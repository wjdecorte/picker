export const dynamic='force-dynamic';
import {generationConfig} from '../../llm';
import {chatgptStatus} from '../../chatgpt';
import {scheduleStatus} from '../../scheduler';
export async function GET(){return Response.json({llm:await generationConfig(),chatgpt:await chatgptStatus(),feeds:{schedule:'ESPN',spreads:'ESPN sportsbook quotes',injuries:'nflverse daily baseline',weather:'Open-Meteo venue-area forecasts',teamResults:'nflverse season-to-date results'},schedule:await scheduleStatus()},{headers:{'Cache-Control':'no-store'}});}
