export const dynamic='force-dynamic';
import {generationConfig} from '../../llm';
import {chatgptStatus} from '../../chatgpt';
export async function GET(){return Response.json({llm:await generationConfig(),chatgpt:await chatgptStatus(),feeds:{schedule:'ESPN',spreads:'ESPN sportsbook quotes',injuries:'nflverse daily baseline',weather:'Open-Meteo venue-area forecasts'},backgroundUpdates:false},{headers:{'Cache-Control':'no-store'}});}
