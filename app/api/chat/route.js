import { NextResponse } from 'next/server';
import dotenv from 'dotenv'; // Load environment variables from .env.local
dotenv.config({ path: '.env.local' }); // Ensure variables are loaded

// Environment variables for API configuration
const API_BASE = process.env.API_BASE;
const agent_id = process.env.AGENT_ID;
const agent_key = process.env.AGENT_KEY;
const agent_endpoint = process.env.AGENT_ENDPOINT;

let accessToken = ''; // Store access token
let tokenInitialized = false; // Track if the token is initialized

// Helper function to initialize the access token during deployment
async function initializeAccessToken() {
  if (tokenInitialized) {
    console.log('Access token already initialized.');
    return; // Skip if already initialized
  }

  console.log('Initializing access token...');
  try {
    const response = await fetch(`${API_BASE}/auth/agents/${agent_id}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': agent_key,
      },
      body: JSON.stringify({}), // Send empty JSON body
    });

    if (!response.ok) {
      throw new Error('Failed to get access token during initialization');
    }

    const data = await response.json();
    accessToken = data.access_token; // Store the access token
    tokenInitialized = true; // Mark token as initialized
    console.log('Initialized access token!');
  } catch (error) {
    console.error('Error during token initialization:', error);
    throw error; // Re-throw to catch deployment failures
  }
}

// Call the token initialization during deployment
initializeAccessToken().catch((error) =>
  console.error('Error during deployment token initialization:', error)
);

// Block requests until token initialization completes
async function waitForTokenInitialization() {
  if (!tokenInitialized) {
    console.log('Waiting for token initialization...');
    await initializeAccessToken(); // Ensure token is initialized before handling requests
    console.log('Token initialized and ready.');
  }
}

// Main handler function for POST requests
export async function POST(request) {
  try {
    await waitForTokenInitialization(); // Ensure token is ready before processing the request

    const { messages } = await request.json(); // Extract messages from the request body

    // Call the GenAI agent API using the access token
    const response = await fetch(`${agent_endpoint}chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`, // Use the initialized token
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // Specify the model
        messages, // Pass the messages in the body
      }),
    });

    // Handle 401 Unauthorized response (token issues)
    if (response.status === 401) {
      console.log('Access token is invalid or expired. Returning 401.');
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized: Invalid or expired token.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Handle other non-OK responses
    if (!response.ok) {
      const errorMessage = await response.text();
      throw new Error(`Error from agent: ${errorMessage}`);
    }

    // Parse and return the successful response
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
