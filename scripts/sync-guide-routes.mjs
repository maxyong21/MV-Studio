// Keeps vercel.json in step with the guides in src/guides/registry.mjs. Run after adding or removing a guide:
//   npm run guides:routes
// Each article address is spelled out (like the service pages) so an unknown address gets the real 404 page.
// With --check it only reports whether vercel.json is current, and exits with 1 if it is not.
import {readFile,writeFile} from 'node:fs/promises';
import {guides} from '../src/guides/registry.mjs';

const config=JSON.parse(await readFile('vercel.json','utf8'));
const routes=config.routes.filter(route=>!/guides/.test(route.src||''));
const everything=guides.map(guide=>guide.slug).join('|'),translated=guides.filter(guide=>guide.ms&&guide.zh).map(guide=>guide.slug).join('|');
const mine=[
  {src:'/guides/?',dest:'/guides/index.html'},
  {src:`/guides/(${everything})/?`,dest:'/guides/$1/index.html'},
  {src:'/(ms|zh)/guides/?',dest:'/$1/guides/index.html'},
  ...(translated?[{src:`/(ms|zh)/guides/(${translated})/?`,dest:'/$1/guides/$2/index.html'}]:[]),
];
const anchor=routes.findIndex(route=>(route.src||'').startsWith('/(ms|zh)/services/'));
if(anchor<0)throw new Error('Could not find the translated service routes in vercel.json to place the guide routes after.');
routes.splice(anchor+1,0,...mine);
const next=['{',`  "$schema": ${JSON.stringify(config.$schema)},`,`  "outputDirectory": ${JSON.stringify(config.outputDirectory)},`,`  "functions": ${JSON.stringify(config.functions)},`,'  "routes": [',...routes.map((route,index)=>`    ${JSON.stringify(route)}${index<routes.length-1?',':''}`),'  ]','}',''].join('\n');
const current=await readFile('vercel.json','utf8');
const same=JSON.stringify(JSON.parse(current))===JSON.stringify(JSON.parse(next));
if(process.argv.includes('--check')){console.log(same?'vercel.json guide routes are current.':'vercel.json guide routes are out of date: run npm run guides:routes');process.exit(same?0:1);}
if(same)console.log('vercel.json guide routes were already current.');
else{await writeFile('vercel.json',next);console.log(`Updated vercel.json for ${guides.length} guides (${translated?translated.split('|').length:0} also in Bahasa Malaysia and Chinese).`);}
