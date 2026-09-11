#!/usr/bin/env node
/**
 * Automated Asset Uploader to Supabase Storage
 * Project: yhwwhqqffgtiavapgjvc (Amanah Drive)
 * Bucket: assets (Public CDN)
 *
 * Usage:
 *   node scripts/upload-storage-assets.mjs <SERVICE_ROLE_OR_ANON_KEY>
 * Or set environment variable:
 *   $env:SUPABASE_SERVICE_ROLE_KEY="ey..." ; node scripts/upload-storage-assets.mjs
 */

import fs from 'fs';
import path from 'path';

const SUPABASE_PROJECT_URL = 'https://yhwwhqqffgtiavapgjvc.supabase.co';
const BUCKET_NAME = 'assets';

const apiKey = process.argv[2] || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!apiKey) {
  console.error('\n❌ Error: API Key Supabase diperlukan.');
  console.log('\nCara Penggunaan:');
  console.log('  node scripts/upload-storage-assets.mjs <SUPABASE_KEY>');
  console.log('\nAtau atur environment variable:');
  console.log('  $env:SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."; node scripts/upload-storage-assets.mjs\n');
  process.exit(1);
}

const MIME_TYPES = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.json': 'application/json',
};

async function getFiles(dir, baseDir = dir) {
  let files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files = files.concat(await getFiles(fullPath, baseDir));
    } else {
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      files.push({ fullPath, relPath });
    }
  }
  return files;
}

async function uploadFile(fullPath, remotePath) {
  const ext = path.extname(fullPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const fileBuffer = fs.readFileSync(fullPath);

  const endpoint = `${SUPABASE_PROJECT_URL}/storage/v1/object/${BUCKET_NAME}/${remotePath}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'apikey': apiKey,
      'Content-Type': contentType,
      'x-upsert': 'true',
      'cache-control': 'public, max-age=31536000, immutable',
    },
    body: fileBuffer,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Upload failed [${res.status}]: ${errText}`);
  }

  return `${SUPABASE_PROJECT_URL}/storage/v1/object/public/${BUCKET_NAME}/${remotePath}`;
}

async function main() {
  console.log('🚀 Memulai upload assets ke Supabase Storage (Bucket: assets)...\n');
  const projectRoot = process.cwd();

  const uploadDirs = [
    { localDir: path.join(projectRoot, 'public', 'assets'), remotePrefix: 'assets' },
    { localDir: path.join(projectRoot, 'public', 'staff_models'), remotePrefix: 'staff_models' },
  ];

  let totalUploaded = 0;
  let totalErrors = 0;

  for (const group of uploadDirs) {
    if (!fs.existsSync(group.localDir)) continue;

    const files = await getFiles(group.localDir);
    console.log(`📁 Mengupload ${files.length} file dari ${group.remotePrefix}...`);

    for (const file of files) {
      const remotePath = `${group.remotePrefix}/${file.relPath}`;
      process.stdout.write(`   ⏳ ${remotePath} ... `);
      try {
        const cdnUrl = await uploadFile(file.fullPath, remotePath);
        process.stdout.write(`✅ OK\n      CDN: ${cdnUrl}\n`);
        totalUploaded++;
      } catch (err) {
        process.stdout.write(`❌ Gagal: ${err.message}\n`);
        totalErrors++;
      }
    }
    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🎉 Selesai! Berhasil upload: ${totalUploaded} file. Gagal: ${totalErrors} file.`);
  console.log('Semua aset kini memiliki CDN URL langsung dari Supabase Storage.');
}

main().catch(console.error);
