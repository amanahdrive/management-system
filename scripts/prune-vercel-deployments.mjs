// scripts/prune-vercel-deployments.mjs
// Automates deleting old Vercel deployments starting from the oldest date
// Usage: node scripts/prune-vercel-deployments.mjs <VERCEL_TOKEN> [--dry-run] [--keep 5]

const TEAM_ID = 'team_N3J8AsdyvLOB90puwgeJA2L9';
const PROJECT_ID = 'prj_FBdRBv0lckr55ufMZyj0C9yIRbLA';

const args = process.argv.slice(2);
const token = process.env.VERCEL_TOKEN || args.find(a => !a.startsWith('--'));
const isDryRun = args.includes('--dry-run');
const keepIndex = args.indexOf('--keep');
const keepCount = keepIndex !== -1 ? parseInt(args[keepIndex + 1], 10) : 5; // keep 5 latest production deployments

if (!token) {
  console.error('\n❌ Error: Vercel token diperlukan!');
  console.error('Cara pakai:');
  console.error('  node scripts/prune-vercel-deployments.mjs <TOKEN_VERCEL> [--dry-run] [--keep 5]');
  console.error('\nUntuk membuat token (1 menit):');
  console.error('  1. Buka https://vercel.com/account/tokens');
  console.error('  2. Klik "Create Token", beri nama "Prune Old Deployments"');
  console.error('  3. Copy token dan jalankan perintah di atas.\n');
  process.exit(1);
}

const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

async function fetchAllDeployments() {
  const all = [];
  let until = undefined;
  console.log('🔍 Mengambil daftar seluruh deployment dari Vercel...');

  while (true) {
    const url = new URL('https://api.vercel.com/v6/deployments');
    url.searchParams.set('projectId', PROJECT_ID);
    url.searchParams.set('teamId', TEAM_ID);
    url.searchParams.set('limit', '100');
    if (until) {
      url.searchParams.set('until', until.toString());
    }

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gagal mengambil deployment: HTTP ${res.status} - ${err}`);
    }

    const data = await res.json();
    const list = data.deployments || [];
    if (list.length === 0) break;

    all.push(...list);
    if (!data.pagination || !data.pagination.next) break;
    until = data.pagination.next;
  }

  return all;
}

async function main() {
  try {
    const deployments = await fetchAllDeployments();
    console.log(`📦 Ditemukan total ${deployments.length} deployment.`);

    // Sort newest to oldest
    deployments.sort((a, b) => b.created - a.created);

    // Identify active/recent production deployments to KEEP
    const prodDeployments = deployments.filter(d => d.target === 'production' && d.state === 'READY');
    const protectedIds = new Set(prodDeployments.slice(0, keepCount).map(d => d.id));

    console.log(`🛡️  Deployment yang DIPROTEKSI (TIDAK AKAN DIHAPUS - ${protectedIds.size} deployment produksi terbaru):`);
    for (const d of prodDeployments.slice(0, keepCount)) {
      const dateStr = new Date(d.created).toLocaleString('id-ID');
      console.log(`   - [PROD AKTIF] ${d.id} | ${dateStr} | ${d.url}`);
    }

    // Deployments to delete: everything else, sorted from OLDEST to NEWEST
    const toDelete = deployments
      .filter(d => !protectedIds.has(d.id))
      .sort((a, b) => a.created - b.created);

    console.log(`\n🗑️  Deployment yang akan dihapus: ${toDelete.length} deployment (mulai dari tanggal PALING LAMA)`);

    if (toDelete.length === 0) {
      console.log('✅ Tidak ada deployment lama yang perlu dihapus.');
      return;
    }

    if (isDryRun) {
      console.log('\n⚠️  [DRY RUN MODE] Menampilkan 10 deployment tertua yang akan dihapus:');
      for (const d of toDelete.slice(0, 10)) {
        const dateStr = new Date(d.created).toLocaleString('id-ID');
        console.log(`   - ${d.id} | ${dateStr} | ${d.url} (${d.state})`);
      }
      console.log(`\nJalankan tanpa --dry-run untuk langsung menghapus.`);
      return;
    }

    console.log('\n🚀 Memulai proses penghapusan...');
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < toDelete.length; i++) {
      const d = toDelete[i];
      const dateStr = new Date(d.created).toLocaleDateString('id-ID');
      process.stdout.write(`[${i + 1}/${toDelete.length}] Menghapus ${d.id} (${dateStr})... `);

      try {
        const delRes = await fetch(`https://api.vercel.com/v13/deployments/${d.id}?teamId=${TEAM_ID}`, {
          method: 'DELETE',
          headers
        });

        if (delRes.ok) {
          process.stdout.write('✅ Sukses\n');
          successCount++;
        } else {
          const err = await delRes.text();
          process.stdout.write(`❌ Gagal: ${err}\n`);
          failCount++;
        }
      } catch (err) {
        process.stdout.write(`❌ Error: ${err.message}\n`);
        failCount++;
      }

      // Small delay to prevent API rate limiting
      await new Promise(r => setTimeout(r, 150));
    }

    console.log(`\n🎉 Selesai! Berhasil menghapus ${successCount} deployment lama.`);
    if (failCount > 0) {
      console.log(`⚠️ Ada ${failCount} deployment yang gagal dihapus.`);
    }
    console.log('Storage Vercel Anda sekarang akan berkurang secara drastis!');
  } catch (err) {
    console.error('Fatal Error:', err);
  }
}

main();
