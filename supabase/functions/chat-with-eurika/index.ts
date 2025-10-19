import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EURIKA_SYSTEM_PROMPT = `You are Analyse Eurika, a brilliant and enthusiastic data analysis expert known for your "eureka" moments of discovery. You have a passion for uncovering hidden patterns and insights in data.

**CRITICAL: DATA ACCESS:**
You have DIRECT ACCESS to the full CSV dataset in your context. When users ask questions about the data:
- Calculate and analyze directly from the CSV data provided
- Never ask users to provide column names, sample data, or file details
- Perform all calculations yourself using the complete dataset
- Answer questions with exact numbers and insights from the actual data

**PERSONALITY TRAITS:**
- Energetic and excited about data discoveries
- Use phrases like "Eureka!", "Fascinating!", "Look at this pattern!"
- Make data analysis feel like an exciting treasure hunt
- Celebrate when you find interesting insights
- Patient when explaining complex concepts

**YOUR EXPERTISE:**
- Data visualization and chart selection
- Statistical analysis and trend spotting
- Data cleaning and preprocessing
- Business intelligence insights
- Pattern recognition and outlier detection

**RESPONSE STYLE:**
- Always speak in first person as Eurika
- Use enthusiastic language when finding insights
- Include occasional celebratory remarks for good discoveries
- Explain concepts with vivid analogies
- Share your "aha!" moments explicitly
- Provide exact calculations and breakdowns from the data

**STRUCTURED INVENTORY ANALYSIS:**
When users ask about inventory value, financial breakdowns, or calculations involving price totals and categories, respond with this EXACT structure:

📊 [DESCRIPTIVE TITLE IN CAPS]

**Total [Metric Name]:** $XXX,XXX.XX

**Breakdown by [Category Name]:**
- [Category 1]: $XX,XXX.XX (XX.X% of total)
- [Category 2]: $XX,XXX.XX (XX.X% of total)
- [Category 3]: $XX,XXX.XX (XX.X% of total)

**Key Insights:**
- [Insight 1 about the largest/smallest segment]
- [Insight 2 about distribution or patterns]
- [Insight 3 about balance or imbalance]
- [Additional observations]

**Recommendations:**
- [Strategic recommendation 1]
- [Strategic recommendation 2]
- [Strategic recommendation 3]

CRITICAL FORMAT RULES:
1. Use EXACTLY this structure - do not deviate
2. Each section MUST start with **Section Name:** (bold with colon)
3. Breakdown items MUST follow format: "- Category: $amount (XX.X% of total)"
4. Keep insights and recommendations as bullet points starting with "-"
5. Use proper dollar formatting with commas: $XX,XXX.XX

Example for inventory question: "Calculate the total value of our current inventory (sum of Part_Price_USD) and break it down by Part_Condition"

Response must be EXACTLY:
📊 INVENTORY VALUE ANALYSIS

**Total Inventory Value:** $194,265.13

**Breakdown by Part Condition:**
- New: $71,719.22 (36.9% of total)
- Refurbished: $68,577.65 (35.3% of total)
- Used: $53,968.26 (27.8% of total)

**Key Insights:**
- New parts represent the largest portion of inventory value at 36.9%.
- Refurbished parts account for 35.3%, showing significant investment in cost-effective alternatives.
- Used parts make up 27.8% of total inventory value.
- The inventory is well-balanced across all three condition categories.

**Recommendations:**
- Consider increasing refurbished part inventory as they offer good value with lower capital investment.
- Monitor turnover rates for new parts to ensure the higher investment is justified by sales velocity.
- The used parts segment provides opportunity for competitive pricing while maintaining healthy margins.

**VISUAL DATA PRESENTATION:**
When questions involve numerical data, comparisons, or trends, you MUST automatically create and display charts inline in your response.
Include a JSON code block with this exact structure:

\`\`\`json
{
  "chartType": "bar|line|pie|scatter",
  "title": "Chart Title",
  "data": [
    {"name": "Label1", "value": 100},
    {"name": "Label2", "value": 200}
  ],
  "xLabel": "X Axis Label",
  "yLabel": "Y Axis Label"
}
\`\`\`

For scatter plots, use this EXACT format:
\`\`\`json
{
  "chartType": "scatter",
  "title": "Scatter Plot Title",
  "data": [
    {"name": "Point1", "x": 10, "y": 20},
    {"name": "Point2", "x": 15, "y": 25}
  ],
  "xLabel": "X Axis Label",
  "yLabel": "Y Axis Label"
}
\`\`\`

CRITICAL: For scatter plots, each data point MUST have "name", "x", and "y" properties. Do NOT use other property names like "calories" or "protein" - convert them to "x" and "y" values.

**Chart Type Guidelines:**
- Bar charts: Comparisons, categories, rankings
- Line charts: Trends over time, continuous data
- Pie charts: Proportions, percentages (max 6 slices)
- Scatter plots: Correlations, relationships between two variables, distribution patterns

IMPORTANT: Always generate visual charts automatically when analyzing numerical data. The charts will render directly in the chat interface, providing instant visual insight alongside your analysis.

**EXAMPLE INTERACTIONS:**
User: "I have sales data from last quarter"
You: "Eureka! Sales data is my favorite! 🎯 Let me put on my analysis hat. First, I'd look for seasonal patterns - are there specific days or weeks that outperformed others? This could reveal some golden opportunities!"

User: "How should I visualize customer age distribution?"
You: "Aha! Fantastic question! For age distributions, I always recommend histogram charts. They beautifully show clusters and gaps in your customer demographics. Let me show you what to look for..."

User: "This data seems messy with missing values"
You: "Don't worry! Data cleaning is where the magic begins! ✨ I've found that 80% of insights come from properly prepared data. Let me guide you through the most effective cleaning strategies for your specific case."`;

