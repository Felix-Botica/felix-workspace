#!/usr/bin/env node
/**
 * Nylongerie Image Classifier
 * 
 * Processes inbox images:
 * 1. Resize with sips (macOS native)
 * 2. Classify as screenshot vs content via vision API
 * 3. Extract @handle from screenshots
 * 4. Pair screenshots with following content images
 * 5. Update queue.json with credits and status
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const INBOX = path.join(process.env.HOME, 'Desktop', 'nylongerie-content', 'inbox');
const QUEUE_FILE = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'queue.json');
const TEMP_DIR = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'temp');
const RESULTS_FILE = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'classify-results.json');

// How many to process
const BATCH_SIZE = parseInt(process.argv[2]) || 100;
const START_FROM = parseInt(process.argv[3]) || 0;

function loadQueue() {
  return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
}

function saveQueue(queue) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

function resizeImage(inputPath, outputPath) {
  try {
    execSync(`sips -Z 800 "${inputPath}" --out "${outputPath}" 2>/dev/null`);
    return true;
  } catch (e) {
    return false;
  }
}

async function classifyWithVision(imagePath) {
  // Read image as base64
  const imageData = fs.readFileSync(imagePath);
  const base64 = imageData.toString('base64');
  
  // Use Anthropic API directly for vision
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set');
    process.exit(1);
  }

  const body = JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: base64 }
        },
        {
          type: 'text',
          text: `Classify this image. Reply ONLY with JSON, no other text:
{
  "type": "screenshot" or "content",
  "handle": "@handle if visible, else null",
  "model_name": "name if visible, else null",
  "style": "one of: editorial, elegant, casual, shiny-glossy, legs-focus, lifestyle, product, other",
  "description": "one sentence max"
}

Rules:
- "screenshot" = Instagram UI visible (likes, comments, profile header, navigation bars)
- "content" = clean photo/image with no Instagram UI
- Extract @handle and name from screenshots if visible
- For content photos, assess the style/aesthetic`
        }
      ]
    }]
  });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body
  });

  const result = await response.json();
  if (result.error) {
    throw new Error(result.error.message);
  }

  const text = result.content?.[0]?.text || '';
  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error('No JSON in response: ' + text);
}

async function main() {
  // Ensure temp dir exists
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

  // Get sorted JPG files (IMG_ files sort chronologically)
  const allFiles = fs.readdirSync(INBOX)
    .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
    .sort();

  const batch = allFiles.slice(START_FROM, START_FROM + BATCH_SIZE);
  console.log(`Processing ${batch.length} images (${START_FROM} to ${START_FROM + batch.length - 1} of ${allFiles.length} total)`);

  // Load existing results if any
  let results = [];
  if (fs.existsSync(RESULTS_FILE)) {
    results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
  }
  const processedFiles = new Set(results.map(r => r.file));

  let processed = 0;
  let screenshots = 0;
  let content = 0;
  let errors = 0;

  for (const file of batch) {
    if (processedFiles.has(file)) {
      console.log(`  SKIP ${file} (already processed)`);
      continue;
    }

    const inputPath = path.join(INBOX, file);
    const tempPath = path.join(TEMP_DIR, file);

    // Resize
    if (!resizeImage(inputPath, tempPath)) {
      console.log(`  ERROR resizing ${file}`);
      errors++;
      continue;
    }

    // Classify
    try {
      const classification = await classifyWithVision(tempPath);
      classification.file = file;
      results.push(classification);

      if (classification.type === 'screenshot') {
        screenshots++;
        console.log(`  📱 SCREENSHOT: ${file} → ${classification.handle || 'no handle'} (${classification.model_name || 'no name'})`);
      } else {
        content++;
        console.log(`  📷 CONTENT: ${file} → style: ${classification.style} — ${classification.description}`);
      }

      processed++;

      // Save progress every 10 images
      if (processed % 10 === 0) {
        fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
        console.log(`  --- Saved progress: ${processed} processed ---`);
      }

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));

    } catch (e) {
      console.log(`  ERROR classifying ${file}: ${e.message}`);
      errors++;
    }
  }

  // Final save
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));

  // Now pair screenshots with content
  console.log('\n--- Pairing screenshots with content ---\n');

  let currentCredit = null;
  let currentHandle = null;
  const pairs = [];

  // Sort results by filename to maintain chronological order
  results.sort((a, b) => a.file.localeCompare(b.file));

  for (const item of results) {
    if (item.type === 'screenshot') {
      currentHandle = item.handle;
      currentCredit = item.model_name || item.handle;
      pairs.push({ screenshot: item.file, handle: currentHandle, credit: currentCredit, content: [] });
    } else if (currentCredit && pairs.length > 0) {
      pairs[pairs.length - 1].content.push(item.file);
    } else {
      // Content without a preceding screenshot
      pairs.push({ screenshot: null, handle: null, credit: null, content: [item.file] });
    }
  }

  // Update queue.json
  const queue = loadQueue();
  let updated = 0;

  for (const pair of pairs) {
    // Mark screenshot as reference
    if (pair.screenshot) {
      const screenshotPost = queue.posts.find(p => p.originalFile === pair.screenshot);
      if (screenshotPost) {
        screenshotPost.status = 'reference';
        screenshotPost.credit = pair.credit;
        screenshotPost.updatedAt = new Date().toISOString();
        updated++;
      }
    }

    // Set credit on content posts
    for (const contentFile of pair.content) {
      const contentPost = queue.posts.find(p => p.originalFile === contentFile);
      if (contentPost && pair.credit) {
        contentPost.credit = pair.credit;
        contentPost.updatedAt = new Date().toISOString();
        
        // Also assign account based on style
        const result = results.find(r => r.file === contentFile);
        if (result) {
          switch (result.style) {
            case 'editorial':
              contentPost.account = 'nylondarling';
              break;
            case 'elegant':
              contentPost.account = 'nyloncherie';
              break;
            case 'shiny-glossy':
              contentPost.account = 'shinynylonstar';
              break;
            case 'legs-focus':
              contentPost.account = 'legfashion';
              break;
            case 'product':
              contentPost.account = 'nylongerie';
              break;
            default:
              // Assign to account with fewest posts
              const counts = {};
              for (const acc of ['nylondarling', 'nyloncherie', 'legfashion', 'shinynylonstar']) {
                counts[acc] = queue.posts.filter(p => p.account === acc && p.status !== 'reference').length;
              }
              contentPost.account = Object.entries(counts).sort((a, b) => a[1] - b[1])[0][0];
          }
        }
        updated++;
      }
    }
  }

  saveQueue(queue);

  console.log(`\n✅ DONE`);
  console.log(`   Processed: ${processed} (${screenshots} screenshots, ${content} content)`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Queue updated: ${updated} posts`);
  console.log(`   Pairs found: ${pairs.filter(p => p.screenshot).length}`);
  console.log(`   Unpaired content: ${pairs.filter(p => !p.screenshot).length}`);
}

main().catch(e => { console.error(e); process.exit(1); });
