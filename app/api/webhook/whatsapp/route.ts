import { NextRequest, NextResponse } from 'next/server';
import { dbQuery, dbQuerySingle } from '@/lib/db';
import { formatRupiah } from '@/lib/utils/currency';
import { formatDateIndo, formatHariTanggalIndo, getTodayDateString } from '@/lib/utils/date';

export const dynamic = 'force-dynamic';

interface BaileysKey {
  remoteJid?: string;
  fromMe?: boolean;
  id?: string;
  participant?: string;
}

interface BaileysMessageItem {
  key?: BaileysKey;
  pushName?: string;
  message?: {
    conversation?: string;
    extendedTextMessage?: {
      text?: string;
    };
    imageMessage?: {
      caption?: string;
    };
  };
  messageTimestamp?: number | string;
}

interface BaileysWebhookPayload {
  event?: string;
  type?: string;
  data?: any;
  // Flattened gateway formats
  messages?: BaileysMessageItem[];
  remoteJid?: string;
  sender?: string;
  from?: string;
  phone?: string;
  message?: string | any;
  body?: string;
  pushName?: string;
  name?: string;
  isGroup?: boolean;
  [key: string]: any;
}

/**
 * Normalizes Indonesian phone numbers to last 9-10 digits for accurate database lookup
 */
function normalizePhoneSuffix(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length >= 9) {
    return digits.slice(-9); // last 9 digits match regardless of leading 0, 62, or +62
  }
  return digits;
}

/**
 * Attempts to send reply via Baileys WhatsApp Gateway outbound API if configured
 */
async function dispatchOutboundWhatsApp(toJid: string, text: string): Promise<boolean> {
  const gatewayUrl =
    process.env.WHATSAPP_GATEWAY_URL ||
    process.env.BAILEYS_GATEWAY_URL ||
    process.env.WA_GATEWAY_URL;

  if (!gatewayUrl) return false;

  const apiKey = process.env.WHATSAPP_API_KEY || process.env.WA_API_KEY || '';

  try {
    const endpoint = gatewayUrl.endsWith('/') ? `${gatewayUrl}send-message` : `${gatewayUrl}/send-message`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}`, 'x-api-key': apiKey } : {}),
      },
      body: JSON.stringify({
        jid: toJid,
        to: toJid,
        phone: toJid.replace('@s.whatsapp.net', ''),
        message: text,
        text,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('[Baileys Outbound Error]', err);
    return false;
  }
}

/**
 * GET /api/webhook/whatsapp
 * Documentation, Health Check, and Baileys Gateway Integration Guide
 */
export async function GET(request: NextRequest) {
  const host = request.headers.get('host') || 'management-amanahdrive.vercel.app';
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const currentWebhookUrl = `${protocol}://${host}/api/webhook/whatsapp`;

  return NextResponse.json({
    status: 'online',
    service: 'Amanah Drive WhatsApp Gateway Webhook (Baileys Engine)',
    webhookUrl: currentWebhookUrl,
    version: '2.0.0',
    capabilities: [
      'Auto-Responder Interaktif untuk Siswa & Instruktur',
      'Pengecekan Jadwal Sesi Mengemudi Realtime (#jadwal)',
      'Pengecekan Tagihan & Rekening Pembayaran Resmi (#tagihan)',
      'Katalog Paket Kursus Aktif (#paket)',
      'Pelacakan Status Berkas & Penerbitan SIM (#sim)',
      'Kontak CS & Lokasi Basecamp (#kontak)',
      'Logging Status Koneksi Baileys (connection.update)',
    ],
    supportedEvents: [
      'messages.upsert',
      'message',
      'connection.update',
      'messages.update',
    ],
    commandList: {
      'menu / halo / bantuan': 'Tampilkan menu interaktif utama',
      '#jadwal': 'Lihat jadwal belajar mengemudi siswa / jadwal instruktur',
      '#tagihan': 'Cek sisa biaya kursus & nomor rekening transfer bank',
      '#paket': 'Daftar paket kursus mengemudi & biaya resmi',
      '#sim': 'Cek status pembuatan & pengambilan SIM',
      '#kontak': 'Alamat kantor basecamp & nomor WhatsApp admin',
    },
    sampleBaileysListener: `
// Contoh integrasi di server Baileys Anda:
sock.ev.on('messages.upsert', async (m) => {
  if (m.type === 'notify') {
    await fetch('${currentWebhookUrl}', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-webhook-secret': process.env.WEBHOOK_SECRET || '' 
      },
      body: JSON.stringify({ event: 'messages.upsert', data: m })
    });
  }
});
    `.trim(),
  });
}

