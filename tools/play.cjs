// Teste automatizado no navegador: node tools/play.cjs <script.js> — o script recebe (page, shot)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') { errs.push(m.text()); console.log('CONSOLE ERR', m.text()); } });
  p.on('pageerror', (e) => { errs.push(e.message); console.log('PAGEERR', e.message, (e.stack || '').split('\n').slice(0, 4).join(' | ')); });
  await p.goto(process.env.URL || 'http://127.0.0.1:5173/');
  await p.waitForFunction('window.QNT && window.QNT.ui.mode==="menu"', null, { timeout: 90000 }).catch((e) => console.log('BOOT TIMEOUT'));
  const shot = (n) => p.screenshot({ path: `shots/${n}.png` });
  await require(require('path').resolve(process.argv[2]))(p, shot);
  console.log('errors:', errs.length);
  await b.close();
})();
