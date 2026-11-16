/* Poker Estudio v4.4 - ICM en el laboratorio PWA. Sin red ni dependencias externas. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),M=window.PokerICMMath;
const R='AKQJT98765432',HANDS=[];
for(let i=0;i<13;i++)for(let j=0;j<13;j++)HANDS.push(i===j?R[i]+R[j]:i<j?R[i]+R[j]+'s':R[j]+R[i]+'o');
const combos=h=>h.length===2?6:h.endsWith('s')?4:12;
const fmt=n=>Number(n).toLocaleString('es-AR',{minimumFractionDigits:0,maximumFractionDigits:2});
const money=n=>'$'+Number(n).toLocaleString('es-AR',{maximumFractionDigits:2});
const percentage=x=>Number(100*x).toLocaleString('es-AR',{maximumFractionDigits:1})+'%';
const escapeText=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let selected='AJs',state=null,imported=null,records=new Map(),isStale=true;
const KEY='poker-icm-v44-settings';
function defaultData(n){
 const stacks=n===8?[26,0,40,33,27,22,18,14]:[25,0,27,21,17,13];
 const prizes=n===8?[5000,3300,2300,1750,1250,900,650,500]:[2500,1600,1100,800,600,400];
 return {stacks,prizes};
}
function countOptions(){let html='';for(let n=2;n<=12;n++)html+=`<option value="${n}"${n===6?' selected':''}>${n} jugadores</option>`;$('icm-count').innerHTML=html;}
function readRows(){const stacks=[],prizes=[];for(const tr of $('icm-rows').querySelectorAll('tr')){stacks.push(Number(tr.querySelector('.icm-stack').value));prizes.push(Number(tr.querySelector('.icm-prize').value));}return {stacks,prizes};}
function setRows(n,values){const data=values||defaultData(n);$('icm-count').value=String(n);
 $('icm-rows').innerHTML=Array.from({length:n},(_,i)=>`<tr><td><strong>${i===0?'Hero':i===1?'Rival':'Jugador '+(i+1)}</strong><span class="label-role">${i===0?'Hero':i===1?'Villain':'Otro stack'}</span></td><td><input aria-label="Stack de ${i===0?'Hero':i===1?'rival':'jugador '+(i+1)}" class="icm-stack" type="number" min="0" step="0.1" value="${Number(data.stacks[i]??10)}"></td><td><input aria-label="Premio al puesto ${i+1}" class="icm-prize" type="number" min="0" step="1" value="${Number(data.prizes[i]??0)}"></td></tr>`).join('');
 $('icm-rows').querySelectorAll('input').forEach(el=>el.addEventListener('input',dirty));
}
function toggle(){const isCall=$('icm-spot').value==='call';$('icm-call-wrap').hidden=!isCall;$('icm-open-wrap').hidden=isCall;$('icm-fold-wrap').hidden=isCall;
 $('icm-instant').closest('.field').hidden=$('tournamentMode').value!=='pko';$('icm-bounty').closest('.field').hidden=$('tournamentMode').value==='vanilla';}
function persist(){try{const v=getUi();localStorage.setItem(KEY,JSON.stringify(v));}catch(_){} }
function restore(){try{const d=JSON.parse(localStorage.getItem(KEY)||'null');if(!d||!Array.isArray(d.stacks)||d.stacks.length<2||d.stacks.length>12)return false;
  for(const id of ['spot','pot','call','open','fold','bounty','instant','win','tie'])if(d[id]!==undefined&&$('icm-'+id))$('icm-'+id).value=d[id];
  setRows(d.stacks.length,{stacks:d.stacks,prizes:d.prizes});toggle();return true;
 }catch(_){return false;}}
function getUi(){return {spot:$('icm-spot').value,pot:+$('icm-pot').value,call:+$('icm-call').value,open:+$('icm-open').value,fold:+$('icm-fold').value,bounty:+$('icm-bounty').value,instant:+$('icm-instant').value,win:+$('icm-win').value,tie:+$('icm-tie').value,...readRows()};}
function getScenario(){const d=getUi();if(d.win<0||d.win>100||d.tie<0||d.tie>100||d.win+d.tie>100)throw Error('Victoria y empate deben estar entre 0–100% y sumar como máximo 100%.');
 const c=M.scenario({spot:d.spot,stacks:d.stacks,prizes:d.prizes,hero:0,villain:1,pot:d.pot,call:d.call,open:d.open,fold:d.fold,mode:$('tournamentMode').value,bounty:d.bounty,instant:d.instant});
 return {c,d,manual:{win:d.win/100,tie:d.tie/100,n:0}};
}
function status(msg,error=false){$('icm-status').textContent=msg;$('icm-status').style.color=error?'#ffa4a4':'#b1cddd';}
function emptyGrid(){for(const el of $('icm-grid').children)el.className='decision-cell'+(el.dataset.hand===selected?' selected':'');$('icm-summary').innerHTML='<p class="rg-muted">Calculá el ICM e importá una matriz de equity para comparar rangos.</p>';$('icm-hand').textContent='No hay resultado activo para esta configuración.';$('icm-ranges').textContent='';}
function dirty(){state=null;isStale=true;records.clear();persist();emptyGrid();status('Parámetros modificados: recalculá ICM y volvé a importar la matriz si corresponde.');}
function onMode(){toggle();dirty();}
function premium(c,an){const chWin=c.stacks.win[c.hero]-c.stacks.baseline[c.hero],chLose=c.stacks.lose[c.hero]-c.stacks.baseline[c.hero],chFold=c.stacks.fold[c.hero]-c.stacks.baseline[c.hero],f=c.fold;
 const den=(1-f)*(chWin-chLose),num=-f*chFold-(1-f)*chLose;return den>1e-9?{chipRequired:num/den,risk:an.required-num/den}:null;
}
function showRequired(x){if(x===null||!Number.isFinite(x))return 'No definido';if(x<=0)return '≤0% (siempre favorable en este modelo)';if(x>1+1e-9)return '>100% (no alcanza)';return percentage(x);}
function calculate(fromClick=true){try{state=getScenario();isStale=false;persist();const {c,manual}=state,a=M.analyze(c,manual),p=premium(c,a);renderScenario(c,a,p);records.clear();emptyGrid();
 status(`ICM calculado: ${c.s.length} participantes, ${fmt(c.totalBefore)} BB contabilizadas. ${c.capture?'Puede cobrarse bounty al ganar':'No se elimina al rival; bounty inmediato = 0'}.`);
 return state;
}catch(e){state=null;isStale=true;records.clear();emptyGrid();status(e.message,true);return null;}}
function renderScenario(c,a,p){const color=x=>x>=0?'profit':'loss';
 const before=M.icm(c.stacks.baseline,c.prizes);
 const rows=[['Fold de Hero',c.stacks.baseline,c.cash.baseline],...(c.spot==='reshove'?[['Rival foldea reshove',c.stacks.fold,c.cash.fold]]:[]),['Hero gana',c.stacks.win,c.cash.win],['Empate',c.stacks.tie,c.cash.tie],['Hero pierde',c.stacks.lose,c.cash.lose]];

 $('icm-result').innerHTML=`<div class="icm-score"><div><small>EV monetario frente a fold</small><strong class="${color(a.monetaryEV)}">${a.monetaryEV>=0?'+':''}${money(a.monetaryEV)}</strong></div><div><small>EV en fichas frente a fold</small><strong class="${color(a.chipEV)}">${a.chipEV>=0?'+':''}${fmt(a.chipEV)} BB</strong></div><div><small>Equity mínima $EV · sin empates</small><strong>${showRequired(a.required)}</strong></div><div><small>Equity mínima cEV · sin empates</small><strong>${p?showRequired(p.chipRequired):'No definido'}</strong></div></div>
 <div class="decision-method"><strong>${a.monetaryEV>0?'Modelo favorable en $EV':a.monetaryEV<0?'Modelo desfavorable en $EV':'Punto de equilibrio $EV'}</strong> · Hero arriesga ${fmt(c.effective)} BB efectivas${c.spot==='reshove'?' y el rival paga '+fmt(c.oppCall)+' BB si continúa':''}. ${p?'Diferencia umbral ICM – cEV: '+(p.risk>=0?'+':'')+fmt(p.risk*100)+' puntos porcentuales.':''}<br>Bounty cobrado al eliminar: ${money(c.bonus)}. ${c.progressive?'Transferencia progresiva a tu cabeza: '+money(c.progressive)+' (no valorada).':''}</div>
 <div class="icm-result-table"><table class="micro-table"><thead><tr><th>Rama</th><th>Hero (BB)</th><th>Rival (BB)</th><th>Premio ICM Hero</th></tr></thead><tbody>${rows.map(([name,st,cash])=>`<tr><td>${name}</td><td>${fmt(st[c.hero])}</td><td>${fmt(st[c.villain])}</td><td>${money(cash)}</td></tr>`).join('')}</tbody></table></div>
 <div class="decision-method" style="margin-top:10px"><strong>Equidad ICM al foldear (todos):</strong><div class="icm-result-table"><table class="micro-table"><thead><tr><th>Jugador</th><th>Stack después del fold</th><th>Equidad ICM ($)</th></tr></thead><tbody>${before.map((v,i)=>`<tr><td>${i===0?'Hero':i===1?'Rival':'Jugador '+(i+1)}</td><td>${fmt(c.stacks.baseline[i])} BB</td><td>${money(v)}</td></tr>`).join('')}</tbody></table></div></div>
 <p class="decision-source">Valores esperados ICM sobre premios regulares; no ganancia garantizada. El EV de la acción está medido respecto de foldear, no es la suma absoluta de premios cobrados. Probabilidad manual: ganar ${percentage(a.win)}, empate ${percentage(a.tie)}. El umbral ignora empates, mientras el EV sí los integra. ${c.spot==='reshove'?'Fold rival al reshove: '+percentage(c.fold)+'.':''}</p>`;
}
function same(x,y){return Math.abs(x-y)<=0.015;}
function matching(snapshot,c){const d=snapshot.args;if(d.spot!==c.spot)throw Error('El analizador tiene un spot distinto. Primero calculá el mismo tipo de decisión.');
 if(!same(d.heroStack,c.s[0]))throw Error('Stack de Hero distinto: usá «Importar matriz» para sincronizar o corregí los valores.');
 if(c.spot==='call'){
  if(!same(d.callCost,c.effective)||!same(d.potBeforeCall,c.pot)||!same(d.villainStack,c.effective))throw Error('Pot/call/all-in no coinciden con Decisiones. La importación solo admite un pozo HU sin side pots.');
 }else{
  if(!same(d.villainStack,c.s[1]+c.open)||!same(d.deadPot+d.openSize,c.pot)||!same(d.openSize,c.open)||!same(d.foldPct,c.fold*100))throw Error('Open, pozo, stack rival o fold % distintos de la matriz de origen.');
 }
}
function importFromDecision(){const snap=window.PokerEstudioDecision?.getSnapshot?.();if(!snap){status('Primero ejecutá «Calcular matriz completa» en Decisiones KO/PKO.',true);return;}
 if(snap.spot==='isolate'){status('ICM de aislamiento multiway todavía no está modelado. Seleccioná call o reshove en Decisiones.',true);return;}
 const d=snap.args;$('icm-spot').value=d.spot;$('icm-pot').value=d.spot==='call'?d.potBeforeCall:d.deadPot+d.openSize;
 if(d.spot==='call')$('icm-call').value=d.callCost;
 else{$('icm-open').value=d.openSize;$('icm-fold').value=d.foldPct;}
 $('icm-bounty').value=d.bounty;$('icm-instant').value=d.instantPct;
 const rows=readRows();rows.stacks[0]=d.heroStack;rows.stacks[1]=d.spot==='call'?0:d.villainStack-d.openSize;
 if(rows.stacks[1]<-1e-7){status('El stack rival importado es incompatible con el open.',true);return;}
 setRows(rows.stacks.length,{stacks:rows.stacks,prizes:rows.prizes});toggle();
 if(!calculate(false))return;
 try{matching(snap,state.c);imported={statsMap:snap.statsMap,rangeText:snap.rangeText};makeMatrix();
  status(`Importadas ${imported.statsMap.size} clases del analizador. $EV calculado con tus stacks y premios. Revisá el rango rival: ${snap.rangeText}.`);
 }catch(e){status(e.message,true);}
}
function makeMatrix(){if(!state||isStale){status('Primero calculá ICM para este escenario.',true);return;}
 if(!imported||!imported.statsMap.size){status('Primero calculá la matriz en Decisiones KO/PKO e importala.',true);return;}
 const report=new Map();
 for(const [hand,stats] of imported.statsMap){if(!(stats.n>0))continue;try{report.set(hand,{...M.analyze(state.c,stats),n:stats.n});}catch(_){}}
 records=report;renderMatrix();}
function renderMatrix(){const view=$('icm-view').value;
 const totals={positive:0,negative:0,borderline:0,missing:0,contrasts:0};
 let goods=[];
 for(const hand of HANDS){const v=records.get(hand);if(!v){totals.missing+=combos(hand);continue;}
  const status=classification(v,view);totals[status]+=combos(hand);
  if(v.confidence==='positive')goods.push(hand);
  if(v.chipConfidence==='positive'&&v.confidence==='negative')totals.contrasts+=combos(hand);
 }
 $('icm-summary').innerHTML=`<div class="icm-mini-stats"><div><small>+EV</small><strong>${totals.positive}</strong><small>combos</small></div><div><small>−EV</small><strong>${totals.negative}</strong><small>combos</small></div><div><small>Frontera</small><strong>${totals.borderline}</strong><small>combos</small></div><div><small>Sin calcular</small><strong>${totals.missing}</strong><small>combos</small></div></div><p class="rg-muted">Comparación +cEV y −$EV (señal estadística): ${totals.contrasts} combos. Conteos aproximados; no son frecuencias de mezcla GTO.</p>`;
 for(const cell of $('icm-grid').children){const hand=cell.dataset.hand,v=records.get(hand);let cls='decision-cell';
  if(v){const status=classification(v,view);cls+=' '+(status==='contrast'?'icm-contrast':status==='other'?'icm-contrast-other':status);}
  if(hand===selected)cls+=' selected';cell.className=cls;cell.title=v?`${hand}: $EV ${money(v.monetaryEV)}, cEV ${fmt(v.chipEV)} BB, ${v.n} muestras`:hand+' no calculado';
 }
 $('icm-ranges').innerHTML=`<strong>Rango con señal +$EV</strong> · ${goods.length} clases: <span id="icm-positive-text">${goods.join(', ')||'Ninguna'}</span>`;
 renderHand();
}
function classification(v,view){if(view==='chips')return v.chipConfidence||'borderline';
 if(view==='contrast')return v.chipConfidence==='positive'&&v.confidence==='negative'?'contrast':'other';
 return v.confidence||'borderline';}
function renderHand(){const v=records.get(selected);$('icm-hand').innerHTML=v?`<strong>${selected}</strong> (${combos(selected)} combos) · $EV ${v.monetaryEV>=0?'+':''}${money(v.monetaryEV)} · cEV ${v.chipEV>=0?'+':''}${fmt(v.chipEV)} BB · ganar ${percentage(v.win)} / empatar ${percentage(v.tie)} · ${fmt(v.n)} simulaciones. ${v.confidence==='borderline'?'Zona incierta: refiná esta mano en Decisiones antes de concluir.':''}`:'Seleccioná una mano calculada o importá primero la matriz.';}
function exportCsv(){if(!records.size){status('Importá resultados de equity antes de exportar.',true);return;}
 const rows=['sep=;','Mano;Combos;Victoria_pct;Empate_pct;EV_ICM_y_bounty;EV_chip_BB;Estado_ICM;Muestras'];for(const h of HANDS){const x=records.get(h);if(!x)continue;rows.push([h,combos(h),(x.win*100).toFixed(3),(x.tie*100).toFixed(3),x.monetaryEV.toFixed(4),x.chipEV.toFixed(4),x.confidence,x.n].join(';'));}
 const blob=new Blob(['\ufeff'+rows.join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='poker-estudio-v44-icm-vs-chip.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);status('CSV exportado. Resultados condicionales, no GTO.');}
async function copyRange(){if(!records.size){status('Importá primero una matriz.',true);return;}const text=HANDS.filter(h=>records.get(h)?.confidence==='positive').join(', ');if(!text){status('No hay manos con señal suficientemente positiva.',true);return;}try{await navigator.clipboard.writeText(text);status('Rango con +$EV copiado.');}catch(_){status('Copiá manualmente el rango mostrado debajo de la matriz.',true);}}
function init(){countOptions();setRows(6);if(!restore())toggle();
 $('icm-grid').innerHTML=HANDS.map(h=>`<button class="decision-cell${h===selected?' selected':''}" data-hand="${h}" type="button" aria-label="${h}">${h}</button>`).join('');
 $('icm-grid').addEventListener('click',e=>{const btn=e.target.closest('[data-hand]');if(btn){selected=btn.dataset.hand;renderMatrix();}});
 $('icm-spot').addEventListener('change',()=>{toggle();dirty();});$('icm-count').addEventListener('change',()=>{setRows(+$('icm-count').value);dirty();});
 for(const id of ['pot','call','open','fold','bounty','instant','win','tie'])$('icm-'+id).addEventListener('input',dirty);
 $('icm-preset-6').addEventListener('click',()=>{setRows(6);$('icm-spot').value='call';$('icm-pot').value=15.5;$('icm-call').value=12;toggle();dirty();});
 $('icm-preset-8').addEventListener('click',()=>{setRows(8);$('icm-spot').value='call';$('icm-pot').value=15.5;$('icm-call').value=12;toggle();dirty();});
 $('icm-compute').addEventListener('click',()=>calculate());$('icm-import').addEventListener('click',importFromDecision);$('icm-view').addEventListener('change',renderMatrix);
 $('icm-export').addEventListener('click',exportCsv);$('icm-copy').addEventListener('click',copyRange);
 $('tournamentMode').addEventListener('change',onMode);emptyGrid();
}
init();window.PokerEstudioICM={importFromDecision,calculate,getState:()=>state,getRecords:()=>new Map(records)};
})();
