// Verify promotion of the exact locally validated rendering correction.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),{execFileSync}=require('child_process');
const app=path.resolve(__dirname,'..'),root=path.resolve(app,'../..');
const prior='2adb9257532ac3b17e39aeea815a23f5fb7f85ce';
const old=file=>execFileSync('git',['show',prior+':peach-physics/v8/'+file],{cwd:root,maxBuffer:4e6}).toString();
const read=file=>fs.readFileSync(app+'/'+file,'utf8');
const normalized=read('index.html').replace('<title>Peach Physics — Elf Lab 0.0.8 r14 Ember fix</title>','<title>Peach Physics — Elf Lab 0.0.8 r14 Holly</title>');
const candidateSHA256='c0c36be258d665e07f022274cd228a492d5f4385d6b9cecbdaed2256bc6b16cc';
assert.equal(crypto.createHash('sha256').update(normalized).digest('hex'),candidateSHA256,'exact tested candidate runtime, apart from release title');
assert.equal(read('motion.js'),old('motion.js'),'all motion calibrations and defaults unchanged');
assert.equal(read('sw.js').replace('peach-physics-v008-r14-ember1','peach-physics-v008-r14-auto2'),old('sw.js'),'only the cache revision changed');
for(const file of ['manifest.webmanifest'])assert.equal(read(file),old(file),file+' unchanged');
require('./artwork.cjs');
const report={prior,candidateSHA256,runtimeIdenticalToValidatedCandidate:true,motionUnchanged:true,cacheOnlyChange:true,artworkVerified:true};
fs.writeFileSync(__dirname+'/ember-source.json',JSON.stringify(report,null,2)+'\n');console.log(report);
