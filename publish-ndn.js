require('dotenv').config({ path: require('path').join(process.env.HOME, '.openclaw', '.env'), override: true });
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const INBOX = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'inbox');
const QUEUE_FILE = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'queue.json');
const META_TOKEN = process.env.META_ACCESS_TOKEN;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

const s3 = new S3Client({
  region: 'auto', endpoint: process.env.R2_ENDPOINT,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY }
});

const caption = `nextdoornylon ■ Shop @nylongerie ♡ Nylongerie.com
Warm smile & classic sheer black tights ★ @amandineherbe
🏡
Featured by Nextdoor Nylon™ @nextdoornylon
•
Copyright © amandineherbe, 2026
Nextdoor Nylon™ legal notice: All copyrights belong to the model, brand or photographer and have been published with their permission. Reposting only allowed with consent of the copyright holder.
•
♥ Always tag @nextdoornylon and #nextdoornylon

#nextdoornylon #nylondarling #legfashion #nylongerie #casualstyle #everydayfashion #fashiontights #tightsfashion #pantyhosefashion #hosierylover #beautifullegs #nylons #nylonlegs #instanylon #tights #pantyhose #collant #calze #pantyhosemodel #streetstyle #casualchic #girlnextdoor #realstyle

· Nextdoor Nylon™ is a brand and network member of Nylongerie® Fashion & Friends by Alex S.
□ Follow @nylondarling @legfashion @shinynylonstar @blackshinynylon @planetnylon`;

async function main() {
  const filePath = path.join(INBOX, 'IMG_1380.jpg');
  const r2Key = 'posts/nextdoornylon/' + Date.now() + '-IMG_1380.jpg';
  const body = fs.readFileSync(filePath);
  await s3.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET, Key: r2Key, Body: body, ContentType: 'image/jpeg' }));
  const r2Url = R2_PUBLIC_URL + '/' + r2Key;
  console.log('R2:', r2Url);

  const c = await fetch('https://graph.facebook.com/v25.0/17841472299535162/media', {
    method: 'POST', headers: {'Content-Type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({ image_url: r2Url, caption, access_token: META_TOKEN })
  }).then(r => r.json());
  if (c.error) throw new Error(JSON.stringify(c.error));
  console.log('Container:', c.id);

  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const s = await fetch('https://graph.facebook.com/v25.0/' + c.id + '?fields=status_code&access_token=' + META_TOKEN).then(r => r.json());
    if (s.status_code === 'FINISHED') break;
    if (s.status_code === 'ERROR') throw new Error('Processing error');
  }

  const p = await fetch('https://graph.facebook.com/v25.0/17841472299535162/media_publish', {
    method: 'POST', headers: {'Content-Type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({ creation_id: c.id, access_token: META_TOKEN })
  }).then(r => r.json());
  if (p.error) throw new Error(JSON.stringify(p.error));
  console.log('✅ Published! Media ID:', p.id);

  // Update queue
  const queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
  queue.push({
    id: 'draft-20260322-ndn1', file: 'IMG_1380.jpg', account: '@nextdoornylon',
    handle: '@amandineherbe', status: 'published', postId: p.id,
    publishedAt: new Date().toISOString(), r2_url: r2Url,
    caption_headline: 'Warm smile & classic sheer black tights'
  });
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
}
main().catch(e => { console.error(e); process.exit(1); });
