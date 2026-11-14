// Persistência local. Gravação "transacional": escreve em chave temporária, relê, valida e só então promove.
// (GDD pede IndexedDB; para o slice usamos localStorage com o mesmo contrato de confirmação.)
const KEY = 'quebra_no_tempo_v1';
export const SAVE_SCHEMA = 1;
export const CONTENT_VERSION = 'a2-forte-0.11.0';
let simulateFailure = false;
export function setSimulateSaveFailure(v) { simulateFailure = v; }   // usado pelo teste A1M1-015
function read(k) { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : null; } catch { return null; } }
export function loadAll() {
  const d = read(KEY);
  const fresh = {saveSchemaVersion:SAVE_SCHEMA,settings:null,campaign:{completed:{},unlocked:['A1-M1'],flags:{},pecasCronais:0,rewardsGranted:{}},checkpoint:null};
  if(!d || d.saveSchemaVersion!==SAVE_SCHEMA)return fresh;
  d.campaign={...fresh.campaign,...d.campaign};
  d.campaign.flags=d.campaign.flags||{};
  d.campaign.completed=d.campaign.completed||{};
  const unlocked=new Set(Array.isArray(d.campaign.unlocked)?d.campaign.unlocked:['A1-M1']);
  unlocked.add('A1-M1');
  if(d.campaign.completed['A1-M1'])unlocked.add('A1-M2');
  if(d.campaign.completed['A1-M2'])unlocked.add('A1-M3');
  if(d.campaign.completed['A1-M3'])unlocked.add('A1-M4');
  if(d.campaign.completed['A1-M4'])unlocked.add('A2-M1');      // saves do Ato I concluído ganham o Ato II
  if(d.campaign.completed['A2-M1'])unlocked.add('A2-M2');
  if(d.campaign.completed['A2-M2'])unlocked.add('A2-M3');
  if(d.campaign.completed['A2-M3'])unlocked.add('A2-M4');
  d.campaign.unlocked=[...unlocked];
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
