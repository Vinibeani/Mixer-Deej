const fs=require('node:fs/promises');
const path=require('node:path');
// Uses the bundled image runtime on the development machine, or sharp installed locally.
let sharp;
try{sharp=require('sharp');}catch{sharp=require('C:/Users/Vinicius/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');}
(async()=>{
  const root=path.join(__dirname,'..'),source=await fs.readFile(path.join(root,'assets/icon.svg'));
  const sizes=[16,24,32,48,64,128,256];const pngs=[];
  for(const size of sizes)pngs.push(await sharp(source).resize(size,size).png().toBuffer());
  await sharp(source).resize(512,512).png().toFile(path.join(root,'assets/icon.png'));
  await sharp(await fs.readFile(path.join(root,'ui/brand-mark.svg'))).resize(32,32).png().toFile(path.join(root,'assets/tray.png'));
  const header=Buffer.alloc(6+sizes.length*16);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);let offset=header.length;
  pngs.forEach((png,i)=>{const p=6+i*16;header[p]=header[p+1]=sizes[i]===256?0:sizes[i];header.writeUInt16LE(1,p+4);header.writeUInt16LE(32,p+6);header.writeUInt32LE(png.length,p+8);header.writeUInt32LE(offset,p+12);offset+=png.length;});
  await fs.writeFile(path.join(root,'assets/icon.ico'),Buffer.concat([header,...pngs]));
  console.log('Ícones SVG, PNG e ICO gerados.');
})().catch(error=>{console.error(error);process.exitCode=1;});
