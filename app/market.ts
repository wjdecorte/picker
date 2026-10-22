import type {EventGame,ProviderEvent} from './history';
export type SpreadQuote={homeSpread:number;awaySpread:number;bookmaker:string};
export type MarketSnapshot=SpreadQuote & {source:'ESPN';eventId:string;checkedAt:string};
const number=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:typeof v==='string'&&/^[+-]?\d+(\.\d+)?$/.test(v.trim())?Number(v):null;
export function parseSpreadQuote(odds:unknown):SpreadQuote|undefined {
 if(!Array.isArray(odds))return;
 const ordered=[...odds].sort((a,b)=>(a?.provider?.id==='100'?-1:b?.provider?.id==='100'?1:((a?.provider?.priority??999)-(b?.provider?.priority??999))));
 for(const o of ordered){
  const bookmaker=o?.provider?.displayName||o?.provider?.name;
  if(typeof bookmaker!=='string'||!bookmaker.trim())continue;
  let home=number(o?.pointSpread?.home?.close?.line),away=number(o?.pointSpread?.away?.close?.line);
  if((o?.pointSpread?.home?.close?.line!=null||o?.pointSpread?.away?.close?.line!=null)&&(home===null||away===null))continue;
  if(home===null||away===null){
   const spread=number(o?.spread),hf=o?.homeTeamOdds?.favorite,af=o?.awayTeamOdds?.favorite;
   if(spread===null||typeof hf!=='boolean'||typeof af!=='boolean'||(spread!==0&&hf===af))continue;
   home=spread===0?0:hf?-Math.abs(spread):Math.abs(spread);away=-home;
  }
  if(Math.abs(home)>100||Math.abs(away)>100||Math.abs(home+away)>0.001)continue;
  return {homeSpread:home===0?0:home,awaySpread:away===0?0:away,bookmaker:bookmaker.trim().slice(0,100)};
 }
}
export function applyMarket(g:EventGame,event:ProviderEvent,now:string){
 if(!event.market||event.state!=='pre'||event.complete||g.status==='Complete'||g.status==='In progress'||!g.kickoff||Date.parse(g.kickoff)<=Date.parse(now))return false;
 g.market={...event.market,source:'ESPN',eventId:event.externalId,checkedAt:now};return true;
}
export function marketForTeam(g:EventGame,team:string){return g.market?(team===g.home?g.market.homeSpread:team===g.away?g.market.awaySpread:null):null;}
