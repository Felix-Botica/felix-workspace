#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');

// Load .env into temporary object
const envPath = path.join(os.homedir(), '.openclaw', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match && !match[1].startsWith('#')) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, '');
    envVars[key] = value;
  }
});

const picks = JSON.parse(fs.readFileSync('/tmp/picks.json', 'utf8'));
const inbox = path.join(os.homedir(), 'Desktop', 'nylongerie-content', 'inbox');

const s3 = new S3Client({
  region: 'auto',
  endpoint: envVars.R2_ENDPOINT,
  credentials: {
    accessKeyId: envVars.R2_ACCESS_KEY_ID,
    secretAccessKey: envVars.R2_SECRET_ACCESS_KEY
  }
});

async function process() {
  for (const pick of picks) {
    const srcPath = path.join(inbox, pick.file);
    if (!fs.existsSync(srcPath)) {
      console.error('❌ File not found:', pick.file);
      continue;
    }
    
    // Crop to 4:5 (1080x1350)
    const img = sharp(srcPath);
    const meta = await img.metadata();
    
    const targetRatio = 4/5;
    const currentRatio = meta.width / meta.height;
    
    let cropWidth = meta.width;
    let cropHeight = meta.height;
    let left = 0;
    let top = 0;
    
    if (currentRatio > targetRatio) {
      cropWidth = Math.round(meta.height * targetRatio);
      left = Math.round((meta.width - cropWidth) / 2);
    } else {
      cropHeight = Math.round(meta.width / targetRatio);
      top = Math.round((meta.height - cropHeight) / 2);
    }
    
    const croppedBuffer = await img
      .extract({ left, top, width: cropWidth, height: cropHeight })
      .resize(1080, 1350, { fit: 'cover' })
      .jpeg({ quality: 90 })
      .toBuffer();
    
    // Upload to R2
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const r2Key = `preview/${dateStr}-${pick.handle.replace('@', '')}-${pick.file}`;
    
    await s3.send(new PutObjectCommand({
      Bucket: envVars.R2_BUCKET,
      Key: r2Key,
      Body: croppedBuffer,
      ContentType: 'image/jpeg'
    }));
    
    const previewUrl = `${envVars.R2_PUBLIC_URL}/${r2Key}`;
    console.log(`✓ ${pick.file} → ${previewUrl}`);
    
    pick.preview_url = previewUrl;
    pick.r2_key = r2Key;
  }
  
  fs.writeFileSync('/tmp/picks-ready.json', JSON.stringify(picks, null, 2));
  console.log('\n✅ All images processed and uploaded.');
}

process().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
