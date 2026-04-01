#!/usr/bin/env node
/**
 * Nylongerie Publisher
 * 
 * Publishes approved posts to Instagram via Graph API:
 * 1. Upload image to R2 for public URL
 * 2. Create media container on Instagram
 * 3. Wait for processing
 * 4. Publish
 * 5. Update queue.json
 * 
 * Usage:
 *   node nylongerie-publish.js <post_id>          # Publish single post
 *   node nylongerie-publish.js --batch             # Publish all approved posts
 *   node nylongerie-publish.js --test <post_id>    # Dry run (upload to R2 only)
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(process.env.HOME, '.openclaw', '.env'), override: true });
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// --- Config ---
const QUEUE_FILE = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'queue.json');
const META_TOKEN = process.env.META_ACCESS_TOKEN;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
const API_VERSION = 'v25.0';

const ACCOUNTS = {
  nylondarling:    { igId: '17841429713561331', name: 'Nylon Darling' },
  nyloncherie:     { igId: '17841402906657029', name: 'Nylon Cherie' },
  nylongerie:      { igId: '17841402986367027', name: 'Nylongerie' },
  legfashion:      { igId: '17841402884847036', name: 'Leg Fashion' },
  shinynylonstar:  { igId: '17841464191117228', name: 'Shiny Nylon Star' },
  blackshinynylon: { igId: '17841471823236920', name: 'Black Shiny Nylon' },
  planetnylon:     { igId: '17841472009081615', name: 'Planet Nylon' },
  nextdoornylon:   { igId: '17841472299535162', name: 'Nextdoor Nylon' },
};

// --- R2 Upload ---
const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

async function uploadToR2(filePath, key) {
  const body = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = ext === '.mp4' ? 'video/mp4' : 'image/jpeg';
  
  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType
  }));
  
  return `${R2_PUBLIC_URL}/${key}`;
}

// --- Instagram API ---
async function createMediaContainer(igAccountId, imageUrl, caption, mediaType = 'IMAGE') {
  const params = new URLSearchParams({
    access_token: META_TOKEN,
    caption: caption
  });
  
  if (mediaType === 'REELS') {
    params.append('media_type', 'REELS');
    params.append('video_url', imageUrl);
  } else {
    params.append('image_url', imageUrl);
  }
  
  const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${igAccountId}/media`, {
    method: 'POST',
    body: params
  });
  const data = await res.json();
  
  if (data.error) throw new Error(`Container error: ${data.error.message}`);
  return data.id;
}

async function checkContainerStatus(containerId) {
  const res = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${containerId}?fields=status_code,status&access_token=${META_TOKEN}`
  );
  return res.json();
}

async function publishMedia(igAccountId, containerId) {
  const params = new URLSearchParams({
    creation_id: containerId,
    access_token: META_TOKEN
  });
  
  const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${igAccountId}/media_publish`, {
    method: 'POST',
    body: params
  });
  const data = await res.json();
  
  if (data.error) throw new Error(`Publish error: ${data.error.message}`);
  return data.id;
}

async function waitForContainer(containerId, maxWait = 60000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const status = await checkContainerStatus(containerId);
    console.log(`  Container status: ${status.status_code}`);
    
    if (status.status_code === 'FINISHED') return true;
    if (status.status_code === 'ERROR') throw new Error(`Container failed: ${JSON.stringify(status)}`);
    
    await new Promise(r => setTimeout(r, 3000));
  }
  throw new Error('Container processing timeout');
}

// --- Queue ---
function loadQueue() {
  const raw = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
  // Support both array format and {posts:[]} format
  if (Array.isArray(raw)) return { posts: raw };
  return raw;
}

function saveQueue(queue) {
  // Save back as array if originally array
  const data = Array.isArray(queue) ? queue : (queue.posts || queue);
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(data, null, 2));
}

// --- Publish a single post ---
async function publishPost(postId, dryRun = false) {
  const queue = loadQueue();
  const post = queue.posts.find(p => p.id === postId);
  
  if (!post) { console.log(`Post ${postId} not found`); return false; }
  if (!post.account) { console.log(`Post ${postId} has no account assigned`); return false; }
  if (!post.caption && !dryRun) { console.log(`Post ${postId} has no caption`); return false; }
  if (!ACCOUNTS[post.account]) { console.log(`Unknown account: ${post.account}`); return false; }

  // Freigabe-Gate: niemals direkt von draft_sent publishen
  if (!dryRun && post.status !== 'approved') {
    console.log(`❌ Post ${postId} hat Status "${post.status}" — nur "approved" darf publiziert werden.`);
    console.log(`   Bitte erst freigeben: status → "approved", approvedAt + approvedBy setzen.`);
    return false;
  }

  const account = ACCOUNTS[post.account];
  console.log(`\n📸 Publishing: ${post.originalFile}`);
  console.log(`   Account: @${post.account} (${account.name})`);
  console.log(`   Credit: ${post.credit || 'none'}`);
  
  // Step 1: Upload to R2
  const r2Key = `posts/${post.account}/${Date.now()}-${post.originalFile}`;
  console.log(`   Uploading to R2...`);
  const publicUrl = await uploadToR2(post.filePath, r2Key);
  console.log(`   URL: ${publicUrl}`);
  
  if (dryRun) {
    console.log(`   ✅ DRY RUN — skipping Instagram publish`);
    return true;
  }
  
  // Step 2: Create container
  console.log(`   Creating media container...`);
  const containerId = await createMediaContainer(
    account.igId,
    publicUrl,
    post.caption,
    post.mediaType
  );
  console.log(`   Container: ${containerId}`);
  
  // Step 3: Wait for processing
  console.log(`   Waiting for processing...`);
  await waitForContainer(containerId);
  
  // Step 4: Publish
  console.log(`   Publishing...`);
  const mediaId = await publishMedia(account.igId, containerId);
  console.log(`   ✅ Published! Media ID: ${mediaId}`);
  
  // Step 5: Update queue (preserve approval metadata)
  post.status = 'published';
  post.publishedAt = new Date().toISOString();
  post.postId = mediaId;
  post.r2Url = publicUrl;
  post.updatedAt = new Date().toISOString();
  // approvedAt and approvedBy should already be set from approval step
  if (!post.approvedAt) {
    console.log(`   ⚠️  Warning: approvedAt was not set — backdating to now`);
    post.approvedAt = new Date().toISOString();
  }
  saveQueue(queue);
  
  return true;
}

// --- Main ---
async function main() {
  const args = process.argv.slice(2);
  
  if (!META_TOKEN) { console.error('META_ACCESS_TOKEN not set'); process.exit(1); }
  
  if (args[0] === '--batch') {
    const queue = loadQueue();
    const approved = queue.posts.filter(p => p.status === 'approved');
    console.log(`Publishing ${approved.length} approved posts...`);
    
    for (const post of approved) {
      try {
        await publishPost(post.id);
        // Rate limit: wait 30s between posts
        await new Promise(r => setTimeout(r, 30000));
      } catch (e) {
        console.error(`  ❌ Failed: ${e.message}`);
      }
    }
  } else if (args[0] === '--test') {
    await publishPost(args[1], true);
  } else if (args[0]) {
    await publishPost(args[0]);
  } else {
    console.log(`
Nylongerie Publisher

Usage:
  node nylongerie-publish.js <post_id>        Publish single post
  node nylongerie-publish.js --batch          Publish all approved posts
  node nylongerie-publish.js --test <id>      Dry run (R2 upload only)
    `);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
