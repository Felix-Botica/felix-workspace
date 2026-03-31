#!/usr/bin/env node
/**
 * Simple batch publisher for today's 6 approved posts
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(process.env.HOME, '.openclaw', '.env'), override: true });
const sharp = require('sharp');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const QUEUE_FILE = path.join(process.env.HOME, '.openclaw/nylongerie/queue.json');
const META_TOKEN = process.env.META_ACCESS_TOKEN;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

const ACCOUNTS = {
  nylondarling:    '17841429713561331',
  legfashion:      '17841402884847036',
  shinynylonstar:  '17841464191117228',
  blackshinynylon: '17841471823236920',
  planetnylon:     '17841472009081615',
  nylongerie:      '17841402986367027',
};

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

async function uploadToR2(filePath, key) {
  const buffer = fs.readFileSync(filePath);
  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'image/jpeg'
  }));
  return `${R2_PUBLIC_URL}/${key}`;
}

async function createContainer(igId, imageUrl, caption) {
  const params = new URLSearchParams({
    image_url: imageUrl,
    caption,
    access_token: META_TOKEN
  });
  
  const res = await fetch(`https://graph.facebook.com/v25.0/${igId}/media`, {
    method: 'POST',
    body: params
  });
  const data = await res.json();
  if (data.error) throw new Error(`Container error: ${data.error.message}`);
  return data.id;
}

async function publishContainer(igId, containerId) {
  const params = new URLSearchParams({
    creation_id: containerId,
    access_token: META_TOKEN
  });
  
  const res = await fetch(`https://graph.facebook.com/v25.0/${igId}/media_publish`, {
    method: 'POST',
    body: params
  });
  const data = await res.json();
  if (data.error) throw new Error(`Publish error: ${data.error.message}`);
  return data.id;
}

async function checkStatus(containerId) {
  const res = await fetch(`https://graph.facebook.com/v25.0/${containerId}?fields=status_code&access_token=${META_TOKEN}`);
  const data = await res.json();
  return data.status_code;
}

async function waitForProcessing(containerId, maxWait = 60000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const status = await checkStatus(containerId);
    if (status === 'FINISHED') return true;
    if (status === 'ERROR') throw new Error('Container processing failed');
    await new Promise(r => setTimeout(r, 3000));
  }
  throw new Error('Timeout waiting for container');
}

async function publishPost(post) {
  const igId = ACCOUNTS[post.account];
  if (!igId) throw new Error(`Unknown account: ${post.account}`);
  
  console.log(`\n📸 ${post.account}`);
  console.log(`   File: ${post.file}`);
  
  // Upload to R2
  const r2Key = `posts/${post.account}/${Date.now()}-${post.file}`;
  const publicUrl = await uploadToR2(post.path, r2Key);
  console.log(`   ✅ Uploaded to R2`);
  
  // Create container
  const containerId = await createContainer(igId, publicUrl, post.caption);
  console.log(`   ✅ Container created: ${containerId}`);
  
  // Wait for processing
  await waitForProcessing(containerId);
  console.log(`   ✅ Processing complete`);
  
  // Publish
  const mediaId = await publishContainer(igId, containerId);
  console.log(`   ✅ Published! Media ID: ${mediaId}`);
  
  // Update queue
  post.status = 'published';
  post.media_id = mediaId;
  post.r2_url = publicUrl;
  post.published_at = new Date().toISOString();
  
  return true;
}

async function main() {
  const queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
  const approved = queue.filter(p => 
    p.status === 'approved' && 
    p.id && 
    p.id.startsWith('1774838')
  );
  
  console.log(`Publishing ${approved.length} posts...`);
  
  for (const post of approved) {
    try {
      await publishPost(post);
      // Save after each success
      fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
    } catch (err) {
      console.error(`   ❌ Failed: ${err.message}`);
      post.status = 'error';
      post.error = err.message;
      fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
    }
  }
  
  console.log(`\n✅ Batch complete`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
