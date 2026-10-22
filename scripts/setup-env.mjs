import { writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
const password=randomBytes(24).toString('hex');
const contents=`POSTGRES_PASSWORD=${password}\nAPP_PORT=3000\nAPP_ORIGIN=http://localhost:3000\nPOSTGRES_PORT=5433\nDATABASE_URL=postgresql://picker:${password}@127.0.0.1:5433/picker\nRESULTS_SERVICE_KEY=${randomBytes(32).toString('hex')}\n`;
try {await writeFile('.env',contents,{flag:'wx',mode:0o600});console.log('Created .env with random local credentials.');}
catch(e) {if(e.code==='EEXIST')console.log('.env already exists; preserved existing credentials.');else throw e;}
