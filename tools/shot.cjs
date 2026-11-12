const {chromium}=require('playwright');(async()=>{
const [,, out, ...urls]=process.argv;
const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:1600,height:800}});
p.on('console',m=>{if(m.type()=='error')console.log('ERR',m.text())});p.on('pageerror',e=>console.log('PAGEERR',e.message));
let i=0;for(const u of urls){await p.goto('http://127.0.0.1:5173/'+u);await p.waitForFunction('window.done',null,{timeout:60000});await p.screenshot({path:`${out}_${i++}.png`});}
await b.close();
})();
