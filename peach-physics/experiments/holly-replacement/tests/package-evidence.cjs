const sharp=require('sharp'),fs=require('fs'),path=require('path');
(async()=>{const dir=path.join(__dirname,'evidence');for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.png'))){await sharp(path.join(dir,file)).jpeg({quality:88}).toFile(path.join(dir,file.replace('.png','.jpg')));fs.unlinkSync(path.join(dir,file));}})();
