import {it,expect} from "vitest";
import {normalizeEvidence,verifyProof} from "./verifier";
import {canonical,sha256} from "./evidence";
import type {Oracle,EvidenceRef} from "./types";
export const jar="6e5eacf500b64292bfb73c49797c1958f6ee44646e43e868039ae7feb573ff75";
export const oracle:Oracle={fixtureId:"A",artifactSha256:"a".repeat(64),sourceHash:"b".repeat(64),facts:{packageName:"space.zaeon.rea.fixturea",versionCode:1,activity:"space.zaeon.rea.fixturea.MainActivity",className:"space.zaeon.rea.fixturea.ProofMarker",methodSignature:"marker()Ljava/lang/String;",returnedLiteral:"ZAEON_REA_FIXTURE_A",internetDeclared:false}};
export function documents(){
 const engine={name:"jadx-headless-mcp",version:"0.7.1",artifact_sha256:jar};
 const base={subject:{digest:{sha256:oracle.artifactSha256}},provider:{id:"jadx",version:"0.7.1"}};
 return JSON.parse(JSON.stringify([
  {...base,operation:"inspect_android_package",normalized_result:{engine,package_name:oracle.facts.packageName,version_code:"1",permissions:[],manifest:{status:"complete",text:`<manifest package="${oracle.facts.packageName}" android:versionCode="1"><application><activity android:name="${oracle.facts.activity}" /></application></manifest>`}}},
  {...base,operation:"search_android_classes",normalized_result:{engine,coverage:"complete",matches:[oracle.facts.className],duplicate_names:[]}},
  {...base,operation:"inspect_android_method",normalized_result:{engine,class_name:oracle.facts.className,method:{name:"marker",dex_descriptor:"()Ljava/lang/String;",overload_index:0},overload_count:1,body_status:"available",representation:"java",fell_back:false,source:{status:"complete",text:'public final class ProofMarker { public static String marker() { return "ZAEON_REA_FIXTURE_A"; } }'}}},
 ])) as any[];
}
export function normalize(docs:unknown[]=documents()){
 const raw=Buffer.from(JSON.stringify({proofRunId:"run",documents:docs}));
 const ref:EvidenceRef={id:"blob",sha256:sha256(raw),bytes:raw.length,locator:"private",coverage:"complete"};
 return normalizeEvidence(raw,[ref]);
}
const seal=sha256(JSON.stringify(oracle));
it("verifies a fully sourced matching observation",()=>expect(verifyProof(oracle,normalize(),seal).pass).toBe(true));
it("fails swapped artifact hashes, incomplete coverage, missing sources and altered oracles",()=>{
 const obs=normalize();
 expect(verifyProof(oracle,{...obs,artifactSha256:"c".repeat(64)},seal).pass).toBe(false);
 expect(verifyProof(oracle,{...obs,complete:false},seal).pass).toBe(false);
 expect(verifyProof(oracle,{...obs,factSources:{}},seal).pass).toBe(false);
 expect(verifyProof({...oracle,sourceHash:"c".repeat(64)},obs,seal).pass).toBe(false);
 expect(verifyProof(oracle,{...obs,facts:{...obs.facts,internetDeclared:true}},seal).pass).toBe(false);
});
it("never infers a literal from another method or an incomplete manifest",()=>{
 const docs=documents();
 docs[2].normalized_result.source!.text='public class ProofMarker { public static String other() { return "ZAEON_REA_FIXTURE_A"; } public static String marker() { return unknown(); } }';
 expect(verifyProof(oracle,normalize(docs),seal).pass).toBe(false);
 docs[0].normalized_result.manifest!.status="partial";
 expect(verifyProof(oracle,normalize(docs),seal).pass).toBe(false);
});
it("rejects a truncated blob, engine drift, mixed artifacts and false INTERNET metadata",()=>{
 expect(()=>normalizeEvidence(Buffer.from("{}"),[{id:"x",sha256:"a",bytes:2,locator:"x",coverage:"complete"}])).toThrow();
 const docs=documents();docs[1].subject.digest.sha256="d".repeat(64);
 expect(normalize(docs).complete).toBe(false);
 const drift=documents();drift[2].normalized_result.engine.artifact_sha256="c".repeat(64);
 expect(normalize(drift).complete).toBe(false);
 const net=documents();net[0].normalized_result.manifest!.text=net[0].normalized_result.manifest!.text.replace("<application>",'<uses-permission android:name="android.permission.INTERNET"/><application>');
 expect(normalize(net).complete).toBe(false);
 expect(canonical(normalize().facts)).toBe(canonical(oracle.facts));
});
