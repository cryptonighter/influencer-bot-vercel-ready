// MCP Tool: Web Search
// Performs real-time web searches using Exa MCP server.
// Use for fetching current information on self-development topics.

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const mcpConfig = require('../../mcp-config.json');

async function webSearch({ query, max_results = 5 }) {
  let client;
  try {
    // Initialize MCP client for Exa server
    const exaConfig = mcpConfig.mcpServers.exa;
    const transport = new StdioClientTransport({
      command: exaConfig.command,
      args: exaConfig.args
    });

    client = new Client({
      name: 'influencer-bot-client',
      version: '1.0.0'
    });

    await client.connect(transport);

    // Call the search tool (assuming Exa has a 'search' tool)
    const result = await client.callTool({
      name: 'search',
      arguments: {
        query,
        num_results: max_results
      }
    });

    return {
      query,
      results: result.content || [],
      note: 'Use this information to provide up-to-date advice, but verify relevance to user context.'
    };
  } catch (error) {
    console.error('Exa web search error:', error);
    return { error: 'Unable to perform web search at this time.' };
  } finally {
    if (client) {
      await client.close();
    }
  }
}

module.exports = webSearch;