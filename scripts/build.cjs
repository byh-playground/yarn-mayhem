const fs=require('fs'),cp=require('child_process'),crypto=require('crypto');
const gamekit=require('../docs/gamekit-manifest.json');
const html=fs.readFileSync('index.html');
if(!html.includes('bloom-gamekit@'+gamekit.distCommit+'/'))throw new Error('Runtime GameKit pin differs from manifest');const source=html.toString().match(/<script type="module" data-game-module>([\s\S]*?)<\/script>/)[1];
cp.execFileSync(process.execPath,['--input-type=module','--check'],{input:source});
fs.mkdirSync('_site',{recursive:true});fs.copyFileSync('index.html','_site/index.html');fs.writeFileSync('_site/.nojekyll','');
fs.writeFileSync('_site/build.json',JSON.stringify({version:require('../package.json').version,commit:process.env.GITHUB_SHA||cp.execFileSync('git',['rev-parse','HEAD']).toString().trim(),htmlSha256:crypto.createHash('sha256').update(html).digest('hex'),gamekit:gamekit.distCommit,gamekitVersion:gamekit.version,gamekitSource:gamekit.sourceCommit,gamekitModules:gamekit.modules},null,2));
console.log('Single HTML prepared with syntax and provenance checks');
