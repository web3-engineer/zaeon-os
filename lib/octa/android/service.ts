import {canonical,sha256,EvidenceVault} from "./evidence";
import {requireAccess} from "./policy";
import {normalizeEvidence,verifyProof} from "./verifier";
import {ProofStore} from "./store";
import type {Access,AndroidRequest,Oracle} from "./types";
export interface AndroidExecutor{analyze(handle:string,scopeKey:string,request:AndroidRequest,signal?:AbortSignal):Promise<unknown>}
export type SealedOracle={oracle:Oracle;oracleHash:string};
export const scopeKey=(a:Access)=>{requireAccess(a);return sha256(a.userId+"\0"+a.projectId);};
export class ProofService{
 constructor(readonly store:ProofStore,readonly vault:EvidenceVault,private executor:AndroidExecutor,private lookupOracle:(hash:string)=>Promise<SealedOracle|null>=async()=>null){}
 /** begin is also used by the durable queue before dispatching the worker. */
 async analyze(a:Access,artifactId:string,options:{existingRun?:boolean;signal?:AbortSignal}={}){
  requireAccess(a);
  const artifact=await this.store.artifact(a,artifactId);
  if(!options.existingRun)await this.store.begin(a,artifactId);
  const signal=options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(600_000)]):AbortSignal.timeout(600_000);
  const live=async()=>{
   signal.throwIfAborted();const run=await this.store.getRun(a,a.runId);
   if(!run||run.artifactId!==artifactId||run.state!=="running"||run.leaseId!==a.leaseId)throw Error("stale_lease");
  };
  try{
   const call=async(r:AndroidRequest)=>{await live();return this.executor.analyze(artifact.handle,scopeKey(a),r,signal);};
   const pkg=await call({goal:"overview"});
   const search:any=await call({goal:"search",query:"Marker"});
   const matches=search?.normalized_result?.matches;
   if(!Array.isArray(matches)||matches.length!==1||typeof matches[0]!=="string")throw Error("marker_not_unique");
   // Discovery is from the APK; the oracle never selects the class for the worker.
   const method=await call({goal:"method",className:matches[0],methodName:"marker"});
   await live();
   const raw=Buffer.from(JSON.stringify({proofRunId:a.runId,documents:[pkg,search,method]}));
   const ref=await this.vault.save(a,raw);
   await live();await this.store.finish(a,a.runId,{evidence:[ref]});
   const observation=normalizeEvidence(await this.vault.read(a,ref),[ref]);
   if(observation.artifactSha256!==artifact.sha256)throw Error("artifact_mismatch");
   const sealed=await this.lookupOracle(artifact.sha256);
   if(!sealed){await this.store.observe(a,observation);return {observation,receipt:null};}
   const receipt=verifyProof(sealed.oracle,observation,sealed.oracleHash);
   await this.store.recordVerification(a,observation,receipt);
   return {observation,receipt};
  }catch(e){await this.store.fail(a,a.runId);throw e;}
 }
}
/** Integrity is rechecked on every promotion, recall and dataset export. */
export async function readVerified(store:ProofStore,vault:EvidenceVault,a:Access,id:string){
 const run=await store.getRun(a,id);
 if(!run||run.state!=="verified"||!run.observation)throw Error("unverified_run");
 const prior=run.observation as unknown as ReturnType<typeof normalizeEvidence>;
 if(prior.evidence.length!==1)throw Error("invalid_evidence");
 const observation=normalizeEvidence(await vault.read(a,prior.evidence[0]),prior.evidence);
 if(canonical(observation)!==canonical(prior)||observation.artifactSha256!==run.artifactSha256||!observation.complete)throw Error("evidence_integrity");
 const rows=await store.db.reaVerificationReceipt.findMany({where:{proofRunId:id,ownerId:a.userId,projectId:a.projectId,pass:true}});
 if(rows.length!==1)throw Error("missing_receipt");
 const receipt=rows[0].payload as any;
 if(receipt.proofRunId!==id||receipt.inputHash!==sha256(canonical(observation))||!receipt.pass||receipt.checks?.some((c:any)=>!c.pass)||canonical(receipt.evidenceHashes)!==canonical(observation.evidence.map(r=>r.sha256)))throw Error("invalid_receipt");
 return {run,observation,receipt};
}
