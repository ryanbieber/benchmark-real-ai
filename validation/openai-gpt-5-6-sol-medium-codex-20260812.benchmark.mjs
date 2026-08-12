import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const defaults = {model:'trend',lookback:'180',horizon:'30',window:'20',confidence:'1.96'};
const elements = new Map();
function element(id='') {
  if (!elements.has(id)) elements.set(id, {
    id, value:defaults[id] ?? '', textContent:'', innerHTML:'', style:{}, classList:{add(){},remove(){}},
    files:[], width:0, height:0, _listeners:{},
    addEventListener(type, fn){this._listeners[type]=fn},
    getBoundingClientRect(){return {width:900,height:360,left:0,top:0}},
    getContext(){return new Proxy({scale(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},closePath(){},fillText(){},setLineDash(){}},{set(o,k,v){o[k]=v;return true}})},
    click(){this.clicked=true}
  });
  return elements.get(id);
}
const document = {
  querySelector(s){return element(s.startsWith('#')?s.slice(1):s)},
  createElement(tag){return element('created-'+tag)}
};
const sandbox = {
  console, document, devicePixelRatio:1, Intl, Date, Math, Blob,
  URL:{createObjectURL(){return 'blob:test'},revokeObjectURL(){}},
  setTimeout(){},
  window:{addEventListener(){}},
};
vm.createContext(sandbox);
vm.runInContext(script, sandbox);

assert.match(element('lastClose').textContent, /^\d/);
assert.match(element('forecastValue').textContent, /^\d/);
assert.match(element('mape').textContent, /%$/);
assert.equal(element('dataStatus').textContent, 'Synthetic demo · 320 rows');

for (const model of ['trend','drift','sma']) {
  element('model').value=model;
  sandbox.run();
  assert.match(element('scoreValue').textContent, /^\d/);
  assert.ok(Number.parseFloat(element('rmse').textContent.replace(',','')) > 0);
}

const parsed = sandbox.parseCSV('Date,Close\n' + Array.from({length:60},(_,i)=>`2025-01-${String(i%28+1).padStart(2,'0')},${5000+i}`).join('\n'));
assert.equal(parsed.length, 60);
assert.throws(()=>sandbox.parseCSV('x,y\n1,2'), /Date and Close/);
assert.equal(sandbox.nextTrading(new Date('2026-08-14T00:00:00Z')).toISOString().slice(0,10), '2026-08-17');

element('exportBtn').onclick();
assert.equal(element('created-a').clicked, true);
console.log('PASS: initial render, 3 models, metrics, CSV parsing, trading dates, and export validated');
