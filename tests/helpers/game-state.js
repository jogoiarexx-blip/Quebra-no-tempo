import fs from 'node:fs/promises';
const original=globalThis.fetch;
globalThis.fetch=async (input,...args)=>{
 const url=input instanceof URL?input:new URL(String(input),'file:///');
 if(url.protocol==='file:')return new Response(await fs.readFile(url),{headers:{'Content-Type':'application/json'}});
 return original(input,...args);
};
