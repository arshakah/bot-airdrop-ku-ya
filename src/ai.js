import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const grok = new OpenAI({
  apiKey: process.env.GROK_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

export async function analyzeAndFormatAirdrop(airdropData) {
  const prompt = `
Anda adalah analis Kripto & Web3 Airdrop profesional.
Lakukan analisis dan buat laporan LENGKAP & DETAIL untuk proyek berikut:
${JSON.stringify(airdropData, null, 2)}

Buat analisis berformat JSON Array berisi objek dengan struktur persis seperti ini untuk tiap proyek:
[
  {
    "id": "${airdropData.id}",
    "name": "Nama Proyek",
    "chain": "Jaringan Blockchain",
    "status": "Mendatang / Baru Rilis (2 Minggu Terakhir)",
    "category": "Kategori Proyek",
    "reward_potential": "Sangat Tinggi / Tinggi / Sedang",
    "capital_required": "Gratis (Testnet) / Membutuhkan Gas Fee",
    "reason": "Penjelasan rinci mengapa airdrop ini bagus, mendukung VC, TVL, atau potensinya.",
    "steps": [
      "Langkah 1: ...",
      "Langkah 2: ...",
      "Langkah 3: ..."
    ],
    "sybil_tips": "Tips agar lolos kriteria sybil / anti-scam",
    "url": "${airdropData.url}"
  }
]

HANYA kembalikan string JSON valid tanpa penjelasan tambahan di luar JSON.
`;

  try {
    const response = await grok.chat.completions.create({
      model: 'grok-beta',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const content = response.choices[0].message.content.trim();
    const cleanedJson = content.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
    return JSON.parse(cleanedJson);
  } catch (error) {
    console.error('Gagal analisis Grok AI:', error.message);
    return null;
  }
}