/**
 * POST /api/webhook/whatsapp
 * Handles incoming Baileys webhook events, parses chats, and generates auto-replies
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Secret Token Verification (Optional if WEBHOOK_SECRET is set)
    const expectedSecret = process.env.WEBHOOK_SECRET || process.env.WA_WEBHOOK_SECRET;
    if (expectedSecret) {
      const authHeader = request.headers.get('authorization');
      const customSecret = request.headers.get('x-webhook-secret') || request.headers.get('x-wa-secret');
      const bearerSecret = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
      const providedSecret = customSecret || bearerSecret;

      if (providedSecret && providedSecret !== expectedSecret) {
        return NextResponse.json({ error: 'Unauthorized: Invalid webhook secret' }, { status: 401 });
      }
    }

    const payload: BaileysWebhookPayload = await request.json().catch(() => ({}));
    const eventType = payload.event || payload.type || 'message';

    // 2. Handle connection.update events from Baileys
    if (eventType === 'connection.update' || payload.data?.connection) {
      const connData = payload.data || payload;
      console.log('[Baileys Connection Update]', {
        connection: connData.connection,
        qr: Boolean(connData.qr),
        lastDisconnect: connData.lastDisconnect?.error?.message,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        event: 'connection.update',
        status: connData.connection || 'received',
      });
    }

    // 3. Extract Message Content from Baileys structure or flattened gateway
    let rawItem: BaileysMessageItem | null = null;
    let textContent = '';
    let remoteJid = '';
    let senderName = '';
    let fromMe = false;

    // A. Native Baileys structure: { event: 'messages.upsert', data: { messages: [...] } }
    if (payload.data?.messages && Array.isArray(payload.data.messages) && payload.data.messages.length > 0) {
      rawItem = payload.data.messages[0];
    } else if (payload.messages && Array.isArray(payload.messages) && payload.messages.length > 0) {
      rawItem = payload.messages[0];
    }

    if (rawItem) {
      remoteJid = rawItem.key?.remoteJid || '';
      fromMe = Boolean(rawItem.key?.fromMe);
      senderName = rawItem.pushName || 'Siswa';
      textContent =
        rawItem.message?.conversation ||
        rawItem.message?.extendedTextMessage?.text ||
        rawItem.message?.imageMessage?.caption ||
        '';
    } else {
      // B. Flattened gateway structure
      remoteJid = payload.remoteJid || payload.sender || payload.from || payload.phone || '';
      if (remoteJid && !remoteJid.includes('@')) {
        remoteJid = `${remoteJid}@s.whatsapp.net`;
      }
      senderName = payload.pushName || payload.name || 'Pengguna';
      textContent =
        typeof payload.message === 'string'
          ? payload.message
          : payload.body || payload.message?.text || '';
    }

    // Ignore self messages or empty messages
    if (fromMe || !textContent || !remoteJid) {
      return NextResponse.json({ ok: true, ignored: true, reason: fromMe ? 'fromMe' : 'empty' });
    }

    // Extract clean phone number without @s.whatsapp.net or @g.us
    const isGroup = remoteJid.endsWith('@g.us');
    const cleanDigits = remoteJid.split('@')[0].replace(/[^0-9]/g, '');
    const phoneSuffix = normalizePhoneSuffix(cleanDigits);

    const cleanQuery = textContent.trim().toLowerCase();

    // 4. Automatic Database Lookup for Student / Staff
    let matchedSiswa: any = null;
    let matchedStaff: any = null;

    if (phoneSuffix) {
      try {
        matchedSiswa = await dbQuerySingle(
          `SELECT s.id, s.kode_siswa, s.nama, s.no_whatsapp, s.status_pembayaran_kode,
                  s.harga_final, s.dp_nominal, s.status_sim, s.tanggal_selesai_sim, s.catatan_sim,
                  p.nama_paket, p.jumlah_sesi, p.termasuk_sim
           FROM siswa s
           LEFT JOIN paket p ON s.paket_id = p.id
           WHERE REGEXP_REPLACE(s.no_whatsapp, '[^0-9]', '', 'g') LIKE '%' || $1
           LIMIT 1`,
          [phoneSuffix]
        );

        if (!matchedSiswa) {
          matchedStaff = await dbQuerySingle(
            `SELECT id, nama, role, telepon FROM staff
             WHERE aktif = true AND REGEXP_REPLACE(telepon, '[^0-9]', '', 'g') LIKE '%' || $1
             LIMIT 1`,
            [phoneSuffix]
          );
        }
      } catch (err) {
        console.error('[DB Lookup Error in WA Webhook]', err);
      }
    }

    // 5. Intelligent Command Processing & Response Generation
    let replyText = '';

    // ==========================================
    // COMMAND: #JADWAL / JADWAL
    // ==========================================
    if (cleanQuery.startsWith('#jadwal') || cleanQuery === 'jadwal') {
      const todayStr = getTodayDateString();

      // Case A: Sender is Instructor / Staff
      if (matchedStaff) {
        const sesiStaff = await dbQuery(
          `SELECT js.nomor_sesi_ke, js.total_sesi_paket, js.status_sesi,
                  s.nama AS nama_siswa, s.no_whatsapp AS wa_siswa,
                  k.nama_kendaraan, k.plat_nomor,
                  sw.jam_mulai, sw.jam_selesai, sw.nama_slot
           FROM jadwal_sesi js
           JOIN siswa s ON js.siswa_id = s.id
           LEFT JOIN kendaraan k ON js.kendaraan_id = k.id
           LEFT JOIN slot_waktu sw ON js.slot_waktu_id = sw.id
           WHERE js.staff_id = $1 AND js.tanggal_sesi = $2 AND js.status_sesi != 'batal'
           ORDER BY sw.urutan ASC NULLS LAST`,
          [matchedStaff.id, todayStr]
        );

        if (sesiStaff.length === 0) {
          replyText =
            `📅 *JADWAL MENGAJAR HARI INI*\n` +
            `Halo Coach *${matchedStaff.nama}*!\n` +
            `Tanggal: *${formatHariTanggalIndo(todayStr)}*\n\n` +
            `_Tidak ada jadwal sesi mengemudi untuk Anda hari ini. Selamat beristirahat!_ 🚗`;
        } else {
          replyText =
            `📅 *JADWAL MENGAJAR COACH ${matchedStaff.nama.toUpperCase()}*\n` +
            `Tanggal: *${formatHariTanggalIndo(todayStr)}*\n` +
            `Total: *${sesiStaff.length} Sesi Aktif*\n` +
            `────────────────────────\n\n`;

          sesiStaff.forEach((s: any, i: number) => {
            const jam = s.jam_mulai ? `${s.jam_mulai.slice(0, 5)} - ${s.jam_selesai ? s.jam_selesai.slice(0, 5) : ''}` : '-';
            const status = s.status_sesi === 'selesai' ? '✅ Selesai' : '⏳ Terjadwal';
            replyText += `*${i + 1}. [${jam}] ${s.nama_siswa}*\n`;
            replyText += `   • Sesi: ${s.nomor_sesi_ke}/${s.total_sesi_paket || '-'}\n`;
            replyText += `   • Mobil: ${s.nama_kendaraan || '-'} (${s.plat_nomor || '-'})\n`;
            replyText += `   • Status: ${status}\n\n`;
          });

          replyText += `_Harap lakukan cek & foto odometer sebelum keluar dan saat kembali ke basecamp._`;
        }
      }
      // Case B: Sender is Registered Student
      else if (matchedSiswa) {
        const sesiSiswa = await dbQuery(
          `SELECT js.tanggal_sesi, js.nomor_sesi_ke, js.total_sesi_paket, js.status_sesi,
                  st.nama AS nama_instruktur,
                  sw.jam_mulai, sw.jam_selesai, sw.nama_slot
           FROM jadwal_sesi js
           LEFT JOIN staff st ON js.staff_id = st.id
           LEFT JOIN slot_waktu sw ON js.slot_waktu_id = sw.id
           WHERE js.siswa_id = $1 AND js.status_sesi != 'batal'
           ORDER BY js.tanggal_sesi ASC, sw.urutan ASC`,
          [matchedSiswa.id]
        );

        const sesiSelesai = sesiSiswa.filter((s: any) => s.status_sesi === 'selesai').length;
        const totalSesi = matchedSiswa.jumlah_sesi || 8;

        replyText =
          `🚗 *INFORMASI JADWAL LATIHAN SISWA*\n\n` +
          `• *Nama Siswa:* ${matchedSiswa.nama}\n` +
          `• *Kode Siswa:* ${matchedSiswa.kode_siswa}\n` +
          `• *Paket:* ${matchedSiswa.nama_paket || 'Kursus Mengemudi'}\n` +
          `• *Progress:* ${sesiSelesai} dari ${totalSesi} Sesi Selesai\n` +
          `────────────────────────\n\n` +
          `*Daftar Sesi Anda:*\n`;

        if (sesiSiswa.length === 0) {
          replyText += `_Jadwal sesi Anda sedang dalam proses penyusunan oleh Admin._\n`;
        } else {
          sesiSiswa.forEach((s: any) => {
            const tgl = formatDateIndo(s.tanggal_sesi);
            const jam = s.jam_mulai ? `${s.jam_mulai.slice(0, 5)} WIB` : '-';
            const icon = s.status_sesi === 'selesai' ? '✅' : '⏳';
            replyText += `${icon} *Sesi ${s.nomor_sesi_ke}:* ${tgl} (${jam})\n`;
            replyText += `   Instruktur: ${s.nama_instruktur || 'Ditugaskan admin'}\n`;
          });
        }

        replyText += `\n_Jika ingin reschedule sesi, harap hubungi Admin minimal 1 hari sebelumnya._`;
      }
      // Case C: Unregistered Phone
      else {
        replyText =
          `🔍 *PENGECEKAN JADWAL*\n\n` +
          `Nomor WhatsApp Anda belum terdaftar otomatis di sistem kami.\n\n` +
          `Silakan ketik kode siswa Anda (contoh: *#jadwal SS010*) atau hubungi Admin kami untuk verifikasi jadwal latihan Anda.`;
      }
    }

    // ==========================================
    // COMMAND: #TAGIHAN / TAGIHAN / BIAYA
    // ==========================================
    else if (
      cleanQuery.startsWith('#tagihan') ||
      cleanQuery === 'tagihan' ||
      cleanQuery.startsWith('#biaya') ||
      cleanQuery === 'biaya'
    ) {
      if (matchedSiswa) {
        const totalBiaya = Number(matchedSiswa.harga_final || 0);
        const dp = Number(matchedSiswa.dp_nominal || 0);
        const isLunas = matchedSiswa.status_pembayaran_kode === 'lunas';
        const sisaTagihan = isLunas ? 0 : Math.max(0, totalBiaya - dp);

        // Ambil daftar rekening resmi
        const rekeningList = await dbQuery(
          `SELECT nama_bank, nomor_rekening, atas_nama FROM rekening_bank WHERE aktif = true ORDER BY is_default DESC LIMIT 2`
        );

        replyText =
          `💳 *STATUS PEMBAYARAN KURSUS*\n\n` +
          `• *Nama Siswa:* ${matchedSiswa.nama}\n` +
          `• *Kode Siswa:* ${matchedSiswa.kode_siswa}\n` +
          `• *Paket:* ${matchedSiswa.nama_paket || 'Kursus Mengemudi'}\n` +
          `• *Total Biaya:* ${formatRupiah(totalBiaya)}\n` +
          `• *DP Terbayar:* ${formatRupiah(dp)}\n` +
          `• *Status:* ${isLunas ? '✅ *LUNAS*' : '⏳ *BELUM LUNAS*'}\n` +
          `• *Sisa Tagihan:* *${formatRupiah(sisaTagihan)}*\n` +
          `────────────────────────\n\n`;

        if (!isLunas && rekeningList.length > 0) {
          replyText += `*Rekening Pembayaran Resmi Amanah Drive:*\n`;
          rekeningList.forEach((r: any) => {
            replyText += `🏦 *${r.nama_bank}*: \`${r.nomor_rekening}\`\n   a.n. ${r.atas_nama}\n`;
          });
          replyText += `\n_Harap kirimkan bukti transfer ke nomor WhatsApp ini setelah melakukan pembayaran._`;
        } else if (isLunas) {
          replyText += `_Terima kasih, administrasi pembayaran kursus Anda telah lunas sepenuhnya._ 🎉`;
        }
      } else {
        replyText =
          `💳 *CEK TAGIHAN KURSUS*\n\n` +
          `Nomor WhatsApp Anda belum terdaftar sebagai siswa aktif.\n` +
          `Untuk mendaftar kursus atau mengecek informasi biaya, silakan ketik *#paket* atau hubungi Admin kami di nomor kantor.`;
      }
    }

    // ==========================================
    // COMMAND: #SIM / SIM
    // ==========================================
    else if (cleanQuery.startsWith('#sim') || cleanQuery === 'sim') {
      if (matchedSiswa) {
        const isSelesai = matchedSiswa.status_sim === 'selesai';
        replyText =
          `🪪 *STATUS BERKAS & PENERBITAN SIM*\n\n` +
          `• *Nama Siswa:* ${matchedSiswa.nama}\n` +
          `• *Kode:* ${matchedSiswa.kode_siswa}\n` +
          `• *Paket SIM:* ${matchedSiswa.termasuk_sim ? 'Termasuk Pembuatan SIM' : 'Tanpa SIM (Hanya Kursus)'}\n` +
          `• *Status SIM:* ${isSelesai ? '✅ *SIAP DIAMBIL / SELESAI*' : '⏳ *DALAM PROSES PEMBUATAN*'}\n`;

        if (isSelesai && matchedSiswa.tanggal_selesai_sim) {
          replyText += `• *Tanggal Terbit:* ${formatDateIndo(matchedSiswa.tanggal_selesai_sim)}\n`;
        }

        if (matchedSiswa.catatan_sim) {
          replyText += `• *Catatan:* ${matchedSiswa.catatan_sim}\n`;
        }

        replyText +=
          `\n_Pengambilan fisik SIM dapat dilakukan di kantor operasional Amanah Drive pada jam kerja (08:00 - 17:00 WIB)._`;
      } else {
        replyText =
          `🪪 *INFORMASI SIM*\n\n` +
          `Amanah Drive melayani kursus mengemudi paket lengkap sekaligus pendampingan penerbitan SIM A & SIM C resmi.\n` +
          `Ketik *#paket* untuk melihat pilihan paket yang sudah termasuk SIM.`;
      }
    }

    // ==========================================
    // COMMAND: #PAKET / PAKET / HARGA
    // ==========================================
    else if (cleanQuery.startsWith('#paket') || cleanQuery === 'paket' || cleanQuery === 'harga') {
      const paketList = await dbQuery(
        `SELECT nama_paket, jumlah_sesi, termasuk_sim, harga_normal, harga_promo
         FROM paket WHERE aktif = true ORDER BY harga_normal ASC`
      );

      replyText =
        `📋 *KATALOG PAKET KURSUS AMANAH DRIVE*\n` +
        `Pilihan paket belajar mengemudi resmi & bergaransi:\n` +
        `────────────────────────\n\n`;

      paketList.forEach((p: any, idx: number) => {
        const harga = p.harga_promo && p.harga_promo < p.harga_normal ? p.harga_promo : p.harga_normal;
        const simBadge = p.termasuk_sim ? ' (+ SIM)' : ' (Tanpa SIM)';
        replyText += `*${idx + 1}. ${p.nama_paket}${simBadge}*\n`;
        replyText += `   • Jumlah Latihan: ${p.jumlah_sesi} Sesi\n`;
        replyText += `   • Biaya: *${formatRupiah(harga)}*\n\n`;
      });

      replyText +=
        `✨ *Fasilitas:* Mobil Ber-AC (Manual & Matic), Instruktur Sabar & Berpengalaman, Jadwal Fleksibel.\n\n` +
        `Ketik *#kontak* untuk melakukan pendaftaran hari ini!`;
    }

    // ==========================================
    // COMMAND: #KONTAK / LOKASI / ADMIN
    // ==========================================
    else if (
      cleanQuery.startsWith('#kontak') ||
      cleanQuery === 'kontak' ||
      cleanQuery === 'lokasi' ||
      cleanQuery === 'admin'
    ) {
      replyText =
        `📍 *KANTOR & BASECAMP AMANAH DRIVE*\n\n` +
        `• *Alamat:* Jl. Sukabangun II No. 15, Palembang, Sumatera Selatan\n` +
        `• *Jam Operasional:* Setiap Hari (07:00 - 18:00 WIB)\n` +
        `• *WhatsApp Admin:* 0812-7890-1234\n` +
        `• *Website:* https://management-amanahdrive.vercel.app\n\n` +
        `_Silakan datang langsung ke kantor kami untuk konsultasi dan pendaftaran jadwal kursus._ 🚗`;
    }

    // ==========================================
    // DEFAULT: MENU / GREETING
    // ==========================================
    else {
      const greetingName = matchedSiswa?.nama || matchedStaff?.nama || senderName;
      replyText =
        `👋 *Halo ${greetingName}!* Selamat datang di layanan otomatis *Amanah Drive Palembang*.\n\n` +
        `Silakan pilih perintah di bawah ini untuk mendapatkan informasi cepat:\n\n` +
        `1️⃣ *#jadwal* — Cek jadwal latihan mengemudi\n` +
        `2️⃣ *#tagihan* — Cek status pembayaran & nomor rekening\n` +
        `3️⃣ *#paket* — Daftar paket kursus & rincian biaya\n` +
        `4️⃣ *#sim* — Cek status pembuatan SIM\n` +
        `5️⃣ *#kontak* — Alamat kantor & nomor kontak Admin\n\n` +
        `_Ketik salah satu kode perintah di atas (contoh: *#jadwal* atau *#paket*)._`;
    }

    // 6. Dispatch Reply to WhatsApp User via Baileys Gateway (if URL is set)
    if (replyText) {
      await dispatchOutboundWhatsApp(remoteJid, replyText);
    }

    // Log the incoming WhatsApp interaction
    console.log('[Baileys Webhook Processed]', {
      from: remoteJid,
      name: senderName,
      command: cleanQuery.slice(0, 30),
      isStudent: Boolean(matchedSiswa),
      isStaff: Boolean(matchedStaff),
      timestamp: new Date().toISOString(),
    });

    // 7. Return HTTP 200 with formatted reply payload
    return NextResponse.json({
      success: true,
      event: eventType,
      sender: remoteJid,
      matched: {
        isStudent: Boolean(matchedSiswa),
        studentCode: matchedSiswa?.kode_siswa || null,
        isStaff: Boolean(matchedStaff),
      },
      reply: {
        to: remoteJid,
        text: replyText,
      },
    });
  } catch (error: any) {
    console.error('[Baileys Webhook Exception]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Error processing WhatsApp webhook' },
      { status: 500 }
    );
  }
}
