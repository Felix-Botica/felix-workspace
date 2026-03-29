#!/usr/bin/env node
/**
 * Nylongerie Image Classifier — LOCAL (Ollama LLaVA)
 * 
 * NEW: Color detection (black nylons), better style categories, handle extraction.
 * 
 * Usage:
 *   node nylongerie-classify-local.js [batch_size] [start_from]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const INBOX = path.join(process.env.HOME, 'Desktop', 'nylongerie-content', 'inbox');
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

  const prompt = `Classify this fashion image. Reply ONLY with valid JSON:

{
  "type": "screenshot or content",
  "handle": "@username or null",
  "model_name": "visible name or null",
  "style": "see list below",
  "nylon_color": "black, tan, white, other, or null",
  "description": "one short sentence",
  "sex_appeal": 1-10
}

TYPE:
- "screenshot" if Instagram UI visible (likes/comments/profile/navigation/status bar)
- "content" if clean photo without UI elements

HANDLE extraction (CRITICAL):
- Look for @username in image text (profile name, captions, overlays)
- Format as "@username" (include @)
- If no @ visible but a username is clear, use "@username"
- If truly uncertain, use null

STYLE categories (pick ONE):
- "black-nylon" — BLACK hosiery/tights/stockings clearly visible (main focus)
- "housewife" — domestic setting, apron, kitchen, casual home wear
- "girl-next-door" — casual, friendly, approachable vibe (not high fashion)
- "editorial" — professional fashion shoot, studio lighting
- "elegant" — classy, sophisticated, formal wear
- "shiny-glossy" — shiny/satin/latex/wet-look materials prominent
- "legs-focus" — legs are main subject, often close-up
- "lifestyle" — casual everyday scenes, outdoors, natural poses
- "product" — product showcase, clean background
- "other" — none of the above

NYLON_COLOR (if visible):
- "black" if dark/opaque black nylons
- "tan" if nude/beige/natural tone
- "white" if white/light
- "other" if colored (red, patterned, etc)
- null if no nylons visible or unclear

Be precise with handles — this is used for copyright attribution.`;

  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      model: 'llava:7b',
      prompt,
      images: [base64],
      stream: false
    })
  });

  const result = await response.json();
  const text = result.response || '';
  
  // Extract JSON
  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      // Validate required fields
      if (!parsed.type) parsed.type = 'content';
      if (!parsed.style) parsed.style = 'other';
      if (!parsed.sex_appeal) parsed.sex_appeal = 5;
      // Clean handle
      if (parsed.handle && parsed.handle !== 'null') {
        parsed.handle = parsed.handle.trim();
        if (!parsed.handle.startsWith('@')) parsed.handle = '@' + parsed.handle;
      } else {
        parsed.handle = null;
      }
      return parsed;
    } catch (e) {
      console.error(`  JSON parse failed: ${e.message}`);
    }
  }
  
  // Fallback: basic text analysis
  const isScreenshot = /screenshot|instagram ui|navigation|status bar|profile header/i.test(text);
  const handleMatch = text.match(/@[\w.]+/);
  
  return {
    type: isScreenshot ? 'screenshot' : 'content',
    handle: handleMatch ? handleMatch[0] : null,
    model_name: null,
    style: 'other',
    nylon_color: null,
    description: text.slice(0, 100).trim(),
    sex_appeal: 5,
    _raw_fallback: true
  };
}

async function main() {
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

  const allFiles = fs.readdirSync(INBOX)
    .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
    .sort();

  const batch = allFiles.slice(START_FROM, START_FROM + BATCH_SIZE);
  console.log(`\n🔍 Classifying ${batch.length} images (${START_FROM} to ${START_FROM + batch.length - 1} of ${allFiles.length})`);
  console.log(`Using: Ollama LLaVA 7B (localhost:11434)\n`);

  let results = [];
  if (fs.existsSync(RESULTS_FILE)) {
    results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
  }
  const processedFiles = new Set(results.map(r => r.filename));

  let stats = { processed: 0, screenshots: 0, content: 0, errors: 0, handles: 0, blackNylon: 0 };

  for (const file of batch) {
    if (processedFiles.has(file)) {
      console.log(`  ⏭️  SKIP: ${file} (already processed)`);
      continue;
    }

    const inputPath = path.join(INBOX, file);
    const tempPath = path.join(TEMP_DIR, file);

    if (!resizeImage(inputPath, tempPath)) {
      console.log(`  ❌ ERROR: Cannot resize ${file}`);
      stats.errors++;
      continue;
    }

    try {
      const classification = await classifyWithOllama(tempPath);
      classification.filename = file; // CRITICAL: always store filename
      classification.file = file; // Alias for backward compat
      classification._model = 'llava:7b';
      classification._classified_at = new Date().toISOString();
      
      results.push(classification);

      // Log results
      const icon = classification.type === 'screenshot' ? '📱' : '📷';
      const handleStr = classification.handle || '(no handle)';
      const colorStr = classification.nylon_color ? ` | ${classification.nylon_color}` : '';
      
      console.log(`  ${icon} ${file}`);
      console.log(`     → ${classification.style}${colorStr} | ${handleStr} | appeal:${classification.sex_appeal}`);

      if (classification.type === 'screenshot') stats.screenshots++;
      else stats.content++;
      
      if (classification.handle && classification.handle !== 'null') stats.handles++;
      if (classification.style === 'black-nylon' || classification.nylon_color === 'black') stats.blackNylon++;

      stats.processed++;

      // Save every 10 items
      if (stats.processed % 10 === 0) {
        fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
        console.log(`\n  💾 Saved: ${stats.processed} done\n`);
      }

    } catch (e) {
      console.log(`  ❌ ERROR ${file}: ${e.message}`);
      stats.errors++;
    }
  }

  // Final save
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));

  console.log(`\n✅ CLASSIFICATION COMPLETE`);
  console.log(`   Total processed: ${stats.processed}`);
  console.log(`   Screenshots: ${stats.screenshots} | Content: ${stats.content}`);
  console.log(`   With handles: ${stats.handles}`);
  console.log(`   Black nylon candidates: ${stats.blackNylon}`);
  console.log(`   Errors: ${stats.errors}`);
  console.log(`\n📂 Results: ${RESULTS_FILE}`);
  console.log(`\n⚡ Next: Run series-link.js to pair screenshots with content\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
