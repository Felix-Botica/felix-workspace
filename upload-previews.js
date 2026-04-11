require('dotenv').config({ path: require('path').join(process.env.HOME, '.openclaw', '.env'), override: true });
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const INBOX = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'inbox');
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY }
});

const files = ['IMG_5021.jpg','IMG_7815.jpg','IMG_7724.jpg','IMG_0687.jpg','IMG_1863.jpg','IMG_1929.jpg','IMG_1616.jpg'];

async function main() {
  for (const f of files) {
    const filePath = path.join(INBOX, f);
    const key = `preview/${f}`;
    const body = fs.readFileSync(filePath);
    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET, Key: key, Body: body, ContentType: 'image/jpeg'
    }));
    console.log(`${f}: ${R2_PUBLIC_URL}/${key}`);
  }
}
main().catch(e => console.error(e));
