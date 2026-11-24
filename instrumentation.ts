// Starts automatic pick updates once per server process (production, or AUTO_PICKS=true).
export async function register(){
 if(process.env.NEXT_RUNTIME!=='nodejs')return;
 const {schedulerEnabled,startScheduler}=await import('./app/scheduler');
 if(schedulerEnabled())startScheduler();
}
