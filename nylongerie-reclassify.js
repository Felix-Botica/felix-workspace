#!/usr/bin/env node
/**
 * Nylongerie Re-Classification (Overnight Run)
 * 
 * Phase 1: Extract handles from screenshots (CRITICAL)
 * Phase 2: Classify content images (simplified)
 * Phase 3: Match content → screenshots
 * 
 * Usage: node nylongerie-reclassify.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const INBOX_DIR = path.join(process.env.HOME, 'Desktop', 'nylongerie-content', 'inbox');
const OUTPUT_FILE = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'classify-results-v2.json');
const LOG_FILE = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'reclassify.log');

// Ollama config
const OLLAMA_MODEL = 'llava:7b';
const OLLAMA_URL = 'http://localhost:11434/api/generate';

let results = [];
let errors = 0;

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

function callOllama(imagePath, prompt) {
  const imageBase64 = fs.readFileSync(imagePath, 'base64');
  
  const payload = JSON.stringify({
    model: OLLAMA_MODEL,
    prompt: prompt,
    images: [imageBase64],
    stream: false,
    options: {
      temperature: 0.1  // Low temperature for consistent extraction
    }
  });
  
  try {
    const result = execSync(`curl -s -X POST ${OLLAMA_URL} -d '${payload.replace(/'/g, "'\\''")}'`, {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 60000
    });
    const response = JSON.parse(result.toString());
    return response.response.trim();
  } catch (error) {
    log(`ERROR calling Ollama: ${error.message}`);
    return null;
  }
}

function extractHandle(imagePath) {
  const prompt = `This is an Instagram screenshot. Extract the Instagram handle visible in the image. The handle starts with @ and appears near the top or as a username tag. 

CRITICAL RULES:
- Only report handles you can CLEARLY see
- If uncertain or blurry, respond with: UNKNOWN
- Do not guess or invent handles
- Format: just the handle (e.g., @username)
- If you see multiple handles, pick the main profile handle (usually top-left or largest)

What is the Instagram handle?`;

  const response = callOllama(imagePath, prompt);
  if (!response) return 'ERROR';
  
  // Extract @handle from response
  const match = response.match(/@[a-z0-9_.]+/i);
  if (match) return match[0].toLowerCase();
  
  if (response.toUpperCase().includes('UNKNOWN') || response.includes('cannot') || response.includes('unclear')) {
    return 'UNKNOWN';
  }
  
  return 'UNKNOWN';
}

function classifyContent(imagePath) {
  const prompt = `Classify this image for Instagram fashion posting.

1. TYPE: Is this a screenshot (has Instagram UI visible) or clean content (just the photo)?
   Answer: screenshot OR content

2. STYLE: What style category?
   - black-nylon: Black nylons/stockings/tights only (for @blackshinynylon)
   - housewife: Casual, relatable, everyday, girl-next-door (for @nextdoornylon)
   - elegant: Sophisticated, classy, high-fashion (for @legfashion)
   - sexy: Glamorous, sultry, provocative (for other accounts)

3. SEX APPEAL: Rate 1-10 (7-8 is ideal for posting)

4. DESCRIPTION: One sentence describing the image.

Format your response as:
TYPE: [screenshot/content]
STYLE: [black-nylon/housewife/elegant/sexy]
APPEAL: [1-10]
DESC: [one sentence]`;

  const response = callOllama(imagePath, prompt);
  if (!response) return null;
  
  // Parse response
  const typeMatch = response.match(/TYPE:\s*(screenshot|content)/i);
  const styleMatch = response.match(/STYLE:\s*(black-nylon|housewife|elegant|sexy)/i);
  const appealMatch = response.match(/APPEAL:\s*(\d+)/i);
  const descMatch = response.match(/DESC:\s*(.+?)(?:\n|$)/i);
  
  return {
    type: typeMatch ? typeMatch[1].toLowerCase() : 'unknown',
    style: styleMatch ? styleMatch[1].toLowerCase() : 'sexy',
    sex_appeal: appealMatch ? parseInt(appealMatch[1]) : 5,
    description: descMatch ? descMatch[1].trim() : ''
  };
}

async function main() {
  log('🚀 Starting Re-Classification (Overnight Run)');
  log(`Model: ${OLLAMA_MODEL}`);
  log(`Inbox: ${INBOX_DIR}`);
  
  // Get all JPG files
  const allFiles = fs.readdirSync(INBOX_DIR)
    .filter(f => f.toLowerCase().endsWith('.jpg'))
    .sort();
  
  log(`Found ${allFiles.length} JPG images`);
  
  // Separate screenshots from content (rough heuristic by filename)
  const screenshots = allFiles.filter(f => /^(IMG_\d{4}|Screenshot|Image \d)/.test(f));
  const contentFiles = allFiles.filter(f => !screenshots.includes(f));
  
  log(`Estimated screenshots: ${screenshots.length}`);
  log(`Estimated content: ${contentFiles.length}`);
  
  // Phase 1: Extract handles from screenshots
  log('\n📸 PHASE 1: Extracting handles from screenshots...');
  const handleMap = {};
  
  for (let i = 0; i < screenshots.length; i++) {
    const file = screenshots[i];
    const filePath = path.join(INBOX_DIR, file);
    
    if (i % 10 === 0) {
      log(`Screenshot ${i+1}/${screenshots.length}: ${file}`);
    }
    
    const handle = extractHandle(filePath);
    handleMap[file] = handle;
    
    if (handle !== 'UNKNOWN' && handle !== 'ERROR') {
      log(`  ✅ ${file} → ${handle}`);
    }
    
    // Save progress every 50 screenshots
    if (i % 50 === 0 && i > 0) {
      fs.writeFileSync(
        path.join(process.env.HOME, '.openclaw', 'nylongerie', 'handle-map.json'),
        JSON.stringify(handleMap, null, 2)
      );
    }
  }
  
  log(`\n✅ Phase 1 complete: ${Object.values(handleMap).filter(h => h !== 'UNKNOWN' && h !== 'ERROR').length} handles extracted`);
  
  // Save handle map
  fs.writeFileSync(
    path.join(process.env.HOME, '.openclaw', 'nylongerie', 'handle-map.json'),
    JSON.stringify(handleMap, null, 2)
  );
  
  // Phase 2: Classify all images
  log('\n🎨 PHASE 2: Classifying all images...');
  
  for (let i = 0; i < allFiles.length; i++) {
    const file = allFiles[i];
    const filePath = path.join(INBOX_DIR, file);
    
    if (i % 25 === 0) {
      log(`Classifying ${i+1}/${allFiles.length}: ${file}`);
    }
    
    const classification = classifyContent(filePath);
    
    if (!classification) {
      errors++;
      log(`  ❌ ERROR: ${file}`);
      continue;
    }
    
    // If this is a screenshot, add the extracted handle
    if (classification.type === 'screenshot' && handleMap[file]) {
      classification.handle = handleMap[file];
    }
    
    results.push({
      file: file,
      ...classification,
      _model: OLLAMA_MODEL
    });
    
    // Save progress every 100 images
    if (i % 100 === 0 && i > 0) {
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
      log(`  💾 Progress saved: ${results.length} classified, ${errors} errors`);
    }
  }
  
  // Phase 3: Match content to screenshots
  log('\n🔗 PHASE 3: Matching content to screenshots...');
  
  for (const item of results) {
    if (item.type !== 'content') continue;
    
    // Try to find matching screenshot by filename proximity
    // E.g., IMG_0045.jpg (content) matches IMG_0044.jpg (screenshot)
    const match = item.file.match(/IMG_(\d+)\.jpg/);
    if (!match) continue;
    
    const num = parseInt(match[1]);
    
    // Look for screenshots within ±5 of this number
    for (let offset = -5; offset <= 5; offset++) {
      const screenshotName = `IMG_${String(num + offset).padStart(4, '0')}.jpg`;
      if (handleMap[screenshotName] && handleMap[screenshotName] !== 'UNKNOWN' && handleMap[screenshotName] !== 'ERROR') {
        item.model = handleMap[screenshotName];
        break;
      }
    }
  }
  
  const withModels = results.filter(r => r.type === 'content' && r.model).length;
  log(`✅ Matched ${withModels} content images to model handles`);
  
  // Final save
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
  log(`\n✅ Classification complete!`);
  log(`Total: ${results.length} images`);
  log(`Content: ${results.filter(r => r.type === 'content').length}`);
  log(`Screenshots: ${results.filter(r => r.type === 'screenshot').length}`);
  log(`With model credits: ${withModels}`);
  log(`Errors: ${errors}`);
  log(`\nOutput: ${OUTPUT_FILE}`);
}

main().catch(err => {
  log(`FATAL ERROR: ${err.message}`);
  log(err.stack);
  process.exit(1);
});
