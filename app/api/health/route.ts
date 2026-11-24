import { getPool } from '../../../db/client';
import { appVersion, appCommit } from '../../version';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET() {
  try {
    const result=await getPool().query("SELECT to_regclass('public.pick_versions') AS ready");
    if (!result.rows[0].ready) throw Error('Migrations required');
    return Response.json({status:'ok',database:'postgresql',version:appVersion,commit:appCommit},{headers:{'Cache-Control':'no-store'}});
  } catch { return Response.json({status:'unavailable',version:appVersion,commit:appCommit},{status:503}); }
}
