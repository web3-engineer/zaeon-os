import {randomUUID} from "node:crypto";
import {canonical,sha256} from "./evidence";
import type {EvidenceRef,Facts,Observation,Oracle,Receipt} from "./types";
export const VERIFIER_VERSION="android-marker-v1.0.0";
export const PINNED_ENGINE={rea:"6.5.0",jadx:"0.7.1",jarSha256:"6e5eacf500b64292bfb73c49797c1958f6ee44646e43e868039ae7feb573ff75"};
const factKeys:ReadonlyArray<keyof Facts>=["packageName","versionCode","activity","className","methodSignature","returnedLiteral","internetDeclared"];
const fqcn=/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)+$/;
/** A deliberately narrow, fail-closed normalizer for this static fixture objective.
 * It does not interpret arbitrary Java, recover missing fields or repair provider output.
 * Raw bytes must be reread from the vault before calling this function. */
export function normalizeEvidence(raw:Uint8Array,refs:EvidenceRef[]):Observation{
 if(refs.length!==1||refs[0].sha256!==sha256(raw)||refs[0].bytes!==raw.length)throw Error("evidence_integrity");
 const bundle=JSON.parse(Buffer.from(raw).toString("utf8"));
 if(typeof bundle.proofRunId!=="string"||!Array.isArray(bundle.documents))throw Error("invalid_bundle");
 const docs=bundle.documents;
 const find=(op:string)=>{const matches=docs.filter((d:any)=>d?.operation===op);return matches.length===1?matches[0]?.normalized_result:null;};
 const pkg=find("inspect_android_package"),search=find("search_android_classes"),method=find("inspect_android_method");
 const artifactSha256=docs[0]?.subject?.digest?.sha256??"";
 const facts:Partial<Facts>={},factSources:Observation["factSources"]={};
 let complete=refs.every(r=>r.coverage==="complete")&&docs.length===3&&/^[a-f0-9]{64}$/.test(artifactSha256)&&!!pkg&&!!search&&!!method;
 for(const d of docs){
  const engine=d?.normalized_result?.engine;
  if(d?.subject?.digest?.sha256!==artifactSha256||d?.provider?.id!=="jadx"||d?.provider?.version!==PINNED_ENGINE.jadx||engine?.name!=="jadx-headless-mcp"||engine?.version!==PINNED_ENGINE.jadx||engine?.artifact_sha256!==PINNED_ENGINE.jarSha256)complete=false;
 }
 const manifest=pkg?.manifest?.text;
 if(pkg?.manifest?.status==="complete"&&typeof manifest==="string"&&!/<!DOCTYPE|<!ENTITY/i.test(manifest)){
  const root=manifest.match(/<manifest\b[^>]*>/g);
  const attr=(text:string,name:string)=>text.match(new RegExp('(?:^|\\s)'+name+'="([^"<>]*)"'))?.[1];
  const packageName=root?.length===1?attr(root[0],"package"):undefined;
  const version=root?.length===1?attr(root[0],"android:versionCode"):undefined;
  const permissions=[...manifest.matchAll(/<uses-permission\b[^>]*>/g)].map(m=>attr(m[0],"android:name"));
  const activities=[...manifest.matchAll(/<activity\b[^>]*>/g)].map(m=>attr(m[0],"android:name"));
  const activity=activities.length===1?activities[0]:undefined;
  if(packageName&&fqcn.test(packageName)&&packageName===pkg.package_name&&version&&/^\d+$/.test(version)&&Number.isSafeInteger(Number(version))&&String(pkg.version_code)===version&&activity&&fqcn.test(activity)&&Array.isArray(pkg.permissions)&&permissions.every(Boolean)&&canonical([...permissions].sort())===canonical([...pkg.permissions].sort())){
   Object.assign(facts,{packageName,versionCode:Number(version),activity,internetDeclared:permissions.includes("android.permission.INTERNET")});
  }else complete=false;
 }else complete=false;
 if(search?.coverage!=="complete"||search?.duplicate_names?.length!==0||!Array.isArray(search?.matches)||search.matches.length!==1||!fqcn.test(search.matches[0]))complete=false;
 if(method?.class_name===search?.matches?.[0]&&method?.overload_count===1&&method?.method?.name==="marker"&&method?.method?.dex_descriptor==="()Ljava/lang/String;"&&method?.body_status==="available"&&method?.representation==="java"&&method?.fell_back===false&&method?.source?.status==="complete"&&typeof method?.source?.text==="string"){
  const source=method.source.text;
  const simple=method.class_name.split(".").pop();
  const classDeclaration=new RegExp('\\bclass\\s+'+simple+'\\s*\\{');
  // Exactly one selected zero-argument method with a direct literal return. Any
  // other expression, overload, missing body or different method remains unknown.
  const bodies=[...source.matchAll(/\bpublic\s+static\s+(?:java\.lang\.)?String\s+marker\s*\(\s*\)\s*\{([^{}]*)\}/g)];
  const literal=bodies.length===1?bodies[0][1].trim().match(/^return\s+"([A-Za-z0-9_]+)"\s*;$/)?.[1]:undefined;
  if(classDeclaration.test(source)&&literal)Object.assign(facts,{className:method.class_name,methodSignature:"marker()Ljava/lang/String;",returnedLiteral:literal});else complete=false;
 }else complete=false;
 for(const key of factKeys)if(facts[key]!==undefined)factSources[key]=[refs[0].id];else complete=false;
 return {proofRunId:bundle.proofRunId,artifactSha256,engine:{...PINNED_ENGINE},evidence:refs,facts,factSources,complete};
}
/** expectedOracleHash is read from the independently sealed fixture lock, never
 * from a request, the model or the provider. A verifier receipt is server-owned. */
export function verifyProof(oracle:Oracle,actual:Observation,expectedOracleHash:string):Receipt{
 const oracleHash=sha256(JSON.stringify(oracle));
 const check=(id:string,pass:boolean)=>({id,pass,detail:pass?"matched":"not established"});
 const checks=[
  check("oracle_seal",/^[a-f0-9]{64}$/.test(expectedOracleHash)&&oracleHash===expectedOracleHash),
  check("artifact",actual.artifactSha256===oracle.artifactSha256),
  check("engine",canonical(actual.engine)===canonical(PINNED_ENGINE)),
  check("coverage",actual.complete&&actual.evidence.length>0&&actual.evidence.every(r=>r.coverage==="complete")),
  ...factKeys.map(key=>check(key,actual.facts[key]===oracle.facts[key]&&!!actual.factSources[key]?.length&&actual.factSources[key]!.every(id=>actual.evidence.some(r=>r.id===id)))),
 ];
 return {id:randomUUID(),proofRunId:actual.proofRunId,inputHash:sha256(canonical(actual)),oracleHash,evidenceHashes:actual.evidence.map(r=>r.sha256),verifierVersion:VERIFIER_VERSION,checks,pass:checks.every(c=>c.pass),createdAt:new Date().toISOString()};
}
