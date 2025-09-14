// MCP Tool: Web Search
// Performs real-time web searches using Exa API.
// Use for fetching current information on self-development topics.

const fetch = require('node-fetch');

async function webSearch({ query, max_results = 5 }) {
  try {
    const apiKey = '382feb40-80e2-4724-8b90-ce2e8d46603e'; // From config
    const url = 'https://api.exa.ai/search';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        query,
        numResults: max_results,
        type: 'neural' // Or 'keyword' based on needs
      })
    });

    if (!response.ok) {
      throw new Error(`Exa API error: ${response.status}`);
    }

    const data = await response.json();
    const results = data.results?.map(result => ({
      title: result.title,
      url: result.url,
      snippet: result.snippet || result.text
    })) || [];

    return {
      query,
      results,
      note: 'Use this information to provide up-to-date advice, but verify relevance to user context.'
    };
  } catch (error) {
    console.error('Exa web search error:', error);
    return { error: 'Unable to perform web search at this time.' };
  }
}

module.exports = webSearch;