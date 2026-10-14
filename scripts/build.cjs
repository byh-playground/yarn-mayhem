const fs=require('fs'),cp=require('child_process'),crypto=require('crypto');
const html=fs.readFileSync('index.html');const source=html.toString().match(/<script type="module" data-game-module>([\s\S]*?)<\/script>/)[1];
cp.execFileSync(process.execPath,['--input-type=module','--check'],{input:source});
fs.mkdirSync('_site',{recursive:true});fs.copyFileSync('index.html','_site/index.html');fs.writeFileSync('_site/.nojekyll','');
fs.writeFileSync('_site/build.json',JSON.stringify({version:require('../package.json').version,commit:process.env.GITHUB_SHA||cp.execFileSync('git',['rev-parse','HEAD']).toString().trim(),htmlSha256:crypto.createHash('sha256').update(html).digest('hex'),gamekit:'63c62dae8d339f6f0329c0940206806f69509630'},null,2));
console.log('Single HTML prepared with syntax and provenance checks');
