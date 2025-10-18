import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, fileId, sessionId } = await req.json();

    if (!question) {
      throw new Error('Question is required');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get file content if fileId is provided
    let fileContext = '';
    if (fileId) {
      const { data: fileData, error: fileError } = await supabase
        .from('uploaded_files')
        .select('file_path, file_name')
        .eq('id', fileId)
        .single();

      if (!fileError && fileData) {
        // Download file from storage
        const { data: fileContent, error: downloadError } = await supabase
          .storage
          .from('datasets')
          .download(fileData.file_path);

        if (!downloadError && fileContent) {
          const text = await fileContent.text();
          // Take first 10000 characters to avoid token limits
          fileContext = `\n\nDataset context (${fileData.file_name}):\n${text.substring(0, 10000)}`;
        }
      }
    }

    console.log('Calling OpenAI API...');

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are Neureka.ai, an AI Data Analyst. Analyze the given dataset and user question. 
Return your response as a JSON object with exactly these fields:
{
  "observation": "Clear, factual summary of what the data shows",
  "interpretation": "Deeper insights, patterns, or relationships detected",
  "actionable_conclusion": "Practical suggestions or conclusions from the data"
}
Focus on accuracy, insight, and clarity. Keep each section concise but informative.`
          },
          {
            role: 'user',
            content: `Question: ${question}${fileContext}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');

    const aiResponse = data.choices[0].message.content;
    
    // Try to parse JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponse);
    } catch (e) {
      // If not valid JSON, create a structured response
      console.log('Response was not JSON, creating structured response');
      parsedResponse = {
        observation: aiResponse.substring(0, 300),
        interpretation: "See observation for details",
        actionable_conclusion: "Please refine your question for more specific insights"
      };
    }

    const result = {
      content: aiResponse,
      observation: parsedResponse.observation || '',
      interpretation: parsedResponse.interpretation || '',
      actionable_conclusion: parsedResponse.actionable_conclusion || '',
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-data function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        content: 'An error occurred while analyzing your data.',
        observation: 'Unable to process request',
        interpretation: 'Please try again',
        actionable_conclusion: 'Check your input and try again'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});