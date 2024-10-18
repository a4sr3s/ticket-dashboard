import { NextResponse } from 'next/server';
import dotenv from 'dotenv'; // Ensure this import is at the top of the file
dotenv.config({ path: '.env.local' }); // Load the environment variables

const API_BASE = process.env.API_BASE;
const agent_id = process.env.AGENT_ID;
const agent_key = process.env.AGENT_KEY;
const agent_endpoint = process.env.AGENT_ENDPOINT;

let accessToken = ''; // Store access token

// Helper: Get initial access token (if needed during startup)
async function initializeAccessToken() {
  const response = await fetch(`${API_BASE}/auth/agents/${agent_id}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': agent_key,
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error('Failed to get access token during initialization');
  }

  const data = await response.json();
  accessToken = data.access_token;
  console.log('Initialized access token!');
}

// Initialize the access token on startup
initializeAccessToken().catch((error) =>
  console.error('Error during token initialization:', error)
);

// Main handler function for the API route
export async function POST(request) {
  try {
    const { messages } = await request.json();

    // Attempt the API call with the current access token
    const response = await fetch(`${agent_endpoint}chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages,
      }),
    });

    // If unauthorized, respond with a 401 status
    if (response.status === 401) {
      console.log('Access token is invalid or expired. Returning 401.');
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized: Invalid or expired token.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      const errorMessage = await response.text();
      throw new Error(`Error from agent: ${errorMessage}`);
    }

    const data = await response.json();
    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error communicating with GenAI agent:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to communicate with GenAI agent.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
