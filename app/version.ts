// Filled in at build time by next.config.ts.
export const appVersion=process.env.APP_VERSION||'unknown';
export const appCommit=process.env.APP_COMMIT||'';
export const versionLabel=()=>`v${appVersion}${appCommit?' · '+appCommit.slice(0,7):''}`;
