/**
 * Backend Server - Express proxy for Harvard API
 * 
 * Proxies requests to Harvard's OpenAI-compatible gateway.
 * API key is stored securely in environment variables.
 * 
 * Environment Variables:
 * - HARVARD_OPENAI_KEY: Your Harvard API key
 * - HARVARD_OPENAI_BASE_URL: Harvard gateway URL (default: https://go.apis.huit.harvard.edu/ais-openai-direct/v2/)
 * - PORT: Server port (default: 3001)
 */

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

// Configuration from environment variables
const HARVARD_API_KEY = process.env.HARVARD_OPENAI_KEY || '';
const HARVARD_BASE_URL = process.env.HARVARD_OPENAI_BASE_URL || 'https://go.apis.huit.harvard.edu/ais-openai-direct/v2/';
const PORT = process.env.PORT || 3001;

// Models that don't support temperature parameter
const NO_TEMP_MODELS = ['gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini', 'gpt-5.4-nano'];

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'harvard-proxy' });
});

// Harvard Chat Completions Proxy
app.post('/api/harvard', async (req, res) => {
  // Check for API key
  if (!HARVARD_API_KEY) {
    console.error('HARVARD_OPENAI_KEY is not configured');
    return res.status(500).json({ error: 'Harvard API key not configured' });
  }

  try {
    const { messages, model, temperature, max_tokens, stream, response_format } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request: messages array required' });
    }

    // Build request body dynamically based on model capabilities
    const harvardRequest = {
      model: model || 'gpt-4o-mini',
      messages: messages,
      stream: stream ?? false,
    };

    // Forward response_format for structured outputs support
    if (response_format !== undefined) {
      harvardRequest.response_format = response_format;
    }

    // Only include temperature for models that support it
    if (!NO_TEMP_MODELS.includes(harvardRequest.model)) {
      harvardRequest.temperature = temperature ?? 0.2;
    }

    if (max_tokens !== undefined) {
      harvardRequest.max_tokens = max_tokens;
    }

    console.log('[Harvard Proxy] Forwarding chat completion request to:', `${HARVARD_BASE_URL}chat/completions`);

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
      console.error('[Harvard Proxy] Harvard API error:', response.status, errorText);

      let errorMessage = 'Harvard API request failed';
      if (response.status === 401 || response.status === 403) {
        errorMessage = 'Invalid Harvard API key';
      } else if (response.status === 429) {
        errorMessage = 'Harvard API rate limit exceeded';
      }

      return res.status(response.status).json({ error: errorMessage, details: errorText });
    }

    // Handle streaming responses
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // For streaming, we need to pipe the response
      response.body.pipe(res);
    } else {
      const data = await response.json();
      res.json(data);
    }

  } catch (error) {
    console.error('[Harvard Proxy] Proxy error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Harvard Responses API Proxy
app.post('/api/harvardResponses', async (req, res) => {
  // Check for API key
  if (!HARVARD_API_KEY) {
    console.error('HARVARD_OPENAI_KEY is not configured');
    return res.status(500).json({ error: 'Harvard API key not configured' });
  }

  try {
    const { input, model, instructions, temperature, stream } = req.body;

    if (!input) {
      return res.status(400).json({ error: 'Invalid request: input required' });
    }

    // Build request body dynamically based on model capabilities
    const harvardRequest = {
      model: model || 'gpt-4.1',
      input,
      stream: stream ?? false,
    };

    // Only include temperature for models that support it
    if (!NO_TEMP_MODELS.includes(harvardRequest.model)) {
      harvardRequest.temperature = temperature ?? 0.2;
    }

    if (instructions !== undefined) {
      harvardRequest.instructions = instructions;
    }

    console.log('[Harvard Proxy] Forwarding responses API request to:', `${HARVARD_BASE_URL}responses`);

    // Forward request to Harvard Responses API
    const response = await fetch(`${HARVARD_BASE_URL}responses`, {
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
      console.error('[Harvard Proxy] Harvard Responses API error:', response.status, errorText);

      let errorMessage = 'Harvard API request failed';
      if (response.status === 401 || response.status === 403) {
        errorMessage = 'Invalid Harvard API key';
      } else if (response.status === 429) {
        errorMessage = 'Harvard API rate limit exceeded';
      }

      return res.status(response.status).json({ error: errorMessage, details: errorText });
    }

    // Handle streaming responses
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // For streaming, we need to pipe the response
      response.body.pipe(res);
    } else {
      const data = await response.json();
      res.json(data);
    }

  } catch (error) {
    console.error('[Harvard Proxy] Proxy error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`[Harvard Proxy] Server running on port ${PORT}`);
  console.log(`[Harvard Proxy] Harvard API base URL: ${HARVARD_BASE_URL}`);
  if (!HARVARD_API_KEY) {
    console.warn('[Harvard Proxy] WARNING: HARVARD_OPENAI_KEY not set!');
  }
});
