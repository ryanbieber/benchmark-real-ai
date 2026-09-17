'use strict';
const $=id=>document.getElementById(id),M=ForecastModel,bundled=$('embedded-data').textContent;
let data=M.parseCSV(bundled),view='forecast',current,bt,hover=[];
const fmt=v=>v.toLocaleString('en-US',{maximumFractionDigits:0}),pct=v=>v.toFixed(1)+'%';
function settings(){return {w:+$('window').value,h:+$('horizon').value,z:+$('confidence').value,mode:$('model').value,a:+$('annual').value};}
function render(){
 const s=settings(); if(!$('annual').checkValidity()){ $('status').textContent='Enter annual growth between -50% and 50%.';return; }
 $('customWrap').hidden=s.mode!=='custom';$('horizonValue').textContent=`${s.h} sessions`;
 current=M.forecast(data,s.w,s.mode,s.a,s.h,s.z);bt=M.backtest(data,s.w,s.mode,s.a,s.h,s.z);
 const last=data.at(-1),end=current.points.at(-1),confidence=$('confidence').selectedOptions[0].text;
 $('last').textContent=fmt(last.value);$('lastDate').textContent=last.date;$('target').textContent=fmt(end.mid);$('change').textContent=`${end.mid>=last.value?'+':''}${pct((end.mid/last.value-1)*100)} over ${s.h} sessions`;
 $('rangeLabel').textContent=confidence+' ENDPOINT RANGE';$('range').textContent=fmt(end.low)+' – '+fmt(end.high);$('vol').textContent=pct(current.fit.sigma*Math.sqrt(252)*100);
 $('dataInfo').textContent=`${data[0].date} → ${last.date} · ${fmt(data.length)} closes. Snapshot only.`;
 for(const [id,v] of [['mape',bt.mape],['baseline',bt.baseline],['coverage',bt.coverage]])$(id).textContent=bt.n?pct(v):'Unavailable';$('count').textContent=bt.n;
 $('verdict').textContent=bt.n?`${bt.mape<bt.baseline?'Model error is lower than the baseline.':bt.mape>bt.baseline?'The no-change baseline has lower error.':'Model and baseline errors are equal.'} ${bt.n<20?'Small sample: interpret cautiously. ':''}Origins are 21 sessions apart; overlapping outcomes are not independent.`:'Not enough history for this training window and horizon. Import more data or shorten the settings.';
 $('forecastTab').classList.toggle('active',view==='forecast');$('backtestTab').classList.toggle('active',view==='backtest');
 $('forecastTab').setAttribute('aria-pressed',view==='forecast');$('backtestTab').setAttribute('aria-pressed',view==='backtest');
 draw();
}
function draw(){
 const s=settings(),isForecast=view==='forecast';let actual,line,bands;
 if(isForecast){actual=data.slice(-253).map((r,i,a)=>({x:i-a.length+1,y:r.value,label:r.date}));line=current.points.map(r=>({x:r.t,y:r.mid,label:r.t===0?data.at(-1).date:`+${r.t} trading sessions`}));bands=current.points.map(r=>({x:r.t,low:r.low,high:r.high}));}
 else {actual=bt.rows.map((r,i)=>({x:i,y:r.actual,label:r.date}));line=bt.rows.map((r,i)=>({x:i,y:r.mid,label:r.date}));bands=bt.rows.map((r,i)=>({x:i,low:r.low,high:r.high}));}
 $('chartTitle').textContent=isForecast?'The range of possibilities':'Forecasts meet actual outcomes';
 $('chartNote').textContent=isForecast?`Showing the last year of history. Forecast starts at the last observed close; shaded area is the ${$('confidence').selectedOptions[0].text} prediction interval.`:`Each point is a ${s.h}-session-ahead outcome. Predictions use only data preceding their origin. The interval is evaluated at the same horizon.`;
 $('legend').innerHTML='<span><b style="background:#eef4fa"></b>Observed close</span><span><b style="background:#8be7cb"></b>Forecast median</span><span><b style="background:#455e83;height:9px"></b>Prediction interval</span>';
 const svg=$('chart');svg.setAttribute('aria-label',isForecast?'S&P 500 history and future forecast with uncertainty range':'Rolling backtest actual and predicted closing prices');
 if(!line.length){svg.innerHTML='<text x="450" y="180" text-anchor="middle" fill="#95a5b8">Insufficient history for this backtest.</text>';hover=[];return;}
 const all=[...actual.map(r=>r.y),...bands.flatMap(r=>[r.low,r.high])],min=Math.min(...all),max=Math.max(...all),pad=(max-min)*.12||min*.05,lo=min-pad,hi=max+pad;
 const xmin=actual[0].x,xmax=Math.max(line.at(-1).x,xmin+1),x=v=>65+(v-xmin)/(xmax-xmin)*810,y=v=>320-(v-lo)/(hi-lo)*290;
 const path=rows=>rows.map((r,i)=>(i?'L':'M')+x(r.x).toFixed(2)+','+y(r.y).toFixed(2)).join(' ');
 let html='';for(let i=0;i<5;i++){const v=lo+(hi-lo)*i/4,yy=y(v);html+=`<line x1="65" x2="875" y1="${yy}" y2="${yy}" stroke="#26323f"/><text x="52" y="${yy+4}" text-anchor="end" fill="#95a5b8" font-size="11">${fmt(v)}</text>`;}
 html+=`<path d="${path(bands.map(r=>({x:r.x,y:r.high})))} ${bands.slice().reverse().map(r=>'L'+x(r.x).toFixed(2)+','+y(r.low).toFixed(2)).join(' ')} Z" fill="#7399ec" opacity=".16"/>`;
 html+=`<path d="${path(actual)}" stroke="#e0e8f2" stroke-width="2" fill="none"/><path d="${path(line)}" stroke="#8be7cb" stroke-width="2.5" fill="none" ${isForecast?'stroke-dasharray="6 4"':''}/>`;
 if(isForecast)html+=`<line x1="${x(0)}" x2="${x(0)}" y1="20" y2="320" stroke="#658177" stroke-dasharray="3 5"/><text x="${x(0)+8}" y="20" fill="#8be7cb" font-size="10">FORECAST →</text>`;
 for(let i=0;i<=4;i++){const xx=xmin+(xmax-xmin)*i/4;let label;if(isForecast)label=xx>0?'+'+Math.round(xx)+' sessions':data[data.length-1+Math.max(-252,Math.round(xx))]?.date;else label=bt.rows[Math.round(xx)]?.date;html+=`<text x="${x(xx)}" y="346" text-anchor="middle" fill="#95a5b8" font-size="10">${label||''}</text>`;}
 svg.innerHTML=html+'<line id="crosshair" y1="25" y2="320" stroke="#95a5b8" opacity="0"/>';
 hover=isForecast?[...actual.filter(r=>r.x<0).map(r=>({...r,px:x(r.x),text:`${r.label} · Close ${fmt(r.y)}`})),...line.map((r,i)=>({...r,px:x(r.x),text:`${r.label} · Median ${fmt(r.y)} · Range ${fmt(bands[i].low)}–${fmt(bands[i].high)}`}))]:line.map((r,i)=>({...r,px:x(r.x),text:`${r.label} · Actual ${fmt(actual[i].y)} · Forecast ${fmt(r.y)}`}));
 $('tooltip').textContent='Move across the chart to inspect values.';
}
$('chart').addEventListener('pointermove',e=>{if(!hover.length)return;const r=$('chart').getBoundingClientRect(),px=(e.clientX-r.left)*900/r.width,p=hover.reduce((a,b)=>Math.abs(a.px-px)<Math.abs(b.px-px)?a:b);$('tooltip').textContent=p.text;const cross=$('crosshair');cross.setAttribute('x1',p.px);cross.setAttribute('x2',p.px);cross.setAttribute('opacity','.6');});
for(const id of ['model','window','horizon','confidence','annual'])$(id).addEventListener('input',render);
$('forecastTab').onclick=()=>{view='forecast';render();};$('backtestTab').onclick=()=>{view='backtest';render();};
$('upload').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>5e6)throw Error('CSV must be smaller than 5 MB.');const imported=M.parseCSV(await file.text());data=imported;$('sourceName').textContent='Imported · '+file.name;$('status').className='';$('status').textContent='CSV validated and loaded.';adjustWindow();render();}catch(err){$('status').className='error';$('status').textContent=err.message;}finally{e.target.value='';}};
function adjustWindow(){for(const o of $('window').options)o.disabled=+o.value>=data.length;if(+$('window').value>=data.length)$('window').value='252';}
$('reset').onclick=()=>{data=M.parseCSV(bundled);$('sourceName').textContent='S&P 500 · FRED';$('status').className='';$('status').textContent='Bundled snapshot restored.';adjustWindow();render();};
$('export').onclick=()=>{const s=settings(),rows=view==='forecast'?['session,median,lower,upper,origin,model,training_sessions,annual_growth_percent,interval_z',...current.points.map(r=>[r.t,r.mid,r.low,r.high,data.at(-1).date,s.mode,s.w,s.a,s.z].join(','))]:['origin,target_date,actual,forecast,lower,upper,no_change',...bt.rows.map(r=>[r.origin,r.date,r.actual,r.mid,r.low,r.high,r.base].join(','))];const url=URL.createObjectURL(new Blob([rows.join('\n')],{type:'text/csv'})),a=document.createElement('a');a.href=url;a.download='sp500-'+view+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
render();
