export const runtime='nodejs';
import {loadState,saveState,responseData} from '../../repository';
import {saveManualPick} from '../../pick-workflow';
import {writeAllowed} from '../../write-access';
export async function POST(req:Request){if(!writeAllowed(req))return Response.json({error:'Trusted local access is required.'},{status:403});try{const d=await req.json(),s=await loadState();if(d.version!==s.version)return Response.json({error:'The dashboard changed. Refresh and try again.'},{status:409});const now=new Date().toISOString();
 if(d.action==='result'){
  const g=s.eventGames.find(g=>g.id===d.gameId);if(!g)throw Error('Game not found.');
  if(!g.kickoff||Date.parse(g.kickoff)>Date.now())throw Error('Final scores can only be entered after kickoff.');
  if(![d.awayScore,d.homeScore].every(n=>Number.isInteger(n)&&n>=0&&n<=200))throw Error('Enter whole-number final scores between 0 and 200.');
  if(typeof d.reason!=='string'||!d.reason.trim()||d.reason.length>1200)throw Error('Provide a source or reason for this score entry.');
  (g.context as any).scoreCorrections=[...((g.context as any).scoreCorrections||[]),{at:now,awayScore:g.awayScore,homeScore:g.homeScore,reason:d.reason}];
  g.awayScore=d.awayScore;g.homeScore=d.homeScore;g.status='Complete';g.completedAt=g.completedAt||now;g.scoreSource='Manual · '+d.reason.trim();g.scoreVerifiedAt=now;
 }else if(d.action==='override')saveManualPick(s,d,now);else throw Error('Unknown pick action.');
 if(!await saveState(s,s.version))return Response.json({error:'Another update completed. Refresh and try again.'},{status:409});s.version++;return Response.json(responseData(s));
 }catch(e:any){return Response.json({error:e.message||'Could not save the pick.'},{status:400});}}
