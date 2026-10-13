import { Telegraf, Markup } from 'telegraf';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { fetchRawAirdrops } from './scraper.js';
import { analyzeAndFormatAirdrop } from './ai.js';
import { saveAirdrop, removeSavedAirdrop, getSavedAirdrops } from './storage.js';

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

let isAutoScanningActive = false;
let cronTask = null;
const cacheAirdrops = new Map();

function getMainMenuKeyboard() {
  return Markup.keyboard([
    ['🚀 Mulai Pemindaian Otomatis', '🛑 Berhenti Pemindaian'],
    ['🔎 Cek Airdrop Sekarang', '📁 Lihat Airdrop Tersimpan']
  ]).resize();
}

bot.start((ctx) => {
  ctx.reply(
    '👋 *Selamat Datang di Bot Airdrop AI Hunter (Powered by Grok)*\n\nGunakan tombol menu di bawah untuk mengontrol bot:',
    { parse_mode: 'Markdown', ...getMainMenuKeyboard() }
  );
});

bot.hears('🚀 Mulai Pemindaian Otomatis', (ctx) => {
  if (isAutoScanningActive) {
    return ctx.reply('✅ Pemindaian harian otomatis sudah berjalan.');
  }

  isAutoScanningActive = true;
  cronTask = cron.schedule('0 2 * * *', async () => {
    console.log('[CRON] Running daily airdrop scan...');
    await runAirdropScan(bot.telegram, CHAT_ID);
  });

  ctx.reply('▶️ *Pemindaian otomatis 24/7 diaktifkan!* Bot akan memindai & melaporkan airdrop baru setiap hari.', { parse_mode: 'Markdown' });
});

bot.hears('🛑 Berhenti Pemindaian', (ctx) => {
  if (!isAutoScanningActive) {
    return ctx.reply('ℹ️ Pemindaian otomatis sedang tidak aktif.');
  }

  isAutoScanningActive = false;
  if (cronTask) cronTask.stop();
  ctx.reply('⏹️ *Pemindaian otomatis dihentikan.* Bot tidak akan mengirim pembaruan harian secara otomatis.', { parse_mode: 'Markdown' });
});

bot.hears('🔎 Cek Airdrop Sekarang', async (ctx) => {
  await ctx.reply('🔎 *Sedang memindai data & memproses analisis Grok AI... (Mohon tunggu)*', { parse_mode: 'Markdown' });
  await runAirdropScan(ctx.telegram, ctx.chat.id);
});

bot.hears('📁 Lihat Airdrop Tersimpan', (ctx) => {
  const saved = getSavedAirdrops();
  if (!saved.length) {
    return ctx.reply('📂 Belum ada airdrop yang disimpan.');
  }

  ctx.reply(`📦 *Daftar Airdrop Tersimpan (${saved.length}):*`, { parse_mode: 'Markdown' });
  
  for (const item of saved) {
    const text = formatAirdropMessage(item);
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('❌ Hapus dari Simpanan', `delete_saved_${item.id}`)]
    ]);
    ctx.reply(text, { parse_mode: 'Markdown', disable_web_page_preview: true, ...keyboard });
  }
});

async function runAirdropScan(telegramObj, chatId) {
  const rawList = await fetchRawAirdrops();
  if (!rawList.length) {
    return telegramObj.sendMessage(chatId, '❌ Gagal mengambil data airdrop terbaru.');
  }

  for (const rawItem of rawList.slice(0, 3)) {
    const analyzed = await analyzeAndFormatAirdrop(rawItem);
    if (analyzed && analyzed.length > 0) {
      const item = analyzed[0];
      cacheAirdrops.set(item.id, item);

      const messageText = formatAirdropMessage(item);
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('💾 Simpan Airdrop', `save_${item.id}`),
          Markup.button.callback('❌ Buang / Hapus', `dismiss_${item.id}`)
        ]
      ]);

      await telegramObj.sendMessage(chatId, messageText, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        ...keyboard
      });
    }
  }
}

function formatAirdropMessage(item) {
  const stepsList = item.steps ? item.steps.map(s => `  • ${s}`).join('\n') : '  • Lihat panduan di link resmi';
  
  return `💎 *AIRDROP REPORT: ${item.name}* 💎\n\n` +
         `🌐 *Jaringan:* ${item.chain}\n` +
         `📌 *Status:* ${item.status}\n` +
         `🏷️ *Kategori:* ${item.category}\n` +
         `💰 *Estimasi Potensi:* ${item.reward_potential}\n` +
         `💵 *Modal Required:* ${item.capital_required}\n\n` +
         `💡 *Alasan Pemilihan (Grok AI):*\n${item.reason}\n\n` +
         `📋 *Langkah-Langkah Partisipasi:* \n${stepsList}\n\n` +
         `🛡️ *Tips Anti-Sybil:* ${item.sybil_tips || 'Gunakan wallet terpisah'}\n\n` +
         `🔗 *Link Resmi:* ${item.url}`;
}

bot.action(/^save_(.+)$/, (ctx) => {
  const id = ctx.match[1];
  const item = cacheAirdrops.get(id);

  if (!item) {
    return ctx.answerCbQuery('⚠️ Data airdrop tidak ditemukan di cache.');
  }

  const success = saveAirdrop(item);
  if (success) {
    ctx.answerCbQuery('✅ Airdrop berhasil disimpan!');
    ctx.editMessageReplyMarkup(Markup.inlineKeyboard([
      [Markup.button.callback('✅ Tersimpan dalam Database', 'already_saved')]
    ]).reply_markup);
  } else {
    ctx.answerCbQuery('ℹ️ Airdrop sudah pernah disimpan sebelumnya.');
  }
});

bot.action(/^dismiss_(.+)$/, (ctx) => {
  ctx.answerCbQuery('🗑️ Dihapus');
  ctx.deleteMessage();
});

bot.action(/^delete_saved_(.+)$/, (ctx) => {
  const id = ctx.match[1];
  removeSavedAirdrop(id);
  ctx.answerCbQuery('❌ Berhasil dihapus dari penyimpanan.');
  ctx.deleteMessage();
});

bot.action('already_saved', (ctx) => ctx.answerCbQuery('Sudah tersimpan!'));

bot.launch().then(() => {
  console.log('🤖 Bot Telegram Airdrop Grok AI Siap Digunakan!');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
            
