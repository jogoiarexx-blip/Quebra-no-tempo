// Regras de recursos sem dependência da cena: usadas pela coleta e pelo loot dos inimigos.
export function applyResourcePickup(player, type, amount, limits) {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  let target, key, cap, value = amount;
  if (type === 'ammo9' || type === 'shells' || type === 'rockets') {
    target = player.ammo; key = type; cap = limits.ammoCaps[type];
    value = Math.max(1, Math.round(amount * limits.res));
  } else if (type === 'medkit' || type === 'armor') {
    target = player; key = type === 'medkit' ? 'hp' : 'armor';
    cap = type === 'medkit' ? limits.maxHealth : limits.maxArmor;
  } else return 0;
  const gain = Math.max(0, Math.min(value, cap - target[key]));
  target[key] += gain;
  return gain;
}

export function chooseEnemyDrop(enemyType, player, limits, random = Math.random) {
  if (random() >= Math.min(1, 0.5 * limits.res)) return null;
  if (enemyType === 'DRONE') return { type: 'pecas', amount: 8 };
  const choices = [];
  const add = (type, amount, weight) => choices.push({ type, amount, weight });
  if (player.hp < limits.maxHealth) add('medkit', 20, player.hp < 40 ? 8 : 1);
  if (player.weapons.martelo9.have && player.ammo.ammo9 < limits.ammoCaps.ammo9) {
    const low = player.ammo.ammo9 + player.weapons.martelo9.mag < 15;
    add('ammo9', enemyType === 'E02' ? 18 : 12, low ? 3 : 1);
  }
  if (player.weapons.trovao_duplo.have && player.ammo.shells < limits.ammoCaps.shells) {
    add('shells', 2, player.ammo.shells < 4 ? 2 : 0.8);
  }
  if (player.armor < limits.maxArmor) add('armor', 15, enemyType === 'E02' ? 0.35 : 0.65);
  if (!choices.length) return null;
  let roll = random() * choices.reduce((sum, c) => sum + c.weight, 0);
  for (const c of choices) {
    roll -= c.weight;
    if (roll < 0) return { type: c.type, amount: c.amount };
  }
  const c = choices.at(-1);
  return { type: c.type, amount: c.amount };
}
