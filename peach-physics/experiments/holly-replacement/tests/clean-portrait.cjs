// Usage: node tests/clean-portrait.cjs /path/to/authoritative/1-Photo-1.jpg
// Requires sharp. Deterministic local Poisson blend, not generative image editing.
const sharp=require('sharp'),fs=require('fs'),path=require('path'),crypto=require('crypto');
(async()=>{const input=process.argv[2];if(!input)throw Error('Supply the authoritative attached JPEG');const {data,info}=await sharp(input).removeAlpha().raw().toBuffer({resolveWithObject:true});if(info.width!==754||info.height!==1280)throw Error('Unexpected source dimensions');const out=Buffer.from(data),field=Float64Array.from(data),mask=[];
for(let y=7;y<48;y++)for(let x=29;x<84;x++)if(((x-56)/28)**2+((y-27)/21)**2<1)mask.push((y*info.width+x)*3);
const donor=i=>{const pixel=Math.floor(i/3),c=i%3;return data[((Math.floor(pixel/info.width)+55)*info.width+(pixel%info.width)-20)*3+c]};
const lap=new Map(mask.map(i=>[i,[0,1,2].map(c=>4*donor(i+c)-donor(i-3+c)-donor(i+3+c)-donor(i-info.width*3+c)-donor(i+info.width*3+c))]));
for(let n=0;n<3500;n++)for(const i of mask)for(let c=0;c<3;c++)field[i+c]=(field[i-3+c]+field[i+3+c]+field[i-info.width*3+c]+field[i+info.width*3+c]+lap.get(i)[c])/4;
for(const i of mask)for(let c=0;c<3;c++)out[i+c]=Math.max(0,Math.min(255,Math.round(field[i+c])));
const output=path.resolve(__dirname,'../assets/holly-heartbreaker.png');await sharp(out,{raw:info}).png().toFile(output);
const final=await sharp(output).removeAlpha().raw().toBuffer(),allowed=new Set(mask);let changed=0;for(let i=0;i<data.length;i+=3){if(final[i]===data[i]&&final[i+1]===data[i+1]&&final[i+2]===data[i+2])continue;if(!allowed.has(i))throw Error('Unexpected pixel change outside arrow repair');changed++;}
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');const report={originalSHA256:hash(fs.readFileSync(input)),cleanedSHA256:hash(fs.readFileSync(output)),width:info.width,height:info.height,repairMaskPixels:mask.length,changedPixels:changed,outsideMaskChangedPixels:0,method:'Local Poisson blend of nearby background; lossless PNG; no character edits'};fs.writeFileSync(__dirname+'/artwork-results.json',JSON.stringify(report,null,2)+'\n');console.log(report);
})().catch(e=>{console.error(e);process.exit(1)});
