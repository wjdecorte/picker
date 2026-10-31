export const dynamic='force-dynamic';
import {generationConfig} from '../../llm';
import {chatgptStatus} from '../../chatgpt';
export async function GET(){return Response.json({llm:await generationConfig(),chatgpt:await chatgptStatus(),feeds:{schedule:'ESPN',spreads:'ESPN sportsbook quotes',injuries:false,weather:false},backgroundUpdates:false},{headers:{'Cache-Control':'no-store'}});}
