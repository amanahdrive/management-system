const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yhwwhqqffgtiavapgjvc.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

console.log('Testing Supabase client with URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const [txRes, siswaRes, hutangRes] = await Promise.all([
    supabase.from('kas_transaksi').select('tipe, nominal, jenis_pembayaran'),
    supabase.from('siswa').select('harga_final, dp_nominal, status_pembayaran_kode'),
    supabase.from('hutang').select('sisa_hutang').eq('status', 'berjalan'),
  ]);

  console.log('txRes:', { count: txRes.data?.length, error: txRes.error });
  console.log('siswaRes:', { count: siswaRes.data?.length, error: siswaRes.error });
  console.log('hutangRes:', { count: hutangRes.data?.length, error: hutangRes.error });
}

check();
