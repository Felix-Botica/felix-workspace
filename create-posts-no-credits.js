#!/usr/bin/env node
/**
 * Create 7-8 posts WITHOUT model credits (using "📸 Unknown | DM for credit" default)
 * Quick solution while handle verification is still running
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
require('dotenv').config({ path: path.join(process.env.HOME, '.openclaw', '.env'), override: true });
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const QUEUE_FILE = path.join(process.env.HOME, '.openclaw/nylongerie/queue.json');
const INBOX_DIR = path.join(process.env.HOME, '.openclaw/nylongerie/inbox');
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

function generateCaption(account) {
  const year = new Date().getFullYear();
  
  const captions = {
    '@nylondarling': `nylondarling ■ Shop @nylongerie ♡ Nylongerie.com\nStyle perfection\n🌹\nIntroduced by Nylon Darling™ @nylondarling\n•\n📸 Unknown | DM for credit\n♥ Always tag @nylondarling and #nylondarling\n\n#nylondarling #legfashion #nylongerie #nylonlegs #pantyhose #tights #hosierylover #beautifullegs #shinynylons`,
    
    '@legfashion': `legfashion ■ Shop @nylongerie ♡ Nylongerie.com\nLegs in focus\n🦵\nFeatured by Leg Fashion™ @legfashion\n•\n📸 Unknown | DM for credit\n♥ Always tag @legfashion and #legfashion\n\n#legfashion #nylondarling #nylongerie #beautifullegs #pantyhose #tights #legscrossed #nylonlegs`,
    
    '@shinynylonstar': `shinynylonstar ■ Shop @nylongerie ♡ Nylongerie.com\nShimmering elegance\n✨\nFeatured by Shiny Nylon Star™ @shinynylonstar\n•\n📸 Unknown | DM for credit\n♥ Always tag @shinynylonstar and #shinynylonstar\n\n#shinynylonstar #nylondarling #shinynylons #glossy #pantyhose #tights #shiny #nylonlegs`,
    
    '@blackshinynylon': `blackshinynylon ■ Shop @nylongerie ♡ Nylongerie.com\nDark elegance\n🖤\nFeatured by Black Shiny Nylon™ @blackshinynylon\n•\n📸 Unknown | DM for credit\n♥ Always tag @blackshinynylon and #blackshinynylon\n\n#blackshinynylon #nylondarling #black #shiny #pantyhose #tights #glossy #nylonlegs`,
    
    '@nextdoornylon': `nextdoornylon ■ Shop @nylongerie ♡ Nylongerie.com\nReal-life style\n🌸\nFeatured by Nextdoor Nylon™ @nextdoornylon\n•\n📸 Unknown | DM for credit\n♥ Always tag @nextdoornylon and #nextdoornylon\n\n#nextdoornylon #nylondarling #casual #lifestyle #pantyhose #tights #nylonlegs`,
    
    '@planetnylon': `planetnylon ■ Shop @nylongerie ♡ Nylongerie.com\nPerfect style\n🌍\nFeatured by Planet Nylon™ @planetnylon\n•\n📸 Unknown | DM for credit\n♥ Always tag @planetnylon and #planetnylon\n\n#planetnylon #nylondarling #nylongerie #pantyhose #tights #nylonlegs`,
    
    '@nylongerie': `Shop Nylongerie ♡ Nylongerie.com\nStyle featured\n🖤\nFeatured by Nylongerie® @nylongerie\n•\n📸 Unknown | DM for credit\n♥ Always tag @nylongerie and #nylongerie\n\n#nylongerie #nylondarling #pantyhose #tights #hosiery #nylonlegs`
  };
  
  return captions[account] || captions['@nylongerie'];
}

async function main() {
  console.log('📸 Creating 7 posts without model credits...\n');
  
  // Get all JPG content images (not screenshots)
  const allImages = fs.readdirSync(INBOX_DIR).filter(f => {
    return f.toLowerCase().endsWith('.jpg') && !f.startsWith('IMG_');
  });
  
  console.log(`📁 Found ${allImages.length} content images in inbox`);
  
  // Sample 7 random images
  const shuffled = allImages.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 7);
  
  // Create drafts
  const queue = fs.existsSync(QUEUE_FILE) ? JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8')) : [];
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const previews = [];
  
  for (let i = 0; i < selected.length; i++) {
    const file = selected[i];
    const account = ACCOUNTS[i];
    
    console.log(`${i + 1}. ${account} → ${file} (no credit)`);
    
    const inputPath = path.join(INBOX_DIR, file);
    const croppedBuffer = await cropImage(inputPath);
    
    // Upload to R2
    const r2Key = `previews/${today}-${account.replace('@', '')}-${file}`;
    const previewUrl = await uploadToR2(croppedBuffer, r2Key);
    
    const caption = generateCaption(account);
    
    const draft = {
      id: `${Date.now()}-${i}`,
      account,
      file,
      handle: null,
      caption,
      preview_url: previewUrl,
      status: 'draft_sent',
      created_at: new Date().toISOString()
    };
    
    queue.push(draft);
    previews.push({
      account,
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
    .note { color: #e91e63; font-size: 14px; margin-bottom: 12px; font-weight: bold; }
  </style>
</head>
<body>
  <h1>📸 Nylongerie Post Previews - ${today}</h1>
  <p>${selected.length} posts ready for approval (NO MODEL CREDITS)</p>
  <p style="color: #e91e63;">⚠️ Using "📸 Unknown | DM for credit" default while handle verification completes</p>
  ${previews.map((p, i) => `
    <div class="post">
      <div class="account">${i + 1}. ${ACCOUNTS[i]}</div>
      <div class="note">⚠️ No model credit</div>
      <img src="${p.preview_url}" alt="${ACCOUNTS[i]}">
      <div class="caption">${p.caption}</div>
    </div>
  `).join('')}
</body>
</html>`;
  
  const htmlPath = `/tmp/post-previews-${today}.html`;
  fs.writeFileSync(htmlPath, html);
  
  console.log(`\n✅ Created ${selected.length} post drafts (no credits)`);
  console.log(`📁 Queue saved: ${QUEUE_FILE}`);
  console.log(`🌐 HTML preview: ${htmlPath}`);
  console.log(`\n💡 To view: open ${htmlPath}`);
  console.log(`\n⚠️  NOTE: These posts use "📸 Unknown | DM for credit" until handle verification completes.`);
}

main().catch(err => {
  console.error('💥 Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
