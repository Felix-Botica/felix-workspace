#!/usr/bin/env node
/**
 * extract-all-handles.js
 * 
 * Continues from sample-first-10.json and extracts handles from ALL remaining screenshots
 */

const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: path.join(process.env.HOME, '.openclaw', '.env'), override: true });

const INBOX = path.join(process.env.HOME, 'Desktop/nylongerie-content/inbox');
const OUTPUT = path.join(process.env.HOME, 'Desktop/nylongerie-content/handle-map.json');
const LOG = path.join(process.env.HOME, 'Desktop/nylongerie-content/handle-extraction.log');
const CLASSIFICATION_FILE = path.join(process.env.HOME, 'Desktop/nylongerie-content/classification-raw.json');

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(LOG, line);
  console.log(msg);
}

async function extractHandle(imagePath, retries = 3) {
  const imageData = fs.readFileSync(imagePath);
  const base64 = imageData.toString('base64');
  
  const prompt = `This is an Instagram screenshot. Extract the EXACT Instagram handle of the account/post shown.

CRITICAL RULES:
- Return ONLY the handle (e.g., @username)
- If you cannot CLEARLY see a handle, respond with UNKNOWN
- Do NOT guess or invent handles
- Do NOT return placeholder text like @username, @person, @model

Handle:`;

  for (let attempt = 1; attempt <= retries; attempt++) {
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
      
      const cleaned = handle.startsWith('@') ? handle : `@${handle}`;
      
      // Reject obvious placeholders
      const suspicious = ['@username', '@person', '@model', '@unknown', '@user', '@name'];
      if (suspicious.includes(cleaned.toLowerCase())) return 'UNKNOWN';
      
      return cleaned;
      
    } catch (err) {
      if (attempt === retries) {
        log(`  ⚠️  Handle extraction failed after ${retries} attempts: ${err.message}`);
        return 'ERROR';
      }
      log(`  ⚠️  Retry ${attempt}/${retries}: ${err.message}`);
      await new Promise(r => setTimeout(r, 2000 * attempt)); // Exponential backoff
    }
  }
}

async function main() {
  log('🚀 Starting full handle extraction...');
  
  // Load classification results
  const classified = JSON.parse(fs.readFileSync(CLASSIFICATION_FILE, 'utf8'));
  
  // Rebuild groups
  const groups = [];
  let currentScreenshot = null;
  let currentImages = [];
  
  for (const item of classified) {
    if (item.type === 'screenshot') {
      if (currentScreenshot) {
        groups.push({
          screenshot: currentScreenshot,
          images: [...currentImages]
        });
      }
      currentScreenshot = item.file;
      currentImages = [];
    } else if (item.type === 'clean_image') {
      if (currentScreenshot) {
        currentImages.push(item.file);
      }
    } else {
      groups.push({
        screenshot: item.file,
        images: [],
        needs_review: true,
        reason: item.type
      });
    }
  }
  
  if (currentScreenshot) {
    groups.push({
      screenshot: currentScreenshot,
      images: [...currentImages]
    });
  }
  
  log(`📊 Total groups: ${groups.length}`);
  
  // Extract handles for ALL groups
  const results = [];
  
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    
    if ((i + 1) % 10 === 0) {
      log(`Progress: ${i + 1}/${groups.length} (${Math.round((i+1)/groups.length*100)}%)`);
      // Save intermediate results
      fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2));
    }
    
    if (group.needs_review) {
      results.push({
        ...group,
        handle: null
      });
      continue;
    }
    
    const screenshotPath = path.join(INBOX, group.screenshot);
    const handle = await extractHandle(screenshotPath);
    
    results.push({
      ...group,
      handle
    });
    
    if ((i + 1) % 10 === 0 || i < 20) {
      log(`  ${group.screenshot} → ${handle} (${group.images.length} images)`);
    }
    
    // Rate limiting: 60 requests per minute
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // Final save
  fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2));
  
  log('\n✅ COMPLETE!');
  log(`📁 Saved to: ${OUTPUT}`);
  
  // Statistics
  const withHandles = results.filter(r => r.handle && r.handle !== 'UNKNOWN' && r.handle !== 'ERROR');
  const withImages = withHandles.filter(r => r.images.length > 0);
  const totalImages = withImages.reduce((sum, r) => sum + r.images.length, 0);
  
  log('\n📈 Statistics:');
  log(`  Total groups: ${results.length}`);
  log(`  With valid handles: ${withHandles.length}`);
  log(`  With handles + images: ${withImages.length}`);
  log(`  Total content images paired: ${totalImages}`);
  
  log('\n✅ Ready for spot-check verification!');
}

main().catch(err => {
  log(`💥 Fatal error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
