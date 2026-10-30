import {createMongoMemory,EMBED_DIM,type EmbedFn} from "../memory";
import {sha256} from "../../octa/android/evidence";
import type {ReaProjection} from "./rea-success";
/** Use the dedicated `rea_success_drawers` collection. Generic memory tools must
 * not return a proof projection without current identity/project/receipt checks. */
export function createReaProjection(collection:any,embed:EmbedFn):ReaProjection{
 const base=createMongoMemory({embed,drawers:{insertMany:async()=>{throw Error("use_idempotent_projection");},aggregate:async pipeline=>collection.aggregate(pipeline).toArray()}});
 return {...base,
  async write(drawers){
   for(const d of drawers){
    if(!d.userId||!d.sourceRef||!d.meta?.reaLessonId||d.wing.kind!=="projeto")throw Error("invalid_projection");
    const [embedding]=await embed([d.text],EMBED_DIM);
    // Mongo's primary-key uniqueness fences a crash between projection and outbox ack.
    const _id="rea:"+sha256(d.userId+"\0"+d.sourceRef);
    await collection.updateOne({_id},{$setOnInsert:{userId:d.userId,sourceRef:d.sourceRef,wingKind:d.wing.kind,wingLabel:d.wing.label,room:d.room,kind:d.kind,text:d.text,meta:d.meta,embedding,at:d.at??new Date().toISOString(),invalidatedAt:null}},{upsert:true});
   }
  },
  async invalidate(userId,lessonId){await collection.updateMany({userId,"meta.reaLessonId":lessonId},{$set:{invalidatedAt:new Date().toISOString()}});},
 };
}
