import fs from 'fs';
import path from 'path';

const filePath = path.resolve('saved_airdrops.json');

export function getSavedAirdrops() {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify([]));
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Gagal membaca database lokal:', error.message);
    return [];
  }
}

export function saveAirdrop(item) {
  try {
    const saved = getSavedAirdrops();
    const exists = saved.some(s => s.id === item.id);
    if (exists) return false;

    saved.push(item);
    fs.writeFileSync(filePath, JSON.stringify(saved, null, 2));
    return true;
  } catch (error) {
    console.error('Gagal menyimpan airdrop:', error.message);
    return false;
  }
}

export function removeSavedAirdrop(id) {
  try {
    let saved = getSavedAirdrops();
    const initialLength = saved.length;
    saved = saved.filter(s => s.id !== id);
    
    if (saved.length === initialLength) return false;

    fs.writeFileSync(filePath, JSON.stringify(saved, null, 2));
    return true;
  } catch (error) {
    console.error('Gagal menghapus airdrop:', error.message);
    return false;
  }
}
  
