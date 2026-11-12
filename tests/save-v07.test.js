import test from 'node:test';
import assert from 'node:assert/strict';
import {loadAll,commit,SAVE_SCHEMA,setSimulateSaveFailure} from '../src/save.js';
const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
test('save v0.6: concluir M2 libera M3 sem perder checkpoint, opções ou flags',()=>{
 const old={saveSchemaVersion:SAVE_SCHEMA,settings:{volume:.3},campaign:{unlocked:['A1-M1','A1-M2'],completed:{'A1-M2':{time:80,seals:2}},flags:{eco_unlocked:true},pecasCronais:42,rewardsGranted:{}},checkpoint:{missionId:'A1-M2',S:{flags:{talked_basso:true}}}};
 data.set('quebra_no_tempo_v1',JSON.stringify(old));const s=loadAll();assert.ok(s.campaign.unlocked.includes('A1-M3'));assert.equal(s.settings.volume,.3);assert.equal(s.campaign.pecasCronais,42);assert.equal(s.checkpoint.S.flags.talked_basso,true);assert.equal(s.campaign.flags.eco_unlocked,true);
});
test('save novo e erro de gravação mantêm formato e transação existentes',()=>{
 data.clear();const s=loadAll();assert.deepEqual(s.campaign.unlocked,['A1-M1']);assert.deepEqual(s.campaign.flags,{});assert.equal(commit(s),true);const old=data.get('quebra_no_tempo_v1');setSimulateSaveFailure(true);assert.equal(commit({...s,settings:{volume:1}}),false);assert.equal(data.get('quebra_no_tempo_v1'),old);setSimulateSaveFailure(false);
});
