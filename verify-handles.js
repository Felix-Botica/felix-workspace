#!/usr/bin/env node
/**
 * verify-handles.js
 * 
 * Verifies Instagram handles from handle-map.json by checking if they exist.
 * Uses Instagram's public profile endpoint (no auth needed).
 * 
 * Output: verification-results.json with:
 * - valid: handle exists
 * - invalid: 404 or error
 * - suspicious: placeholder patterns
 * - skipped: UNKNOWN/ERROR entries
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const HANDLE_MAP_PATH = path.join(process.env.HOME, '.openclaw/nylongerie/handle-map.json');
const OUTPUT_PATH = path.join(process.env.HOME, '.openclaw/nylongerie/verification-results.json');
const LOG_PATH = path.join(process.env.HOME, '.openclaw/nylongerie/verification.log');

// Placeholder patterns to flag as suspicious
const SUSPICIOUS_PATTERNS = [
  /^@?username$/i,
  /^@?person$/i,
  /^@?unknown$/i,
  /^@?persona_/i,
  /^@?real_person/i,
  /^@?not_visible/i,
  /^\d{10,}$/,  // Long number strings
  /^[a-z_]{1,3}$/i,  // Too short (1-3 chars)
  /(.)\1{5,}/,  // Repeated chars (666666, aaaaaa)
];

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}\n`;
  fs.appendFileSync(LOG_PATH, line);
  console.log(msg);
}

function isSuspicious(handle) {
  const clean = handle.replace('@', '');
  return SUSPICIOUS_PATTERNS.some(pattern => pattern.test(clean));
}

function checkHandle(handle) {
  return new Promise((resolve) => {
    const clean = handle.replace('@', '');
    
    // Skip obvious non-handles
    if (handle === 'UNKNOWN' || handle === 'ERROR' || !clean) {
      resolve({ handle, status: 'skipped', reason: 'placeholder' });
      return;
    }
    
    // Flag suspicious patterns
    if (isSuspicious(handle)) {
      resolve({ handle, status: 'suspicious', reason: 'placeholder pattern' });
      return;
    }
    
    // Check if handle exists via Instagram public profile
    const options = {
      hostname: 'www.instagram.com',
      path: `/${clean}/`,
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 5000
    };
    
    const req = https.request(options, (res) => {
      if (res.statusCode === 200) {
        resolve({ handle, status: 'valid', statusCode: 200 });
      } else if (res.statusCode === 404) {
        resolve({ handle, status: 'invalid', statusCode: 404, reason: 'not found' });
      } else if (res.statusCode === 429) {
        resolve({ handle, status: 'rate_limited', statusCode: 429 });
      } else {
        resolve({ handle, status: 'unknown', statusCode: res.statusCode });
      }
    });
    
    req.on('error', (err) => {
      resolve({ handle, status: 'error', reason: err.message });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ handle, status: 'timeout', reason: 'request timeout' });
    });
    
    req.end();
  });
}

async function verifyHandles() {
  log('🔍 Starting handle verification...');
  
  // Load handle map
  if (!fs.existsSync(HANDLE_MAP_PATH)) {
    log('❌ handle-map.json not found. Wait for reclassification to finish.');
    process.exit(1);
  }
  
  const handleMap = JSON.parse(fs.readFileSync(HANDLE_MAP_PATH, 'utf8'));
  const uniqueHandles = [...new Set(Object.values(handleMap))];
  
  log(`📊 Found ${uniqueHandles.length} unique handles to verify`);
  
  const results = {
    timestamp: new Date().toISOString(),
    total: uniqueHandles.length,
    valid: [],
    invalid: [],
    suspicious: [],
    skipped: [],
    rate_limited: [],
    errors: []
  };
  
  // Verify each handle with rate limiting
  for (let i = 0; i < uniqueHandles.length; i++) {
    const handle = uniqueHandles[i];
    
    if (i > 0 && i % 50 === 0) {
      log(`Progress: ${i}/${uniqueHandles.length} (${Math.round(i/uniqueHandles.length*100)}%)`);
      // Save intermediate results
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
    }
    
    const result = await checkHandle(handle);
    
    switch(result.status) {
      case 'valid':
        results.valid.push(result);
        break;
      case 'invalid':
        results.invalid.push(result);
        break;
      case 'suspicious':
        results.suspicious.push(result);
        break;
      case 'skipped':
        results.skipped.push(result);
        break;
      case 'rate_limited':
        results.rate_limited.push(result);
        log(`⚠️  Rate limited at handle ${i+1}/${uniqueHandles.length}`);
        break;
      default:
        results.errors.push(result);
    }
    
    // Rate limiting: 2 requests per second max
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Final save
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
  
  // Summary
  log('\n📈 Verification Results:');
  log(`✅ Valid: ${results.valid.length} (${Math.round(results.valid.length/uniqueHandles.length*100)}%)`);
  log(`❌ Invalid: ${results.invalid.length} (${Math.round(results.invalid.length/uniqueHandles.length*100)}%)`);
  log(`⚠️  Suspicious: ${results.suspicious.length} (${Math.round(results.suspicious.length/uniqueHandles.length*100)}%)`);
  log(`⏭️  Skipped: ${results.skipped.length} (${Math.round(results.skipped.length/uniqueHandles.length*100)}%)`);
  log(`🚫 Rate limited: ${results.rate_limited.length}`);
  log(`💥 Errors: ${results.errors.length}`);
  
  const verifiable = uniqueHandles.length - results.skipped.length;
  const accuracy = verifiable > 0 ? Math.round((results.valid.length / verifiable) * 100) : 0;
  
  log(`\n🎯 Extraction Accuracy: ${accuracy}% (valid handles / non-placeholder handles)`);
  log(`📁 Results saved to: ${OUTPUT_PATH}`);
  
  if (accuracy < 90) {
    log(`\n⚠️  ACCURACY TOO LOW (${accuracy}% < 90%)`);
    log('Recommendation: Use GPT-4o mini or Gemini 2.0 Flash for re-extraction.');
  } else {
    log(`\n✅ ACCURACY ACCEPTABLE (${accuracy}% >= 90%)`);
    log('Proceed with current handle-map.json');
  }
}

// Run
verifyHandles().catch(err => {
  log(`💥 Fatal error: ${err.message}`);
  process.exit(1);
});
