#!/usr/bin/env node
/**
 * nylongerie-reclassify-batched.js
 * 
 * Same as nylongerie-reclassify.js but processes in batches of 100 screenshots.
 * Saves progress after each batch so crashes don't lose work.
 * 
 * Usage: node nylongerie-reclassify-batched.js [--batch-size 100] [--resume]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const INBOX = path.join(process.env.HOME, 'Desktop/nylongerie-content/inbox');
const OUTPUT_DIR = path.join(process.env.HOME, '.openclaw/nylongerie');
const HANDLE_MAP_PATH = path.join(OUTPUT_DIR, 'handle-map.json');
const CLASSIFY_RESULTS_PATH = path.join(OUTPUT_DIR, 'classify-results-v2.json');
const LOG_PATH = path.join(OUTPUT_DIR, 'reclassify-batched.log');
const PROGRESS_PATH = path.join(OUTPUT_DIR, 'batch-progress.json');

const BATCH_SIZE = parseInt(process.argv.find(a => a.startsWith('--batch-size='))?.split('=')[1]) || 100;
const RESUME = process.argv.includes('--resume');

const MODEL = 'llava:7b';
const OLLAMA_TIMEOUT = 30000;

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}\n`;
  fs.appendFileSync(LOG_PATH, line);
  console.log(msg);
}

function callOllama(prompt, imagePath) {
  try {
    const cmd = `ollama run ${MODEL} "${prompt}" --image "${imagePath}"`;
    const result = execSync(cmd, { 
      encoding: 'utf8', 
      timeout: OLLAMA_TIMEOUT,
      stdio: ['pipe', 'pipe', 'ignore']
    });
    return result.trim();
  } catch (err) {
    if (err.killed) return 'ERROR';
    log(`  ⚠️  Ollama error: ${err.message}`);
    return 'ERROR';
  }
}

function extractHandle(imagePath) {
  const prompt = `This is a screenshot of an Instagram post. Extract the EXACT Instagram handle of the person who posted this.

CRITICAL: Only return real, visible handles. If you cannot CLEARLY see a handle in the image, respond with UNKNOWN.

Rules:
- Return ONLY the handle (e.g., @username)
- Do NOT guess or invent handles
- Do NOT return placeholder text like @username, @person, @persona_name, @real_person_name
- If the handle is not clearly visible, return UNKNOWN
- Do NOT add any explanation or commentary

Handle:`;

  const response = callOllama(prompt, imagePath);
  
  if (!response || response === 'ERROR') return 'ERROR';
  
  const cleaned = response.split('\n')[0].trim();
  if (!cleaned || cleaned.length < 2) return 'UNKNOWN';
  
  return cleaned.startsWith('@') ? cleaned : `@${cleaned}`;
}

function classifyImage(imagePath) {
  const prompt = `Analyze this image and provide a classification in this exact format:

style: [black-nylon OR housewife OR elegant OR sexy]
sex_appeal: [1-10]

Guidelines:
- black-nylon: Black nylon/pantyhose focused content
- housewife: Domestic/casual setting, relatable aesthetic
- elegant: High fashion, sophisticated, classy
- sexy: Glamorous, provocative, attention-grabbing

sex_appeal scale:
1-3: Modest, conservative
4-6: Moderately attractive, tasteful
7-8: Highly attractive, Instagram-worthy (TARGET RANGE)
9-10: Extremely provocative

Respond with ONLY the two lines above, no extra text.`;

  const response = callOllama(prompt, imagePath);
  
  if (!response || response === 'ERROR') {
    return { style: 'unknown', sex_appeal: 0 };
  }
  
  const lines = response.split('\n').filter(l => l.trim());
  const styleMatch = lines.find(l => l.startsWith('style:'));
  const appealMatch = lines.find(l => l.startsWith('sex_appeal:'));
  
  const style = styleMatch ? styleMatch.split(':')[1].trim().toLowerCase() : 'unknown';
  const sex_appeal = appealMatch ? parseInt(appealMatch.split(':')[1].trim()) : 0;
  
  return { style, sex_appeal };
}

async function processBatch(screenshots, batchNumber, totalBatches) {
  log(`\n📦 BATCH ${batchNumber}/${totalBatches} (${screenshots.length} screenshots)`);
  
  const handleMap = fs.existsSync(HANDLE_MAP_PATH) 
    ? JSON.parse(fs.readFileSync(HANDLE_MAP_PATH, 'utf8')) 
    : {};
  
  for (let i = 0; i < screenshots.length; i++) {
    const screenshot = screenshots[i];
    const screenshotPath = path.join(INBOX, screenshot);
    
    if ((i + 1) % 10 === 0) {
      log(`  Progress: ${i + 1}/${screenshots.length} in batch`);
    }
    
    const handle = extractHandle(screenshotPath);
    handleMap[screenshot] = handle;
    log(`  ✅ ${screenshot} → ${handle}`);
  }
  
  // Save after each batch
  fs.writeFileSync(HANDLE_MAP_PATH, JSON.stringify(handleMap, null, 2));
  log(`✅ Batch ${batchNumber} complete. handle-map.json updated.`);
  
  // Update progress tracker
  const progress = {
    lastCompletedBatch: batchNumber,
    totalBatches,
    timestamp: new Date().toISOString()
  };
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));
}

async function main() {
  log('🚀 Starting Batched Re-Classification');
  log(`Batch size: ${BATCH_SIZE}`);
  log(`Resume mode: ${RESUME}`);
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Get all images
  const allImages = fs.readdirSync(INBOX).filter(f => f.toLowerCase().endsWith('.jpg'));
  const screenshots = allImages.filter(f => f.startsWith('IMG_'));
  const contentImages = allImages.filter(f => !f.startsWith('IMG_'));
  
  log(`Found ${allImages.length} total images`);
  log(`Screenshots: ${screenshots.length}`);
  log(`Content images: ${contentImages.length}`);
  
  // Check for resume
  let startBatch = 1;
  if (RESUME && fs.existsSync(PROGRESS_PATH)) {
    const progress = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
    startBatch = progress.lastCompletedBatch + 1;
    log(`📍 Resuming from batch ${startBatch}`);
  }
  
  // Split into batches
  const batches = [];
  for (let i = 0; i < screenshots.length; i += BATCH_SIZE) {
    batches.push(screenshots.slice(i, i + BATCH_SIZE));
  }
  
  log(`📦 Total batches: ${batches.length}`);
  
  // Process batches starting from resume point
  for (let i = startBatch - 1; i < batches.length; i++) {
    await processBatch(batches[i], i + 1, batches.length);
    
    // Small delay between batches to let Ollama breathe
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  log('\n✅ PHASE 1 COMPLETE: All screenshots processed');
  log(`📁 handle-map.json ready at: ${HANDLE_MAP_PATH}`);
  
  // PHASE 2: Classify content images
  log('\n📸 PHASE 2: Classifying content images...');
  
  const classifications = {};
  for (let i = 0; i < contentImages.length; i++) {
    const image = contentImages[i];
    const imagePath = path.join(INBOX, image);
    
    if ((i + 1) % 10 === 0 || i === 0) {
      log(`Content image ${i + 1}/${contentImages.length}: ${image}`);
    }
    
    const classification = classifyImage(imagePath);
    classifications[image] = {
      filename: image,
      ...classification,
      path: imagePath
    };
  }
  
  // PHASE 3: Match content to screenshots
  log('\n🔗 PHASE 3: Matching content images to screenshots...');
  
  const handleMap = JSON.parse(fs.readFileSync(HANDLE_MAP_PATH, 'utf8'));
  const results = [];
  
  for (const [contentFile, data] of Object.entries(classifications)) {
    const baseNum = contentFile.replace(/[^0-9]/g, '');
    
    // Find matching screenshot
    let model = null;
    for (const [screenshot, handle] of Object.entries(handleMap)) {
      const screenshotNum = screenshot.replace(/[^0-9]/g, '');
      if (screenshotNum === baseNum && handle !== 'UNKNOWN' && handle !== 'ERROR') {
        model = handle;
        break;
      }
    }
    
    results.push({
      ...data,
      model,
      source_screenshot: model ? `IMG_${baseNum}.jpg` : null
    });
  }
  
  // Save final results
  fs.writeFileSync(CLASSIFY_RESULTS_PATH, JSON.stringify(results, null, 2));
  
  log('\n✅ ALL PHASES COMPLETE');
  log(`📊 Classifications: ${results.length} images`);
  log(`✅ With credits: ${results.filter(r => r.model).length}`);
  log(`📁 Results: ${CLASSIFY_RESULTS_PATH}`);
  
  // Cleanup progress tracker
  if (fs.existsSync(PROGRESS_PATH)) {
    fs.unlinkSync(PROGRESS_PATH);
  }
}

main().catch(err => {
  log(`💥 Fatal error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
