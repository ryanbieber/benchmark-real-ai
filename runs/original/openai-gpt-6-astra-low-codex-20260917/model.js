(function(root){
 'use strict';
 function parseCSV(text){
  const lines=text.trim().replace(/^\uFEFF/,'').split(/\r?\n/), head=lines.shift().toLowerCase().split(',').map(s=>s.trim().replaceAll('"',''));
  const di=head.findIndex(s=>['date','observation_date'].includes(s)), vi=head.findIndex(s=>['sp500','close','value'].includes(s));
  if(di<0||vi<0)throw Error('Use CSV columns Date,Close or observation_date,SP500.');
  const map=new Map();
  for(const line of lines){const a=line.split(',').map(s=>s.trim().replaceAll('"','')); if(!a[vi]||a[vi]==='.')continue; const date=a[di],value=Number(a[vi]);
   if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||!Number.isFinite(value)||value<=0)throw Error('Invalid date or nonpositive price in CSV.');
   if(map.has(date))throw Error('Duplicate date: '+date); map.set(date,value);
  }
  const rows=[...map].sort((a,b)=>a[0].localeCompare(b[0])).map(([date,value])=>({date,value}));
  if(rows.length<300)throw Error('At least 300 valid daily closing prices are required.'); return rows;
 }
 function fit(data,end,window,mode,annual){
  const start=Math.max(0,end-window),r=[]; for(let i=start+1;i<=end;i++)r.push(Math.log(data[i].value/data[i-1].value));
  const mean=r.reduce((a,b)=>a+b,0)/r.length,variance=r.reduce((a,b)=>a+(b-mean)**2,0)/(r.length-1);
  return {mu:mode==='historical'?mean:mode==='custom'?Math.log1p(annual/100)/252:0,sigma:Math.sqrt(variance),n:r.length};
 }
 function point(base,t,fit,z){const mid=base*Math.exp(fit.mu*t),spread=z*fit.sigma*Math.sqrt(t);return {t,mid,low:mid*Math.exp(-spread),high:mid*Math.exp(spread)};}
 function forecast(data,window,mode,annual,horizon,z){const f=fit(data,data.length-1,window,mode,annual);return {fit:f,points:Array.from({length:horizon+1},(_,t)=>point(data.at(-1).value,t,f,z))};}
 function backtest(data,window,mode,annual,h,z){const rows=[];for(let end=window;end+h<data.length;end+=21){const f=fit(data,end,window,mode,annual),p=point(data[end].value,h,f,z),actual=data[end+h].value;rows.push({origin:data[end].date,date:data[end+h].date,actual,base:data[end].value,...p});}
  const n=rows.length; if(!n)return {rows,n};return {rows,n,mape:rows.reduce((s,r)=>s+Math.abs(r.mid/r.actual-1),0)/n*100,baseline:rows.reduce((s,r)=>s+Math.abs(r.base/r.actual-1),0)/n*100,coverage:rows.filter(r=>r.actual>=r.low&&r.actual<=r.high).length/n*100,rmse:Math.sqrt(rows.reduce((s,r)=>s+(r.mid-r.actual)**2,0)/n)};
 }
 const api={parseCSV,fit,point,forecast,backtest};if(typeof module!=='undefined')module.exports=api;root.ForecastModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
