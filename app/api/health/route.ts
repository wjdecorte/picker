import { getPool } from '../../../db/client';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET() {
  try {
    const result=await getPool().query("SELECT to_regclass('public.pick_versions') AS ready");
    if (!result.rows[0].ready) throw Error('Migrations required');
    return Response.json({status:'ok',database:'postgresql'},{headers:{'Cache-Control':'no-store'}});
  } catch { return Response.json({status:'unavailable'},{status:503}); }
}
