import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const url=new URL('../src/weapon-data.js',import.meta.url),api=fs.existsSync(url)?await import(url):{};
test('arsenal antigo preserva armas e reserva e recebe lançador indisponível',()=>{
 assert.equal(typeof api.normalizeArsenal,'function');const old={weapons:{martelo9:{have:true,mag:7},trovao_duplo:{have:true,mag:1}},ammo:{ammo9:42,shells:9},current:'martelo9'};
 const result=api.normalizeArsenal(old);assert.equal(result.weapons.martelo9.mag,7);assert.equal(result.ammo.ammo9,42);assert.equal(result.weapons.rompe_casco.have,false);assert.equal(result.ammo.rockets,0);assert.equal(old.weapons.rompe_casco,undefined);
});
test('ciclo PC/gamepad/celular alcança três armas e pula armas não adquiridas',()=>{
 assert.equal(typeof api.nextWeaponId,'function');const p=api.normalizeArsenal({weapons:{martelo9:{have:true},trovao_duplo:{have:true},rompe_casco:{have:true}},current:'martelo9'});
 assert.equal(api.nextWeaponId(p),'trovao_duplo');p.current='trovao_duplo';assert.equal(api.nextWeaponId(p),'rompe_casco');p.current='rompe_casco';assert.equal(api.nextWeaponId(p),'martelo9');p.weapons.trovao_duplo.have=false;p.current='martelo9';assert.equal(api.nextWeaponId(p),'rompe_casco');
});
