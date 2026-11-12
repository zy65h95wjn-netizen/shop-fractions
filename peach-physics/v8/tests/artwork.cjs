const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..'),current=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),baseline=fs.readFileSync(path.join(root,'peach-physics/v6-2-3/index.html'),'utf8');
const hashes=require('./artwork-sha256.json'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const name of ['IMAGE','OTHER_IMAGE']){
 const pattern=new RegExp(`const ${name}=['"]data:image/webp;base64,([^'"]+)['"]`),a=current.match(pattern)[1],b=baseline.match(pattern)[1];
 assert.equal(a,b);assert.equal(sha(Buffer.from(a,'base64')),hashes[name]);
}
assert.equal(sha(fs.readFileSync(path.join(__dirname,'../assets/aurelia-frost.jpg'))),hashes.aurelia);
console.log('All three original portrait hashes verified.');

assert.equal(sha(fs.readFileSync(path.join(__dirname,'../assets/holly-heartbreaker.jpg'))),hashes.holly);
console.log('Holly original JPEG hash verified.');

assert.equal(sha(fs.readFileSync(path.join(__dirname,'../assets/santa-claus.jpg'))),'0c081474e67e0f5a94a12fdce68f712884933485a21082d45b9c36188cfea5ed');
console.log('Santa approved attachment JPEG hash verified.');
