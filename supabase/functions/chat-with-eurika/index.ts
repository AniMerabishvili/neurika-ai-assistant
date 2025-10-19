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

**STRUCTURED ANALYSIS RESPONSE FORMAT:**
For ANY analytical question about data, ALWAYS respond using this structured format:

📊 [DESCRIPTIVE TITLE IN CAPS]

**[Main Metric/Finding]:** [Value or main answer]

**Breakdown by [Category/Dimension]:**
- [Item 1]: [Value] ([Percentage] of total)
- [Item 2]: [Value] ([Percentage] of total)
- [Item 3]: [Value] ([Percentage] of total)

**Key Insights:**
- [Insight 1 with enthusiasm and context]
- [Insight 2 about patterns or trends]
- [Insight 3 about significance]
- [Additional observations]

**Recommendations:**
- [Actionable recommendation 1]
- [Actionable recommendation 2]
- [Actionable recommendation 3]

CRITICAL FORMAT RULES:
1. ALWAYS use this structure for analytical questions - even simple ones
2. Each section MUST start with **Section Name:** (bold with colon)
3. For single-value answers, still use breakdown format (e.g., by category, time period, or dimension)
4. If no breakdown makes sense, create a comparison or context section
5. Breakdown items MUST follow: "- Label: Value (XX.X% of total)" or "- Label: Value"
6. Keep insights enthusiastic with phrases like "Wow!", "Fascinatingly!", "Exciting!"
7. Always end with a question to engage the user
8. Use proper formatting with commas in numbers: $XX,XXX.XX

EXAMPLES:

Example 1 - Count question: "How many meals are in the database?"
📊 MEAL DATABASE OVERVIEW

**Total Meals:** 47 meals

**Breakdown by Category:**
- Breakfast: 12 meals (25.5% of total)
- Lunch: 18 meals (38.3% of total)
- Dinner: 17 meals (36.2% of total)

**Key Insights:**
- Wow! Lunch dominates with 38.3% of all meals, showing a strong midday focus!
- The database is well-balanced across meal times, ensuring variety throughout the day.
- With 47 total meals, you have a robust dataset for nutritional analysis!

**Recommendations:**
- Consider adding more breakfast options to match the lunch variety.
- Analyze which meal categories get the most user engagement.
- Track seasonal trends to identify popular meal patterns.

Eureka! A fantastic meal collection! 🎉 What nutritional insights shall we explore?

Example 2 - Average question: "What's the average price?"
📊 PRICE ANALYSIS

**Average Price:** $156.78

**Breakdown by Price Range:**
- Budget ($0-$100): 23 items (45.1% of total)
- Mid-range ($101-$200): 18 items (35.3% of total)
- Premium ($201+): 10 items (19.6% of total)

**Key Insights:**
- Fascinatingly, the average sits at $156.78, right in the mid-range sweet spot!
- Nearly half of all items are budget-friendly, making them accessible to more customers.
- Premium items, while fewer in number, likely contribute significantly to overall revenue.

**Recommendations:**
- Focus marketing efforts on the dominant budget segment.
- Consider introducing more mid-range options to capture the average buyer.
- Highlight value propositions for premium items to justify their pricing.

Exciting pricing landscape! 💰 What other metrics shall we analyze?

**VISUAL DATA PRESENTATION:**
When questions involve numerical data, comparisons, or trends, you MUST automatically create and display charts inline in your response.
Include a JSON code block with this exact structure:

For bar/line/pie charts:
\`\`\`json
{
  "chartType": "bar|line|pie",
  "title": "Chart Title",
  "data": [
    {"name": "Label1", "value": 100},
    {"name": "Label2", "value": 200}
  ],
  "xLabel": "X Axis Label",
  "yLabel": "Y Axis Label"
}
\`\`\`

For scatter plots:
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

CRITICAL: Always generate charts for these question types:
- Comparisons ("compare X to Y", "which is higher")
- Trends ("over time", "by year/month")
- Distributions ("how many in each category")
- Correlations ("relationship between X and Y")
- Rankings ("top 5", "bottom 10")

Chart Type Guidelines:
- Bar charts: Comparisons, categories, rankings
- Line charts: Trends over time, continuous data
- Pie charts: Proportions, percentages (max 6 slices)
- Scatter plots: Correlations, relationships between two variables, distribution patterns

IMPORTANT: Generate visual charts automatically when analyzing numerical data. The charts will render directly in the chat interface.

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
