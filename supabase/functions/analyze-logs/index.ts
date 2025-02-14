
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const groqApiKey = Deno.env.get('GROQ_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!groqApiKey) {
      console.error('GROQ_API_KEY is not set');
      throw new Error('Groq API key is not configured');
    }

    const { question, logData } = await req.json();

    console.log('Received request with question:', question);
    console.log('Log data sample:', JSON.stringify(logData).slice(0, 100) + '...');

    // Format the conversation for Groq
    const messages = [
      {
        role: "system",
        content: "You are an AI assistant specialized in analyzing log data from bubble sensor measurements. You help users understand their log data by answering questions about wait times, trigger times, pressure readings, and other metrics. Be concise and precise in your answers."
      },
      {
        role: "user",
        content: `Here is the log data: ${JSON.stringify(logData)}\n\nQuestion: ${question}`
      }
    ];

    console.log('Making request to Groq API...');
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768",
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    console.log('Groq API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error response:', errorText);
      throw new Error(`Groq API returned status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Successfully received Groq API response');

    const answer = data.choices[0].message.content;

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Detailed error in analyze-logs function:', {
      message: error.message,
      stack: error.stack,
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
