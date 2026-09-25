/**
 * Vercel Catch-All Serverless Function Handler
 * Automatically handles all /api/* requests (e.g. /api/health, /api/agents, /api/stats, etc.)
 */

const handleRequest = require('../server');

module.exports = async (req, res) => {
  try {
    return await handleRequest(req, res);
  } catch (err) {
    console.error('[SERVERLESS_CATCHALL_ERROR]', err);
    if (!res.headersSent) {
      res.writeHead(500, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({
        success: false,
        error: 'Serverless execution failure',
        message: err.message
      }));
    }
  }
};
