import test from 'node:test';
import assert from 'node:assert/strict';
import { turnValve, takeBackup, useCrane, armDischarge, steamActive, sealEligibility } from '../src/missions/usina-state.js';
const state=()=>({flags:{},seals:[]});
test('Usina: válvulas são idempotentes e só concedem selo após as duas',()=>{
 const s=state();assert.equal(turnValve(s,0),true);assert.equal(turnValve(s,0),false);assert.equal(sealEligibility(s).cooling,false);
 assert.equal(turnValve(s,1),true);assert.equal(sealEligibility(s).cooling,true);assert.equal(turnValve(s,2),false);
});
test('Usina: backup depende de turbinas desligadas e defesa concluída',()=>{
 const s=state();assert.equal(takeBackup(s),false);s.flags.turbines_off=true;assert.equal(takeBackup(s),false);
 s.flags.turbine_defense_cleared=true;assert.equal(takeBackup(s),true);assert.equal(takeBackup(s),false);assert.equal(sealEligibility(s).turbines,true);
});
test('Usina: guindaste é alternativa real às válvulas; descarga exige backup',()=>{
 const s=state();assert.equal(useCrane(s),false);s.flags.crane_fuse=true;assert.equal(useCrane(s),true);assert.equal(useCrane(s),false);
 assert.equal(armDischarge(s),false);s.flags.backup_secured=true;s.flags.roof_defense_cleared=true;assert.equal(armDischarge(s),true);
 const eligible=sealEligibility(s);assert.equal(eligible.cooling,false);assert.equal(eligible.crane,true);assert.equal(eligible.turbines,true);
 assert.equal(s.flags.discharge_stopped,true);
});
test('Usina: vapor tem janela segura, telegraph e desliga com válvula local',()=>{
 const s=state();assert.equal(steamActive(s,0,0),false);assert.equal(steamActive(s,0,1.7),true);assert.equal(steamActive(s,0,4),false);
 turnValve(s,0);assert.equal(steamActive(s,0,1.7),false);assert.equal(steamActive(s,1,.2),true);
});
