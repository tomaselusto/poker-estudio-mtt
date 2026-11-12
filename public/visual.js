/* Poker Estudio v3 — selectores visuales de cartas y rangos. Sin dependencias. */
'use strict';
(() => {
  const T = window.PokerEstudioTools;
  if (!T) { console.error('Poker Estudio: tools.js es necesario antes de visual.js'); return; }
  const $ = id => document.getElementById(id);
  const R = 'AKQJT98765432', S = ['s','h','d','c'];
  const ICON = {s:'♠',h:'♥',d:'♦',c:'♣'};
  const SUITNAME = {s:'Picas',h:'Corazones',d:'Diamantes',c:'Tréboles'};
  const DECK = S.flatMap(s=>[...R].map(r=>r+s));
  const fmt = n => Number(n).toLocaleString('es-AR',{maximumFractionDigits:2});
  const esc = x => String(x).replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const HANDS_ALL = Array.from({length:13},(_,i)=>Array.from({length:13},(_,j)=>i===j?R[i]+R[j]:i<j?R[i]+R[j]+'s':R[j]+R[i]+'o')).flat();
  const instances = {};
  function cardHtml(c) {return `<span class="v3-cardface ${'hd'.includes(c[1])?'red':''}">${esc(c[0])}<span>${ICON[c[1]]}</span></span>`;}
  function parseCardsLoose(str) {
    const cleaned = String(str||'').trim().replace(/10/gi,'T').replaceAll('♠','s').replaceAll('♥','h').replaceAll('♦','d').replaceAll('♣','c');
    if(!cleaned) return [];
    const v=cleaned.split(/[\s,;]+/).filter(Boolean).map(c=>c[0].toUpperCase()+c.slice(1).toLowerCase());
    for (const c of v)if(!DECK.includes(c))throw Error(`Carta inválida: ${c}`);
    if(new Set(v).size!==v.length)throw Error('Una carta está duplicada dentro de la misma selección.');
    return v;
  }
  function stringifyRange(map) {
    return HANDS_ALL.filter(h=>(map.get(h)||0)>0).map(h=>{
      const f=map.get(h);return h+(f<.999?'@'+Math.round(f*100)+'%':'');
    }).join(', ');
  }
  function baseMarkup(id){
    return `<div class="v3-studio" id="${id}-studio">
      <div class="v3-sectiontitle"><div><h3>Selector visual de cartas</h3><p>Elegí el destino y tocá las cartas. Se bloquean las que ya están utilizadas.</p></div><span class="v3-version">MODO VISUAL · v3</span></div>
      <div class="v3-deck-top" id="${id}-deck-top"></div>
      <div class="v3-deckframe"><div class="v3-deck-grid" id="${id}-deck"></div></div>
      <div class="v3-deck-bottom"><div class="v3-hint" id="${id}-card-help"></div><div class="v3-buttons"><button type="button" class="secondary-btn" data-v3-clear-target="${id}">Limpiar selección</button><button type="button" class="secondary-btn" data-v3-clear-all="${id}">Limpiar todas</button></div></div>
    </div>`;
  }
  function rangeMarkup(id){
    return `<div class="v3-range" id="${id}-range-panel">
       <div class="v3-sectiontitle"><div><h3>Matriz editable del rango rival</h3><p>Tocá una mano para alternar 100% → 50% → 25% → 0%. Shift + clic la elimina.</p></div><span class="v3-version">169 manos</span></div>
       <div class="v3-range-toolbar"><div class="v3-presets"><button type="button" data-v3-preset="${id}:utg40">UTG · 40 BB</button><button type="button" data-v3-preset="${id}:co40">CO · 40 BB</button><button type="button" data-v3-preset="${id}:btn20">BTN · 20 BB</button><button type="button" data-v3-preset="${id}:btnco">BTN vs. CO · 3-bet</button><button type="button" data-v3-preset="${id}:bbbtn">BB vs. BTN · call</button></div><div class="v3-buttons"><button type="button" class="secondary-btn" data-v3-all="${id}">Todo 100%</button><button type="button" class="secondary-btn" data-v3-empty="${id}">Vaciar</button></div></div>
       <div class="v3-range-layout"><div class="v3-range-scroll"><div class="v3-rangegrid" id="${id}-matrix"></div></div><aside class="v3-range-aside"><div class="v3-range-stats" id="${id}-stats"></div><div class="v3-selected-detail" id="${id}-selected"><strong>Tocá una mano</strong><p>Vas a ver su frecuencia y sus combinaciones disponibles.</p></div><div class="v3-freqkey"><span>Sin seleccionar</span><span>25%</span><span>50%</span><span>100%</span></div><div class="v3-range-status" id="${id}-range-status" aria-live="polite"></div></aside></div>
     </div>`;
  }
  const configurations = {
    eq:{area:'tool-equity', hero:'eq-hero',board:'eq-board',villain:'eq-villain-exact',range:'eq-villain-range',isEquity:true},
    co:{area:'tool-combos',hero:'co-hero',board:'co-board',range:'co-range',isEquity:false}
  };
  function getCards(inst){
    const groups={};
    for(const key of ['hero','villain','board']) {
      if(key==='villain' && (!inst.cfg.isEquity || $('eq-mode').value!=='exact')) continue;
      groups[key]=parseCardsLoose($(inst.cfg[key]).value);
    }
    const all=Object.values(groups).flat();
    if(new Set(all).size!==all.length) throw Error('Hay una carta repetida entre Hero, rival o board.');
    if(groups.hero.length>2 || (groups.villain||[]).length>2 || groups.board.length>5)throw Error('Superaste el máximo de cartas para una posición.');
    return groups;
  }
  function isExact(inst){return inst.cfg.isEquity&&$('eq-mode').value==='exact';}
  function targetList(inst){return isExact(inst)?['hero','villain','board']:['hero','board'];}
  const label = {hero:'Hero · 2',villain:'Rival · 2',board:'Board · 0/3/4/5'};
  function renderDeck(inst){
    const {id}=inst;
    let groups,error='';
    try{groups=getCards(inst);}catch(e){error=e.message;groups={hero:[],villain:[],board:[]};for(const k of targetList(inst))try{groups[k]=parseCardsLoose($(inst.cfg[k]).value);}catch(x){/* conservar otras secciones */}}
    const targets=targetList(inst);
    if(!targets.includes(inst.target))inst.target='hero';
    $(id+'-deck-top').innerHTML=targets.map(t=>{
      const cards=groups[t]||[];
      return `<button type="button" data-v3-target="${id}:${t}" aria-pressed="${inst.target===t}" class="v3-target${inst.target===t?' active':''}"><span class="v3-target-name">${label[t]}</span><span class="v3-target-cards">${cards.length?cards.map(cardHtml).join(''):'<span class="v3-placeholder">Seleccionar cartas</span>'}</span><span class="v3-target-count">${cards.length}${t==='board'?'/5':'/2'}</span></button>`;
    }).join('');
    const occupied={};
    for(const [key,cards] of Object.entries(groups))for(const c of cards)occupied[c]=key;
    $(id+'-deck').innerHTML=DECK.map(c=>{
      const other=occupied[c],mine=other===inst.target,blocked=!!other&&!mine;
      return `<button type="button" class="v3-cardbtn ${'hd'.includes(c[1])?'red':''}${mine?' selected':''}${blocked?' used':''}" data-v3-card="${id}:${c}" ${blocked?'disabled':''} title="${c[0]} de ${SUITNAME[c[1]]}${other?' · '+(mine?'seleccionada':'ocupada en '+other):''}" aria-label="${c[0]} de ${SUITNAME[c[1]]}${other?' · '+(mine?'quitar':'ocupada'):''}" aria-pressed="${mine}"><span>${c[0]}</span><span>${ICON[c[1]]}</span></button>`;
    }).join('');
    const hints={hero:'Hero: seleccioná 2 cartas. Podés quitarlas tocándolas otra vez.',villain:'Rival exacto: seleccioná 2 cartas diferentes de las de Hero.',board:'Board: elegí 0, 3, 4 o 5 cartas (flop, turn, river).'};
    $(id+'-card-help').innerHTML=error?`<span class="v3-error">${esc(error)}</span>`:hints[inst.target];
    if(error)$(id+'-deck').classList.add('invalid');else $(id+'-deck').classList.remove('invalid');
  }
  function onCard(inst,card){
    let groups;
    try{groups=getCards(inst);}catch(e){$(inst.id+'-card-help').textContent=e.message;return;}
    const target=inst.target,current=groups[target]||[],limit=target==='board'?5:2;
    const belonging=Object.entries(groups).find(([k,v])=>v.includes(card));
    if(belonging && belonging[0]!==target)return;
    if(current.includes(card))groups[target]=current.filter(c=>c!==card);
    else if(current.length<limit)groups[target]=[...current,card];
    else {$(inst.id+'-card-help').textContent=`Máximo de ${limit} cartas. Quitá una primero.`;return;}
    $(inst.cfg[target]).value=groups[target].join(' ');
    $(inst.cfg[target]).dispatchEvent(new Event('input',{bubbles:true}));
    // Avanza al siguiente objetivo vacío sin perder el estado.
    if(groups[target].length===limit){
      const order=targetList(inst),index=order.indexOf(target);
      if(index<order.length-1){let next=order[index+1];if((groups[next]||[]).length<(next==='board'?5:2))inst.target=next;}
    }
    renderAll(inst);
  }
  function clearTarget(inst,all){
    const keys=all?targetList(inst):[inst.target];
    for(const key of keys){$(inst.cfg[key]).value='';$(inst.cfg[key]).dispatchEvent(new Event('input',{bubbles:true}));}
    if(all)inst.target='hero';renderAll(inst);
  }
  function parseVisualRange(inst){
    const txt=$(inst.cfg.range).value;
    if(!txt.trim()) return new Map();
    return T.parseRange(txt);
  }
  function rangeSummary(map,blocked){
    let raw=0,available=0,weighted=0,weightedOriginal=0,classes=0;
    for(const [h,f] of map){if(f<=0)continue;classes++;const n=T.holeCombos(h,new Set()).length,left=T.holeCombos(h,blocked).length;
      raw+=n;available+=left;weightedOriginal+=n*f;weighted+=left*f;}
    return {raw,available,weighted,weightedOriginal,classes};
  }
  function rangeCell(inst,h,map,blocked){
    const f=map.get(h)||0;
    const n=T.holeCombos(h,new Set()).length,avail=T.holeCombos(h,blocked).length;
    const style=f?`style="--v3-p:${f};"`:'';
    return `<button type="button" data-v3-hand="${inst.id}:${h}" class="v3-rangehand ${f>0?'active':''} ${f>0&&avail===0?'exhausted':''}" ${style} title="${h} · Frecuencia ${Math.round(f*100)}% · ${avail}/${n} combos posibles" aria-label="${h}, frecuencia ${Math.round(f*100)}%, ${avail} de ${n} combos disponibles"><span class="v3-handname">${h}</span>${f>0?`<span class="v3-handpct">${Math.round(f*100)}%</span>`:''}</button>`;
  }
  function renderRange(inst){
    let map,groups;
    try{map=parseVisualRange(inst);}catch(e){$(inst.id+'-range-status').innerHTML=`<span class="v3-error">${esc(e.message)}</span>`;return;}
    try{groups=getCards(inst);}catch(e){$(inst.id+'-range-status').innerHTML=`<span class="v3-error">${esc(e.message)}. Corregí las cartas antes de confiar en los blockers.</span>`;groups={hero:[],board:[]};}
    const blocked=new Set([...(groups.hero||[]),...(groups.board||[])]);
    const summary=rangeSummary(map,blocked);
    $(inst.id+'-matrix').innerHTML=HANDS_ALL.map(h=>rangeCell(inst,h,map,blocked)).join('');
    $(inst.id+'-stats').innerHTML=`<div><small>Clases activas</small><strong>${fmt(summary.classes)} / 169</strong></div><div><small>Combos originales</small><strong>${fmt(summary.raw)}</strong></div><div><small>Combos disponibles</small><strong>${fmt(summary.available)}</strong></div><div><small>Ponderados disponibles</small><strong>${fmt(summary.weighted)}</strong></div><div><small>Bloqueados ponderados</small><strong>${fmt(summary.weightedOriginal-summary.weighted)}</strong></div><div><small>Rango ponderado inicial</small><strong>${fmt(summary.weightedOriginal/1326*100)}%</strong></div>`;
    let h=inst.selected;
    if(h){let f=map.get(h)||0,orig=T.holeCombos(h,new Set()).length,avail=T.holeCombos(h,blocked).length;
      $(inst.id+'-selected').innerHTML=`<strong>${h}</strong><p>Frecuencia: ${Math.round(f*100)}% · Originales: ${orig} · Disponibles: ${avail} · Ponderados disponibles: ${fmt(avail*f)}</p>`;
    }
    if(!$(inst.id+'-range-status').classList.contains('v3-manual-error')) $(inst.id+'-range-status').textContent='Los blockers se actualizan con Hero + board. La frecuencia aplicada a cada clase se utiliza en equity y combinatoria.';
  }
  function renderAll(inst){renderDeck(inst);renderRange(inst);}
  function updateRange(inst,map){
    $(inst.cfg.range).value=stringifyRange(map);
    $(inst.cfg.range).dispatchEvent(new Event('input',{bubbles:true}));
    renderRange(inst);
  }
  function clickHand(inst,h,shift){
    let map;
    try{map=parseVisualRange(inst);}catch(e){$(inst.id+'-range-status').textContent=e.message;return;}
    inst.selected=h;
    const prev=map.get(h)||0,next=shift?0:(prev<.001?1:prev>.75?.5:prev>.4?.25:0);
    if(next===0)map.delete(h);else map.set(h,next);
    updateRange(inst,map);
  }
  const presets={
    utg40:{stack:40,hero:'UTG',prior:'rfi',action:['R','J'],description:'RFI UTG · 40 BB'},
    co40:{stack:40,hero:'CO',prior:'rfi',action:['R','J'],description:'RFI CO · 40 BB'},
    btn20:{stack:20,hero:'BTN',prior:'rfi',action:['R','J'],description:'RFI BTN · 20 BB'},
    btnco:{stack:40,hero:'BTN',op:'CO',amount:2,prior:'raise',action:['B','J'],description:'BTN vs. CO · 40 BB · 3-bet'},
    bbbtn:{stack:40,hero:'BB',op:'BTN',amount:2,prior:'raise',action:['C'],description:'BB vs. BTN · 40 BB · call'}
  };
  function preset(inst,key){
    const p=presets[key];if(!p)return;
    const data=chooseData({st:p.stack,hero:p.hero,op:p.op||'UTG',amount:p.amount||2,prior:p.prior});
    const map=new Map();for(let i=0;i<HANDS_ALL.length;i++)if(p.action.includes(data.grid[i]))map.set(HANDS_ALL[i],1);
    updateRange(inst,map);
    const approximate=(data.kind!=='published'||data.approximate);
    $(inst.id+'-range-status').innerHTML=`<span class="${approximate?'v3-warn':'v3-ok'}">Preset cargado: ${esc(p.description)}. ${approximate?'Rango orientativo / heurístico.':'Manos por acción predominante; no son frecuencias mixtas exactas.'}</span>`;
  }
  function setup(id,cfg){
    const section=$(cfg.area),heading=section.querySelector('.tool-heading');
    const studio=document.createElement('div');studio.className='v3-visual-layout';studio.innerHTML=baseMarkup(id)+rangeMarkup(id);
    heading.insertAdjacentElement('afterend',studio);
    const inst={id,cfg,target:'hero',selected:null};instances[id]=inst;
    // Edición manual disponible, pero no ocupa el espacio principal.
    const wrap=section.querySelector('.tool-grid>.tool-card:first-child');
    const manual=document.createElement('details');manual.className='v3-manual';manual.innerHTML='<summary>Entrada manual de cartas y rango (avanzado)</summary><div class="v3-manual-fields"></div>';
    const wanted=cfg.isEquity?['eq-hero','eq-villain-exact','eq-villain-range','eq-board']:['co-hero','co-board','co-range'];
    for(const inputID of wanted){
      const f=$(inputID).closest('.field');manual.querySelector('.v3-manual-fields').appendChild(f);
    }
    if(cfg.isEquity){
      const modeToggle=document.createElement('div');modeToggle.className='v3-mode-toggle';modeToggle.innerHTML='<span>Tipo de rival</span><div class="v3-buttons"><button type="button" id="v3-eq-exact">Mano exacta</button><button type="button" id="v3-eq-range">Rango 13×13</button></div>';
      $(id+'-deck-top').insertAdjacentElement('beforebegin',modeToggle);
      $('v3-eq-exact').addEventListener('click',()=>switchMode('exact'));
      $('v3-eq-range').addEventListener('click',()=>switchMode('range'));
      function switchMode(mode){$('eq-mode').value=mode;$('eq-mode').dispatchEvent(new Event('change',{bubbles:true}));}
      function refreshMode(){
        $('v3-eq-exact').classList.toggle('v3-active-mode',isExact(inst));
        $('v3-eq-range').classList.toggle('v3-active-mode',!isExact(inst));
        $(id+'-range-panel').classList.toggle('v3-hidden',isExact(inst));
        renderAll(inst);
      }
      $('eq-mode').addEventListener('change',refreshMode);refreshMode();
    }
    wrap.insertBefore(manual,wrap.querySelector('.actions'));
    for(const k of ['hero','board',...(cfg.isEquity?['villain']:[])])$(cfg[k]).addEventListener('input',()=>{
      renderAll(inst);
      if(cfg.isEquity){$('eq-result').innerHTML='<p class="hint">Las cartas cambiaron. Volvé a calcular la equity para ver el resultado actualizado.</p>';}
      else $('co-run').click();
    });
    $(cfg.range).addEventListener('input',()=>{
      // Si el rango se está escribiendo, el texto es la fuente de verdad.
      renderRange(inst);
      if(cfg.isEquity)$('eq-result').innerHTML='<p class="hint">Cambiaste el rango. Volvé a calcular la equity.</p>';
      else $('co-run').click();
    });
    renderAll(inst);
  }
  setup('eq',configurations.eq);setup('co',configurations.co);
  document.addEventListener('click',event=>{
    const t=event.target.closest('[data-v3-target],[data-v3-card],[data-v3-clear-target],[data-v3-clear-all],[data-v3-hand],[data-v3-empty],[data-v3-all],[data-v3-preset]');if(!t)return;
    if(t.dataset.v3Target){const [id,target]=t.dataset.v3Target.split(':');instances[id].target=target;renderDeck(instances[id]);}
    if(t.dataset.v3Card){const [id,card]=t.dataset.v3Card.split(':');onCard(instances[id],card);}
    if(t.dataset.v3ClearTarget)clearTarget(instances[t.dataset.v3ClearTarget],false);
    if(t.dataset.v3ClearAll)clearTarget(instances[t.dataset.v3ClearAll],true);
    if(t.dataset.v3Hand){const [id,h]=t.dataset.v3Hand.split(':');clickHand(instances[id],h,event.shiftKey);}
    if(t.dataset.v3Empty)updateRange(instances[t.dataset.v3Empty],new Map());
    if(t.dataset.v3All)updateRange(instances[t.dataset.v3All],new Map(HANDS_ALL.map(h=>[h,1])));
    if(t.dataset.v3Preset){const [id,key]=t.dataset.v3Preset.split(':');preset(instances[id],key);}
  });
  // El módulo original carga rangos desde el estimador mediante asignación programática.
  // Refrescamos la matriz después del mismo evento, manteniendo el motor original intacto.
  for(const id of ['eq-rival-apply','rv-to-equity','co-use-rival','rv-to-combos']){
    const b=$(id);if(b)b.addEventListener('click',()=>setTimeout(()=>{renderRange(instances.eq);renderRange(instances.co);},0));
  }
  window.PokerEstudioVisual={instances,parseCardsLoose,rangeSummary,renderAll,renderRange,clickHand,preset};
})();
