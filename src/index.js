import { Telegraf, Markup } from 'telegraf';
import dotenv from 'dotenv';
import { fetchRawAirdrops } from './scraper.js';
import { analyzeAndFormatAirdrop } from './ai.js';
import { getSavedAirdrops, saveAirdrop, removeSavedAirdrop } from './storage.js';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error('TELEGRAM_BOT_TOKEN tidak ditemukan di environment variables!');
  process.exit(1);
}

const bot = new Telegraf(token);

bot.start((ctx) => {
  ctx.reply(
    '🤖 *Selamat Datang di Bot Airdrop Grok AI!*\n\n' +
    'Bot ini siap memindai peluang airdrop terbaru, menganalisisnya menggunakan Grok AI, dan membantu Anda menyimpannya.',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔎 Cek Airdrop Sekarang', 'check_airdrop')],
        [Markup.button.callback('📁 Lihat Airdrop Tersimpan', 'view_saved')]
      ])
    }
  );
});

bot.action('check_airdrop', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('⏳ Sedang memindai protokol dan menganalisis airdrop dengan Grok AI, mohon tunggu sebentar...');

  try {
    const rawDataList = await fetchRawAirdrops();
    if (!rawDataList || rawDataList.length === 0) {
      return ctx.reply('❌ Gagal menemukan data airdrop saat ini.');
    }

    const sample = rawDataList[0];
    const analyzedResults = await analyzeAndFormatAirdrop(sample);

    if (!analyzedResults || analyzedResults.length === 0) {
      return ctx.reply('❌ Gagal mendapatkan hasil analisis dari Grok AI.');
    }

    for (const item of analyzedResults) {
      const message = 
        `🚀 *${item.name}*\n\n` +
        `🌐 *Chain:* ${item.chain}\n` +
        `📊 *Status:* ${item.status}\n` +
        `🏷 *Kategori:* ${item.category}\n` +
        `💎 *Potensi Reward:* ${item.reward_potential}\n` +
        `💰 *Modal:* ${item.capital_required}\n\n` +
        `📝 *Alasan Potensi:* ${item.reason}\n\n` +
        `🛠 *Langkah Partisipasi:*\n` +
        item.steps.map((s, i) => `${i + 1}. ${s}`).join('\n') + `\n\n` +
        `🛡 *Tips Sybil:* ${item.sybil_tips}\n\n` +
        `🔗 [Link Resmi](${item.url})`;

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        ...Markup.inlineKeyboard([
          [Markup.button.callback('💾 Simpan Airdrop', `save_${item.id}`)],
          [Markup.button.callback('❌ Lewati', 'skip_airdrop')]
        ])
      });
      
      global.tempAirdropStore = global.tempAirdropStore || {};
      global.tempAirdropStore[item.id] = item;
    }
  } catch (err) {
    console.error('Error saat proses airdrop:', err);
    ctx.reply('❌ Terjadi kesalahan sistem saat memproses airdrop.');
  }
});

bot.action(/^save_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const id = ctx.match[1];
  const itemToSave = global.tempAirdropStore ? global.tempAirdropStore[id] : null;

  if (itemToSave) {
    const success = saveAirdrop(itemToSave);
    if (success) {
      await ctx.reply(`✅ Airdrop *${itemToSave.name}* berhasil disimpan ke database lokal!`, { parse_mode: 'Markdown' });
    } else {
      await ctx.reply('⚠️ Airdrop ini sudah pernah disimpan sebelumnya.');
    }
  } else {
    await ctx.reply('❌ Data airdrop tidak ditemukan di memori sementara.');
  }
});

bot.action('skip_airdrop', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('👍 Baik, silakan cari airdrop lainnya.');
});

bot.action('view_saved', async (ctx) => {
  await ctx.answerCbQuery();
  const saved = getSavedAirdrops();

  if (saved.length === 0) {
    return ctx.reply('📁 Belum ada airdrop yang Anda simpan.');
  }

  for (const item of saved) {
    const message = 
      `📁 *[TERSIMPAN] ${item.name}*\n\n` +
      `🌐 *Chain:* ${item.chain}\n` +
      `🔗 [Link Resmi](${item.url})`;

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      ...Markup.inlineKeyboard([
        [Markup.button.callback(`🗑 Hapus ${item.name}`, `del_${item.id}`)]
      ])
    });
  }
});

bot.action(/^del_(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const id = ctx.match[1];
  const removed = removeSavedAirdrop(id);
  if (removed) {
    await ctx.reply('🗑 Airdrop berhasil dihapus dari daftar simpanan.');
  } else {
    await ctx.reply('❌ Gagal menghapus airdrop.');
  }
});

bot.launch();
console.log('🤖 Bot Telegram Airdrop Grok AI Siap Digunakan!');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
      
