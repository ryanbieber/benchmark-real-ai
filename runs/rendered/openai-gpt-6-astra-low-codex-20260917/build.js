const fs=require('node:fs');
const html=fs.readFileSync('index.template.html','utf8').replace('/* MODEL */',()=>fs.readFileSync('model.js','utf8')).replace('/* DATA */',()=>fs.readFileSync('sp500.csv','utf8')).replace('/* APP */',()=>fs.readFileSync('app.js','utf8'));
fs.writeFileSync('index.html',html);console.log('Built standalone index.html');
