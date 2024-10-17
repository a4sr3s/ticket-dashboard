import { Client } from '@opensearch-project/opensearch';
import dotenv from 'dotenv'; // Ensure this import is at the top of the file
dotenv.config({ path: '.env.local' }); // Load the environment variables

// OpenSearch client setup
const client = new Client({
  node: process.env.OPENSEARCH_NODE,
  auth: {
    username: process.env.OPENSEARCH_USERNAME,
    password: process.env.OPENSEARCH_PASSWORD,
  },
  ssl: {
    rejectUnauthorized: false,
  },
});

// GET request handler to retrieve open, resolved, and total tickets
export async function GET() {
  try {
    console.log('Querying OpenSearch for tickets...');

    // Query Open and In Progress tickets
    const openResult = await client.search({
      index: 'tickets',
      body: {
        query: {
          bool: {
            should: [
              { match: { status: { query: 'Open', operator: 'AND', fuzziness: 'AUTO' } } },
              { match: { status: { query: 'In Progress', operator: 'AND', fuzziness: 'AUTO' } } },
            ],
            minimum_should_match: 1,
          },
        },
        size: 100,
      },
    });
    const openTicketsCount = openResult.body.hits.total.value;

    // Query Resolved tickets
    const resolvedResult = await client.search({
      index: 'tickets',
      body: {
        query: { match: { status: { query: 'Resolved', operator: 'AND', fuzziness: 'AUTO' } } },
        size: 100,
      },
    });
    const resolvedTicketsCount = resolvedResult.body.hits.total.value;

    // Query Total tickets
    const totalResult = await client.search({
      index: 'tickets',
      body: { query: { match_all: {} }, size: 100 },
    });
    const totalTicketsCount = totalResult.body.hits.total.value;

    console.log('Open:', openTicketsCount, 'Resolved:', resolvedTicketsCount, 'Total:', totalTicketsCount);

    // Return all counts in a single JSON response
    return new Response(
      JSON.stringify({
        openTickets: openTicketsCount,
        resolvedTickets: resolvedTicketsCount,
        totalTickets: totalTicketsCount,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error querying OpenSearch:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch ticket data.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
