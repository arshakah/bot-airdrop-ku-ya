import axios from 'axios';

export async function fetchRawAirdrops() {
  try {
    const response = await axios.get('https://api.llama.fi/protocols', {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    
    const protocols = response.data;
    if (!protocols || !Array.isArray(protocols)) {
      throw new Error('Format data API tidak valid');
    }

    const candidates = protocols
      .filter(p => !p.symbol || p.symbol === '-' || p.symbol === null)
      .slice(0, 10)
      .map((p, index) => ({
        id: `airdrop_${p.slug || index}_${Date.now()}`,
        name: p.name || 'Unknown Project',
        chain: p.chain || (p.chains ? p.chains.join(', ') : 'Multi-chain'),
        category: p.category || 'DeFi / Web3',
        tvl: p.tvl ? `$${Math.round(p.tvl).toLocaleString()}` : 'N/A',
        url: p.url || 'https://defillama.com/airdrops'
      }));

    if (candidates.length === 0) {
      throw new Error('Tidak ada kandidat airdrop yang lolos filter.');
    }

    return candidates;
  } catch (error) {
    console.error('Error fetching data, menggunakan data cadangan:', error.message);
    
    return [
      {
        id: `fallback_${Date.now()}_1`,
        name: "Monad Ecosystem Protocol (Testnet)",
        chain: "Monad / L1",
        category: "Infrastructure",
        tvl: "$50,000,000",
        url: "https://testnet.monad.xyz"
      },
      {
        id: `fallback_${Date.now()}_2`,
        name: "Berachain Based DEX",
        chain: "Berachain",
        category: "DeFi",
        tvl: "$120,000,000",
        url: "https://berachain.com"
      }
    ];
  }
          }
