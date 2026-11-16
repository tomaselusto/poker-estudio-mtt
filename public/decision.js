/* Poker Estudio v4.3 · analizador educativo KO/PKO con constructor de rangos.
   Las matrices se estiman por Monte Carlo (NO solver GTO).
   Aislamiento: EV condicionado exclusivamente a quedar heads-up. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id),T=window.PokerEstudioTools,M=window.PokerDecisionMath,RG=window.PokerRangeReport;
 const R='AKQJT98765432',S='shdc',DECK=[...R].flatMap(r=>[...S].map(s=>r+s));
 const HANDS=[];for(let i=0;i<13;i++)for(let j=0;j<13;j++)HANDS.push(i===j?R[i]+R[j]:i<j?R[i]+R[j]+'s':R[j]+R[i]+'o');
 const fmt=n=>Number(n).toLocaleString('es-AR',{maximumFractionDigits:2});
 const pct=n=>(Number(n)*100).toLocaleString('es-AR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%';
 const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const KEY='poker-v42-decision-inputs';
 const inputIds=['dm-spot','dm-pos','dm-hero-pos','dm-hero','dm-villain','dm-pot','dm-call','dm-dead','dm-open','dm-fold','dm-bounty','dm-instant','dm-power','dm-range','dm-iso-fold'];
 let generation=0,results=new Map(),selected='AJs',working=false,context=null,currentData=null;
 const fastId=['dm-spot','dm-hero','dm-villain','dm-pot','dm-call','dm-dead','dm-open','dm-fold','dm-bounty','dm-instant','dm-power','dm-range','dm-iso-fold'];
 function preset(pos,stack,action){
  // Hipótesis didácticas EDITABLES, no outputs de solver.
  if(action==='reshove')return ({UTG:'TT+, AQs+, AKo',HJ:'99+, AJs+, KQs, AQo+',CO:'88+, ATs+, KQs, AJo+',BTN:'77+, A9s+, KQs, ATo+'})[pos]||'88+, AJs+, KQs, AQo+';
  if(stack<=10)return ({UTG:'44+, A7s+, KTs+, QTs+, AJo+, KQo',HJ:'22+, A2s+, K7s+, Q9s+, JTs, A8o+, KJo+',CO:'22+, A2s+, K4s+, Q8s+, J9s+, T9s, A5o+, KTo+, QJo',BTN:'22+, A2s+, K2s+, Q5s+, J8s+, T8s+, 98s, A2o+, K7o+, QTo+'})[pos]||'33+, A5s+, KTs+, QJs, ATo+, KQo';
  return ({UTG:'66+, ATs+, KQs, AJo+',HJ:'44+, A5s+, KTs+, QTs+, JTs, ATo+, KQo',CO:'33+, A2s+, K8s+, Q9s+, J9s+, T9s, A8o+, KJo+',BTN:'22+, A2s+, K3s+, Q6s+, J7s+, T8s+, 98s, A5o+, K9o+, QTo+'})[pos]||'55+, A9s+, KJs+, QJs, ATo+, KQo';
 }
 function opts(){return {
   spot:$('dm-spot').value,format:$('tournamentMode').value,
   heroStack:+$('dm-hero').value,villainStack:+$('dm-villain').value,
   potBeforeCall:+$('dm-pot').value,callCost:+$('dm-call').value,
   deadPot:+$('dm-dead').value,openSize:+$('dm-open').value,foldPct:+$('dm-fold').value,
   bounty:+$('dm-bounty').value,instantPct:+$('dm-instant').value,bountyPower:+$('dm-power').value
 };}
 function updatePositions(){
  const current=$('dm-pos').value;
  const positions=$('tableMode').value==='6max'?['UTG','HJ','CO','BTN','SB']:['UTG','UTG+1','LJ','HJ','CO','BTN','SB'];
  $('dm-pos').innerHTML=positions.map(p=>`<option value="${p}">${p}</option>`).join('');
  $('dm-pos').value=positions.includes(current)?current:'CO';
  const prev=$('dm-hero-pos').value; const all=[...positions,'BB'];
  $('dm-hero-pos').innerHTML=all.map(p=>`<option value="${p}">${p}</option>`).join('');
  $('dm-hero-pos').value=all.includes(prev)?prev:'BTN';
 }
 function toggle(){
  const spot=$('dm-spot').value;
  $('dm-call-group').hidden=spot!=='call';
  $('dm-dead-group').hidden=spot==='call';
  $('dm-reshove-group').hidden=spot!=='reshove';
  $('dm-iso-group').hidden=spot!=='isolate';
  $('dm-bounty-group').hidden=$('tournamentMode').value==='vanilla';
  $('dm-instant-group').hidden=$('tournamentMode').value!=='pko';
  $('dm-pot-description').textContent=spot==='call'?'Pozo incluye la apuesta rival, pero NO tu call.':'Pozo muerto antes de la acción, normalmente 0,5 SB + 1 BB + 1 BB ante = 2,5 BB (rival aún no contribuyó).';
  $('dm-range-label').textContent=spot==='reshove'?'Rango con el que CO/UTG paga tu reshove':'Rango con el que el short hace open shove';
  $('dm-context').textContent=spot==='call'?'Call a un open shove · un único rival':spot==='reshove'?'Reshove vs open raise · un único rival':'Aislamiento de short · solo escenario heads-up';
 }
 function setStale(){generation++;results.clear();currentData=null;context=null;for(const el of $('dm-grid').children)el.className='decision-cell'+(el.dataset.hand===selected?' selected':'');
  $('dm-selected').innerHTML='<div class="decision-method">Los parámetros cambiaron. Recalculá una mano o toda la matriz para obtener resultados nuevos.</div>';
  $('dm-progress-fill').style.width='0%';$('dm-status').textContent='Sin cálculos para esta configuración.';renderRangeReport();
 }
 function persist(){try{localStorage.setItem(KEY,JSON.stringify(Object.fromEntries(inputIds.map(id=>[id,$(id).value]))));}catch(_e){}}
 function restore(){try{let data=JSON.parse(localStorage.getItem(KEY)||'{}');for(const id of inputIds)if(data[id]!==undefined)$(id).value=data[id];}catch(_e){}}
 function getContext(){
  const order=($('tableMode').value==='6max'?['UTG','HJ','CO','BTN','SB','BB']:['UTG','UTG+1','LJ','HJ','CO','BTN','SB','BB']);
  const spot=$('dm-spot').value, heroPos=$('dm-hero-pos').value, villPos=$('dm-pos').value;
  if(order.indexOf(heroPos)<=order.indexOf(villPos))throw Error('Hero debe actuar después del rival en este árbol de un único agresor.');
  if(spot!=='call' && ['SB','BB'].includes(heroPos))throw Error('El modelo de reshove/aislamiento asume que Hero aún no invirtió ciegas: elegí una posición distinta de SB/BB.');
  const args=opts(); const c=M.context(args);
  const map=T.parseRange($('dm-range').value);
  if(![...map.values()].some(x=>x>0))throw Error('El rango rival está vacío.');
  return {args,c,map};
 }
 function sampler(hand,map){
  const heroPairs=T.holeCombos(hand,new Set());
  const groups=[],weights=[];let total=0;
  for(const hero of heroPairs){
   const villainPairs=[];let subtotal=0;
   const blocked=new Set(hero);
   for(const [clazz,freq] of map){if(freq<=0)continue;for(const cards of T.holeCombos(clazz,blocked)){subtotal+=freq;villainPairs.push({cards,prefix:subtotal});}}
   if(subtotal>0){total+=subtotal;groups.push({hero,villainPairs,total:subtotal,prefix:total});}
  }
  if(total<=0)return null;
  return {groups,total};
 }
 function binaryPick(array,v,key){let l=0,r=array.length-1;while(l<r){let m=(l+r)>>1;if(v<array[m][key])r=m;else l=m+1;}return array[l];}
 function simulate(hand,map,trials){
  const samples=sampler(hand,map);if(!samples)return {win:0,tie:0,n:0,error:'Sin combinaciones rivales legales'};
  let wins=0,ties=0;
  for(let i=0;i<trials;i++){
   const g=binaryPick(samples.groups,Math.random()*samples.total,'prefix');
   const picked=binaryPick(g.villainPairs,Math.random()*g.total,'prefix');
   const villain=picked.cards,hero=g.hero;
   const used=new Set([...hero,...villain]),board=[];
   while(board.length<5){const card=DECK[(Math.random()*52)|0];if(!used.has(card)){used.add(card);board.push(card);}}
   const hr=T.evaluate7([...hero,...board]),vr=T.evaluate7([...villain,...board]);
   if(hr>vr)wins++;else if(hr===vr)ties++;
  }
  return {win:wins/trials,tie:ties/trials,n:trials};
 }
 function className(x){return x.confidence==='positive'?'positive':x.confidence==='negative'?'negative':'borderline';}
 function label(x,c){if(c.type==='isolate')return x.confidence==='positive'?'HU favorable':x.confidence==='negative'?'HU desfavorable':'HU incierto';return x.confidence==='positive'?(c.type==='call'?'Call +cEV':'Shove +cEV'):x.confidence==='negative'?(c.type==='call'?'Fold favorecido':'Fold favorecido'):'Decisión cercana / incierta';}
 function getReports(){return context&&results.size?RG.report(new Map([...results].map(([hand,x])=>[hand,x.stats])),context.args,M):null;}
 function selectedMode(){const view=$('rg-view').value;return view.startsWith('ko')?'ko':view.startsWith('pko')?'pko':'vanilla';}
 function isDelta(){return $('rg-view').value.includes('-delta');}
 function actionLabel(c){return c.type==='call'?'Call':c.type==='reshove'?'Reshove':'Aislamiento HU';}
 function makeRangeString(report){
  const view=$('rg-view').value;
  if(isDelta())return report.delta[selectedMode()].join(', ');
  return RG.rangeOf(report.modes[selectedMode()],'positive').join(', ');
 }
 function renderRangeReport(){
  const report=getReports();const summary=$('rg-summary'),coverage=$('rg-coverage'),strip=$('rg-strip'),positive=$('rg-positive-list'),border=$('rg-border-list'),delta=$('rg-delta');
  if(!report){summary.innerHTML='<p class="rg-muted">Sin calcular. Configurá el escenario y ejecutá «Calcular matriz completa».</p>';coverage.textContent='';strip.innerHTML='';positive.textContent='Sin calcular.';border.textContent='Sin calcular.';delta.textContent='Compará las manos que pasan de EV negativo a positivo gracias al bounty.';return;}
  const view=$('rg-view').value,mode=selectedMode(),data=report.modes[mode],isDiff=isDelta();
  summary.innerHTML=['vanilla','ko','pko'].map(m=>{const t=report.modes[m].totals;return `<div class="rg-card${mode===m?' active':''}"><small>${m.toUpperCase()}</small><strong>${fmt(t.positive/1326*100)}%</strong><b>${fmt(t.positive)} combos +EV</b><small>${fmt(t.borderline)} combos inciertos</small></div>`;}).join('');
  const t=data.totals,total=t.computed||1;
  strip.innerHTML=`<div style="width:${t.positive/total*100}%;background:#26866b"></div><div style="width:${t.borderline/total*100}%;background:#bb8e45"></div><div style="width:${t.negative/total*100}%;background:#8a4a58"></div>`;
  coverage.textContent=`${report.analyzed}/169 clases calculadas · ${fmt(t.computed)}/1326 combos evaluados · Favorables: ${fmt(t.positive)} · Inciertos: ${fmt(t.borderline)} · Desfavorables: ${fmt(t.negative)}. El porcentaje favorable es sobre todas las manos iniciales, no la frecuencia óptima GTO.`;
  const green=isDiff?report.delta[mode]:RG.rangeOf(data,'positive');
  const amber=isDiff?report.delta[mode+'Border']:RG.rangeOf(data,'borderline');
  positive.textContent=green.length?green.join(', '):'Ninguna mano cumple el criterio de EV positivo con suficiente margen estadístico.';
  border.textContent=amber.length?amber.join(', '):'Ninguna mano en este grupo.';
  $('rg-positive-label').textContent=isDiff?`Manos que pasan de −EV Vanilla a +EV ${mode.toUpperCase()}`:`Rango de ${actionLabel(data.context)} favorable estimado · ${mode.toUpperCase()}`;
  if(isDiff){
   const n=RG.sumCombos(green),b=RG.sumCombos(amber);
   delta.textContent=`${fmt(n)} combinaciones cambian de EV negativo con certeza estadística en Vanilla a EV positivo con ${mode.toUpperCase()} según los supuestos. Otras ${fmt(b)} combos pasan de fronterizas en Vanilla a positivas: requieren revisar el rango y las simulaciones. Una mejora de EV no garantiza que la acción sea la mejor frente a call, raise u otras líneas.`;
  }else{
   const v=report.modes.vanilla.totals.positive;
   delta.textContent=mode==='vanilla'?'Referencia sin recompensa: las manos con +EV superan foldear en este escenario.':`Comparado con Vanilla (${fmt(v)} combos favorables), ${mode.toUpperCase()} tiene ${fmt(t.positive)} combos favorables. La diferencia de tamaños no implica un cambio de frecuencia GTO.`;
  }
 }
 function drawSelected(){
  const reports=getReports(),el=$('dm-selected');
  for(const btn of $('dm-grid').children)btn.classList.toggle('selected',btn.dataset.hand===selected);
  $('dm-current').textContent=selected;
  const x=results.get(selected);
  if(!x||!reports){el.innerHTML='<div class="decision-method">Seleccioná «Calcular matriz» o «Refinar mano» para estimar esta mano frente al rango rival.</div>';return;}
  const mode=selectedMode(),c=reports.modes[mode].context,r=reports.modes[mode].data.get(selected),z=x.stats;
  const compare=['vanilla','ko','pko'].map(m=>{const cc=reports.modes[m].context,rr=reports.modes[m].data.get(selected);return `<tr${m===mode?' class="selected-row"':''}><td>${m.toUpperCase()}</td><td>${fmt(cc.bonus)} BB</td><td>${pct(rr.req)}</td><td class="${rr.ev>=0?'ok-text':'error-text'}">${rr.ev>=0?'+':''}${fmt(rr.ev)} BB</td><td>${rr.confidence==='positive'?'Favorable':rr.confidence==='negative'?'Desfavorable':'Incierto'}</td></tr>`;}).join('');
  const effective=c.type==='reshove'?`Reshove ALL-IN (exposición efectiva heads-up: ${fmt(c.callCost)} BB). Si el rival foldea ${pct(c.foldProb)}, ganás ${fmt(c.foldGain)} BB inmediatamente; cuando paga, usás el rango de call al reshove. La parte no igualada de un shove se devuelve.`:c.type==='isolate'?`EV condicionado a quedar heads-up; no integra el resultado de los jugadores restantes. La probabilidad estimada de quedar HU no convierte este valor en EV completo.`:`Call de ${fmt(c.callCost)} BB; EV incremental contra foldear ahora (EV=0), solo en heads-up.`;
  const foldNeed=c.type==='reshove'?`<div class="decision-method">Fold mínimo necesario frente a su rango de call: <strong>${pct(RG.foldThreshold(r.callEV,c.foldGain))}</strong> para empatar el EV de fold (suponiendo las demás entradas constantes). Fold observado: <strong>${pct(c.foldProb)}</strong>.</div>`:'';
  el.innerHTML=`<div class="decision-big"><div><small>Acción modelada (${mode.toUpperCase()})</small><strong class="${r.ev>=0?'ok-text':'error-text'}">${label(r,c)}</strong></div><div><small>Equity contra rango</small><strong>${pct(r.eq)}</strong></div><div><small>${c.type==='isolate'?'EV HU condicionado':c.type==='reshove'?'EV reshove vs fold':'EV call vs fold'}</small><strong class="${r.ev>=0?'ok-text':'error-text'}">${r.ev>=0?'+':''}${fmt(r.ev)} BB</strong></div><div><small>Equity necesaria sin empates</small><strong>${pct(r.req)}</strong></div></div>
    ${foldNeed}<div class="decision-method">${effective}<br>Victoria ${pct(z.win)} · Empate ${pct(z.tie)} · Margen estadístico de EV (95%): ±${fmt(1.96*r.stderr)} BB · ${fmt(z.n)} muestras. ${r.confidence==='borderline'?'<strong>Resultado incierto por muestreo: no hay decisión concluyente.</strong>':''}</div>
    <p class="decision-tag">Hero ${fmt(c.hero)} BB · Rival ${fmt(c.villain)} BB · ${c.covers?'Hero cubre al rival':'Hero NO cubre al rival'} · bounty inmediato convertido ${fmt(c.bonus)} BB. ${c.format==='pko'?'Transferido a la cabeza de Hero: '+fmt(c.transferred)+' ($, NO valorado en EV).':''}</p>
    <div style="overflow-x:auto"><table class="micro-table"><thead><tr><th>Modalidad</th><th>Bonus</th><th>Equity mín. sin empate</th><th>EV modelo</th><th>Señal</th></tr></thead><tbody>${compare}</tbody></table></div>
    <p class="decision-source">Las bandas de confianza representan solo error Monte Carlo, NO incertidumbre del rango rival, fold real, Bounty Power ni ICM. El umbral de equity supone ausencia de empates; el EV sí los contempla. No se compara con otras líneas distintas de foldear.</p>`;
 }
 function updateCells(){
  const report=getReports(),view=$('rg-view').value,mode=selectedMode(),delta=isDelta();
  $('dm-grid').classList.toggle('rg-matrix-highlights',delta);
  for(const btn of $('dm-grid').children){
   const hand=btn.dataset.hand,stats=results.get(hand),d=report?.modes[mode].data.get(hand);
   let klass='decision-cell';
   if(delta){if(report?.delta[mode].includes(hand))klass+=' delta-new';else if(report?.delta[mode+'Border'].includes(hand))klass+=' delta-possible';else if(stats)klass+=' delta-other';}
   else if(d)klass+=' '+d.confidence;
   if(hand===selected)klass+=' selected';
   btn.className=klass;btn.title=d?`${hand}: ${pct(d.eq)} equity · ${mode.toUpperCase()} EV ${fmt(d.ev)} BB · ${fmt(stats.stats.n)} simulaciones`:hand+' · sin calcular';
  }
 }
 async function refineBorderline(){
  if(working)return;
  let data;try{data=getContext();}catch(e){$('rg-feedback').textContent=e.message;return;}
  // Los resultados anteriores deben referirse al mismo escenario; si faltan, primero generamos la matriz.
  if(!results.size||!context){$('rg-feedback').textContent='Primero calculá la matriz completa.';return;}
  const report=getReports(),mode=selectedMode(),view=report.modes[mode];
  let hs=isDelta()?[...report.delta[mode+'Border']]:RG.rangeOf(view,'borderline');
  hs=hs.sort((a,b)=>Math.abs(view.data.get(a).ev)/(view.data.get(a).stderr||0.00001)-Math.abs(view.data.get(b).ev)/(view.data.get(b).stderr||0.00001)).slice(0,25);
  if(!hs.length){$('rg-feedback').textContent='No hay manos fronterizas pendientes para esta vista.';return;}
  working=true;let my=++generation;
  const buttons=[$('dm-run'),$('dm-refine'),$('rg-refine')];buttons.forEach(b=>b.disabled=true);
  $('rg-feedback').textContent=`Refinando ${hs.length} manos con 4.000 simulaciones cada una...`;
  try{
   for(let i=0;i<hs.length;i++){
    if(my!==generation)throw Error('Cálculo cancelado porque cambiaron los parámetros.');
    const h=hs[i],s=simulate(h,data.map,4000);
    if(s.n>0)results.set(h,{stats:s,result:M.analyze(data.c,s)});
    if(i%3===0||i===hs.length-1){$('rg-feedback').textContent=`Refinando ${i+1}/${hs.length} clases. Podés seguir consultando la matriz.`;renderRangeReport();updateCells();await new Promise(r=>setTimeout(r,0));}
   }
   $('rg-feedback').textContent=`Se refinaron ${hs.length} clases. Revisá las manos que todavía quedan inciertas.`;
  }catch(e){$('rg-feedback').textContent=e.message;}
  finally{working=false;buttons.forEach(b=>b.disabled=false);renderRangeReport();updateCells();drawSelected();}
 }
 function exportCsv(){
  const report=getReports();if(!report){$('rg-feedback').textContent='Primero calculá las manos.';return;}
  const heading=['Mano','Combos','Equity_pct','Victoria_pct','Empate_pct','EV_Vanilla_BB','Estado_Vanilla','EV_KO_BB','Estado_KO','EV_PKO_BB','Estado_PKO','Muestras'];
  const rows=['sep=;',heading.join(';')];
  for(const h of HANDS){const x=results.get(h);if(!x)continue;
   const v=report.modes.vanilla.data.get(h),k=report.modes.ko.data.get(h),p=report.modes.pko.data.get(h);
   rows.push([h,RG.combos(h),(v.eq*100).toFixed(3),(x.stats.win*100).toFixed(3),(x.stats.tie*100).toFixed(3),v.ev.toFixed(4),v.confidence,k.ev.toFixed(4),k.confidence,p.ev.toFixed(4),p.confidence,x.stats.n].join(';'));
  }
  const blob=new Blob(['\ufeff'+rows.join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`poker-estudio-${context.c.type}-EV-modalidades.csv`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  $('rg-feedback').textContent=`CSV exportado con ${rows.length-2} clases de manos. Equity y EV estimados, no soluciones GTO.`;
 }
 async function copyRange(){const report=getReports();if(!report){$('rg-feedback').textContent='Primero calculá las manos.';return;}
  const txt=copyRangeText(report);if(!txt){$('rg-feedback').textContent='No hay manos con señal favorable suficiente para copiar.';return;}
  try{await navigator.clipboard.writeText(txt);$('rg-feedback').textContent='Rango copiado al portapapeles.';}catch(e){$('rg-positive-list').focus();$('rg-feedback').textContent='No se pudo copiar automáticamente. Seleccioná el texto del rango y copialo manualmente.';}
 }
 function copyRangeText(report){return makeRangeString(report);}
 async function run(one=false){if(working)return;
  let data;try{data=getContext();}catch(e){$('dm-status').textContent=e.message;return;}
  context=data;working=true;let my=++generation;
  const buttons=[$('dm-run'),$('dm-refine'),$('rg-refine')];buttons.forEach(b=>b.disabled=true);
  const hands=one?[selected]:HANDS,trials=one?14000:480;
  $('dm-status').textContent=one?'Refinando '+selected+'...':'Estimando las 169 clases de manos...';
  try{
   if(!one)results.clear();
   let step=0;
   for(const h of hands){
    if(my!==generation)throw Error('Cálculo cancelado porque cambió la configuración.');
    const stats=simulate(h,data.map,trials);
    if(stats.n>0)results.set(h,{stats,result:M.analyze(data.c,stats)});
    else results.delete(h);
    step++;
    if(step%7===0||step===hands.length){updateCells();$('dm-progress-fill').style.width=(step/hands.length*100).toFixed(1)+'%';$('dm-status').textContent=one?'Refinando '+h+'...':'Simulación '+step+' / '+hands.length+' manos. Rangos aproximados.';await new Promise(r=>setTimeout(r,0));}
   }
   currentData=data;renderRangeReport();
   $('dm-status').textContent=one?`${selected}: ${fmt(trials)} muestras. Revisión completada.`:`169 clases procesadas, ${fmt(trials)} muestras por clase. Refiná las manos fronterizas.`;
  }catch(e){$('dm-status').textContent=e.message;}
  finally{working=false;buttons.forEach(b=>b.disabled=false);renderRangeReport();updateCells();drawSelected();}
 }
 function init(){
  updatePositions();restore();$('rg-view').value=$('tournamentMode').value;if(!$('dm-range').value.trim())$('dm-range').value=preset($('dm-pos').value,+$('dm-villain').value,'call');
  toggle();
  $('dm-grid').innerHTML=HANDS.map(h=>`<button class="decision-cell${h===selected?' selected':''}" data-hand="${h}" aria-label="Mano ${h}" type="button">${h}</button>`).join('');
  $('dm-grid').addEventListener('click',ev=>{const btn=ev.target.closest('[data-hand]');if(btn){selected=btn.dataset.hand;drawSelected();}});
  $('dm-run').addEventListener('click',()=>run(false));$('dm-refine').addEventListener('click',()=>run(true));
  $('rg-view').addEventListener('change',()=>{renderRangeReport();updateCells();drawSelected();});
  $('rg-refine').addEventListener('click',refineBorderline);$('rg-export').addEventListener('click',exportCsv);$('rg-copy').addEventListener('click',copyRange);
  $('dm-preset').addEventListener('click',()=>{$('dm-range').value=preset($('dm-pos').value,+$('dm-villain').value,$('dm-spot').value);persist();setStale();$('dm-status').textContent='Preset didáctico cargado. Editá el rango si tenés información del rival.';});
  $('dm-use-rival').addEventListener('click',()=>{
    let source=$('rv-result')?.querySelector('.result-list')?.textContent?.trim();
    if(!source){$('dm-status').textContent='Primero generá un rango en la pestaña «Rango rival». Debe ser un rango compatible con esta acción.';return;}
    $('dm-range').value=source;persist();setStale();$('dm-status').textContent='Rango rival importado. Comprobá que represente shove o call al reshove, según corresponda.';
  });
  $('dm-import-bounty').addEventListener('click',()=>{
   $('dm-hero').value=$('bo-hero').value;$('dm-villain').value=$('bo-villain').value;
   $('dm-bounty').value=$('bo-amount').value;$('dm-instant').value=$('bo-instant').value;
   try{let settings={method:$('bo-method').value,manualPower:$('bo-power-manual').value,totalChipsBB:$('bo-total-chips').value,regularPool:$('bo-regular').value,bountyPool:$('bo-pool').value};$('dm-power').value=PokerBountyMath.power(settings).toFixed(5);}catch(e){$('dm-status').textContent=e.message;return;}
   persist();setStale();$('dm-status').textContent='Se importaron stacks y Bounty Power desde el módulo anterior.';
  });
  for(const id of fastId){$(id).addEventListener('input',()=>{toggle();persist();setStale();});$(id).addEventListener('change',()=>{toggle();persist();});}
  for(const id of ['dm-pos','dm-hero-pos'])$(id).addEventListener('change',()=>{persist();setStale();});
  $('tournamentMode').addEventListener('change',()=>{$('rg-view').value=$('tournamentMode').value;toggle();setStale();});
  document.addEventListener('poker:table-change',()=>{updatePositions();setStale();});
  renderRangeReport();drawSelected();
  $('dm-status').textContent='Configurá rango y recompensa, después calculá la matriz.';
 }
 init();
 window.PokerEstudioDecision={simulate,preset,run};
})();
