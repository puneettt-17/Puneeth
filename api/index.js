/**
 * Vercel Serverless Function Handler
 * Routes all /api/* requests to the Aegis Backend API controller
 */

const handleRequest = require('../server');

module.exports = async (req, res) => {
  return handleRequest(req, res);
};
