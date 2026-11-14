export const WEAPONS={
 martelo9:{name:'MARTELO-9',dmg:24,rate:4,mag:15,reload:1.25,pellets:1,spread:.012,adsSpread:.003,kick:.012,ammo:'ammo9',range:90,auto:true},
 trovao_duplo:{name:'TROVÃO DUPLO',dmg:10,rate:1.5,mag:2,reload:1.7,pellets:10,spread:.075,adsSpread:.055,kick:.05,ammo:'shells',range:28,auto:false},
 rompe_casco:{name:'ROMPE-CASCO',dmg:125,rate:.8,mag:1,reload:2.1,pellets:1,spread:.006,adsSpread:.002,kick:.065,ammo:'rockets',range:80,auto:false,projectile:true},
 // GDD §5: rifle de alavanca, distância média, perfuração leve (atravessa um inimigo com 60% do dano)
 ferrovia:{name:'FERROVIA',dmg:52,rate:1.2,mag:8,reload:2.2,pellets:1,spread:.007,adsSpread:.0008,kick:.04,ammo:'rifle',range:130,auto:false,pierce:.6},
};
export const AMMO_CAP={ammo9:135,shells:24,rockets:12,rifle:40};
export function normalizeArsenal(s={}){
 const weapons={};for(const[id,w]of Object.entries(WEAPONS))weapons[id]={have:false,mag:w.mag,...s.weapons?.[id]};
 return {weapons,ammo:{ammo9:0,shells:0,rockets:0,rifle:0,...s.ammo},current:s.current&&weapons[s.current]?.have?s.current:null};
}
export function nextWeaponId(p){const owned=Object.keys(WEAPONS).filter(id=>p.weapons[id]?.have);return owned[(owned.indexOf(p.current)+1)%owned.length]||null;}
