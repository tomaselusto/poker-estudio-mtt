'use strict';
// Poker Estudio: módulos adicionales. Sin dependencias ni llamadas de red.
(() => {
 const $t = id => document.getElementById(id);
 const fmtT = n => Number(n).toLocaleString('es-AR',{maximumFractionDigits:2});
 const fmtP = n => (Number(n)*100).toLocaleString('es-AR',{minimumFractionDigits:1,maximumFractionDigits:2})+'%';
 const enc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const val = id => +$t(id).value;
 const R='AKQJT98765432', SUITS='shdc';
 const DECK=[...R].flatMap(r=>[...SUITS].map(s=>r+s));
 const nr=x=> R.length-R.indexOf(x[0])+1; // A=14, K=13 ... 2=2
 let lastEquity=null, latestRival=null, latestRangeItems=null;
 let equityGeneration=0; // invalida simulaciones si cambian cartas o rango durante el cálculo

 function changeTab(tab){
  for (const b of document.querySelectorAll('.tab')) {let yes=b.dataset.tab===tab;b.classList.toggle('active',yes);b.setAttribute('aria-selected',String(yes));}
  for(const p of document.querySelectorAll('.page'))p.classList.toggle('active-page',p.id===(tab==='viewer'?'viewerPage':'tool-'+tab));
 }
 document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>changeTab(b.dataset.tab)));

 // Cartas y rangos
 function cardsFrom(str, caption, lengths){
  const txt=String(str||'').trim().replace(/10/gi,'T').replaceAll('♠','s').replaceAll('♥','h').replaceAll('♦','d').replaceAll('♣','c');
  const terms=txt?txt.split(/[\s,;]+/).filter(Boolean):[];
  if(lengths && !lengths.includes(terms.length))throw Error(`${caption}: se esperan ${lengths.join(' o ')} cartas, recibí ${terms.length}.`);
  const found=terms.map(x=>x.replace(/[^a-zA-Z0-9]/g,'').toUpperCase()[0]+x.slice(-1).toLowerCase());
  for (const x of found)if(!DECK.includes(x))throw Error(`${caption}: carta inválida «${x}». Usá Ah Kd 7s.`);
  if(new Set(found).size!==found.length)throw Error(`${caption}: hay cartas repetidas.`);
  return found;
 }
 function noDuplicates(...groups){const xs=groups.flat();if(new Set(xs).size!==xs.length)throw Error('Una carta se repite entre Hero, rival y board.');}
 function standardHand(h){
  h=h.toUpperCase();let a=h[0],b=h[1],s=(h[2]||'').toLowerCase();
  if(!R.includes(a)||!R.includes(b))throw Error('Clase de mano incorrecta: '+h);
  if(a===b){if(s)throw Error('Parejas se escriben como 99 o AA.');return a+b;}
  if(!['s','o',''].includes(s))throw Error('Sufijo de mano incorrecto: '+h);
  if(R.indexOf(a)>R.indexOf(b)) [a,b]=[b,a];
  return a+b+s;
 }
 function rangeClassList(term){
  let cleaned=term.trim(), plus=cleaned.endsWith('+'), dash=cleaned.includes('-');
  if(plus){const h=standardHand(cleaned.slice(0,-1));if(!h||h.length<2)return[];
   if(h.length===2)return [...R].slice(0,R.indexOf(h[0])+1).map(r=>r+r);
   let k=R.indexOf(h[0]), last=R.indexOf(h[1]);return [...R].slice(k+1,last+1).map(r=>h[0]+r+h[2]);
  }
  if(dash){let [start,end,...extra]=cleaned.split('-');if(extra.length||!start||!end)throw Error('Intervalo inválido: '+term);
   let a=standardHand(start),b=standardHand(end);
   if(a.length===2 && b.length===2){let from=R.indexOf(a[0]),to=R.indexOf(b[0]);let arr=[];for(let i=Math.min(from,to);i<=Math.max(from,to);i++)arr.push(R[i]+R[i]);return arr;}
   if(a.length===3&&b.length===3&&a[0]===b[0]&&a[2]===b[2]){let from=R.indexOf(a[1]),to=R.indexOf(b[1]);let arr=[];for(let i=Math.min(from,to);i<=Math.max(from,to);i++){if(i>R.indexOf(a[0]))arr.push(a[0]+R[i]+a[2]);}return arr;}
   throw Error('Intervalo no compatible: '+term+'. Usá A5s-A2s o 55-99.');
  }
  let single=standardHand(cleaned);return single.length===2?[single]:single.length===3?[single]:[single+'s',single+'o'];
 }
 function parseRange(str){
  const result=new Map(), input=String(str||'').trim();if(!input)throw Error('Ingresá un rango (por ejemplo: 99+, AJs+, KQs, AQo+).');
  let terms=input.split(/[,;\s]+/).filter(Boolean);
  for (const raw of terms){
   const m=raw.match(/^([^:@]+)(?:[:@](\d+(?:\.\d+)?)%)?$/i);if(!m)throw Error('Sintaxis inválida: '+raw);
   let f=m[2]==null?1:Number(m[2])/100;if(!Number.isFinite(f)||f<0||f>1)throw Error('La frecuencia debe estar entre 0% y 100%: '+raw);
   for(const h of rangeClassList(m[1])){
    if(!HANDS.includes(h))throw Error('Mano fuera de la matriz: '+h);
    result.set(h,Math.max(result.get(h)||0,f));
   }
  }
  return result;
 }
 function holeCombos(hand,blocked){
  const h=standardHand(hand),out=[];
  if(h.length===2){const usable=[...SUITS].map(s=>h[0]+s).filter(x=>!blocked.has(x));for(let i=0;i<usable.length;i++)for(let j=i+1;j<usable.length;j++)out.push([usable[i],usable[j]]);return out;}
  for(let s1 of SUITS)for(let s2 of SUITS){if(h.endsWith('s')&&s1!==s2)continue;if(h.endsWith('o')&&s1===s2)continue;const a=h[0]+s1,b=h[1]+s2;if(!blocked.has(a)&&!blocked.has(b))out.push([a,b]);}return out;
 }
 function combosForRange(map,blocked){const combos=[];for(let [h,f] of map){if(f<=0)continue;for(const pair of holeCombos(h,blocked))combos.push({cards:pair,weight:f,hand:h});}return combos;}
 function rangeText(map){return [...map].sort((a,b)=>HANDS.indexOf(a[0])-HANDS.indexOf(b[0])).map(([h,f])=>h+(f<.9999?':'+fmtT(f*100)+'%':'')).join(', ');}
 function metrics(items){let b=0,w=0,changed=0;for(let [h,f] of items){const c=combos(h);b+=c;w+=c*f;if(f!==1)changed++;}return {b,w,changed};}

 // Pot odds: finalPot = pozo previo + apuesta efectiva rival + nuestro call.
 function potModel(pot,bet,call,equity){
  if([pot,bet,call,equity].some(x=>!Number.isFinite(x))||pot<0||bet<0||call<=0||equity<0||equity>1)throw Error('Revisá los valores: el pozo y la apuesta no pueden ser negativos, el call debe ser positivo y la equity entre 0 y 100%.');
  if(call>bet+1e-9)throw Error('En este modelo heads-up, el call no puede superar la apuesta rival. Si ya invertiste fichas en la calle, ingresá el costo real de igualar y el pozo que está en juego.');
  const effectiveBet=Math.min(bet,call),final=pot+effectiveBet+call;
  if(final<=0)throw Error('El pozo final debe ser mayor que cero.');
  return {effectiveBet,final,needed:call/final,ev:equity*final-call,ratio:(pot+effectiveBet)/call,over:bet>call+1e-9};
 }
 function calcPot(){
  try{
   let p=potModel(val('po-pot'),val('po-bet'),val('po-call'),val('po-equity')/100),edge=val('po-equity')/100-p.needed;
   $t('po-result').innerHTML=`<div class="metric-grid"><div class="metric"><small>Equity mínima</small><strong>${fmtP(p.needed)}</strong></div><div class="metric"><small>Equity ingresada</small><strong>${fmtP(val('po-equity')/100)}</strong></div><div class="metric"><small>Pozo tras call</small><strong>${fmtT(p.final)} BB</strong></div><div class="metric"><small>EV inmediato de pagar</small><strong class="${p.ev>=-1e-9?'ok-text':'error-text'}">${p.ev>=0?'+':''}${fmtT(p.ev)} BB</strong></div></div><div class="callout ${p.ev<-.0001?'bad':''}"><strong>${p.ev>.0001?'Call +EV inmediato':p.ev<-.0001?'Call −EV inmediato':'Call indiferente en EV inmediato'}</strong><div>Precio ${fmtT(p.ratio)}:1 · margen de equity ${edge>=0?'+':''}${fmtP(edge)}.</div></div><p class="mini-formula">EV(call) = equity × pozo final − costo = ${fmtT(val('po-equity'))}% × ${fmtT(p.final)} − ${fmtT(val('po-call'))} = ${fmtT(p.ev)} BB</p>${p.over?'<p class="hint warn-text">Apuesta no igualada: se excluyó la parte del rival que no podés cubrir.</p>':''}<p class="hint">Modelo de showdown inmediato, sin futuras apuestas, rake ni ICM. Los empates se representan usando equity como participación en el pozo.</p>`;
  }catch(e){$t('po-result').innerHTML=`<div class="callout bad">${enc(e.message)}</div>`;}
 }
 for(const id of ['po-pot','po-bet','po-call','po-equity'])$t(id).addEventListener('input',calcPot);
 $t('po-from-equity').addEventListener('click',()=>{if(lastEquity==null){$t('po-result').innerHTML='<div class="callout warning">Primero calculá una equity en la pestaña «Equity».</div>';return;}$t('po-equity').value=(lastEquity*100).toFixed(2);calcPot();});
 calcPot();

 function calcImplied(){
  try{
   const pot=val('im-pot'),bet=val('im-bet'),call=val('im-call'),eq=val('im-chance')/100,future=val('im-future'),left=val('im-effective');
   if(eq<=0||future<0||left<0)throw Error('Ingresá una probabilidad positiva y montos no negativos.');
   const p=potModel(pot,bet,call,eq),minExtra=Math.max(0,call/eq-p.final),eqWithFuture=call/(p.final+future),ev=eq*(p.final+future)-call;
   $t('im-result').innerHTML=`<div class="metric-grid"><div class="metric"><small>Equity mínima directa</small><strong>${fmtP(p.needed)}</strong></div><div class="metric"><small>BB extra necesarias</small><strong>${fmtT(minExtra)} BB</strong></div><div class="metric"><small>Equity mínima con extras</small><strong>${fmtP(eqWithFuture)}</strong></div><div class="metric"><small>EV condicional</small><strong class="${ev>=0?'ok-text':'error-text'}">${ev>=0?'+':''}${fmtT(ev)} BB</strong></div></div><div class="callout ${minExtra>left?'bad':minExtra>0?'warning':''}">${minExtra===0?'No necesitás cobrar fichas futuras para alcanzar el equilibrio inmediato.':`Necesitás ganar <strong>${fmtT(minExtra)} BB adicionales de promedio en el escenario ganador</strong> para compensar el call.`}${minExtra>left?'<div>El stack restante del rival no alcanza para cubrir esa ganancia.</div>':''}${future>left?'<div>Las BB futuras que ingresaste superan el stack restante del rival.</div>':''}</div><p class="mini-formula">Extra mínima = max(0, call / P(ganar) − pozo tras call)<br>EV simplificado = P(ganar) × (pozo final + extras cobradas) − call</p><p class="hint">No asume que completar un draw garantiza ganar. Si tenés que pagar futuras apuestas, podés ser dominado o no cobrar siempre, el EV real es menor.</p>`;
  }catch(e){$t('im-result').innerHTML=`<div class="callout bad">${enc(e.message)}</div>`;}
 }
 for(const id of ['im-pot','im-bet','im-call','im-chance','im-future','im-effective'])$t(id).addEventListener('input',calcImplied);
 calcImplied();

 function calcCombos(){
  try{
   const hero=cardsFrom($t('co-hero').value,'Tus cartas',[0,2]),board=cardsFrom($t('co-board').value,'Board',[0,3,4,5]);noDuplicates(hero,board);
   const map=parseRange($t('co-range').value),blocked=new Set([...hero,...board]);let total=0,available=0,raw=0;let rows=[];
   for(let [h,f] of [...map].sort((a,b)=>HANDS.indexOf(a[0])-HANDS.indexOf(b[0]))){let rawC=combos(h),left=holeCombos(h,blocked).length;raw+=rawC;total+=rawC*f;available+=left*f;rows.push([h,rawC,left,f]);}
   $t('co-result').innerHTML=`<div class="metric-grid"><div class="metric"><small>Combos sin blockers</small><strong>${fmtT(raw)}</strong></div><div class="metric"><small>Combos disponibles</small><strong>${fmtT(rows.reduce((a,r)=>a+r[2],0))}</strong></div><div class="metric"><small>Combos ponderados originales</small><strong>${fmtT(total)}</strong></div><div class="metric"><small>Combos ponderados finales</small><strong>${fmtT(available)}</strong></div></div><div class="callout">Tus cartas y el board bloquean <strong>${fmtT(total-available)}</strong> combinaciones ponderadas. El rango corresponde al <strong>${fmtP(total/1326)}</strong> de las manos iniciales antes de blockers.</div><div style="max-height:245px;overflow:auto;margin-top:13px"><table class="micro-table"><thead><tr><th>Mano</th><th>Original</th><th>Disponible</th><th>Ponderado</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${enc(r[0])}${r[3]<1?` <small>×${fmtP(r[3])}</small>`:''}</td><td>${r[1]}</td><td>${r[2]}</td><td>${fmtT(r[2]*r[3])}</td></tr>`).join('')}</tbody></table></div><p class="hint">Las combinaciones ponderadas pueden ser decimales porque modelan frecuencias de acción, no cartas físicas.</p>`;
  }catch(e){$t('co-result').innerHTML=`<div class="callout bad">${enc(e.message)}</div>`;}
 }
 $t('co-run').addEventListener('click',calcCombos);$t('co-use-rival').addEventListener('click',()=>{if(!latestRival){changeTab('rival');return;}$t('co-range').value=latestRival.text;calcCombos();});calcCombos();

 // Evaluación de manos: 7 cartas exactas, categorías 0..8 (high card a escalera de color).
 function straightHigh(values){let set=new Set(values);if(set.has(14))set.add(1);for(let r=14;r>=5;r--){let yes=true;for(let j=0;j<5;j++)if(!set.has(r-j)){yes=false;break;}if(yes)return r;}return 0;}
 function pack(category,rs){let v=category;for(let i=0;i<5;i++)v=v*15+(rs[i]||0);return v;}
 function evaluate7(cards){
  let counts=new Uint8Array(15),suits={s:[],h:[],d:[],c:[]};
  for(const card of cards){const n=nr(card);counts[n]++;suits[card[1]].push(n);}
  let flushVals=Object.values(suits).find(a=>a.length>=5);
  if(flushVals){const sf=straightHigh(flushVals);if(sf)return pack(8,[sf]);}
  let fours=[],trips=[],pairs=[],ranks=[];
  for(let r=14;r>=2;r--){if(counts[r]===4)fours.push(r);else if(counts[r]===3)trips.push(r);else if(counts[r]===2)pairs.push(r);if(counts[r])ranks.push(r);}
  if(fours.length)return pack(7,[fours[0],ranks.find(x=>x!==fours[0])]);
  if(trips.length && (pairs.length||trips.length>=2))return pack(6,[trips[0],Math.max(pairs[0]||0,trips[1]||0)]);
  if(flushVals)return pack(5,flushVals.slice().sort((a,b)=>b-a).slice(0,5));
  let straight=straightHigh(ranks);if(straight)return pack(4,[straight]);
  if(trips.length)return pack(3,[trips[0],...ranks.filter(x=>x!==trips[0]).slice(0,2)]);
  if(pairs.length>=2)return pack(2,[pairs[0],pairs[1],ranks.find(x=>x!==pairs[0]&&x!==pairs[1])]);
  if(pairs.length)return pack(1,[pairs[0],...ranks.filter(x=>x!==pairs[0]).slice(0,3)]);
  return pack(0,ranks.slice(0,5));
 }
 function exactAgainst(hero,villain,board){
  const fixed=new Set([...hero,...villain,...board]),missing=5-board.length,remaining=DECK.filter(x=>!fixed.has(x));let win=0,lose=0,tie=0;
  function check(fullboard){let a=evaluate7([...hero,...fullboard]),b=evaluate7([...villain,...fullboard]);if(a>b)win++;else if(a<b)lose++;else tie++;}
  if(missing===0)check(board);
  else if(missing===1)for(const c of remaining)check([...board,c]);
  else if(missing===2)for(let i=0;i<remaining.length;i++)for(let j=i+1;j<remaining.length;j++)check([...board,remaining[i],remaining[j]]);
  else throw Error('La enumeración exacta de mano contra mano se utiliza desde el flop.');
  return {win,lose,tie,total:win+lose+tie,exact:true};
 }
 function resultEquity(res,description){
  const n=res.total,eq=(res.win+.5*res.tie)/n,tie=res.tie/n,won=res.win/n,loss=res.lose/n,se=res.exact?0:1.96*Math.sqrt(Math.max(0,(res.sumSquares/n-eq*eq))/n);
  lastEquity=eq;
  $t('eq-result').innerHTML=`<div class="metric-grid"><div class="metric"><small>Equity Hero</small><strong class="ok-text">${fmtP(eq)}</strong></div><div class="metric"><small>Equity rival</small><strong>${fmtP(1-eq)}</strong></div><div class="metric"><small>Victoria / derrota</small><strong style="font-size:17px">${fmtP(won)} / ${fmtP(loss)}</strong></div><div class="metric"><small>Empates</small><strong>${fmtP(tie)}</strong></div></div><div class="callout"><strong>${res.exact?'Cálculo exacto':`Monte Carlo (${fmtT(n)} muestras)`}</strong><div>${res.exact?'Se enumeraron todos los boards restantes legalmente posibles.':`Margen estadístico estimado 95%: ±${fmtP(se)} (solo error de muestreo).`}</div></div><p class="mini-formula">Equity Hero = [victorias + 0,5 × empates] / ${fmtT(n)} = ${fmtP(eq)}</p><p class="hint">${enc(description)}. No implica automáticamente call o 3-bet +EV: el resultado supone que ambas manos llegan al showdown y no incorpora folds ni apuestas futuras.</p>`;
  $t('eq-status').textContent='Resultado actualizado. Podés usarlo en Pot odds.';
 }
 async function runEquity(){
  let btn=$t('eq-run');btn.disabled=true;const myGeneration=equityGeneration;lastEquity=null;$t('eq-status').textContent='Validando cartas y rango...';
  let nTrials=val('eq-trials');
  try{
   const hero=cardsFrom($t('eq-hero').value,'Hero',[2]);
   const board=cardsFrom($t('eq-board').value,'Board',[0,3,4,5]);noDuplicates(hero,board);
   const mode=$t('eq-mode').value;
   let pairs=[];
   if(mode==='exact'){
    const villain=cardsFrom($t('eq-villain-exact').value,'Rival',[2]);noDuplicates(hero,board,villain);pairs=[{cards:villain,weight:1,hand:'exacta'}];
   }else{
    const range=parseRange($t('eq-villain-range').value);pairs=combosForRange(range,new Set([...hero,...board]));
    if(!pairs.length)throw Error('Ninguna combinación del rango rival es legal con estas cartas conocidas.');
   }
   const missing=5-board.length;
   if((mode==='exact'&&missing<=2)||(missing===0)){
    let full={win:0,lose:0,tie:0,total:0,exact:true};
    for(const o of pairs){let z=exactAgainst(hero,o.cards,board);full.win+=z.win*o.weight;full.lose+=z.lose*o.weight;full.tie+=z.tie*o.weight;full.total+=z.total*o.weight;}
    if(full.total<=0)throw Error('No hay muestras posibles.');
    if(myGeneration!==equityGeneration)throw Error('Cambiaste las cartas o el rango. Volvé a calcular.');
    resultEquity(full,mode==='exact'?'Hero contra mano exacta':'Hero contra rango ponderado');return;
   }
   let sumW=0;const prefix=[];for(const p of pairs){sumW+=p.weight;prefix.push(sumW);}if(sumW<=0)throw Error('El rango está vacío.');
   let counts={win:0,lose:0,tie:0,total:0,sumSquares:0,exact:false};
   $t('eq-progress').classList.remove('hidden');$t('eq-progress-fill').style.width='0%';
   const known=new Set([...hero,...board]);
   let i=0;
   while(i<nTrials){
    const stop=Math.min(nTrials,i+1000);
    for(;i<stop;i++){
     let rnd=Math.random()*sumW,lo=0,hi=prefix.length-1;
     while(lo<hi){const mid=(lo+hi)>>1;if(rnd<prefix[mid])hi=mid;else lo=mid+1;}
     const villain=pairs[lo].cards;
     const dead=new Set([...hero,...board,...villain]);let deck=DECK.filter(c=>!dead.has(c));
     for(let j=0;j<missing;j++){const idx=j+Math.floor(Math.random()*(deck.length-j));[deck[j],deck[idx]]=[deck[idx],deck[j]];}
     const flop=[...board,...deck.slice(0,missing)],hRank=evaluate7([...hero,...flop]),vRank=evaluate7([...villain,...flop]);
     if(hRank>vRank){counts.win++;counts.sumSquares++;}
     else if(hRank<vRank)counts.lose++;
     else {counts.tie++;counts.sumSquares+=.25;}
     counts.total++;
    }
    $t('eq-progress-fill').style.width=`${100*i/nTrials}%`;$t('eq-status').textContent=`Simulando ${fmtT(i)} / ${fmtT(nTrials)}...`;
    await new Promise(r=>setTimeout(r,0));
    if(myGeneration!==equityGeneration)throw Error('Cambiaste las cartas o el rango durante la simulación. Volvé a calcular.');
   }
   resultEquity(counts,mode==='exact'?'Hero contra mano exacta':'Hero contra rango ponderado');
  }catch(e){$t('eq-result').innerHTML=`<div class="callout bad">${enc(e.message)}</div>`;$t('eq-status').textContent='No se pudo calcular.';}
  finally{btn.disabled=false;$t('eq-progress').classList.add('hidden');}
 }
 for(const id of ['eq-hero','eq-board','eq-villain-exact','eq-villain-range'])$t(id).addEventListener('input',()=>{equityGeneration++;lastEquity=null;});
 $t('eq-mode').addEventListener('change',()=>{equityGeneration++;lastEquity=null;});
 $t('eq-run').addEventListener('click',runEquity);
 $t('eq-mode').addEventListener('change',()=>{$t('eq-villain-exact-wrap').classList.toggle('hidden',$t('eq-mode').value!=='exact');$t('eq-villain-range-wrap').classList.toggle('hidden',$t('eq-mode').value!=='range');});
 $t('eq-mode').dispatchEvent(new Event('change'));
 $t('eq-rival-apply').addEventListener('click',()=>{if(!latestRival){changeTab('rival');return;}$t('eq-mode').value='range';$t('eq-mode').dispatchEvent(new Event('change'));$t('eq-villain-range').value=latestRival.text;$t('eq-status').textContent='Se cargó el rango estimado. Revisá la información y calculá.';});

 function renderRivalOpeners(){
  const pos=$t('rv-pos').value,action=$t('rv-action').value;
  $t('rv-opener-wrap').classList.toggle('hidden',!['threebet','call'].includes(action));
  const allowed=POS.slice(0,POS.indexOf(pos)),prev=$t('rv-opener').value;
  $t('rv-opener').innerHTML=allowed.map(v=>`<option>${v}</option>`).join('');$t('rv-opener').value=allowed.includes(prev)?prev:allowed.includes('CO')?'CO':allowed.at(-1)||'';
 }
 function buildRival(){
  renderRivalOpeners();let pos=$t('rv-pos').value,action=$t('rv-action').value,stack=val('rv-stack'),op=$t('rv-opener').value;
  if((action==='rfi'||action==='shove')&&pos==='BB'){$t('rv-result').innerHTML='<div class="callout bad">BB no realiza RFI: ya existe la apuesta obligatoria. Elegí una posición anterior o la acción de call / 3-bet.</div>';$t('rv-grid').innerHTML='';latestRival=null;return;}
  if(['threebet','call'].includes(action)&&!op){$t('rv-result').innerHTML='<div class="callout bad">No hay una posición anterior válida para comparar.</div>';$t('rv-grid').innerHTML='';latestRival=null;return;}
  const f={st:stack,hero:pos,op,amount:2,prior:['rfi','shove'].includes(action)?'rfi':'raise'};
  let source=chooseData(f),allowed=action==='rfi'?['R']:action==='shove'?['J']:action==='threebet'?['B','J']:['C'];
  // En RFI se incluyen también los shoves: una mano que abre puede subir o empujar.
  if(action==='rfi')allowed=['R','J'];
  let result=new Map();for(let i=0;i<HANDS.length;i++)if(allowed.includes(source.grid[i]))result.set(HANDS[i],1);
  let txt=rangeText(result),count=[...result.keys()].reduce((s,h)=>s+combos(h),0);
  latestRival=txt?{text:txt,map:result,source}:null;
  let approx=source.kind!=='published'||source.approximate;
  const kind=approx?'Orientativo / aproximado':'Matriz de referencia';
  $t('rv-result').innerHTML=`<div class="tagline"><span class="status-flag ${approx?'':'published'}">${kind}</span><span class="tag">Base ${source.base} BB</span></div><div class="metric-grid" style="margin-top:12px"><div class="metric"><small>Combos por acción predominante</small><strong>${fmtT(count)}</strong></div><div class="metric"><small>% de 1.326 manos</small><strong>${fmtP(count/1326)}</strong></div></div><p class="small-note">${enc(action==='rfi'?'Manos que hacen open raise o open shove':action==='shove'?'Solo manos que hacen open shove':action==='threebet'?'Manos que resuben (incluye 3-bet shove)':'Manos que pagan una apertura')} · ${enc(pos)} · ${fmtT(stack)} BB${['threebet','call'].includes(action)?' vs. '+enc(op):''}.</p>${txt?`<div class="result-list">${enc(txt)}</div>`:'<div class="callout warning">Este árbol no incluye manos con esa acción predominante. No debe interpretarse como que esa acción sea imposible.</div>'}<p class="small-note">${enc(source.note||'')} ${approx?'La estimación no es solver exacto para este cruce.':''} Las frecuencias mixtas no están disponibles: esta selección no representa un rango ponderado exacto.</p>`;
  $t('rv-grid').innerHTML=HANDS.map((h,i)=>{let on=result.has(h),a=source.grid[i];return `<button type="button" class="rival-hand${on?' on':''}${a==='J'?' shove':''}" title="${h} · ${LABELS[a]}" aria-label="${h} ${on?'incluida':'fuera'}">${h}</button>`;}).join('');
  for(const [i,b] of [...$t('rv-grid').children].entries())b.addEventListener('click',()=>{$t('rv-copy-status').textContent=HANDS[i]+' · '+LABELS[source.grid[i]]+' · '+combos(HANDS[i])+' combos sin blockers';});
 }
 for(const id of ['rv-stack','rv-pos','rv-action','rv-opener'])$t(id).addEventListener('change',buildRival);
 $t('rv-refresh').addEventListener('click',buildRival);
 $t('rv-to-equity').addEventListener('click',()=>{if(!latestRival){buildRival();if(!latestRival)return;}$t('eq-mode').value='range';$t('eq-mode').dispatchEvent(new Event('change'));$t('eq-villain-range').value=latestRival.text;changeTab('equity');});
 $t('rv-to-combos').addEventListener('click',()=>{if(!latestRival){buildRival();if(!latestRival)return;}$t('co-range').value=latestRival.text;changeTab('combos');calcCombos();});
 $t('rv-copy').addEventListener('click',async()=>{if(!latestRival){$t('rv-copy-status').textContent='No hay rango para copiar.';return;}try{await navigator.clipboard.writeText(latestRival.text);$t('rv-copy-status').textContent='Rango copiado.';}catch(e){$t('rv-copy-status').textContent='Usá el texto del resultado para copiar el rango.';}});
 renderRivalOpeners();buildRival();

 // Facilita testear fórmulas sin depender del HTML.
 window.PokerEstudioTools={potModel,parseRange,holeCombos,evaluate7,exactAgainst,cardsFrom,rangeClassList,buildRival,runEquity,changeTab};
})();
