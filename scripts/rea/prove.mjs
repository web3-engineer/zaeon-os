import {spawnSync} from 'node:child_process';
const result=spawnSync(process.execPath,['--import','tsx',new URL('./prove-runner.ts',import.meta.url).pathname,...process.argv.slice(2)],{stdio:'inherit'});
process.exitCode=result.status??1;
