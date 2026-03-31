#!/usr/bin/env node
/**
 * Create 7-8 posts using only VERIFIED handles from handle-map.json
 * Uses images that have 97% verified model credits
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
require('dotenv').config({ path: path.join(process.env.HOME, '.openclaw', '.env'), override: true });
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const HANDLE_MAP_PATH = path.join(process.env.HOME, '.openclaw/nylongerie/handle-map.json');
const VERIFICATION_PATH = path.join(process.env.HOME, '.openclaw/nylongerie/verification-results.json');
const QUEUE_FILE = path.join(process.env.HOME, '.openclaw/nylongerie/queue.json');
const INBOX_DIR = path.join(process.env.HOME, 'Desktop/nylongerie-content/inbox');
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

const ACCOUNTS = [
  '@nylondarling',
  '@legfashion',
  '@shinynylonstar',
  '@blackshinynylon',
  '@nextdoornylon',
  '@planetnylon',
  '@nylongerie'
];

// R2 client
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

async function cropImage(inputPath) {
  const img = sharp(inputPath);
  const meta = await img.metadata();
  
  const targetRatio = 1080 / 1350;
  const currentRatio = meta.width / meta.height;
  
  let width, height, left = 0, top = 0;
  
  if (currentRatio > targetRatio) {
    height = meta.height;
    width = Math.round(height * targetRatio);
    left = Math.round((meta.width - width) / 2);
  } else {
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

function generateCaption(account, handle) {
  const year = new Date().getFullYear();
  const handleClean = handle.replace('@', '');
  
  const captions = {
    '@nylondarling': `nylondarling ■ Shop @nylongerie ♡ Nylongerie.com\nStyle perfection ★ ${handle}\n🌹\nIntroduced by Nylon Darling™ @nylondarling\n•\nCopyright © ${handleClean}, ${year}\n♥ Always tag @nylondarling and #nylondarling\n\n#nylondarling #legfashion #nylongerie #nylonlegs #pantyhose #tights`,
    
    '@legfashion': `legfashion ■ Shop @nylongerie ♡ Nylongerie.com\nLegs in focus ★ ${handle}\n🦵\nFeatured by Leg Fashion™ @legfashion\n•\nCopyright © ${handleClean}, ${year}\n♥ Always tag @legfashion and #legfashion\n\n#legfashion #nylondarling #nylongerie #beautifullegs #pantyhose #tights`,
    
    '@shinynylonstar': `shinynylonstar ■ Shop @nylongerie ♡ Nylongerie.com\nShimmering elegance ★ ${handle}\n✨\nFeatured by Shiny Nylon Star™ @shinynylonstar\n•\nCopyright © ${handleClean}, ${year}\n♥ Always tag @shinynylonstar and #shinynylonstar\n\n#shinynylonstar #nylondarling #shinynylons #glossy #pantyhose #tights`,
    
    '@blackshinynylon': `blackshinynylon ■ Shop @nylongerie ♡ Nylongerie.com\nDark elegance ★ ${handle}\n🖤\nFeatured by Black Shiny Nylon™ @blackshinynylon\n•\nCopyright © ${handleClean}, ${year}\n♥ Always tag @blackshinynylon and #blackshinynylon\n\n#blackshinynylon #nylondarling #black #shiny #pantyhose #tights`,
    
    '@nextdoornylon': `nextdoornylon ■ Shop @nylongerie ♡ Nylongerie.com\nReal-life style ★ ${handle}\n🌸\nFeatured by Nextdoor Nylon™ @nextdoornylon\n•\nCopyright © ${handleClean}, ${year}\n♥ Always tag @nextdoornylon and #nextdoornylon\n\n#nextdoornylon #nylondarling #casual #lifestyle #pantyhose #tights`,
    
    '@planetnylon': `planetnylon ■ Shop @nylongerie ♡ Nylongerie.com\nPerfect style ★ ${handle}\n🌍\nFeatured by Planet Nylon™ @planetnylon\n•\nCopyright © ${handleClean}, ${year}\n♥ Always tag @planetnylon and #planetnylon\n\n#planetnylon #nylondarling #nylongerie #pantyhose #tights`,
    
    '@nylongerie': `Shop Nylongerie ♡ Nylongerie.com\nStyle featured ★ ${handle}\n🖤\nFeatured by Nylongerie® @nylongerie\n•\nCopyright © ${handleClean}, ${year}\n♥ Always tag @nylongerie and #nylongerie\n\n#nylongerie #nylondarling #pantyhose #tights #hosiery`
  };
  
  return captions[account] || captions['@nylongerie'];
}

async function main() {
  console.log('📸 Creating posts from verified handles...\n');
  
  // Load data
  const handleMap = JSON.parse(fs.readFileSync(HANDLE_MAP_PATH, 'utf8'));
  const verification = JSON.parse(fs.readFileSync(VERIFICATION_PATH, 'utf8'));
  const validHandles = new Set(verification.valid.map(v => v.handle));
  
  // Find content images with valid model credits
  const allImages = fs.readdirSync(INBOX_DIR).filter(f => f.toLowerCase().endsWith('.jpg'));
  const contentImages = allImages.filter(f => !f.startsWith('IMG_'));
  
  const candidates = [];
  
  for (const contentFile of contentImages) {
    const baseNum = contentFile.replace(/[^0-9]/g, '');
    const screenshotFile = `IMG_${baseNum}.jpg`;
    const handle = handleMap[screenshotFile];
    
    if (handle && validHandles.has(handle)) {
      candidates.push({
        file: contentFile,
        handle,
        screenshot: screenshotFile
      });
    }
  }
  
  console.log(`✅ Found ${candidates.length} images with verified model credits`);
  console.log(`📊 Sampling 7-8 random images...\n`);
  
  // Sample 7-8 random images
  const shuffled = candidates.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 7);
  
  // Create drafts
  const queue = fs.existsSync(QUEUE_FILE) ? JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8')) : [];
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const previews = [];
  
  for (let i = 0; i < selected.length; i++) {
    const { file, handle } = selected[i];
    const account = ACCOUNTS[i % ACCOUNTS.length];
    
    console.log(`${i + 1}. ${account} → ${file} (model: ${handle})`);
    
    const inputPath = path.join(INBOX_DIR, file);
    const croppedBuffer = await cropImage(inputPath);
    
    // Upload to R2
    const r2Key = `previews/${today}-${account.replace('@', '')}-${file}`;
    const previewUrl = await uploadToR2(croppedBuffer, r2Key);
    
    const caption = generateCaption(account, handle);
    
    const draft = {
      id: `${Date.now()}-${i}`,
      account,
      file,
      handle,
      caption,
      preview_url: previewUrl,
      status: 'draft_sent',
      created_at: new Date().toISOString()
    };
    
    queue.push(draft);
    previews.push({
      account,
      handle,
      preview_url: previewUrl,
      caption
    });
  }
  
  // Save queue
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
  
  // Generate HTML preview
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Nylongerie Post Previews - ${today}</title>
  <style>
    body { font-family: system-ui; padding: 20px; max-width: 1200px; margin: 0 auto; background: #fafafa; }
    .post { background: white; border-radius: 8px; padding: 16px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .post img { width: 100%; max-width: 400px; border-radius: 4px; }
    .account { font-weight: bold; font-size: 18px; margin-bottom: 8px; }
    .caption { white-space: pre-wrap; font-size: 14px; color: #333; margin-top: 12px; }
    .model { color: #666; font-size: 14px; margin-bottom: 12px; }
  </style>
</head>
<body>
  <h1>📸 Nylongerie Post Previews - ${today}</h1>
  <p>${selected.length} posts ready for approval</p>
  ${previews.map((p, i) => `
    <div class="post">
      <div class="account">${i + 1}. ${p.account}</div>
      <div class="model">Model: ${p.handle}</div>
      <img src="${p.preview_url}" alt="${p.account}">
      <div class="caption">${p.caption}</div>
    </div>
  `).join('')}
</body>
</html>`;
  
  const htmlPath = `/tmp/post-previews-${today}.html`;
  fs.writeFileSync(htmlPath, html);
  
  console.log(`\n✅ Created ${selected.length} post drafts`);
  console.log(`📁 Queue saved: ${QUEUE_FILE}`);
  console.log(`🌐 HTML preview: ${htmlPath}`);
  console.log(`\nOpen in browser: open ${htmlPath}`);
}

main().catch(err => {
  console.error('💥 Error:', err.message);
  process.exit(1);
});
