/* Poker Estudio v4.1 — UI Modalidades KO / PKO. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const fmt=n=>Number(n).toLocaleString('es-AR',{maximumFractionDigits:2});
 const fp=n=>(n*100).toLocaleString('es-AR',{maximumFractionDigits:2,minimumFractionDigits:1})+'%';
 const pfx=n=>(n>=0?'+':'')+fmt(n);
 const ids=['bo-hero','bo-villain','bo-pot','bo-call','bo-equity','bo-win','bo-amount','bo-instant','bo-power-manual','bo-total-chips','bo-regular','bo-pool'];
 const mode=$('tournamentMode');
 const method=$('bo-method');
 const percent=$('bo-instant');
 const result=$('bo-result');
 const modeBanner=$('modeBanner');
 const KEY='poker-estudio-v41-bounty-inputs';
 let recentEquity=null;
 const opts=()=>({
   format:mode.value,
   method:method.value,
   heroStack:$('bo-hero').value,villainStack:$('bo-villain').value,
   potBeforeCall:$('bo-pot').value,callCost:$('bo-call').value,
   equityPct:$('bo-equity').value,winPct:$('bo-win').value,
   bountyAmount:$('bo-amount').value,instantPct:percent.value,
   manualPower:$('bo-power-manual').value,
   totalChipsBB:$('bo-total-chips').value,regularPool:$('bo-regular').value,bountyPool:$('bo-pool').value
 });
 function restore(){
  try{
    const data=JSON.parse(localStorage.getItem(KEY)||'{}');
    if(data.format && ['vanilla','ko','pko'].includes(data.format))mode.value=data.format;
    if(data.method && ['manual','pools'].includes(data.method))method.value=data.method;
    for(const id of ids)if(data[id]!==undefined && $(id))$(id).value=data[id];
  }catch(_e){}
 }
 function save(){
  try{
   const data={format:mode.value,method:method.value};
   for(const id of ids)data[id]=$(id).value;
   localStorage.setItem(KEY,JSON.stringify(data));
  }catch(_e){}
 }
 function setMode(){
  let f=mode.value;
  document.querySelectorAll('[data-mode-text]').forEach(el=>el.textContent=f==='pko'?'PKO':f==='ko'?'KO':'Vanilla');
  $('bo-instant-field').classList.toggle('hidden',f!=='pko');
  $('bo-bounty-fields').classList.toggle('hidden',f==='vanilla');
  modeBanner.classList.toggle('hidden',f==='vanilla');
  modeBanner.innerHTML=f==='vanilla'?'':`<strong>${f.toUpperCase()} activo.</strong> Las matrices de RFI, call y 3-bet existentes siguen siendo referencias <strong>Vanilla chip EV</strong>; NO son rangos resueltos para ${f.toUpperCase()}. Usá el módulo «Bounty / KO» para analizar calls a all-in y su recompensa.`;
  $('bo-manual-wrap').classList.toggle('hidden',method.value!=='manual');
  $('bo-pools-wrap').classList.toggle('hidden',method.value==='manual');
 }
 function render(){
  setMode();
  try{
   const x=PokerBountyMath.breakdown(opts());
   const note=x.format==='vanilla'?'Modalidad clásica: no se añade recompensa por eliminación.':!x.covers?'Hero no cubre al rival: aunque ganes el pozo, no lo eliminás. No se suma bounty.':x.format==='pko'?`Si eliminás al rival cobrás ${fmt(x.instantCash)} ahora; ${fmt(x.transferCash)} se suma a tu propia cabeza (NO es cobro inmediato).`:`Si eliminás al rival obtenés ${fmt(x.instantCash)} de recompensa fija.`;
   const display=[
     ['Vanilla', 'vanilla'],['KO fijo','ko'],['PKO','pko']
   ].map(([title,m])=>{
    const k=PokerBountyMath.breakdown({...opts(),format:m});
    const klass=x.format===m?' selected-row':'';
    return `<tr class="${klass}"><td>${title}</td><td>${fmt(k.bonusBB)} BB</td><td>${fp(k.requiredAdjusted)}</td><td class="${k.adjustedEV>=0?'ok-text':'error-text'}">${pfx(k.adjustedEV)} BB</td></tr>`;
   }).join('');
   result.innerHTML=`
    <div class="bo-results-top">
      <div class="bo-big"><small>Equity mínima ${x.format.toUpperCase()}</small><strong>${fp(x.requiredAdjusted)}</strong><span>Vanilla: ${fp(x.requiredVanilla)} · diferencia ${(x.requiredVanilla-x.requiredAdjusted)*100>=0?'−':''}${fmt((x.requiredVanilla-x.requiredAdjusted)*100)} pp</span></div>
      <div class="bo-big"><small>EV del call con bounty</small><strong class="${x.adjustedEV>=0?'ok-text':'error-text'}">${pfx(x.adjustedEV)} BB</strong><span>Sin bounty ${pfx(x.baseEV)} BB · premio esperado ${pfx(x.bonusEV)} BB</span></div>
    </div>
    <div class="metric-grid"><div class="metric"><small>Bounty Power (conversión)</small><strong>${fmt(x.bountyPower)} BB/$</strong></div><div class="metric"><small>Bonus cobrable convertido</small><strong>${fmt(x.bonusBB)} BB</strong></div></div>
    <div class="callout ${x.format!=='vanilla'&&!x.covers?'warning':''}">${note}</div>
    <div class="bo-coverage">Cobertura: <strong>${x.covers?'Hero cubre o iguala el stack del rival':'Rival cubre a Hero'}</strong> · stacks declarados: ${fmt(x.hero)} / ${fmt(x.villain)} BB</div>
    <h3 class="bo-compare-title">Comparación con los mismos supuestos</h3>
    <div class="bo-table-scroll"><table class="micro-table bo-compare"><thead><tr><th>Modalidad</th><th>Bonus</th><th>Equity mínima</th><th>EV call</th></tr></thead><tbody>${display}</tbody></table></div>
    <p class="mini-formula">Equity mínima sin empates = call ÷ (pozo tras call + bonus bounty en BB)<br>EV = equity del pozo × pozo final − call + P(victoria sin empate) × bonus bounty BB<br>${fp(x.equity)} × ${fmt(x.basePot)} − ${fmt(x.call)} + ${fp(x.win)} × ${fmt(x.bonusBB)} = ${pfx(x.adjustedEV)} BB</p>
    <p class="hint">La equity mínima asume que no hay empates; si indicás una probabilidad de victoria diferente de la equity de pozo, evaluá el EV, no solo el umbral. No incluye ICM, riesgo de eliminación, futuros bounties ni ramas multiway.</p>`;
   $('bo-live').textContent='Resultados actualizados · Modelo educativo cEV';
  }catch(e){result.innerHTML=`<div class="callout bad">${String(e.message).replaceAll('<','&lt;')}</div>`; $('bo-live').textContent='Revisá los campos';}
 }
 restore();
 try{if(!localStorage.getItem(KEY))percent.value=50;}catch(_e){percent.value=50;}
 mode.addEventListener('change',()=>{setMode();save();render();});
 method.addEventListener('change',()=>{setMode();save();render();});
 for(const id of ids)$(id).addEventListener('input',()=>{save();render();});
 $('bo-fill-equity').addEventListener('click',()=>{
  if(!recentEquity){$('bo-live').textContent='Primero calculá una mano en la pestaña Equity.';return;}
  $('bo-equity').value=(recentEquity.equity*100).toFixed(2);
  $('bo-win').value=(recentEquity.win*100).toFixed(2);
  save();render();
  $('bo-live').textContent='Se importaron equity y probabilidad de ganar sin empate.';
 });
 document.addEventListener('poker:equity-updated',ev=>{recentEquity=ev.detail;});
 $('bo-reset').addEventListener('click',()=>{
  if(!window.confirm('¿Restablecer el ejemplo del calculador de bounty?'))return;
  try{localStorage.removeItem(KEY)}catch(_e){}
  const defaults={'bo-hero':25,'bo-villain':12,'bo-pot':15.5,'bo-call':12,'bo-equity':36,'bo-win':'','bo-amount':10,'bo-instant':50,'bo-power-manual':1,'bo-total-chips':10000,'bo-regular':5000,'bo-pool':5000};
  for(const [id,v] of Object.entries(defaults))$(id).value=v;
  method.value='pools'; mode.value='vanilla';render();
 });
 render();
})();
