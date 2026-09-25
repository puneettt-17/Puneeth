/**
 * Vercel Serverless Function Handler
 * Routes all /api/* requests to the Aegis Backend API controller
 */

const handleRequest = require('../server');

module.exports = async (req, res) => {
  try {
    return await handleRequest(req, res);
  } catch (err) {
    console.error('[SERVERLESS_API_ERROR]', err);
    if (!res.headersSent) {
      res.writeHead(500, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({
        success: false,
        error: 'Serverless execution error',
        message: err.message
      }));
    }
  }
};
