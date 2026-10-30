import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
const exec = promisify(execFile);
const hash = b => createHash('sha256').update(b).digest('hex');
const root = resolve(new URL('../..', import.meta.url).pathname);
const out = resolve(process.argv[process.argv.indexOf('--output')+1] || '.superpowers/rea-fixtures');
if (!process.argv.includes('--output')) throw Error('provide --output DIRECTORY (outside the agent workspace)');
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
if (!sdk) throw Error('ANDROID_HOME required; install platforms;android-35 and build-tools;35.0.0');
const tools = join(sdk, 'build-tools/35.0.0');
const androidJar = join(sdk, 'platforms/android-35/android.jar');
const toolchain = { buildTools: '35.0.0', platform: 'android-35', java: (await exec('java',['-version'])).stderr.trim(), androidJarSha256: hash(await readFile(androidJar)), aapt2Sha256: hash(await readFile(join(tools,'aapt2'))) };
for (const [id,cls,v,net] of [['a','ProofMarker',1,false],['b','TransferMarker',2,true]]) {
 const source = join(root,'tests/fixtures/rea-android/source',id);
 const dir = join(out,id); await mkdir(join(dir,'classes'),{recursive:true}); await mkdir(join(dir,'dex'),{recursive:true});
 const sources = ['AndroidManifest.xml','MainActivity.java',cls+'.java'];
 const sourceHash = hash(Buffer.concat(await Promise.all(sources.map(p=>readFile(join(source,p))))));
 await exec('javac',['--release','8','-classpath',androidJar,'-d',join(dir,'classes'),...sources.filter(p=>p.endsWith('.java')).map(p=>join(source,p))]);
 const pkg='space.zaeon.rea.fixture'+id;
 const classesDir=join(dir,'classes',...pkg.split('.'));
 await exec(join(tools,'d8'),['--lib',androidJar,'--output',join(dir,'dex'),...(await readdir(classesDir)).map(p=>join(classesDir,p))]);
 const apk=join(dir,'fixture.apk');
 await exec(join(tools,'aapt2'),['link','-I',androidJar,'--manifest',join(source,'AndroidManifest.xml'),'-o',apk]);
 await exec('zip',['-j',apk,join(dir,'dex/classes.dex')]);
 const artifactSha256=hash(await readFile(apk));
 const oracle={fixtureId:id.toUpperCase(),artifactSha256,sourceHash,facts:{packageName:pkg,versionCode:v,activity:pkg+'.MainActivity',className:pkg+'.'+cls,methodSignature:'marker()Ljava/lang/String;',returnedLiteral:'ZAEON_REA_FIXTURE_'+id.toUpperCase(),internetDeclared:net}};
 await writeFile(join(dir,'oracle.json'),JSON.stringify(oracle,null,2));
 await writeFile(join(dir,'fixture.lock.json'),JSON.stringify({fixture:id,artifactSha256,sourceHash,oracleHash:hash(JSON.stringify(oracle)),toolchain},null,2));
 console.log(JSON.stringify({fixture:id,apk,artifactSha256,kind:'fixture_build',targetExecuted:false}));
}

