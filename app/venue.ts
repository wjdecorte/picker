import type {Venue} from './weather';
export function parseVenue(v:any):Venue|undefined {return v&&typeof v.fullName==='string'&&typeof v.address?.city==='string'&&typeof v.address?.country==='string'?{id:String(v.id||''),name:v.fullName,city:v.address.city,state:String(v.address.state||''),country:v.address.country,indoor:typeof v.indoor==='boolean'?v.indoor:null}:undefined;}
