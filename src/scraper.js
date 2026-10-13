import axios from 'axios';

export async function fetchRawAirdrops() {
  try {
    const response = await axios.get('[https://api.llama.fi/protocols](https://api.llama.fi/protocols)');
    const protocols = response.data;

    const candidates = protocols
      .filter(p => !p.symbol || p.symbol === '-')
      .slice(0, 10)
      .map((p, index) => ({
        id: `airdrop_${p.slug || index}_${Date.now()}`,
        name: p.name,
        chain: p.chain || (p.chains ? p.chains.join(', ') : 'Multi-chain'),
        category: p.category || 'DeFi / Web3',
        tvl: p.tvl ? `$${Math.round(p.tvl).toLocaleString()}` : 'N/A',
        url: p.url || '[https://defillama.com/airdrops](https://defillama.com/airdrops)'
      }));

    return candidates;
  } catch (error) {
    console.error('Error scraping data:', error.message);
    return [];
  }
}
