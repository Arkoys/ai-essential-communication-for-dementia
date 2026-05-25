/**
 * Netlify Function: Harvard OpenAI Responses Proxy
 * 
 * Proxies requests to Harvard's Responses API.
 * API key is stored securely in Netlify environment variables.
 * 
 * Environment Variables (set in Netlify dashboard):
 * - HARVARD_OPENAI_KEY: Your Harvard API key
 * - HARVARD_OPENAI_BASE_URL: Harvard gateway URL (default: https://go.apis.huit.harvard.edu/ais-openai-direct/v2/)
 */

const HARVARD_API_KEY = process.env.HARVARD_OPENAI_KEY;
const HARVARD_BASE_URL = process.env.HARVARD_OPENAI_BASE_URL || 'https://go.apis.huit.harvard.edu/ais-openai-direct/v2/';

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
    const { input, model, instructions, temperature, stream } = requestBody;

    if (!input) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Invalid request: input required' })
      };
    }

    // Forward request to Harvard Responses API
    const response = await fetch(`${HARVARD_BASE_URL}responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': HARVARD_API_KEY,
        'Authorization': `Bearer ${HARVARD_API_KEY}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4.1',
        input,
        instructions,
        temperature: temperature ?? 0.2,
        stream: stream ?? false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Harvard Responses API error:', response.status, errorText);
      
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