require('dotenv').config({ path: require('path').join(process.env.HOME, '.openclaw', '.env'), override: true });
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

const batchFilePath = path.join(process.env.HOME, '.openclaw', 'workspace', 'batch-0327.json');
if (!fs.existsSync(batchFilePath)) {
  console.error('Batch file not found:', batchFilePath);
  process.exit(1);
}
const batch = JSON.parse(fs.readFileSync(batchFilePath, 'utf8'));

async function uploadAll() {
  console.log(`Starting upload for ${batch.length} images...`);
  const ts = Date.now();
  const uploadPromises = batch.map(p => {
    const localPath = path.join(process.env.HOME, '.openclaw', 'nylongerie', 'temp', 'batch-0327', `cropped-${p.file}`);
    if (!fs.existsSync(localPath)) {
      console.error(`Local file not found for ${p.file}, skipping.`);
      return Promise.resolve(null); // Return a resolved promise to not break Promise.all
    }
    const r2Key = `posts/${p.account.substring(1)}/${ts}-${p.file}`;
    const fileContent = fs.readFileSync(localPath);
    
    return s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: r2Key,
      Body: fileContent,
      ContentType: 'image/jpeg'
    })).then(() => {
      const url = `${process.env.R2_PUBLIC_URL}/${r2Key}`;
      console.log(`SUCCESS: ${p.file} -> ${url}`);
      return { ...p, r2_url: url };
    }).catch(err => {
      console.error(`ERROR uploading ${p.file}:`, err.message);
      return null; // Return null on error
    });
  });
  
  const results = (await Promise.all(uploadPromises)).filter(Boolean); // Filter out nulls from skipped/failed uploads
  
  if (results.length > 0) {
    const publishedFilePath = path.join(process.env.HOME, '.openclaw', 'workspace', 'batch-0327-published.json');
    fs.writeFileSync(publishedFilePath, JSON.stringify(results, null, 2));
    console.log(`Successfully uploaded ${results.length} images. Results saved to batch-0327-published.json`);
  } else {
    console.log('No images were uploaded.');
  }
}

uploadAll().catch(e => {
  console.error('A critical error occurred:', e.message);
  console.error(e.stack);
});
