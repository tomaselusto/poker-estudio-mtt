/* Poker Estudio v4.4 — ICM Malmuth–Harville y árboles HU simplificados.
   El ICM evalúa premios regulares. El bounty inmediato se agrega en efectivo
   únicamente si se elimina al rival. No es un solver ICM/PKO. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.PokerICMMath=api;})(typeof globalThis!=='undefined'?globalThis:undefined,function(){
'use strict';
const EPS=1e-8;
const validateNumber=(x,label)=>{const n=Number(x);if(!Number.isFinite(n)||n<0)throw Error(label+' debe ser un número no negativo.');return n;};
function icm(stacks,prizes){
 if(!Array.isArray(stacks)||stacks.length<2||stacks.length>12)throw Error('ICM requiere entre 2 y 12 jugadores restantes (campo completo).');
 const n=stacks.length; if(!Array.isArray(prizes)||prizes.length!==n)throw Error('Cargá un premio por cada puesto, incluidos los puestos sin cobro.');
 const s=stacks.map((v,i)=>validateNumber(v,'Stack jugador '+(i+1)));
 const pay=prizes.map((v,i)=>validateNumber(v,'Premio puesto '+(i+1)));
 for(let i=1;i<n;i++)if(pay[i]>pay[i-1]+EPS)throw Error('Los premios deben estar ordenados de mayor a menor.');
 const active=s.map((v,i)=>v>EPS?i:-1).filter(i=>i>=0),zero=s.map((v,i)=>v<=EPS?i:-1).filter(i=>i>=0);
 if(!active.length)throw Error('Debe quedar al menos un jugador con fichas.');
 const m=active.length,size=1<<m,subsetSum=new Float64Array(size),dp=new Float64Array(size),pop=new Uint8Array(size),out=Array(n).fill(0);
 const total=active.reduce((a,i)=>a+s[i],0);
 for(let mask=1;mask<size;mask++){
  const bit=mask & -mask,at=31-Math.clz32(bit),prev=mask^bit;
  subsetSum[mask]=subsetSum[prev]+s[active[at]];
  pop[mask]=pop[prev]+1;
 }
 dp[0]=1;
 for(let mask=0;mask<size-1;mask++){
  const prob=dp[mask];if(prob<EPS*1e-6)continue;
  const rest=total-subsetSum[mask],rank=pop[mask];
  if(rest<=EPS)continue;
  for(let j=0;j<m;j++)if(!(mask & (1<<j))){
   const p=prob*s[active[j]]/rest;
   out[active[j]]+=p*pay[rank];
   dp[mask|(1<<j)]+=p;
  }
 }
 // Una mano puede dejar un único eliminado con stack 0. Para múltiples
 // eliminados simultáneos (no modelados por el árbol), repartir últimos premios.
 if(zero.length){const sum=pay.slice(m).reduce((a,v)=>a+v,0);for(const i of zero)out[i]=sum/zero.length;}
 return out;
}
function scenario(a){
 const spot=a.spot;
 if(!['call','reshove'].includes(spot))throw Error('ICM admite call contra all-in y reshove HU; aislamiento multiway no resuelto.');
 const s=a.stacks.map((x,i)=>validateNumber(x,'Stack '+(i+1))),n=s.length;
 if(n<2||n>12)throw Error('Ingresá entre 2 y 12 jugadores restantes.');
 const hero=Number(a.hero),villain=Number(a.villain);
 if(!Number.isInteger(hero)||!Number.isInteger(villain)||hero===villain||hero<0||villain<0||hero>=n||villain>=n)throw Error('Hero y rival deben ser jugadores diferentes.');
 const pot=validateNumber(a.pot,'Pozo antes de actuar');
 const cost=validateNumber(a.call,'Call'),open=validateNumber(a.open,'Open rival'),fold=validateNumber(a.fold,'Fold del rival (%)')/100;
 if(fold>1)throw Error('Fold del rival entre 0 y 100%.');
 if(!(s[hero]>EPS)||pot<=0)throw Error('Stack disponible de Hero y pozo deben ser positivos.');
 let effective=0,oppCall=0,opponentFold=false;
 if(spot==='call'){
  if(s[villain]>EPS)throw Error('Call vs all-in: el rival debe tener 0 BB FUERA del pozo, porque ya empujó todo.');
  if(cost<=0||cost>s[hero])throw Error('El call debe ser mayor a cero y no exceder el stack disponible de Hero.');
  if(pot+EPS<cost)throw Error('El pozo debe contener el all-in que estamos pagando.');
  effective=cost;
 }else{
  if(open<=0||open>pot)throw Error('El open rival debe ser positivo y estar incluido en el pozo.');
  if(s[villain]<=0)throw Error('Reshove: el rival aún debe tener fichas detrás para decidir call o fold.');
  if(s[hero]<=open)throw Error('Reshove: el stack de Hero debe superar el open actual del rival.');
  // La parte no igualada del shove regresa a Hero: no creamos side pots.
  effective=Math.min(s[hero],s[villain]+open);
  oppCall=effective-open;
  if(oppCall<=0||oppCall>s[villain]+EPS)throw Error('Stack/open incompatibles para un reshove HU.');
  opponentFold=true;
 }
 const withAdjust=(h,v)=>{const x=s.slice();x[hero]=h;x[villain]=v;return x;};
 const baseline=withAdjust(s[hero],s[villain]+pot);
 const branchFold=withAdjust(s[hero]+pot,s[villain]);
 const totalShowdown=pot+effective+oppCall;
 const win=withAdjust(s[hero]-effective+totalShowdown,s[villain]-oppCall);
 const lose=withAdjust(s[hero]-effective,s[villain]-oppCall+totalShowdown);
 const tie=withAdjust(s[hero]-effective+totalShowdown/2,s[villain]-oppCall+totalShowdown/2);
 const totalBefore=pot+s.reduce((a,b)=>a+b,0);
 for(const [name,branch] of Object.entries({baseline,branchFold,win,lose,tie})){
  if(branch.some(x=>x< -EPS))throw Error('La rama '+name+' produce stacks negativos. Revisá pot y call.');
  if(Math.abs(branch.reduce((sum,v)=>sum+v,0)-totalBefore)>1e-6*Math.max(1,totalBefore))throw Error('Fallo en conservación de fichas: '+name);
 }
 const prizes=a.prizes,prizeBranch={baseline:icm(baseline,prizes)[hero],fold:icm(branchFold,prizes)[hero],win:icm(win,prizes)[hero],lose:icm(lose,prizes)[hero],tie:icm(tie,prizes)[hero]};
 const mode=['vanilla','ko','pko'].includes(a.mode)?a.mode:'vanilla';
 const bounty=validateNumber(a.bounty,'Bounty rival'),fraction=validateNumber(a.instant,'Parte inmediata PKO (%)')/100;
 if(fraction>1)throw Error('Parte inmediata PKO entre 0 y 100%.');
 const capture=win[villain]<=EPS;
 const bonus=capture?(mode==='ko'?bounty:mode==='pko'?bounty*fraction:0):0;
 return {spot,s,prizes,hero,villain,pot,cost,effective,open,oppCall,fold:spot==='reshove'?fold:0,mode,bonus,capture,progressive:mode==='pko'&&capture?bounty*(1-fraction):0,totalBefore,stacks:{baseline,fold:branchFold,win,lose,tie},cash:prizeBranch};
}
function analyze(c,stats){
 const w=validateNumber(stats.win,'Probabilidad de ganar'),t=validateNumber(stats.tie,'Probabilidad de empate');
 if(w+t>1+EPS)throw Error('Victoria y empate no pueden superar el 100%.');
 const l=Math.max(0,1-w-t),f=c.fold,base=c.cash.baseline;
 const a=c.cash.win+c.bonus-base,b=c.cash.tie-base,d=c.cash.lose-base,g=c.cash.fold-base;
 const called=w*a+t*b+l*d;
 const monetaryEV=f*g+(1-f)*called;
 const chipsBase=c.stacks.baseline[c.hero],cw=c.stacks.win[c.hero]-chipsBase,ct=c.stacks.tie[c.hero]-chipsBase,cl=c.stacks.lose[c.hero]-chipsBase,cg=c.stacks.fold[c.hero]-chipsBase;
 const chipCalled=w*cw+t*ct+l*cl;
 const chipEV=f*cg+(1-f)*chipCalled;
 const denom=(1-f)*(a-d),numerator= -f*g-(1-f)*d;
 const required=denom>EPS?numerator/denom:null;
 const n=Number(stats.n)||0;
 const varCall=Math.max(0,w*(a-called)**2+t*(b-called)**2+l*(d-called)**2);
 const se=n>0?Math.sqrt(varCall/n)*(1-f):null;
 const varChip=Math.max(0,w*(cw-chipCalled)**2+t*(ct-chipCalled)**2+l*(cl-chipCalled)**2);
 const chipSE=n>0?Math.sqrt(varChip/n)*(1-f):null;
 const chipConfidence=chipSE===null?null:chipEV>1.96*chipSE?'positive':chipEV< -1.96*chipSE?'negative':'borderline';
 const confidence=se===null?null:monetaryEV>1.96*se?'positive':monetaryEV< -1.96*se?'negative':'borderline';
 return {win:w,tie:t,lose:l,monetaryEV,chipEV,required,confidence,se,chipSE,chipConfidence,foldValue:g,winValue:a,loseValue:d,tieValue:b,conditional:called};
}
return {icm,scenario,analyze};
});
