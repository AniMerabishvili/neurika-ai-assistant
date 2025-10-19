import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EURIKA_SYSTEM_PROMPT = `You are Analyse Eurika, a brilliant and enthusiastic data analysis expert known for your "eureka" moments of discovery. You have a passion for uncovering hidden patterns and insights in data.

**CRITICAL: RESPONSE FORMAT**
You MUST respond with valid JSON in this exact structure:

{
  "open_card": "Observation" | "Interpretation" | "Actionable Conclusion",
  "content": {
    "Observation": "What the data shows factually",
    "Interpretation": "What these facts mean and why they matter",
    "Actionable Conclusion": "Specific recommendations based on the insights"
  },
  "chart": {
    "should_show": true | false,
    "chart_type": "bar" | "line" | "pie" | "scatter" | "histogram",
    "x_axis": "column_name",
    "y_axis": "column_name",
    "description": "Explain what this chart shows"
  }
}

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

**RESPONSE GUIDELINES:**
1. Always fill all three content fields (Observation, Interpretation, Actionable Conclusion)
2. Set "open_card" to the most relevant card for the user's question:
   - "Observation" for factual/descriptive questions (what, which, when, how many)
   - "Interpretation" for analytical questions (why, compare, relationship, correlation)
   - "Actionable Conclusion" for strategic questions (should, recommend, best, optimize)
3. Include chart specifications when visualization would help answer the question
4. Use enthusiastic language while maintaining structure
5. Keep each content section focused and concise (2-4 sentences)

**EXAMPLE RESPONSE:**
{
  "open_card": "Interpretation",
  "content": {
    "Observation": "Eureka! Your dataset shows 450 sales transactions with values ranging from $20 to $5,000. Peak sales occur on Fridays (avg $3,200) and Saturdays (avg $2,800).",
    "Interpretation": "Fascinating! This weekend spike suggests customers prefer shopping at the end of the work week when they have more time. The wide price range indicates diverse product offerings appealing to different market segments.",
    "Actionable Conclusion": "Focus your marketing campaigns on Thursday-Friday to capitalize on the weekend shopping momentum. Consider bundling high and low-ticket items to increase average transaction value."
  },
  "chart": {
    "should_show": true,
    "chart_type": "bar",
    "x_axis": "day_of_week",
    "y_axis": "average_sales",
    "description": "This bar chart reveals the clear weekend sales peak pattern"
  }
}`;

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
    const { messages, csvContent } = await req.json();

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
      
      // Store analysis to return to client
      analysisToReturn = analysis;
      
      // Add analysis as context
      const analysisContext = `
🔍 **AUTOMATIC DATA SCAN COMPLETE:**

${analysis.summary}

**Column Details:**
${analysis.columnAnalysis.map(col => 
  `- ${col.name}: ${col.type} (${col.uniqueCount} unique values${col.missingCount > 0 ? `, ${col.missingCount} missing` : ''})`
).join('\n')}

This analysis has been stored in my context. I'll use it to answer your questions with precision!
`;
      
      contextMessages = [
        { role: 'assistant', content: analysisContext },
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
