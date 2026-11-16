/* Poker Estudio v4.3 - resumen de rangos cEV, no GTO ni ICM. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.PokerRangeReport=api;})(typeof globalThis!=='undefined'?globalThis:undefined,function(){
 'use strict';
 const MODES=['vanilla','ko','pko'];
 function combos(hand){return hand.length===2?6:hand.endsWith('s')?4:12;}
 function report(statsMap,args,math){
   if(!math||typeof math.context!=='function'||typeof math.analyze!=='function')throw Error('Motor de EV no disponible.');
   const contexts={},modes={};
   for(const mode of MODES){
    contexts[mode]=math.context({...args,format:mode});
    const data=new Map(),totals={positive:0,negative:0,borderline:0,notCalculated:0,computed:0};
    for(const hand of hands()){
      const stats=statsMap.get(hand);
      if(!stats||!(stats.n>0)){totals.notCalculated+=combos(hand);continue;}
      const value=math.analyze(contexts[mode],stats);
      data.set(hand,value); totals.computed+=combos(hand);totals[value.confidence]+=combos(hand);
    }
    modes[mode]={data,totals,context:contexts[mode]};
   }
   const delta={ko:[],pko:[],koBorder:[],pkoBorder:[]};
   for(const hand of hands()){
     const base=modes.vanilla.data.get(hand);
     if(!base)continue;
     for(const mode of ['ko','pko']){
       const cur=modes[mode].data.get(hand);
       if(cur.confidence==='positive'&&base.confidence==='negative')delta[mode].push(hand);
       if(cur.confidence==='positive'&&base.confidence==='borderline')delta[mode+'Border'].push(hand);
     }
   }
   return {modes,delta,analyzed:statsMap.size};
 }
 const ranks='AKQJT98765432';
 function hands(){let hs=[];for(let i=0;i<13;i++)for(let j=0;j<13;j++)hs.push(i===j?ranks[i]+ranks[j]:i<j?ranks[i]+ranks[j]+'s':ranks[j]+ranks[i]+'o');return hs;}
 function rangeOf(view,status){return [...view.data].filter(([hand,result])=>result.confidence===status).map(([hand])=>hand);}
 function sumCombos(hands){return hands.reduce((acc,h)=>acc+combos(h),0);}
 function foldThreshold(callEV,foldGain){
   if(!Number.isFinite(callEV)||!Number.isFinite(foldGain)||foldGain<=0)throw Error('EV y ganancia por fold inválidos.');
   return callEV>=0?0:Math.min(1,Math.max(0,-callEV/(foldGain-callEV)));
 }
 return {report,hands,combos,rangeOf,sumCombos,foldThreshold};
});
