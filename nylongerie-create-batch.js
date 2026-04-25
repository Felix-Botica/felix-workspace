#!/usr/bin/env node
/**
 * Nylongerie Batch Creator
 * Creates preview drafts: crop, upload to R2, generate caption, save to queue.json
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
require('dotenv').config({ path: path.join(process.env.HOME, '.openclaw', '.env'), override: true });
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Config
const CLASSIFY_FILE = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'classify-results.json');
const QUEUE_FILE = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'queue.json');
const INBOX_DIR = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'inbox');
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

// Caption templates
const CAPTIONS = {
  '@nylondarling': (headline, handle) => `nylondarling ■ Shop @nylongerie ♡ Nylongerie.com\n${headline} ★ the stunning ${handle.replace('@', '')} ${handle}\n🌹\nIntroduced by Nylon Darling™ @nylondarling\n•\nCopyright © ${handle.replace('@', '')}, ${new Date().getFullYear()}\nNylon Darling™ legal notice: All copyrights belong to the model, brand or photographer and have been published with their permission. Reposting only allowed with consent of the copyright holder.\n•\n♥ Always tag @nylondarling and #nylondarling\n\n#nylondarling #legfashion #nylongerie #classynylons #nyloncherie #fashiontights #tightsfashion #legscrossed #pantyhosefashion #hosierylover #beautifullegs #shinynylons #nylons #nylonlegs #instanylon #nylonlovers #instanylons #tightsblogger #crossedlegs #tights #pantyhose #collant #calze #pantyhosemodel #pantyhoselegs #rajstopy #tightslover #stockings #instaheels #iloveheels\n\n· Nylon Darling™ is a brand and network member of Nylongerie® Fashion & Friends by Alex S. @nyloncherie\n□ Follow @legfashion @shinynylonstar @nylondarling`,
  
  '@legfashion': (headline, handle) => `legfashion ■ Shop @nylongerie ♡ Nylongerie.com\n${headline} ★ ${handle}\n🦵\nFeatured by Leg Fashion™ @legfashion\n•\nCopyright © ${handle.replace('@', '')}, ${new Date().getFullYear()}\nLeg Fashion™ legal notice: All copyrights belong to the model, brand or photographer and have been published with their permission. Reposting only allowed with consent of the copyright holder.\n•\n♥ Always tag @legfashion and #legfashion\n\n#legfashion #nylondarling #nylongerie #nyloncherie #classynylons #fashiontights #tightsfashion #legscrossed #pantyhosefashion #hosierylover #beautifullegs #shinynylons #nylons #nylonlegs #instanylon #tights #pantyhose #collant #calze #pantyhosemodel #pantyhoselegs #stockings #instaheels\n\n· Leg Fashion™ is a brand and network member of Nylongerie® Fashion & Friends by Alex S.\n□ Follow @nylondarling @nyloncherie @shinynylonstar`,
  
  '@shinynylonstar': (headline, handle) => `shinynylonstar ■ Shop @nylongerie ♡ Nylongerie.com\n${headline} ★ ${handle}\n✨\nFeatured by Shiny Nylon Star™ @shinynylonstar\n•\nCopyright © ${handle.replace('@', '')}, ${new Date().getFullYear()}\nShiny Nylon Star™ legal notice: All copyrights belong to the model, brand or photographer and have been published with their permission. Reposting only allowed with consent of the copyright holder.\n•\n♥ Always tag @shinynylonstar and #shinynylonstar\n\n#shinynylonstar #nylondarling #legfashion #nylongerie #nyloncherie #glossy #shiny #fashiontights #tightsfashion #pantyhosefashion #hosierylover #beautifullegs #shinynylons #nylons #nylonlegs #instanylon #tights #pantyhose #collant #calze #pantyhosemodel #stockings #latex #glossylegs\n\n· Shiny Nylon Star™ is a brand and network member of Nylongerie® Fashion & Friends by Alex S.\n□ Follow @nylondarling @nyloncherie @legfashion`,
  
  '@blackshinynylon': (headline, handle) => `blackshinynylon ■ Shop @nylongerie ♡ Nylongerie.com\n${headline} ★ ${handle}\n🖤\nFeatured by Black Shiny Nylon™ @blackshinynylon\n•\nCopyright © ${handle.replace('@', '')}, ${new Date().getFullYear()}\nBlack Shiny Nylon™ legal notice: All copyrights belong to the model, brand or photographer and have been published with their permission. Reposting only allowed with consent of the copyright holder.\n•\n♥ Always tag @blackshinynylon and #blackshinynylon\n\n#blackshinynylon #nylondarling #legfashion #nylongerie #black #shiny #fashiontights #tightsfashion #pantyhosefashion #hosierylover #beautifullegs #shinynylons #nylons #nylonlegs #instanylon #tights #pantyhose #collant #calze #pantyhosemodel #stockings\n\n· Black Shiny Nylon™ is a brand and network member of Nylongerie® Fashion & Friends by Alex S.\n□ Follow @nylondarling @legfashion @shinynylonstar`,
  
  '@nextdoornylon': (headline, handle) => `nextdoornylon ■ Shop @nylongerie ♡ Nylongerie.com\n${headline} ★ ${handle}\n🌸\nFeatured by Nextdoor Nylon™ @nextdoornylon\n•\nCopyright © ${handle.replace('@', '')}, ${new Date().getFullYear()}\nNextdoor Nylon™ legal notice: All copyrights belong to the model, brand or photographer and have been published with their permission. Reposting only allowed with consent of the copyright holder.\n•\n♥ Always tag @nextdoornylon and #nextdoornylon\n\n#nextdoornylon #nylondarling #legfashion #nylongerie #casual #lifestyle #fashiontights #tightsfashion #pantyhosefashion #hosierylover #beautifullegs #nylons #nylonlegs #instanylon #tights #pantyhose #collant #calze #pantyhosemodel #stockings\n\n· Nextdoor Nylon™ is a brand and network member of Nylongerie® Fashion & Friends by Alex S.\n□ Follow @nylondarling @legfashion @shinynylonstar`,

  '@nylongerie': (headline, handle) => `nylongerie ■ Shop Nylongerie.com\n${headline} ★ ${handle}\n🛍️\nFeatured by Nylongerie® @nylongerie\n•\nCopyright © ${handle.replace('@', '')}, ${new Date().getFullYear()}\nNylongerie® legal notice: All copyrights belong to the model, brand or photographer and have been published with their permission. Reposting only allowed with consent of the copyright holder.\n•\n♥ Always tag @nylongerie and #nylongerie\n\n#nylongerie #nylondarling #legfashion #classynylons #fashiontights #tightsfashion #pantyhosefashion #hosierylover #beautifullegs #shinynylons #nylons #nylonlegs #instanylon #tights #pantyhose #collant #calze #pantyhosemodel #stockings #editorial #fashionphotography\n\n· Nylongerie® Fashion & Friends by Alex S.\n□ Follow @nylondarling @legfashion @shinynylonstar`,

  '@planetnylon': (headline, handle) => `planetnylon ■ Shop @nylongerie ♡ Nylongerie.com\n${headline} ★ ${handle}\n🌍\nFeatured by Planet Nylon™ @planetnylon\n•\nCopyright © ${handle.replace('@', '')}, ${new Date().getFullYear()}\nPlanet Nylon™ legal notice: All copyrights belong to the model, brand or photographer and have been published with their permission. Reposting only allowed with consent of the copyright holder.\n•\n♥ Always tag @planetnylon and #planetnylon\n\n#planetnylon #nylondarling #legfashion #nylongerie #edgy #alternative #fashiontights #tightsfashion #pantyhosefashion #hosierylover #beautifullegs #nylons #nylonlegs #instanylon #tights #pantyhose #collant #calze #pantyhosemodel #stockings\n\n· Planet Nylon™ is a brand and network member of Nylongerie® Fashion & Friends by Alex S.\n□ Follow @nylondarling @legfashion @shinynylonstar`
};

// Headline generators
function generateHeadline(description, style) {
  if (!description) {
    // Fallback if no description
    if (style === 'shiny-glossy') return 'Glossy perfection';
    if (style === 'legs-focus') return 'Legs in focus';
    if (style === 'black') return 'Dark elegance';
    if (style === 'elegant') return 'Timeless elegance';
    if (style === 'lifestyle') return 'Real-life style';
    return 'Style statement';
  }
  
  const words = description.toLowerCase();
  
  // Extract key features
  const hasRed = /red|scarlet|crimson|burgundy/.test(words);
  const hasBlack = /black|noir|ebony/.test(words);
  const hasShiny = /shiny|glossy|latex|leather/.test(words);
  const hasFur = /fur/.test(words);
  const hasElegance = /elegant|sophisticated|chic/.test(words);
  const hasLeopard = /leopard|animal print/.test(words);
  
  if (style === 'elegant') {
    if (hasRed) return 'Scarlet sophistication';
    if (hasFur) return 'Luxe & elegance';
    return 'Timeless elegance';
  }
  
  if (style === 'shiny-glossy') {
    if (hasBlack) return 'Glossy noir perfection';
    return 'Shimmering elegance';
  }
  
  if (style === 'legs-focus') {
    if (hasShiny) return 'Glossy leg perfection';
    return 'Legs in focus';
  }
  
  if (style === 'black' || style === 'black-nylon') {
    if (hasShiny) return 'Dark glossy elegance';
    return 'Noir sophistication';
  }
  
  if (style === 'lifestyle') {
    if (hasLeopard) return 'Wild & casual chic';
    return 'Real-life style';
  }

  if (style === 'editorial') {
    if (hasElegance) return 'Editorial elegance';
    return 'Fashion statement';
  }

  if (style === 'other') {
    return 'Style statement';
  }

  return 'Style statement';
}

// R2 Upload
const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

async function uploadToR2(buffer, key) {
  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'image/jpeg'
  }));
  return `${R2_PUBLIC_URL}/${key}`;
}

// Crop to 4:5 (1080x1350)
async function cropImage(inputPath) {
  const img = sharp(inputPath);
  const meta = await img.metadata();
  
  const targetRatio = 1080 / 1350; // 0.8
  const currentRatio = meta.width / meta.height;
  
  let width, height, left = 0, top = 0;
  
  if (currentRatio > targetRatio) {
    // Image is wider - crop width
    height = meta.height;
    width = Math.round(height * targetRatio);
    left = Math.round((meta.width - width) / 2);
  } else {
    // Image is taller - crop height
    width = meta.width;
    height = Math.round(width / targetRatio);
    top = Math.round((meta.height - height) / 2);
  }
  
  return img
    .extract({ left, top, width, height })
    .resize(1080, 1350, { fit: 'cover' })
    .jpeg({ quality: 92 })
    .toBuffer();
}

// Main
async function createBatch(selections) {
  const queue = fs.existsSync(QUEUE_FILE) ? JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8')) : [];
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');

  const drafts = [];

  for (let i = 0; i < selections.length; i++) {
    const sel = selections[i];

    const inputPath = path.join(INBOX_DIR, sel.file);
    if (!fs.existsSync(inputPath)) {
      console.warn(`⚠️  File not found in inbox: ${sel.file}`);
      continue;
    }
    
    console.log(`\n📸 Processing: ${sel.file}`);
    console.log(`   Account: ${sel.account}`);
    console.log(`   Model: ${sel.handle}`);
    
    // Crop
    console.log(`   Cropping to 4:5...`);
    const cropped = await cropImage(inputPath);
    
    // Upload preview to R2
    const r2Key = `preview/${today}-${sel.handle.replace('@', '')}-${sel.file}`;
    console.log(`   Uploading to R2...`);
    const previewUrl = await uploadToR2(cropped, r2Key);
    console.log(`   Preview: ${previewUrl}`);
    
    // Generate caption
    const headline = generateHeadline(sel.description, sel.style);
    const caption = CAPTIONS[sel.account](headline, sel.handle);
    
    // Create draft entry
    const draft = {
      id: `draft-${today}-${i + 1}`,
      file: sel.file,
      model: sel.handle,
      account: sel.account,
      status: 'draft_sent',
      created: new Date().toISOString(),
      preview_url: previewUrl,
      caption_headline: headline,
      caption: caption
    };
    
    drafts.push(draft);
    queue.push(draft);
  }
  
  // Save queue
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
  console.log(`\n✅ Created ${drafts.length} drafts. Saved to queue.json`);
  
  return drafts;
}

// CLI
if (require.main === module) {
  const selectionsJson = process.argv[2];
  if (!selectionsJson) {
    console.error('Usage: node nylongerie-create-batch.js <selections.json>');
    process.exit(1);
  }
  
  const selections = JSON.parse(fs.readFileSync(selectionsJson, 'utf8'));
  createBatch(selections).catch(e => { console.error(e); process.exit(1); });
} else {
  module.exports = { createBatch };
}
