// Future feed adapters update market/score fields, never the saved pick spread.
export interface GameReference {season:number;week:number;away:string;home:string;date:string}
export interface NflDataProvider {
 schedule(season:number,week:number):Promise<(GameReference & {kickoff:string})[]>;
 scores(games:GameReference[]):Promise<{game:GameReference;awayScore:number;homeScore:number;complete:boolean}[]>;
 market(games:GameReference[]):Promise<{game:GameReference;team:string;spread:number;observedAt:string;closing:boolean}[]>;
 reports(games:GameReference[]):Promise<{game:GameReference;injuryNotes:string;weatherNotes:string}[]>;
}
export const feedsEnabled={scores:true,spreads:true,injuries:false,weather:false};
