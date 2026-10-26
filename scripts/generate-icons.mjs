import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const source=await readFile(new URL('../public/favicon.svg',import.meta.url));
const sizes=[16,32,48];
const frames=await Promise.all(sizes.map(size=>sharp(source).resize(size,size).png().toBuffer()));
const directory=Buffer.alloc(6+16*frames.length);
directory.writeUInt16LE(1,2);directory.writeUInt16LE(frames.length,4);
let offset=directory.length;
frames.forEach((frame,index)=>{
  const entry=6+index*16;
  directory[entry]=sizes[index];directory[entry+1]=sizes[index];
  directory.writeUInt16LE(1,entry+4);directory.writeUInt16LE(32,entry+6);
  directory.writeUInt32LE(frame.length,entry+8);directory.writeUInt32LE(offset,entry+12);
  offset+=frame.length;
});
await writeFile(new URL('../public/favicon.ico',import.meta.url),Buffer.concat([directory,...frames]));
await sharp(source).resize(180,180).flatten({background:'#f17951'}).png().toFile(fileURLToPath(new URL('../public/apple-touch-icon.png',import.meta.url)));
console.log('Created favicon.ico (16/32/48 px) and apple-touch-icon.png (180 px).');
