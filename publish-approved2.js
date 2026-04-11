require('dotenv').config({ path: require('path').join(process.env.HOME, '.openclaw', '.env'), override: true });
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const INBOX = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'inbox');
const QUEUE_FILE = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'queue.json');
const META_TOKEN = process.env.META_ACCESS_TOKEN;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY }
});

const posts = [
  {
    queueId: 'draft-20260322-lf1',
    file: 'IMG_5021.jpg',
    igId: '17841402884847036',
    account: '@legfashion',
    caption: `legfashion ■ Shop @nylongerie ♡ Nylongerie.com
Red hearts & patterned perfection ★ @ni.petersova
🦵
Featured by Leg Fashion™ @legfashion
•
Copyright © ni.petersova, 2026
Leg Fashion™ legal notice: All copyrights belong to the model, brand or photographer and have been published with their permission. Reposting only allowed with consent of the copyright holder.
•
♥ Always tag @legfashion and #legfashion

#legfashion #nylondarling #nylongerie #nyloncherie #classynylons #fashiontights #tightsfashion #legscrossed #pantyhosefashion #hosierylover #beautifullegs #shinynylons #nylons #nylonlegs #instanylon #tights #pantyhose #collant #calze #pantyhosemodel #pantyhoselegs #stockings #instaheels

· Leg Fashion™ is a brand and network member of Nylongerie® Fashion & Friends by Alex S.
□ Follow @nylondarling @nyloncherie @shinynylonstar`
  },
  {
    queueId: 'draft-20260322-bsn2',
    file: 'IMG_1863.jpg',
    igId: '17841471823236920',
    account: '@blackshinynylon',
    caption: `blackshinynylon ■ Shop @nylongerie ♡ Nylongerie.com
Leopard sheer & European architecture ★ @jakekyloy
🖤
Featured by Black Shiny Nylon™ @blackshinynylon
•
Copyright © jakekyloy, 2026
Black Shiny Nylon™ legal notice: All copyrights belong to the model, brand or photographer and have been published with their permission. Reposting only allowed with consent of the copyright holder.
•
♥ Always tag @blackshinynylon and #blackshinynylon

#blackshinynylon #nylondarling #legfashion #nylongerie #darknylons #blacktights #fashiontights #tightsfashion #pantyhosefashion #hosierylover #beautifullegs #shinynylons #nylons #nylonlegs #instanylon #tights #pantyhose #collant #calze #pantyhosemodel #stockings #darkfashion #blackaesthetic

· Black Shiny Nylon™ is a brand and network member of Nylongerie® Fashion & Friends by Alex S.
□ Follow @nylondarling @legfashion @shinynylonstar @planetnylon @nextdoornylon`
  },
  {
    queueId: 'draft-20260322-pn1',
    file: 'IMG_1929.jpg',
    igId: '17841472009081615',
    account: '@planetnylon',
    caption: `planetnylon ■ Shop @nylongerie ♡ Nylongerie.com
Leather trench descending in style ★ @the.queen.tiff
🌍
Featured by Planet Nylon™ @planetnylon
•
Copyright © the.queen.tiff, 2026
Planet Nylon™ legal notice: All copyrights belong to the model, brand or photographer and have been published with their permission. Reposting only allowed with consent of the copyright holder.
•
♥ Always tag @planetnylon and #planetnylon

#planetnylon #nylondarling #legfashion #nylongerie #edgyfashion #leatherfashion #fashiontights #tightsfashion #pantyhosefashion #hosierylover #beautifullegs #shinynylons #nylons #nylonlegs #instanylon #tights #pantyhose #collant #calze #pantyhosemodel #stockings #leather #edgystyle

· Planet Nylon™ is a brand and network member of Nylongerie® Fashion & Friends by Alex S.
□ Follow @nylondarling @legfashion @shinynylonstar @blackshinynylon @nextdoornylon`
  }
];

async function uploadToR2(filePath, key) {
  const body = fs.readFileSync(filePath);
  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET, Key: key, Body: body, ContentType: 'image/jpeg'
  }));
  return `${R2_PUBLIC_URL}/${key}`;
}

async function publish(igId, imageUrl, caption) {
  const c = await fetch(`https://graph.facebook.com/v25.0/${igId}/media`, {
    method: 'POST',
    headers: {'Content-Type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({ image_url: imageUrl, caption, access_token: META_TOKEN })
  }).then(r => r.json());
  if (c.error) throw new Error(JSON.stringify(c.error));
  console.log(`  Container: ${c.id}`);
  
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const s = await fetch(`https://graph.facebook.com/v25.0/${c.id}?fields=status_code&access_token=${META_TOKEN}`).then(r => r.json());
    if (s.status_code === 'FINISHED') break;
    if (s.status_code === 'ERROR') throw new Error('Container processing error');
  }
  
  const p = await fetch(`https://graph.facebook.com/v25.0/${igId}/media_publish`, {
    method: 'POST',
    headers: {'Content-Type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({ creation_id: c.id, access_token: META_TOKEN })
  }).then(r => r.json());
  if (p.error) throw new Error(JSON.stringify(p.error));
  return p.id;
}

async function main() {
  const queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
  
  for (const post of posts) {
    try {
      const filePath = path.join(INBOX, post.file);
      console.log(`📸 ${post.file} → ${post.account}`);
      
      const r2Key = `posts/${post.account.replace('@','')}/${Date.now()}-${post.file}`;
      const r2Url = await uploadToR2(filePath, r2Key);
      console.log(`  R2: ${r2Url}`);
      
      const mediaId = await publish(post.igId, r2Url, post.caption);
      console.log(`  ✅ Published! Media ID: ${mediaId}\n`);
      
      // Update queue
      const entry = queue.find(q => q.id === post.queueId);
      if (entry) {
        entry.status = 'published';
        entry.publishedAt = new Date().toISOString();
        entry.postId = mediaId;
        entry.r2_url = r2Url;
      }
      fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
      
      await new Promise(r => setTimeout(r, 15000));
    } catch (e) {
      console.error(`  ❌ Error: ${e.message}\n`);
    }
  }
  
  // Mark rejected drafts
  for (const id of ['draft-20260322-lf2','draft-20260322-lf3','draft-20260322-bsn1','draft-20260322-pn2']) {
    const entry = queue.find(q => q.id === id);
    if (entry) entry.status = 'rejected';
  }
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
  console.log('Queue updated, rejected drafts marked.');
}

main().catch(e => { console.error(e); process.exit(1); });
