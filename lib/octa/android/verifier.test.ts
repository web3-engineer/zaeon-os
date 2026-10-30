import {it,expect} from "vitest";
import {normalizeEvidence,verifyProof} from "./verifier";
import {canonical,sha256} from "./evidence";
import type {Oracle,EvidenceRef} from "./types";
import {documents,oracle} from "./test-fixtures";
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
