/**
 * AEGIS.AI CI Automated Test Suite
 * Designed to execute cleanly in GitHub Actions across Node.js 18.x, 20.x, and 22.x.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');

const rootDir = path.join(__dirname, '..');

// Helper for timing-safe password verification
function verifyPassword(password, salt, storedHash) {
  return new Promise((resolve) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return resolve(false);
      try {
        const keyBuffer = Buffer.from(derivedKey.toString('hex'), 'hex');
        const hashBuffer = Buffer.from(storedHash, 'hex');
        if (keyBuffer.length !== hashBuffer.length) return resolve(false);
        resolve(crypto.timingSafeEqual(keyBuffer, hashBuffer));
      } catch (e) {
        resolve(false);
      }
    });
  });
}

async function run() {
  console.log('=======================================================');
  console.log('  AEGIS.AI - GitHub Actions CI Automated Test Runner');
  console.log(`  Node.js Version: ${process.version}`);
  console.log('=======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Filesystem & Integrity Checks
  console.log('--- 1. File Integrity & Build Artifacts ---');
  const criticalFiles = [
    'server.js',
    'index.html',
    'styles.css',
    'app.js',
    'bundle.html',
    'package.json',
    'public/index.html',
    'public/styles.css',
    'public/app.js',
    'public/bundle.html'
  ];

  criticalFiles.forEach(f => {
    const exists = fs.existsSync(path.join(rootDir, f));
    assert(exists, `Required file exists: ${f}`);
  });

  // 2. DOM & HTML Contract Checks
  console.log('\n--- 2. Login UI Markup Contract ---');
  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
  assert(indexHtml.includes('id="login-form"'), 'Login form element exists');
  assert(indexHtml.includes('id="login-alert"'), 'Inline login alert container exists');
  assert(indexHtml.includes('id="login-email"'), 'Email input field exists');
  assert(indexHtml.includes('id="login-password"'), 'Password input field exists');

  // 3. Cryptographic Password Verification Logic
  console.log('\n--- 3. Cryptographic Password Engine ---');
  const testSalt = '7c9a4b8d2e1f3a5b6c7d8e9f0a1b2c3d';
  const testHash = 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0';
  
  // Create known hash for 'test-secret'
  const knownSalt = crypto.randomBytes(16).toString('hex');
  const knownHash = await new Promise((res, rej) => {
    crypto.scrypt('test-secret-2026', knownSalt, 64, (err, key) => err ? rej(err) : res(key.toString('hex')));
  });

  const validMatch = await verifyPassword('test-secret-2026', knownSalt, knownHash);
  assert(validMatch === true, 'Timing-safe crypto correctly validates correct password');

  const invalidMatch = await verifyPassword('wrong-password', knownSalt, knownHash);
  assert(invalidMatch === false, 'Timing-safe crypto strictly rejects incorrect password');

  // 4. Server Integration Tests
  console.log('\n--- 4. HTTP API Server & Authentication Validation ---');
  const handleRequest = require('../server');
  
  const testPort = 3899 + Math.floor(Math.random() * 500);
  const server = http.createServer((req, res) => {
    handleRequest(req, res).catch(err => {
      res.writeHead(500);
      res.end(err.message);
    });
  });

  await new Promise(res => server.listen(testPort, '127.0.0.1', res));
  console.log(`  Test server listening on port ${testPort}`);

  function makeRequest(method, path, body) {
    return new Promise((resolve, reject) => {
      const postData = body ? JSON.stringify(body) : null;
      const req = http.request({
        hostname: '127.0.0.1',
        port: testPort,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {})
        },
        timeout: 4000
      }, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(data); } catch (e) {}
          resolve({ status: res.statusCode, body: json || data });
        });
      });
      req.on('error', reject);
      if (postData) req.write(postData);
      req.end();
    });
  }

  // Health endpoint
  const healthRes = await makeRequest('GET', '/api/health');
  assert(healthRes.status === 200 && healthRes.body.status === 'healthy', 'GET /api/health returns 200 OK & status: healthy');

  // Auth: Reject nonexistent email (allow any domain like @gmail.com)
  const nonExistRes = await makeRequest('POST', '/api/auth/login', {
    email: 'user.analyst@gmail.com',
    password: 'anypassword123'
  });
  assert(
    nonExistRes.status === 401 && nonExistRes.body.error === 'Invalid email or password',
    'POST /api/auth/login rejects nonexistent email with generic "Invalid email or password" (no domain discrimination)'
  );

  // Auth: Reject incorrect password on existing account
  const wrongPassRes = await makeRequest('POST', '/api/auth/login', {
    email: 'admin@aegis.ai',
    password: 'COMPLETELY_WRONG_PASSWORD'
  });
  assert(
    wrongPassRes.status === 401 && wrongPassRes.body.error === 'Invalid email or password',
    'POST /api/auth/login rejects wrong password with generic "Invalid email or password"'
  );

  // Auth: Accept valid credentials
  const validRes = await makeRequest('POST', '/api/auth/login', {
    email: 'admin@aegis.ai',
    password: 'aegis-enterprise-2026'
  });
  assert(
    validRes.status === 200 && validRes.body.success === true && !!validRes.body.token,
    'POST /api/auth/login verifies correct password and issues session token'
  );

  // Close test server
  await new Promise(res => server.close(res));

  // Summary
  console.log('\n=======================================================');
  console.log(`  CI TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log('=======================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run().catch(err => {
  console.error('Fatal CI Test Failure:', err);
  process.exit(1);
});
