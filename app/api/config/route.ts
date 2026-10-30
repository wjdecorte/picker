export const dynamic='force-dynamic';
import {llmConfig} from '../../llm';
export async function GET(){return Response.json({llm:llmConfig(),feeds:{schedule:'ESPN',spreads:'ESPN sportsbook quotes',injuries:false,weather:false},backgroundUpdates:false},{headers:{'Cache-Control':'no-store'}});}
