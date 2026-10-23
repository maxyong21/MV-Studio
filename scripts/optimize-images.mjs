import sharp from 'sharp';
import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {basename,extname,join} from 'node:path';
await mkdir('public/optimized',{recursive:true});
await mkdir('.generated',{recursive:true});
const manifest={};let before=0,after=0;
for(const name of await readdir('public')){
  if(!/\.(png|jpe?g|webp)$/i.test(name))continue;
  const bytes=await readFile(join('public',name));const meta=await sharp(bytes).metadata();
  if(!meta.width||!meta.height)continue;
  const stem=basename(name,extname(name)).replace(/[^a-z0-9_-]/gi,'-');
  const hash=createHash('sha256').update(bytes).digest('hex').slice(0,10),variants=[];
  for(const width of [...new Set([480,960,1600].map(v=>Math.min(v,meta.width)))]){
    const filename=`${stem}-${hash}-${width}.webp`;
    const result=await sharp(bytes).rotate().resize({width,withoutEnlargement:true}).webp({quality:82}).toBuffer({resolveWithObject:true});
    await writeFile(join('public/optimized',filename),result.data);
    variants.push({url:`/optimized/${filename}`,width:result.info.width,height:result.info.height});
    if(width===Math.min(1600,meta.width))after+=result.data.length;
  }
  manifest[`/${name}`]=variants;before+=bytes.length;
}
await writeFile('.generated/media.json',JSON.stringify(manifest));
console.log(`Optimized ${Object.keys(manifest).length} local images: ${(before/1024/1024).toFixed(1)} MB → ${(after/1024/1024).toFixed(1)} MB at largest size. Originals retained for legacy pages.`);
