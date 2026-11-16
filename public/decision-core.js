/* Poker Estudio v4.2 · matemáticas de un único rival, chip EV.
   NO es solver GTO ni incorpora ICM / acciones multiway. */
(function(root, factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.PokerDecisionMath=api;})(typeof globalThis!=='undefined'?globalThis:undefined,function(){
 'use strict';
 function num(x,name){const n=Number(x);if(!Number.isFinite(n)||n<0)throw Error(name+' debe ser un número no negativo.');return n;}
 function bounded(x,name){const n=num(x,name);if(n>100)throw Error(name+' debe estar entre 0 y 100%.');return n/100;}
 function context(p){
   const type=p.spot;
   if(!['call','reshove','isolate'].includes(type))throw Error('Tipo de decisión inválido.');
   const hero=num(p.heroStack,'Stack Hero'),villain=num(p.villainStack,'Stack rival');
   if(hero<=0||villain<=0)throw Error('Ambos stacks deben ser positivos.');
   const format=['vanilla','ko','pko'].includes(p.format)?p.format:'vanilla';
   const covers=hero+1e-8>=villain;
   const bounty=num(p.bounty,'Bounty rival');
   const instantFraction=bounded(p.instantPct,'Fracción inmediata PKO');
   const bountyPower=num(p.bountyPower,'Bounty Power');
   const immediatelyWon=!covers||format==='vanilla'?0:format==='ko'?bounty:bounty*instantFraction;
   const transferred=!covers||format!=='pko'?0:bounty*(1-instantFraction);
   const bonus=immediatelyWon*bountyPower;
   let cost,pot,foldGain=0,foldProb=0,conditional=false;
   if(type==='call'){
     cost=num(p.callCost,'Costo de call');const before=num(p.potBeforeCall,'Pozo antes del call');
     if(cost<=0||cost>hero||cost>villain)throw Error('El call debe ser positivo y no superar el stack de Hero ni el tamaño del all-in rival.');
     if(before<cost)throw Error('El pozo anterior al call debe incluir el all-in rival, al menos igual al call.');
     pot=before+cost;
   }else if(type==='reshove'){
     const dead=num(p.deadPot,'Ciegas y antes');const open=num(p.openSize,'Open rival');
     cost=Math.min(hero,villain);
     if(open<=0||open>=cost)throw Error('El open debe ser positivo y menor que el stack efectivo para modelar un reshove.');
     pot=dead+2*cost; foldGain=dead+open; foldProb=bounded(p.foldPct,'Fold al reshove');
   }else{
     const dead=num(p.deadPot,'Ciegas y antes');
     cost=villain;
     if(hero+1e-8<villain)throw Error('Para aislar y capturar bounty, Hero debe cubrir el shove del short.');
     pot=dead+2*cost;
     conditional=true;
   }
   if(pot<=0)throw Error('Pozo final inválido.');
   return {type,format,hero,villain,covers,bonus,transferred,immediatelyWon,bountyPower,callCost:cost,pot,foldGain,foldProb,conditional};
 }
 function analyze(c,stats){
   const win=num(stats.win,'Probabilidad de ganar'),tie=num(stats.tie,'Probabilidad de empatar'),n=num(stats.n,'Muestras');
   if(win+tie>1.00000001||n<=0)throw Error('Muestras o probabilidades no válidas.');
   const eq=win+tie*.5;
   const callEV=eq*c.pot-c.callCost+win*c.bonus;
   const callVanilla=eq*c.pot-c.callCost;
   const ev=c.type==='reshove'?c.foldProb*c.foldGain+(1-c.foldProb)*callEV:callEV;
   const vals=[c.pot-c.callCost+c.bonus,c.pot*.5-c.callCost,-c.callCost];
   const loss=1-win-tie;
   const m=win*vals[0]+tie*vals[1]+loss*vals[2];
   const variance=Math.max(0,win*(vals[0]-m)**2+tie*(vals[1]-m)**2+loss*(vals[2]-m)**2);
   const stderr=Math.sqrt(variance/n)*(c.type==='reshove'?1-c.foldProb:1);
   const req=c.callCost/(c.pot+c.bonus); // sin empates
   const vanillaReq=c.callCost/c.pot;
   const edge=ev;
   const confidence=ev>1.96*stderr?'positive':ev< -1.96*stderr?'negative':'borderline';
   return {eq,win,tie,loss,callEV,callVanilla,ev,stderr,confidence,req,vanillaReq,foldGain:c.foldGain,foldProb:c.foldProb,bonus:c.bonus,conditional:c.conditional};
 }
 return {context,analyze};
});
