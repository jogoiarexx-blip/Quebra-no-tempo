import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const path=new URL('../src/missions/leviathan-state.js',import.meta.url);
const api=fs.existsSync(path)?await import(path):{};
test('Leviatã: blindagem bloqueia dano; válvula e propulsor criam aberturas',()=>{
 assert.equal(typeof api.createLeviathan,'function','máquina do chefe ausente');
 const b=api.createLeviathan();api.startLeviathan(b);
 assert.equal(api.hitLeviathan(b,'core',125),0);assert.equal(b.hp,1080);
 assert.equal(api.exposeLeviathan(b,'valve0'),true);assert.equal(api.hitLeviathan(b,'core',125),120);assert.equal(b.hp,960);
 assert.equal(api.hitLeviathan(b,'core',125),0,'limite por abertura');
 for(let i=0;i<360;i++)api.stepLeviathan(b,1/60,{x:0,y:0,z:116});
 assert.equal(api.hitLeviathan(b,'thruster',24),0);api.hitLeviathan(b,'thruster',24);api.hitLeviathan(b,'thruster',24);
 assert.equal(b.mode,'exposed');assert.equal(api.hitLeviathan(b,'core',125),120);
});
test('Leviatã: três janelas por etapa; mudança de fase impede morte instantânea e derrota é final',()=>{
 assert.equal(typeof api.createLeviathan,'function');const b=api.createLeviathan();api.startLeviathan(b);
 for(let phase=1;phase<=3;phase++){
  assert.equal(b.phase,phase);
  for(let n=0;n<3;n++){
   for(let i=0;i<1200&&['transition','exposed','attack'].includes(b.mode);i++)api.stepLeviathan(b,1/60,{x:0,y:0,z:115});
   b.valveCooldown=[0,0];assert.ok(api.exposeLeviathan(b,'valve0'));assert.equal(api.hitLeviathan(b,'core',9999),120);
  }
 }
 assert.equal(b.hp,0);assert.equal(b.mode,'dead');assert.equal(api.exposeLeviathan(b,'valve1'),false);assert.equal(api.hitLeviathan(b,'core',125),0);
 assert.deepEqual(api.stepLeviathan(b,20,{x:0,y:0,z:120}),[]);
});
test('Leviatã: aviso fixa alvo antes do ataque e hazards respeitam altura',()=>{
 assert.equal(typeof api.createLeviathan,'function');const b=api.createLeviathan();api.startLeviathan(b);
 let events=[];for(let i=0;i<60;i++)events.push(...api.stepLeviathan(b,1/60,{x:5,y:0,z:116}));
 assert.equal(events.some(e=>e.kind==='attack'),false);assert.equal(b.mode,'warning');
 for(let i=0;i<60;i++)events.push(...api.stepLeviathan(b,1/60,{x:-8,y:4,z:116}));
 const attack=events.find(e=>e.kind==='attack');assert.ok(attack);assert.equal(attack.x,5);assert.ok(api.attackHits(attack,{x:5,y:0,z:116}));assert.equal(api.attackHits(attack,{x:-8,y:0,z:116}),false);assert.equal(api.attackHits(attack,{x:5,y:4,z:116}),false);
});
test('Leviatã: ficar parado no painel ou nas margens continua sujeito a todos os padrões',()=>{
 for(const p of[{x:0,y:0,z:102},{x:26.5,y:4,z:163}]){
  const b=api.createLeviathan();api.startLeviathan(b);b.phase=3;const events=[];for(let i=0;i<1500;i++)events.push(...api.stepLeviathan(b,1/60,p));
  for(const pattern of['lane','drill','pulse']){const attack=events.find(e=>e.kind==='attack'&&e.pattern===pattern);assert.ok(attack,pattern);assert.ok(api.attackHits(attack,p),`${pattern} ignora posição ${JSON.stringify(p)}`);}
 }
});
