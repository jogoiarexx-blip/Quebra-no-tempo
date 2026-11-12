// Estado compartilhado entre módulos (evita dependências circulares).
// O config é lido em runtime (fetch) para o jogo rodar sem etapa de build no GitHub Pages.
export const CFG = await (await fetch(new URL('./data/game_config_v2_2.json', import.meta.url))).json();
export const G = {
  scene: null, camera: null, renderer: null, level: null, mission: null,
  settings: { quality: CFG.graphics.defaultPreset, fov: CFG.camera.fovDefaultDegrees, sens: 1, invertY: false, volume: 0.8, music: 0.5, shake: true, attenuate: false, difficulty: 'mercenario', hints: true, waypoint: true },
  S: null,            // estado da missão (serializável)
  time: 0, shake: 0,
  hooks: {},          // callbacks registrados pelo main (toast, hud, etc.)
};
export const DIFF = {
  turista: { name: 'Turista Temporal', dmg: 0.7, hp: 0.85, res: 1.25, iframe: 0.3 },
  mercenario: { name: 'Mercenário', dmg: 1.0, hp: 1.0, res: 1.0, iframe: 0.22 },
  paradoxo: { name: 'Paradoxo', dmg: 1.3, hp: 1.1, res: 0.85, iframe: 0.16 },
};
export const diff = () => DIFF[G.settings.difficulty] || DIFF.mercenario;
