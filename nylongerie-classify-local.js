#!/usr/bin/env node
/**
 * Nylongerie Image Classifier — LOCAL (Ollama LLaVA)
 *
 * Input: series-map.json (handle + image grouping already done)
 * LLaVA classifies ONLY: style, nylon_color, sex_appeal, description
 * Handle comes from series-map — not guessed by LLaVA.
 *
 * Usage:
 *   node nylongerie-classify-local.js [batch_size]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONTENT_DIR = path.join(process.env.HOME, '.openclaw', 'nylongerie');
const INBOX = path.join(CONTENT_DIR, 'inbox');
const SERIES_MAP = path.join(CONTENT_DIR, 'series-map.json');
const TEMP_DIR = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'temp');
const RESULTS_FILE = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'classify-results.json');

const BATCH_SIZE = parseInt(process.argv[2]) || 100;

function resizeImage(inputPath, outputPath) {
  try {
    execSync(`sips -Z 800 "${inputPath}" --out "${outputPath}" 2>/dev/null`);
    return true;
  } catch (e) { return false; }
}

async function classifyWithOllama(imagePath) {
  const imageData = fs.readFileSync(imagePath);
  const base64 = imageData.toString('base64');

  const prompt = `Classify this fashion/nylon image. Reply ONLY with valid JSON:

{
  "style": "one of the categories below",
  "nylon_color": "black, tan, white, other, or null",
  "description": "one short sentence describing the image",
  "sex_appeal": 1-10
}

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
- null if no nylons visible or unclear`;

  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      model: 'llava:latest',
      prompt,
      images: [base64],
      stream: false
    })
  });

  const result = await response.json();
  const text = result.response || '';

  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.style) parsed.style = 'other';
      if (!parsed.sex_appeal) parsed.sex_appeal = 5;
      if (parsed.nylon_color === 'null') parsed.nylon_color = null;
      return parsed;
    } catch (e) {
      console.error(`  JSON parse failed: ${e.message}`);
    }
  }

  // Fallback
  return {
    style: 'other',
    nylon_color: null,
    description: text.slice(0, 100).trim(),
    sex_appeal: 5,
    _raw_fallback: true
  };
}

async function main() {
  if (!fs.existsSync(SERIES_MAP)) {
    console.error(`ERROR: ${SERIES_MAP} not found. Run build-series-map.py first.`);
    process.exit(1);
  }

  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

  // Load series-map → flat list of content images with handle
  const seriesMap = JSON.parse(fs.readFileSync(SERIES_MAP, 'utf-8'));
  const contentImages = [];
  for (const group of seriesMap) {
    if (!group.images || group.images.length === 0) continue;
    for (const img of group.images) {
      contentImages.push({ filename: img, handle: group.handle });
    }
  }

  // Resume: load existing results
  let results = [];
  if (fs.existsSync(RESULTS_FILE)) {
    results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
  }
  const processedFiles = new Set(results.map(r => r.filename));

  // Filter to unprocessed, apply batch limit
  const todo = contentImages.filter(img => !processedFiles.has(img.filename));
  const batch = todo.slice(0, BATCH_SIZE);

  console.log(`\nInput: series-map.json (${seriesMap.length} groups, ${contentImages.length} content images)`);
  console.log(`Already classified: ${processedFiles.size}`);
  console.log(`Batch: ${batch.length} of ${todo.length} remaining`);
  console.log(`Using: Ollama LLaVA (localhost:11434)\n`);

  if (batch.length === 0) {
    console.log('Nothing to classify — all images already processed.');
    return;
  }

  let stats = { processed: 0, errors: 0, blackNylon: 0 };

  for (const { filename, handle } of batch) {
    const inputPath = path.join(INBOX, filename);
    const tempPath = path.join(TEMP_DIR, filename);

    if (!fs.existsSync(inputPath)) {
      console.log(`  SKIP: ${filename} (not in inbox)`);
      continue;
    }

    if (!resizeImage(inputPath, tempPath)) {
      console.log(`  ERROR: Cannot resize ${filename}`);
      stats.errors++;
      continue;
    }

    try {
      const classification = await classifyWithOllama(tempPath);

      // Build result: handle from series-map, visual props from LLaVA
      const entry = {
        filename,
        file: filename,
        type: 'content',
        handle,
        style: classification.style,
        nylon_color: classification.nylon_color || null,
        description: classification.description || '',
        sex_appeal: classification.sex_appeal,
        _model: 'llava:latest',
        _classified_at: new Date().toISOString()
      };
      if (classification._raw_fallback) entry._raw_fallback = true;

      results.push(entry);

      const colorStr = entry.nylon_color ? ` | ${entry.nylon_color}` : '';
      console.log(`  ${filename}`);
      console.log(`     ${handle} | ${entry.style}${colorStr} | appeal:${entry.sex_appeal}`);

      if (entry.style === 'black-nylon' || entry.nylon_color === 'black') stats.blackNylon++;
      stats.processed++;

      // Save every 10
      if (stats.processed % 10 === 0) {
        fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
        console.log(`\n  Saved: ${stats.processed} done\n`);
      }

    } catch (e) {
      console.log(`  ERROR ${filename}: ${e.message}`);
      stats.errors++;
    }
  }

  // Final save
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));

  console.log(`\nCLASSIFICATION COMPLETE`);
  console.log(`  Processed: ${stats.processed}`);
  console.log(`  Black nylon: ${stats.blackNylon}`);
  console.log(`  Errors: ${stats.errors}`);
  console.log(`  Total in results: ${results.length}`);
  console.log(`  Remaining: ${todo.length - batch.length}`);
  console.log(`\nResults: ${RESULTS_FILE}`);
}

main().catch(e => { console.error(e); process.exit(1); });
