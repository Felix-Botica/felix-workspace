require('dotenv').config({ path: require('path').join(process.env.HOME, '.openclaw', '.env'), override: true });
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const QUEUE_FILE = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'queue.json');
const INBOX = path.join(process.env.HOME, 'Desktop', 'nylongerie-content', 'inbox');
const META_TOKEN = process.env.META_ACCESS_TOKEN;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY }
});

const ACCOUNTS = {
  '@nylondarling': '17841429713561331',
  '@legfashion': '17841402884847036',
  '@shinynylonstar': '17841464191117228',
  '@blackshinynylon': '17841471823236920',
  '@planetnylon': '17841472009081615',
};

const CAPTIONS = {
  '@nylondarling': (headline, handle) => `nylondarling ■ Shop @nylongerie ♡ Nylongerie.com
${headline} ★ the stunning ${handle}
🌹
Introduced by Nylon Darling™ @nylondarling
•
Copyright © ${handle.replace('@','')}, 2026
Nylon Darling™ legal notice: All copyrights belong to the model, brand or photographer and have been published with their permission. Reposting only allowed with consent of the copyright holder.
•
♥ Always tag @nylondarling and #nylondarling

#nylondarling #legfashion #nylongerie #classynylons #nyloncherie #fashiontights #tightsfashion #legscrossed #pantyhosefashion #hosierylover #beautifullegs #shinynylons #nylons #nylonlegs #instanylon #nylonlovers #instanylons #tightsblogger #crossedlegs #tights #pantyhose #collant #calze #pantyhosemodel #pantyhoselegs #rajstopy #tightslover #stockings #instaheels #iloveheels

· Nylon Darling™ is a brand and network member of Nylongerie® Fashion & Friends by Alex S. @nyloncherie
□ Follow @legfashion @shinynylonstar @nylondarling`,
};

async function uploadToR2(filePath, key) {
  const body = fs.readFileSync(filePath);
  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET, Key: key, Body: body, ContentType: 'image/jpeg'
  }));
  return `${R2_PUBLIC_URL}/${key}`;
}

async function gfetch(url, opts) {
  const res = await fetch(url, opts);
  return res.json();
}

async function publish(igId, imageUrl, caption) {
  // Create container
  const c = await gfetch(`https://graph.facebook.com/v25.0/${igId}/media?image_url=${encodeURIComponent(imageUrl)}&caption=${encodeURIComponent(caption)}&access_token=${META_TOKEN}`, {method:'POST'});
  if (c.error) throw new Error(JSON.stringify(c.error));
  console.log(`  Container: ${c.id}`);
  
  // Wait for processing
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const s = await gfetch(`https://graph.facebook.com/v25.0/${c.id}?fields=status_code&access_token=${META_TOKEN}`);
    if (s.status_code === 'FINISHED') break;
    if (s.status_code === 'ERROR') throw new Error('Container processing error');
  }
  
  // Publish
  const p = await gfetch(`https://graph.facebook.com/v25.0/${igId}/media_publish?creation_id=${c.id}&access_token=${META_TOKEN}`, {method:'POST'});
  if (p.error) throw new Error(JSON.stringify(p.error));
  return p.id;
}

async function main() {
  const queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
  const approved = queue.filter(p => p.status === 'approved');
  console.log(`Found ${approved.length} approved posts\n`);
  
  for (const post of approved) {
    try {
      const filePath = path.join(INBOX, post.file);
      if (!fs.existsSync(filePath)) { console.log(`❌ File not found: ${post.file}`); continue; }
      
      const igId = ACCOUNTS[post.account];
      if (!igId) { console.log(`❌ Unknown account: ${post.account}`); continue; }
      
      const captionFn = CAPTIONS[post.account];
      if (!captionFn) { console.log(`❌ No caption template for: ${post.account}`); continue; }
      
      const caption = captionFn(post.caption_headline, post.handle);
      
      console.log(`📸 ${post.id}: ${post.file} → ${post.account}`);
      
      // Upload to R2
      const r2Key = `posts/${post.account.replace('@','')}/${Date.now()}-${post.file}`;
      const r2Url = await uploadToR2(filePath, r2Key);
      console.log(`  R2: ${r2Url}`);
      
      // Publish to Instagram
      const mediaId = await publish(igId, r2Url, caption);
      console.log(`  ✅ Published! Media ID: ${mediaId}\n`);
      
      // Update queue
      post.status = 'published';
      post.publishedAt = new Date().toISOString();
      post.postId = mediaId;
      post.r2_url = r2Url;
      fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
      
      // Rate limit
      await new Promise(r => setTimeout(r, 15000));
    } catch (e) {
      console.error(`  ❌ Error: ${e.message}\n`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
