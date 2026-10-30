import type { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import type {Access,Observation,Receipt,Lesson} from "./types";
import { requireAccess,assertArtifactOwner } from "./policy";
import { canonical,sha256 } from "./evidence";
const json=(x:unknown)=>JSON.parse(JSON.stringify(x));
export class ProofStore{
 constructor(readonly db:PrismaClient){}
 private where(a:Access){requireAccess(a);return {ownerId:a.userId,projectId:a.projectId};}
 async createArtifact(a:Access,data:{sha256:string;name:string;bytes:number;handle:string;synthetic:boolean}){
  return this.db.reaArtifact.create({data:{...this.where(a),...data,expiresAt:data.synthetic?null:new Date(Date.now()+7200000)}});
 }
 async artifact(a:Access,id:string){
  const r=await this.db.reaArtifact.findFirst({where:{id,...this.where(a)}});
  if(!r)throw Error("not_found");assertArtifactOwner(a,r);return r;
 }
 async begin(a:Access,artifactId:string){
  const artifact=await this.artifact(a,artifactId);
  return this.db.reaProofRun.create({data:{id:a.runId,...this.where(a),artifactId,artifactSha256:artifact.sha256,leaseId:a.leaseId}});
 }
 async getRun(a:Access,id:string){return this.db.reaProofRun.findFirst({where:{id,...this.where(a)}});}
 async finish(a:Access,id:string,data:unknown){
  const r=await this.db.reaProofRun.updateMany({where:{id,...this.where(a),leaseId:a.leaseId,state:"running"},data:{state:"evidence_ready",evidence:json(data)}});
  if(r.count!==1)throw Error("stale_lease");
 }
 async cancel(a:Access,id:string){
  return this.db.reaProofRun.updateMany({where:{id,...this.where(a),state:"running"},data:{state:"cancelled",leaseId:randomUUID()}});
 }
 async recordVerification(a:Access,observation:Observation,receipt:Receipt){
  if(receipt.proofRunId!==observation.proofRunId||receipt.inputHash!==sha256(canonical(observation))||canonical(receipt.evidenceHashes)!==canonical(observation.evidence.map(r=>r.sha256))||receipt.pass!==receipt.checks.every(c=>c.pass))throw Error("invalid_receipt");
  const run=await this.getRun(a,observation.proofRunId);
  if(!run||run.leaseId!==a.leaseId||run.state!=="evidence_ready"||run.artifactSha256!==observation.artifactSha256)throw Error("stale_lease");
  return this.db.$transaction(async tx=>{
   const cas=await tx.reaProofRun.updateMany({where:{id:run.id,leaseId:a.leaseId,state:"evidence_ready"},data:{state:receipt.pass?"verified":"failed",observation:json(observation)}});
   if(cas.count!==1)throw Error("stale_lease");
   return tx.reaVerificationReceipt.create({data:{id:receipt.id,...this.where(a),proofRunId:run.id,verifierVersion:receipt.verifierVersion,oracleHash:receipt.oracleHash,pass:receipt.pass,payload:json(receipt)}});
  });
 }
 async observe(a:Access,observation:Observation){
  const r=await this.db.reaProofRun.updateMany({where:{id:observation.proofRunId,...this.where(a),leaseId:a.leaseId,state:"evidence_ready"},data:{state:"observed",observation:json(observation)}});
  if(r.count!==1)throw Error("stale_lease");
 }
 async fail(a:Access,id:string){
  return this.db.reaProofRun.updateMany({where:{id,...this.where(a),leaseId:a.leaseId,state:{in:["running","evidence_ready"]}},data:{state:"failed"}});
 }
 async promote(a:Access,ids:string[]):Promise<Lesson>{
  const unique=[...new Set(ids)];if(unique.length<2)throw Error("two_independent_runs_required");
  const runs=await this.db.reaProofRun.findMany({where:{id:{in:unique},...this.where(a),state:"verified"}});
  if(runs.length!==unique.length)throw Error("unverified_runs");
  const receipts=await this.db.reaVerificationReceipt.findMany({where:{proofRunId:{in:unique},...this.where(a),pass:true}});
  if(new Set(receipts.map(r=>r.proofRunId)).size!==unique.length)throw Error("missing_receipts");
  const observations=runs.map(r=>r.observation as unknown as Observation);
  const first=observations[0];const fp=sha256(canonical(first.engine));
  if(runs.some(r=>r.artifactSha256!==runs[0].artifactSha256||r.objective!==runs[0].objective)||observations.some(o=>canonical(o.facts)!==canonical(first.facts)||sha256(canonical(o.engine))!==fp)||new Set(receipts.map(r=>r.verifierVersion)).size!==1||new Set(receipts.map(r=>r.oracleHash)).size!==1)throw Error("incompatible_runs");
  const key={...this.where(a),artifactSha256:runs[0].artifactSha256,objectiveHash:sha256(runs[0].objective),engineFingerprint:fp,verifierVersion:receipts[0].verifierVersion};
  return this.db.$transaction(async tx=>{
   // upsert + unique key makes replay idempotent. Retirement is not undone by another delivery.
   const row=await tx.reaSuccessLesson.upsert({where:{ownerId_projectId_artifactSha256_objectiveHash_engineFingerprint_verifierVersion:key},update:{},create:{...key,payload:json({proofRunIds:unique,receiptIds:receipts.map(r=>r.id),objective:runs[0].objective,procedure:"Inspect package manifest; discover marker class; inspect the selected method; verify source references and artifact hash. Observe permissions anew for every APK.",limitations:["Static analysis only; no execution or APK signature verification.","Verified on this artifact and engine; another APK requires fresh evidence."]})}});
   if(row.state!=="verified_project")throw Error("lesson_retired");
   await tx.reaLearningOutbox.upsert({where:{lessonId_lessonRevision_destination:{lessonId:row.id,lessonRevision:row.revision,destination:"l3"}},update:{},create:{lessonId:row.id,lessonRevision:row.revision,destination:"l3"}});
   return this.lesson(row);
  });
 }
 lesson(row:any):Lesson{return {...row.payload,id:row.id,ownerId:row.ownerId,projectId:row.projectId,artifactSha256:row.artifactSha256,engineFingerprint:row.engineFingerprint,revision:row.revision,state:row.state};}
 async lessons(a:Access){return (await this.db.reaSuccessLesson.findMany({where:{...this.where(a),state:"verified_project"},orderBy:{createdAt:"desc"},take:20})).map(r=>this.lesson(r));}
 async retire(a:Access,id:string){
  return this.db.reaSuccessLesson.updateMany({where:{id,...this.where(a)},data:{state:"retired",revision:{increment:1}}});
 }
}

