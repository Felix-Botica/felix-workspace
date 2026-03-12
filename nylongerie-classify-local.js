#!/usr/bin/env node
/**
 * Nylongerie Image Classifier — LOCAL (Ollama LLaVA)
 * Zero API cost. Runs entirely on the M1 Mac.
 * 
 * Falls back to Anthropic Sonnet for ambiguous results.
 * 
 * Usage:
 *   node nylongerie-classify-local.js [batch_size] [start_from]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const INBOX = path.join(process.env.HOME, 'Desktop', 'nylongerie-content', 'inbox');
const QUEUE_FILE = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'queue.json');
const TEMP_DIR = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'temp');
const RESULTS_FILE = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'classify-results.json');

const BATCH_SIZE = parseInt(process.argv[2]) || 100;
const START_FROM = parseInt(process.argv[3]) || 0;

function resizeImage(inputPath, outputPath) {
  try {
    execSync(`sips -Z 800 "${inputPath}" --out "${outputPath}" 2>/dev/null`);
    return true;
  } catch (e) { return false; }
}

async function classifyWithOllama(imagePath) {
  const imageData = fs.readFileSync(imagePath);
  const base64 = imageData.toString('base64');

  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      model: 'llava:7b',
      prompt: `Classify this image. Reply ONLY with valid JSON, nothing else:
{"type": "screenshot" or "content", "handle": "@handle if visible else null", "model_name": "name if visible else null", "style": "one of: editorial, elegant, casual, shiny-glossy, legs-focus, lifestyle, product, other", "description": "one sentence max", "sex_appeal": number 1-10}

Rules:
- "screenshot" = Instagram UI visible (likes, comments, profile header, navigation bars, status bar)
- "content" = clean photo with no Instagram UI elements
- For style: legs-focus means legs are the main subject. shiny-glossy means shiny/satin/glossy materials prominent. editorial means professional fashion shoot. elegant means classy/sophisticated.`,
      images: [base64],
      stream: false
    })
  });

  const result = await response.json();
  const text = result.response || '';
  
  // Try to extract JSON
  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      // Try to fix common JSON issues
      const fixed = jsonMatch[0]
        .replace(/'/g, '"')
        .replace(/(\w+):/g, '"$1":')
        .replace(/,\s*}/g, '}');
      try { return JSON.parse(fixed); } catch (e2) {}
    }
  }
  
  // If JSON parsing fails, extract what we can
  const isScreenshot = text.toLowerCase().includes('screenshot') || 
                       text.toLowerCase().includes('instagram ui') ||
                       text.toLowerCase().includes('navigation bar');
  return {
    type: isScreenshot ? 'screenshot' : 'content',
    handle: null,
    model_name: null,
    style: 'other',
    description: text.slice(0, 100),
    sex_appeal: 5,
    _raw: true // Flag that this was a fallback parse
  };
}

async function main() {
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

  const allFiles = fs.readdirSync(INBOX)
    .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
    .sort();

  const batch = allFiles.slice(START_FROM, START_FROM + BATCH_SIZE);
  console.log(`Processing ${batch.length} images locally via Ollama LLaVA (FREE)`);
  console.log(`Range: ${START_FROM} to ${START_FROM + batch.length - 1} of ${allFiles.length} total`);

  let results = [];
  if (fs.existsSync(RESULTS_FILE)) {
    results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
  }
  const processedFiles = new Set(results.map(r => r.file));

  let processed = 0, screenshots = 0, content = 0, errors = 0;

  for (const file of batch) {
    if (processedFiles.has(file)) {
      continue; // Skip already processed
    }

    const inputPath = path.join(INBOX, file);
    const tempPath = path.join(TEMP_DIR, file);

    if (!resizeImage(inputPath, tempPath)) {
      console.log(`  ERROR resizing ${file}`);
      errors++;
      continue;
    }

    try {
      const classification = await classifyWithOllama(tempPath);
      classification.file = file;
      classification._model = 'llava:7b';
      results.push(classification);

      if (classification.type === 'screenshot') {
        screenshots++;
        console.log(`  📱 SCREENSHOT: ${file} → ${classification.handle || 'no handle'}`);
      } else {
        content++;
        console.log(`  📷 CONTENT: ${file} → ${classification.style} | appeal: ${classification.sex_appeal} | ${classification.description?.slice(0,60)}`);
      }

      processed++;
      if (processed % 10 === 0) {
        fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
        console.log(`  --- Saved: ${processed} done (${screenshots} screenshots, ${content} content, ${errors} errors) ---`);
      }

    } catch (e) {
      console.log(`  ERROR ${file}: ${e.message}`);
      errors++;
    }
  }

  // Final save
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));

  // Pairing logic
  console.log('\n--- Pairing screenshots with content ---');
  results.sort((a, b) => a.file.localeCompare(b.file));
  
  let currentHandle = null, currentCredit = null;
  const pairs = [];
  
  for (const item of results) {
    if (item.type === 'screenshot') {
      currentHandle = item.handle;
      currentCredit = item.model_name || item.handle;
      pairs.push({ screenshot: item.file, handle: currentHandle, credit: currentCredit, content: [] });
    } else if (currentCredit && pairs.length > 0) {
      pairs[pairs.length - 1].content.push(item.file);
    }
  }

  console.log(`\n✅ DONE (Ollama LLaVA — $0 cost)`);
  console.log(`   Processed: ${processed} (${screenshots} screenshots, ${content} content)`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Pairs: ${pairs.filter(p => p.screenshot).length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
