const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..'),current=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),baseline=fs.readFileSync(path.join(root,'peach-physics/v6-2-3/index.html'),'utf8');
const hashes=require('./artwork-sha256.json'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const name of ['IMAGE','OTHER_IMAGE']){
 const pattern=new RegExp(`const ${name}=['"]data:image/webp;base64,([^'"]+)['"]`),a=current.match(pattern)[1],b=baseline.match(pattern)[1];
 assert.equal(a,b);assert.equal(sha(Buffer.from(a,'base64')),hashes[name]);
}
assert.equal(sha(fs.readFileSync(path.join(__dirname,'../assets/aurelia-frost.jpg'))),hashes.aurelia);
console.log('All three original portrait hashes verified.');
