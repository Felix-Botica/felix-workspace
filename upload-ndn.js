require('dotenv').config({ path: require('path').join(process.env.HOME, '.openclaw', '.env'), override: true });
const fs = require('fs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const s3 = new S3Client({
  region: 'auto', endpoint: process.env.R2_ENDPOINT,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY }
});
async function upload(file) {
  const body = fs.readFileSync(require('path').join(process.env.HOME, 'Desktop/nylongerie-content/inbox', file));
  const key = `preview/${file}`;
  await s3.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key, Body: body, ContentType: 'image/jpeg' }));
  console.log(`${file}: ${process.env.R2_PUBLIC_URL}/${key}`);
}
(async () => { await upload('IMG_2563.jpg'); await upload('IMG_1380.jpg'); })();