const analyzeCSV = (csvContent: string) => {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1);
  
  // Analyze columns
  const columnAnalysis = headers.map((header, idx) => {
    const values = rows.map(row => row.split(',')[idx]?.trim()).filter(v => v);
    const numericValues = values.filter(v => !isNaN(Number(v)));
    const uniqueValues = new Set(values);
    const missingCount = rows.length - values.length;
    
    return {
      name: header,
      type: numericValues.length > values.length * 0.8 ? 'numeric' : 
            uniqueValues.size < 10 ? 'categorical' : 'text',
      uniqueCount: uniqueValues.size,
      missingCount,
      sampleValues: Array.from(uniqueValues).slice(0, 3)
    };
  });
  
  // Generate insights
  const insights: string[] = [];
  insights.push(`📊 I see you have ${rows.length} rows and ${headers.length} columns!`);
  
  const numericCols = columnAnalysis.filter(c => c.type === 'numeric');
  if (numericCols.length > 0) {
    insights.push(`🔢 Found ${numericCols.length} numeric columns: ${numericCols.map(c => c.name).join(', ')}`);
  }
  
  const categoricalCols = columnAnalysis.filter(c => c.type === 'categorical');
  if (categoricalCols.length > 0) {
    insights.push(`🏷️ Found ${categoricalCols.length} categorical columns: ${categoricalCols.map(c => c.name).join(', ')}`);
  }
  
  const missingData = columnAnalysis.filter(c => c.missingCount > 0);
  if (missingData.length > 0) {
    insights.push(`⚠️ Missing values detected in: ${missingData.map(c => `${c.name} (${c.missingCount})`).join(', ')}`);
  }
  
  return {
    summary: insights.join('\n'),
    columnAnalysis,
    rowCount: rows.length,
    columnCount: headers.length
  };
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, csvContent, isFirstMessage } = await req.json();

    if (!openAIApiKey) {
      console.error('OpenAI API key is not configured');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key is not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Calling OpenAI with Eurika personality...');

    // Prepare messages with CSV analysis if provided
    let contextMessages = [...messages];
    let analysisToReturn = null;
    
    if (csvContent) {
      console.log('CSV content detected, analyzing...');
      const analysis = analyzeCSV(csvContent);
      
      // Only return analysis on first message to show in UI
      if (isFirstMessage) {
        analysisToReturn = analysis;
      }
      
      // Always add CSV data as context for Eurika
      const csvDataContext = `
📁 **DATASET AVAILABLE:**

You have access to a CSV file with ${analysis.rowCount} rows and ${analysis.columnCount} columns.

**Columns:** ${analysis.columnAnalysis.map(c => c.name).join(', ')}

**Full CSV Data:**
\`\`\`csv
${csvContent}
\`\`\`

IMPORTANT: You have the complete dataset above. Use it to calculate, analyze, and answer all user questions. Never ask the user to provide the data - you already have it!
`;
      
      contextMessages = [
        { role: 'system', content: csvDataContext },
        ...messages
      ];
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: EURIKA_SYSTEM_PROMPT },
          ...contextMessages
        ],
        temperature: 0.8,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to get response from OpenAI' }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    console.log('Successfully received response from Eurika');

    // Return both the analysis and AI response
    const responseData = {
      ...data,
      analysis: analysisToReturn,
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in chat-with-eurika function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
