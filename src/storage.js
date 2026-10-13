import fs from 'fs';
import path from 'path';

const DB_FILE = path.resolve('saved_airdrops.json');

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([]));
}

export function getSavedAirdrops() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

export function saveAirdrop(airdrop) {
  const saved = getSavedAirdrops();
  if (!saved.some(item => item.id === airdrop.id)) {
    saved.push(airdrop);
    fs.writeFileSync(DB_FILE, JSON.stringify(saved, null, 2));
    return true;
  }
  return false;
}

export function removeSavedAirdrop(id) {
  let saved = getSavedAirdrops();
  const initialLength = saved.length;
  saved = saved.filter(item => item.id !== id);
  fs.writeFileSync(DB_FILE, JSON.stringify(saved, null, 2));
  return saved.length < initialLength;
  }
