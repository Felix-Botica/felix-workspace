#!/usr/bin/env node
/**
 * Upload test story images to R2
 */

require('dotenv').config({ path: require('path').join(process.env.HOME, '.openclaw', '.env'), override: true });
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// R2 Client
const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function uploadFile(localPath, key) {
  const file = fs.readFileSync(localPath);
  
  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: file,
    ContentType: 'image/jpeg',
  }));
  
  const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
  console.log(`✅ ${path.basename(localPath)} → ${publicUrl}`);
  return publicUrl;
}

async function main() {
  console.log('📤 Uploading story test images to R2...\n');
  
  const testImages = [
    'story-test-sale.jpg',
    'story-test-product.jpg',
    'story-test-motw.jpg',
    'story-test-season.jpg',
    'story-test-category.jpg'
  ];
  
  const urls = [];
  
  for (const imageName of testImages) {
    const localPath = path.join(process.env.HOME, '.openclaw', 'workspace', imageName);
    const key = `preview/${imageName}`;
    
    if (fs.existsSync(localPath)) {
      const url = await uploadFile(localPath, key);
      urls.push({ type: imageName.replace('story-test-', '').replace('.jpg', ''), url });
    } else {
      console.log(`⚠️  ${imageName} not found, skipping...`);
    }
  }
  
  console.log('\n📋 Summary of uploaded test images:');
  console.log('='.repeat(50));
  urls.forEach(({ type, url }) => {
    console.log(`${type.toUpperCase().padEnd(10)} : ${url}`);
  });
  
  return urls;
}

main().catch(console.error);