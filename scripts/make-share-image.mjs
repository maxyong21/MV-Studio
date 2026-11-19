// Draws public/og-image.png, the picture WhatsApp, Instagram, Threads, Facebook and LinkedIn
// show when someone shares a link to the site. Run: node scripts/make-share-image.mjs
// Change the words or colours below, run it again, then deploy.
import {existsSync,readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import sharp from 'sharp';

const headline='Affordable websites for small businesses in Malaysia';
const points=['Websites','Online stores','Web apps'];
const promise='Clear prices. Work directly with the developers.';

const executable=process.env.BROWSER_PATH||['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/google-chrome','/usr/bin/chromium'].find(existsSync);
if(!executable)throw new Error('Set BROWSER_PATH to a Chrome or Edge executable.');
// The fonts go in as data, because a blank page may not read files from disk.
const font=name=>`data:font/woff2;base64,${readFileSync(`public/fonts/${name}-latin-wght-normal.woff2`).toString('base64')}`;
const mark=size=>`<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#f17951"/><path d="M9 43V21h6l7 11 7-11h6v22h-6V31l-7 10-7-10v12Z" fill="#fffdf8"/><path d="M35 21h7l5 14 5-14h7l-9 22h-6Z" fill="#173c31"/></svg>`;
const html=`<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Manrope;src:url("${font('manrope')}");font-weight:200 800}
@font-face{font-family:"DM Sans";src:url("${font('dm-sans')}");font-weight:100 1000}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:#f8f7f4;color:#173c31;font-family:"DM Sans",sans-serif;overflow:hidden;position:relative}
.ring{position:absolute;right:-150px;top:-130px;width:560px;height:560px;border-radius:50%;background:#f17951;opacity:.14}
.ring.two{right:60px;top:330px;width:420px;height:420px;background:#173c31;opacity:.07}
main{position:absolute;inset:0;padding:64px 72px;display:flex;flex-direction:column;justify-content:space-between}
.brand{display:flex;align-items:center;gap:20px;font:800 40px Manrope,sans-serif;letter-spacing:-.02em}
h1{font:800 76px/1.06 Manrope,sans-serif;letter-spacing:-.035em;max-width:900px;text-wrap:balance}
.row{display:flex;gap:14px;margin-top:30px}
.row span{font-size:28px;font-weight:600;padding:10px 24px;border-radius:999px;background:#fffdf8;border:2px solid #d9dfd4}
footer{font-size:30px;font-weight:500;color:#3f4a40;display:flex;align-items:center;gap:16px}
footer i{width:14px;height:14px;border-radius:50%;background:#f17951;flex:none}
</style><div class="ring"></div><div class="ring two"></div>
<main><div class="brand">${mark(84)}MV Studio</div>
<div><h1>${headline}</h1><div class="row">${points.map(point=>`<span>${point}</span>`).join('')}</div></div>
<footer><i></i>${promise}</footer></main>`;

const browser=await chromium.launch({executablePath:executable});
const page=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
await page.setContent(html);
await page.evaluate(()=>document.fonts.ready);
const shot=await page.screenshot({type:'png'});
await browser.close();
// WhatsApp skips large preview pictures, so keep the file small.
const info=await sharp(shot).png({palette:true,quality:90,compressionLevel:9}).toFile('public/og-image.png');
console.log(`Wrote public/og-image.png (${info.width}x${info.height}, ${Math.round(info.size/1024)} KB).`);
