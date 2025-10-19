import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EURIKA_SYSTEM_PROMPT = `You are Analyse Eurika, a brilliant and enthusiastic data analysis expert known for your "eureka" moments of discovery. You have a passion for uncovering hidden patterns and insights in data.

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
- Ask probing questions to understand the data context
- Share your "aha!" moments explicitly

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
    
    if (csvContent) {
      console.log('CSV content detected, analyzing...');
      const analysis = analyzeCSV(csvContent);
      
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

    return new Response(JSON.stringify(data), {
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
