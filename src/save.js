// Persistência local. Gravação "transacional": escreve em chave temporária, relê, valida e só então promove.
// (GDD pede IndexedDB; para o slice usamos localStorage com o mesmo contrato de confirmação.)
const KEY = 'quebra_no_tempo_v1';
export const SAVE_SCHEMA = 1;
export const CONTENT_VERSION = 'a1m1-slice-0.1.0';
let simulateFailure = false;
export function setSimulateSaveFailure(v) { simulateFailure = v; }   // usado pelo teste A1M1-015
function read(k) { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : null; } catch { return null; } }
export function loadAll() {
  const d = read(KEY);
  if (!d || d.saveSchemaVersion !== SAVE_SCHEMA) return { saveSchemaVersion: SAVE_SCHEMA, settings: null, campaign: { completed: {}, unlocked: ['A1-M1'], pecasCronais: 0, rewardsGranted: {} }, checkpoint: null };
  return d;
}
export function commit(data) {
  if (simulateFailure) return false;
  try {
    const s = JSON.stringify(data);
    localStorage.setItem(KEY + '_tmp', s);
    if (localStorage.getItem(KEY + '_tmp') !== s) return false;
    localStorage.setItem(KEY, s); localStorage.removeItem(KEY + '_tmp');
    return localStorage.getItem(KEY) === s;
  } catch { return false; }
}
