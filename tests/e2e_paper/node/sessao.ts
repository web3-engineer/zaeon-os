/**
 * tests/e2e_paper/node/sessao.ts — cria (ou acha) um aluno no Mongo de TESTE e imprime um cookie de sessão NextAuth
 * válido (JWT assinado com o NEXTAUTH_SECRET de teste). É exatamente o que o navegador manda depois do login por código.
 *
 *   MONGODB_URI=… NEXTAUTH_SECRET=… npx tsx tests/e2e_paper/node/sessao.ts <email>
 *   → {"userId":"…","email":"…","cookie":"next-auth.session-token=…"}
 */
import { MongoClient } from "mongodb";
import { encode } from "next-auth/jwt";

async function main() {
  const email = String(process.argv[2] ?? "").toLowerCase();
  const uri = process.env.MONGODB_URI!, secret = process.env.NEXTAUTH_SECRET!;
  if (!email || !uri || !secret) throw new Error("uso: MONGODB_URI=… NEXTAUTH_SECRET=… sessao.ts <email>");
  if (!/127\.0\.0\.1|localhost/.test(uri)) throw new Error("sessao.ts só roda contra Mongo LOCAL");
  const c = new MongoClient(uri);
  await c.connect();
  const users = c.db().collection("users");
  let u = await users.findOne({ email });
  if (!u) {
    const agora = new Date();
    const { insertedId } = await users.insertOne({
      name: email.split("@")[0], email, emailVerified: null, image: null, role: "student", kycStatus: "pending",
      academicLevel: "Graduação", institution: "Teste E2E", plan: "max", createdAt: agora, updatedAt: agora,
    } as any);
    u = await users.findOne({ _id: insertedId });
  }
  const id = u!._id.toString();
  const token = await encode({ token: { sub: id, id, email, name: u!.name, role: "student" }, secret, maxAge: 6 * 3600 });
  console.log(JSON.stringify({ userId: id, email, cookie: `next-auth.session-token=${token}` }));
  await c.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
