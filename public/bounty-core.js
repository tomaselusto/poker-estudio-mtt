/* Poker Estudio v4.1 — motor educativo, sin solver ni ICM. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PokerBountyMath = api;
})(typeof globalThis !== 'undefined' ? globalThis : undefined, function () {
  'use strict';
  const nonneg=(v,name)=>{let n=Number(v);if(!Number.isFinite(n)||n<0)throw Error(name+' debe ser un número no negativo.');return n;};
  const pct=(v,name)=>{let n=nonneg(v,name);if(n>100)throw Error(name+' no puede superar 100%.');return n;};
  function power(params){
    if(params.method==='manual')return nonneg(params.manualPower, 'BB por unidad monetaria');
    const chips=nonneg(params.totalChipsBB,'Total de fichas en BB');
    const regular=nonneg(params.regularPool,'Premios regulares pendientes');
    const bounties=nonneg(params.bountyPool,'Recompensas pendientes');
    if(chips<=0||regular+bounties<=0)throw Error('Ingresá fichas en juego y premios pendientes positivos.');
    return chips/(regular+bounties);
  }
  function breakdown(params){
    const format=['vanilla','ko','pko'].includes(params.format)?params.format:null;
    if(!format)throw Error('Modalidad no reconocida.');
    const hero=nonneg(params.heroStack,'Stack de Hero');
    const villain=nonneg(params.villainStack,'Stack del rival');
    const pot=nonneg(params.potBeforeCall,'Pozo antes de pagar');
    const call=nonneg(params.callCost,'Costo del call');
    const equity=pct(params.equityPct,'Equity')/100;
    const win= params.winPct === '' || params.winPct === undefined || params.winPct === null ? equity : pct(params.winPct,'Probabilidad de victoria')/100;
    if(win>equity+1e-10)throw Error('La probabilidad de ganar sin empate no puede superar la equity de pozo.');
    if(call<=0||pot<=0||hero<=0||villain<=0)throw Error('Pozo, call y ambos stacks deben ser mayores que cero.');
    if(call>hero+1e-9)throw Error('El costo del call supera las fichas disponibles de Hero.');
    if(call>villain+1e-9)throw Error('El call no puede superar el stack inicial del rival all-in en este modelo heads-up.');
    // Se compara tamaño de stacks al comienzo del enfrentamiento; en escenarios con fichas previas hay que verificar cobertura manualmente.
    const covers=hero+1e-9>=villain;
    const bounty=nonneg(params.bountyAmount,'Bounty rival');
    const split=pct(params.instantPct,'Porcentaje inmediato')/100;
    const bountyPower=power(params);
    const instantCash=format==='vanilla'||!covers?0:format==='ko'?bounty:bounty*split;
    const transferCash=format==='pko'&&covers?bounty*(1-split):0;
    const bonusBB=instantCash*bountyPower;
    const basePot=pot+call;
    const requiredVanilla=call/basePot;
    const requiredAdjusted=call/(basePot+bonusBB);
    const baseEV=equity*basePot-call;
    const bonusEV=win*bonusBB;
    const adjustedEV=baseEV+bonusEV;
    return {format,covers,hero,villain,pot,call,equity,win,bountyPower,bounty,split,instantCash,transferCash,bonusBB,basePot,requiredVanilla,requiredAdjusted,baseEV,bonusEV,adjustedEV,edge:equity-requiredAdjusted,canCollect:covers&&format!=='vanilla'&&bounty>0};
  }
  return {power,breakdown};
});
