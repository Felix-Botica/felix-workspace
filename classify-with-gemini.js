#!/usr/bin/env node
/**
 * classify-with-gemini.js
 * 
 * Klassifiziert Bilder als "screenshot" oder "clean_image" mit Gemini 2.0 Flash
 * Paart clean_images mit ihrem vorherigen Screenshot
 * Extrahiert Instagram-Handles aus Screenshots
 */

const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: path.join(process.env.HOME, '.openclaw', '.env'), override: true });

const INBOX = path.join(process.env.HOME, 'Desktop/nylongerie-content/inbox');
const OUTPUT = path.join(process.env.HOME, 'Desktop/nylongerie-content/handle-map.json');
const LOG = path.join(process.env.HOME, 'Desktop/nylongerie-content/gemini-classify.log');

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(LOG, line);
  console.log(msg);
}

async function classifyImage(imagePath) {
  const imageData = fs.readFileSync(imagePath);
  const base64 = imageData.toString('base64');
  
  const prompt = `Analyze this image and respond with ONLY ONE WORD:

- "screenshot" if you see Instagram UI elements (like/comment buttons, profile info, share icon, Instagram interface)
- "clean_image" if it's a clean photo without UI elements
- "unclear" if you cannot determine with confidence

Answer with ONE WORD ONLY:`;

  try {
    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64
        }
      }
    ]);
    
    const text = result.response.text().trim().toLowerCase();
    
    if (text.includes('screenshot')) return 'screenshot';
    if (text.includes('clean_image') || text.includes('clean')) return 'clean_image';
    return 'unclear';
    
  } catch (err) {
    log(`  ⚠️  Gemini error: ${err.message}`);
    return 'error';
  }
}

async function extractHandle(imagePath) {
  const imageData = fs.readFileSync(imagePath);
  const base64 = imageData.toString('base64');
  
  const prompt = `This is an Instagram screenshot. Extract the EXACT Instagram handle of the account/post shown.

CRITICAL RULES:
- Return ONLY the handle (e.g., @username)
- If you cannot CLEARLY see a handle, respond with UNKNOWN
- Do NOT guess or invent handles
- Do NOT return placeholder text like @username, @person, @model

Handle:`;

  try {
    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64
        }
      }
    ]);
    
    const text = result.response.text().trim();
    const lines = text.split('\n');
    const handle = lines[0].trim();
    
    if (!handle || handle.length < 2) return 'UNKNOWN';
    
    // Clean up
    const cleaned = handle.startsWith('@') ? handle : `@${handle}`;
    
    // Reject obvious placeholders
    const suspicious = ['@username', '@person', '@model', '@unknown', '@user', '@name'];
    if (suspicious.includes(cleaned.toLowerCase())) return 'UNKNOWN';
    
    return cleaned;
    
  } catch (err) {
    log(`  ⚠️  Handle extraction error: ${err.message}`);
    return 'ERROR';
  }
}

async function main() {
  log('🚀 Starting Gemini classification...');
  
  // Get all JPG files sorted by name
  const allFiles = fs.readdirSync(INBOX)
    .filter(f => f.toLowerCase().endsWith('.jpg'))
    .sort();
  
  log(`📁 Found ${allFiles.length} JPG files`);
  
  const classified = [];
  
  // Step 1: Classify all images
  log('\n📸 PHASE 1: Classifying images...');
  
  for (let i = 0; i < allFiles.length; i++) {
    const file = allFiles[i];
    const filePath = path.join(INBOX, file);
    
    if ((i + 1) % 10 === 0) {
      log(`Progress: ${i + 1}/${allFiles.length}`);
    }
    
    const type = await classifyImage(filePath);
    classified.push({ file, type });
    
    log(`  ${file} → ${type}`);
    
    // Rate limiting: 60 requests per minute for Gemini
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // Save intermediate result
  fs.writeFileSync(
    path.join(INBOX, '..', 'classification-raw.json'),
    JSON.stringify(classified, null, 2)
  );
  
  // Step 2: Group clean_images with their screenshots
  log('\n🔗 PHASE 2: Pairing images with screenshots...');
  
  const groups = [];
  let currentScreenshot = null;
  let currentImages = [];
  
  for (const item of classified) {
    if (item.type === 'screenshot') {
      // Save previous group
      if (currentScreenshot) {
        groups.push({
          screenshot: currentScreenshot,
          images: [...currentImages]
        });
      }
      // Start new group
      currentScreenshot = item.file;
      currentImages = [];
    } else if (item.type === 'clean_image') {
      if (currentScreenshot) {
        currentImages.push(item.file);
      }
    } else {
      // unclear or error - needs review
      groups.push({
        screenshot: item.file,
        images: [],
        needs_review: true,
        reason: item.type
      });
    }
  }
  
  // Don't forget last group
  if (currentScreenshot) {
    groups.push({
      screenshot: currentScreenshot,
      images: [...currentImages]
    });
  }
  
  log(`✅ Created ${groups.length} groups`);
  
  // Step 3: Extract handles from first 10 screenshots for verification
  log('\n🔍 PHASE 3: Extracting handles from first 10 screenshots...');
  
  const sample = [];
  
  for (let i = 0; i < Math.min(10, groups.length); i++) {
    const group = groups[i];
    
    if (group.needs_review) {
      sample.push({
        ...group,
        handle: null
      });
      continue;
    }
    
    log(`Extracting handle from: ${group.screenshot}`);
    const screenshotPath = path.join(INBOX, group.screenshot);
    const handle = await extractHandle(screenshotPath);
    
    sample.push({
      ...group,
      handle
    });
    
    log(`  → ${handle} (${group.images.length} images)`);
    
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // Save sample for verification
  fs.writeFileSync(
    path.join(INBOX, '..', 'sample-first-10.json'),
    JSON.stringify(sample, null, 2)
  );
  
  log('\n✅ SAMPLE READY FOR VERIFICATION');
  log(`📁 Saved to: ~/Desktop/nylongerie-content/sample-first-10.json`);
  log('\n📋 First 10 groups:');
  
  sample.forEach((g, i) => {
    log(`\n${i + 1}. Screenshot: ${g.screenshot}`);
    log(`   Handle: ${g.handle || 'N/A'}`);
    log(`   Images: ${g.images.length}`);
    if (g.images.length > 0) {
      log(`   → ${g.images.slice(0, 3).join(', ')}${g.images.length > 3 ? '...' : ''}`);
    }
    if (g.needs_review) {
      log(`   ⚠️  NEEDS REVIEW: ${g.reason}`);
    }
  });
  
  log('\n⏸️  PAUSED FOR VERIFICATION');
  log('Review the sample and confirm to continue with remaining images.');
}

main().catch(err => {
  log(`💥 Fatal error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
