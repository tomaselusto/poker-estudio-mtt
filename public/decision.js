/* Poker Estudio v4.2 · analizador educativo KO/PKO.
   Las matrices se estiman por Monte Carlo (NO solver GTO).
   Aislamiento: EV condicionado exclusivamente a quedar heads-up. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id),T=window.PokerEstudioTools,M=window.PokerDecisionMath;
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
  $('dm-progress-fill').style.width='0%';$('dm-status').textContent='Sin cálculos para esta configuración.';
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
 function drawSelected(){
  const x=results.get(selected),el=$('dm-selected');
  for(const btn of $('dm-grid').children)btn.classList.toggle('selected',btn.dataset.hand===selected);
  $('dm-current').textContent=selected;
  if(!x||!context){el.innerHTML='<div class="decision-method">Seleccioná «Calcular matriz» o «Refinar mano» para obtener resultados de esta mano contra el rango elegido.</div>';return;}
  const c=context.c,r=x.result,z=x.stats;
  const compare=['vanilla','ko','pko'].map(format=>{let cc=M.context({...context.args,format}),rr=M.analyze(cc,z);return `<tr><td>${format.toUpperCase()}</td><td>${fmt(cc.bonus)} BB</td><td>${pct(rr.req)}</td><td class="${rr.ev>=0?'ok-text':'error-text'}">${rr.ev>=0?'+':''}${fmt(rr.ev)} BB</td></tr>`;}).join('');
  const effective=c.type==='reshove'?`Con fold del rival ${pct(c.foldProb)}, ganás ${fmt(c.foldGain)} BB sin showdown; si paga, el resultado depende del rango de call que ingresaste.`:c.type==='isolate'?`Probabilidad ingresada de quedar HU: ${pct(+$('dm-iso-fold').value/100)}. NO se computa EV de las ramas en que intervienen terceros.`:'El call se compara contra fold (EV = 0) en un único pozo heads-up.';
  el.innerHTML=`<div class="decision-big"><div><small>Acción del modelo</small><strong class="${r.ev>=0?'ok-text':'error-text'}">${label(r,c)}</strong></div><div><small>Equity vs rango</small><strong>${pct(r.eq)}</strong></div><div><small>${c.type==='isolate'?'EV heads-up condicionado':c.type==='reshove'?'EV reshove vs fold':'EV call vs fold'}</small><strong class="${r.ev>=0?'ok-text':'error-text'}">${r.ev>=0?'+':''}${fmt(r.ev)} BB</strong></div><div><small>Umbral de equity sin empates</small><strong>${pct(r.req)}</strong></div></div>
    <div class="decision-method">${effective}<br>Ganar ${pct(z.win)} · Empatar ${pct(z.tie)} · Margen de muestreo EV (95%): ±${fmt(1.96*r.stderr)} BB · ${fmt(z.n)} simulaciones. ${r.confidence==='borderline'?'<strong>Resultado cercano a cero o incierto por muestreo: no hay decisión concluyente.</strong>':''}</div>
    <p class="decision-tag">Hero ${fmt(c.hero)} BB · Rival ${fmt(c.villain)} BB · ${c.covers?'Hero cubre al rival':'Hero NO cubre al rival'} · premio inmediato convertible ${fmt(c.bonus)} BB. ${c.format==='pko'?'Transferencia a cabeza de Hero: '+fmt(c.transferred)+' (no valorada).':''}</p>
    <div style="overflow-x:auto"><table class="micro-table"><thead><tr><th>Modalidad</th><th>Bounty en BB</th><th>Equity mín. sin empate</th><th>EV modelo</th></tr></thead><tbody>${compare}</tbody></table></div>
    <p class="decision-source">El umbral de equity supone ausencia de empates; el EV sí los contempla. No compara EV del call con otras líneas salvo fold. Las bandas de confianza representan solamente el error de Monte Carlo, no incertidumbre del rango ni ICM.</p>`;
 }
 function updateCells(){for(const btn of $('dm-grid').children){let d=results.get(btn.dataset.hand);btn.className='decision-cell'+(d?' '+className(d.result):'')+(btn.dataset.hand===selected?' selected':'');btn.title=d?`${btn.dataset.hand}: ${pct(d.result.eq)} equity, EV ${fmt(d.result.ev)} BB, n=${d.stats.n}`:btn.dataset.hand+' · sin calcular';}}
 async function run(one=false){if(working)return;
  let data;try{data=getContext();}catch(e){$('dm-status').textContent=e.message;return;}
  context=data;working=true;let my=++generation;
  const buttons=[$('dm-run'),$('dm-refine')];buttons.forEach(b=>b.disabled=true);
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
   currentData=data;
   $('dm-status').textContent=one?`${selected}: ${fmt(trials)} muestras. Revisión completada.`:`169 clases procesadas, ${fmt(trials)} muestras por clase. Refiná las manos fronterizas.`;
  }catch(e){$('dm-status').textContent=e.message;}
  finally{working=false;buttons.forEach(b=>b.disabled=false);updateCells();drawSelected();}
 }
 function init(){
  updatePositions();restore();if(!$('dm-range').value.trim())$('dm-range').value=preset($('dm-pos').value,+$('dm-villain').value,'call');
  toggle();
  $('dm-grid').innerHTML=HANDS.map(h=>`<button class="decision-cell${h===selected?' selected':''}" data-hand="${h}" aria-label="Mano ${h}" type="button">${h}</button>`).join('');
  $('dm-grid').addEventListener('click',ev=>{const btn=ev.target.closest('[data-hand]');if(btn){selected=btn.dataset.hand;drawSelected();}});
  $('dm-run').addEventListener('click',()=>run(false));$('dm-refine').addEventListener('click',()=>run(true));
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
  $('tournamentMode').addEventListener('change',()=>{toggle();setStale();});
  document.addEventListener('poker:table-change',()=>{updatePositions();setStale();});
  drawSelected();
  $('dm-status').textContent='Configurá rango y recompensa, después calculá la matriz.';
 }
 init();
 window.PokerEstudioDecision={simulate,preset,run};
})();
