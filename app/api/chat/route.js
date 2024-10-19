import { NextResponse } from 'next/server';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' }); // Load environment variables

// Environment variables
const API_BASE = process.env.API_BASE;
const agent_id = process.env.AGENT_ID;
const agent_key = process.env.AGENT_KEY;
const agent_endpoint = process.env.AGENT_ENDPOINT;

// Token management variables
let accessToken = '';
let tokenExpiresAt = 0;
let isFetchingToken = false; // Prevent race conditions

// Helper: Fetch new access token
async function fetchAccessToken() {
  console.log('Fetching new access token...');
  try {
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
    accessToken = data.access_token;
    tokenExpiresAt = Date.now() + data.expires_in * 1000 - 5000; // Subtract 5s buffer
    console.log('Access token initialized and stored.');
  } catch (error) {
    console.error('Error fetching access token:', error);
    throw error;
  }
}

// Ensure token is valid before use
async function ensureValidToken() {
  if (!accessToken || Date.now() >= tokenExpiresAt) {
    if (!isFetchingToken) {
      isFetchingToken = true; // Lock to prevent concurrent fetches
      try {
        await fetchAccessToken();
      } finally {
        isFetchingToken = false; // Release lock
      }
    } else {
      console.log('Waiting for token fetch to complete...');
      await new Promise((resolve) => setTimeout(resolve, 100)); // Small wait
      return ensureValidToken(); // Re-check after waiting
    }
  }
}

// Main handler for POST requests
export async function POST(request) {
  try {
    await ensureValidToken(); // Ensure we have a valid token

    const { messages } = await request.json();

    const response = await fetch(`${agent_endpoint}chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`, // Use the valid token
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
