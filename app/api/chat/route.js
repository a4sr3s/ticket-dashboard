import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import dotenv from 'dotenv'; // Ensure this import is at the top of the file
dotenv.config({ path: '.env.local' }); // Load the environment variables

const API_BASE = process.env.API_BASE;
const agent_id = process.env.AGENT_ID;
const agent_key = process.env.AGENT_KEY;
const agent_endpoint = process.env.AGENT_ENDPOINT;

let refreshToken = ''; // Store refresh token (can be initialized if needed)
let accessToken = ''; // Store access token

// Helper: Check if a JWT token is expired
function isExpired(token) {
  try {
    jwt.decode(token, { verify_signature: false, verify_exp: true });
    return false;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return true;
    }
    throw error;
  }
}

// Helper: Get a new refresh token
async function getRefreshToken() {
  const response = await fetch(`${API_BASE}/auth/agents/${agent_id}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': agent_key,
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error('Failed to issue refresh token');
  }

  const data = await response.json();
  return data.refresh_token;
}

// Helper: Get a new access token using a refresh token
async function getAccessToken(refreshToken) {
  const response = await fetch(`${API_BASE}/auth/agents/${agent_id}/token?refresh_token=${refreshToken}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': agent_key,
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh access token');
  }

  const data = await response.json();
  return data.access_token;
}

// Main handler function for the API route
export async function POST(request) {
  try {
    const { messages } = await request.json();

    // Refresh the tokens if necessary
    if (!refreshToken || isExpired(refreshToken)) {
      refreshToken = await getRefreshToken();
      console.log('Refreshed refresh token!');
    }

    if (!accessToken || isExpired(accessToken)) {
      accessToken = await getAccessToken(refreshToken);
      console.log('Refreshed access token!');
    }

    // Call the agent API with the valid access token
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
    return new NextResponse(JSON.stringify({ error: 'Failed to communicate with GenAI agent.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
