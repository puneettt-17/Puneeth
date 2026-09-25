/**
 * Supabase Client & Adapter Module
 * Supports both Live Supabase Cloud and Local Fallback Storage
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Try reading .env file if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let val = (match[2] || '').trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      if (!process.env[key]) process.env[key] = val;
    }
  });
}

let supabaseUrl = process.env.SUPABASE_URL || '';
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

let client = null;
let isConfigured = false;

function initSupabase(url, key) {
  if (url && key && url.startsWith('http')) {
    try {
      client = createClient(url, key, {
        auth: { persistSession: false }
      });
      supabaseUrl = url;
      supabaseKey = key;
      isConfigured = true;
      console.log(`[SUPABASE] Connected to Supabase Cloud: ${url}`);
      return true;
    } catch (err) {
      console.error('[SUPABASE] Failed to initialize Supabase client:', err.message);
      isConfigured = false;
      client = null;
      return false;
    }
  } else {
    isConfigured = false;
    client = null;
    return false;
  }
}

// Auto-initialize if environment variables are present
if (supabaseUrl && supabaseKey) {
  initSupabase(supabaseUrl, supabaseKey);
}

module.exports = {
  getSupabaseClient: () => client,
  isConfigured: () => isConfigured,
  getSupabaseUrl: () => supabaseUrl,
  initSupabase
};
