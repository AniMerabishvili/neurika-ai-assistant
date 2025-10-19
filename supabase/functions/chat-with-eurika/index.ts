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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

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
          ...messages
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
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
