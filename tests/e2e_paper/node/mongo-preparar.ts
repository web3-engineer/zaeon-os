/**
 * tests/e2e_paper/node/mongo-preparar.ts — inicia o replica set do Mongo de TESTE (o Prisma exige replica set) e espera
 * o nó virar PRIMARY. Só fala com a URI que recebe — nunca com o .env do projeto.
 *
 *   npx tsx tests/e2e_paper/node/mongo-preparar.ts <porta>
 */
import { MongoClient } from "mongodb";

async function main() {
  const porta = Number(process.argv[2]);
  const c = new MongoClient(`mongodb://127.0.0.1:${porta}/?directConnection=true`, { serverSelectionTimeoutMS: 20_000 });
  await c.connect();
  const admin = c.db("admin");
  try {
    await admin.command({ replSetInitiate: { _id: "rs0", members: [{ _id: 0, host: `127.0.0.1:${porta}` }] } });
  } catch (e) {
    if (!/already initialized/i.test(String((e as Error).message))) throw e;
  }
  for (let i = 0; i < 120; i++) {
    const s = await admin.command({ replSetGetStatus: 1 }).catch(() => null);
    if (s?.members?.some((m: any) => m.stateStr === "PRIMARY")) { console.log("PRIMARY"); await c.close(); return; }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("replica set não ficou PRIMARY");
}
main().catch((e) => { console.error(e); process.exit(1); });
