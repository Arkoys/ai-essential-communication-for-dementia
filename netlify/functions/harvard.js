/**
 * Netlify Function: Harvard OpenAI Proxy
 * 
 * Proxies requests to Harvard's OpenAI-compatible gateway.
 * API key is stored securely in Netlify environment variables.
 * 
 * Environment Variables (set in Netlify dashboard):
 * - HARVARD_OPENAI_KEY: Your Harvard API key
 * - HARVARD_OPENAI_BASE_URL: Harvard gateway URL (default: https://go.apis.huit.harvard.edu/ais-openai-direct/v2/)
 */

const HARVARD_API_KEY = process.env.HARVARD_OPENAI_KEY;
const HARVARD_BASE_URL = process.env.HARVARD_OPENAI_BASE_URL || 'https://go.apis.huit.harvard.edu/ais-openai-direct/v2/';

// Models that don't support temperature parameter (or only support default value 1)
const NO_TEMP_MODELS = ['gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini', 'gpt-5.4-nano'];

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Check for API key
  if (!HARVARD_API_KEY) {
    console.error('HARVARD_OPENAI_KEY is not configured');
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Harvard API key not configured' })
    };
  }

  try {
    // Parse the request body
    const requestBody = JSON.parse(event.body || '{}');
    const { messages, model, temperature, max_tokens, stream } = requestBody;

    if (!messages || !Array.isArray(messages)) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Invalid request: messages array required' })
      };
    }

    // Build request body dynamically based on model capabilities
    const harvardRequest = {
      model: model || 'gpt-4o-mini',
      messages: messages,
      stream: stream ?? false,
    };

    // Only include temperature for models that support it
    if (!NO_TEMP_MODELS.includes(harvardRequest.model)) {
      harvardRequest.temperature = temperature ??0.2;
    }

    if (max_tokens !== undefined) {
      harvardRequest.max_tokens = max_tokens;
    }

    // Forward request to Harvard API
    const response = await fetch(`${HARVARD_BASE_URL}chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': HARVARD_API_KEY,
        'Authorization': `Bearer ${HARVARD_API_KEY}`,
      },
      body: JSON.stringify(harvardRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Harvard API error:', response.status, errorText);
      
      let errorMessage = 'Harvard API request failed';
      if (response.status === 401 || response.status === 403) {
        errorMessage = 'Invalid Harvard API key';
      } else if (response.status === 429) {
        errorMessage = 'Harvard API rate limit exceeded';
      }

      return {
        statusCode: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: errorMessage, details: errorText })
      };
    }

    // Get response data
    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error('Proxy error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Internal server error', message: error.message })
    };
  }
};
