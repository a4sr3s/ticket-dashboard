import { NextResponse } from 'next/server';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const API_BASE = process.env.API_BASE;
const agent_id = process.env.AGENT_ID;
const agent_key = process.env.AGENT_KEY;
const agent_endpoint = process.env.AGENT_ENDPOINT;

let tokenCache = {
  accessToken: '',
  expiresAt: 0,
  fetching: null, // Store the fetch promise
};

// Helper: Fetch and store a new access token
async function fetchAccessToken() {
  console.log('Fetching new access token...');
  const response = await fetch(`${API_BASE}/auth/agents/${agent_id}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': agent_key,
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error('Failed to get access token');
  }

  const data = await response.json();
  tokenCache.accessToken = data.access_token;
  tokenCache.expiresAt = Date.now() + data.expires_in * 1000 - 5000; // Buffer time
  console.log('Access token initialized and stored.');
  return tokenCache.accessToken;
}

// Helper: Ensure a valid token is available
async function ensureValidToken() {
  // Return token if it's still valid
  if (tokenCache.accessToken && Date.now() < tokenCache.expiresAt) {
    return tokenCache.accessToken;
  }

  // If a token fetch is already in progress, wait for it to complete
  if (tokenCache.fetching) {
    console.log('Waiting for ongoing token fetch...');
    return tokenCache.fetching;
  }

  // Start a new token fetch and store the promise
  tokenCache.fetching = fetchAccessToken().finally(() => {
    tokenCache.fetching = null; // Clear the fetching state after completion
  });

  return tokenCache.fetching;
}

// Main handler for POST requests
export async function POST(request) {
  try {
    const validToken = await ensureValidToken(); // Ensure a valid token

    const { messages } = await request.json();

    const response = await fetch(`${agent_endpoint}chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`, // Use the valid token
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages,
      }),
    });

    if (response.status === 401) {
      console.error('Unauthorized: Token expired or invalid.');
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      const errorMessage = await response.text();
      throw new Error(`API Error: ${errorMessage}`);
    }

    const data = await response.json();
    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Request failed:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to process request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
