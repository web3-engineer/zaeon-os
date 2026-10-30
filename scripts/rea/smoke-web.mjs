// Real web/queue/engine/storage smoke with a MOCK signed local identity. This is
// not an OAuth login test and refuses non-loopback or non-test databases.
import { MongoClient, ObjectId } from "mongodb";
import { encode } from "next-auth/jwt";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
const url = process.env.REA_TEST_DATABASE_URL;
if (
  process.env.REA_WEB_SMOKE !== "1" ||
  !url?.startsWith("mongodb://127.0.0.1:") ||
  !new URL(url).pathname.startsWith("/rea_test")
)
  throw Error("explicit_isolated_local_smoke_required");
const base = "http://localhost:51835",
  secret = "local-synthetic-proof-smoke";
const output = resolve(".superpowers/web-smoke");
await mkdir(output, { recursive: true, mode: 0o700 });
const db = new MongoClient(url);
await db.connect();
try {
  const userId = new ObjectId(),
    projectId = new ObjectId(),
    email = `rea-smoke-${userId}@example.invalid`;
  await db
    .db()
    .collection("users")
    .insertOne({
      _id: userId,
      email,
      name: "REA synthetic pilot",
      role: "student",
      emailVerified: new Date(),
      onboardingComplete: true,
    });
  await db
    .db()
    .collection("octa_projetos")
    .insertOne({
      _id: projectId,
      userId: String(userId),
      nome: "Prova APK sintética",
      slug: "rea-smoke",
      arquivos: { "README.md": "Synthetic REA integration test." },
      permissao: "auto",
      avisoPublicoAceito: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  const token = await encode({
    secret,
    token: { id: String(userId), email, reaIdentity: "google_verified" },
    maxAge: 3600,
  });
  await writeFile(
    join(output, "browser-state.json"),
    JSON.stringify({
      cookies: [
        {
          name: "next-auth.session-token",
          value: token,
          domain: "localhost",
          path: "/",
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [],
    }),
    { mode: 0o600 },
  );
  const cookie = `next-auth.session-token=${token}`;
  const request = async (path, options = {}) => {
    const response = await fetch(base + path, {
      ...options,
      headers: { cookie, ...options.headers },
      signal: AbortSignal.timeout(180_000),
    });
    const body = await response.json();
    if (!response.ok) throw Error(`HTTP ${response.status}: ${body.error}`);
    return body;
  };
  const apk = await readFile(
    resolve(".superpowers/rea-fixtures/a/fixture.apk"),
  );
  const proofIds = [];
  for (let i = 0; i < 2; i++) {
    const artifact = await request(
      `/api/octa/rea/proofs/artifacts?projectId=${projectId}`,
      {
        method: "POST",
        body: apk,
        headers: { "content-type": "application/octet-stream" },
      },
    );
    const started = await request("/api/octa/rea/proofs", {
      method: "POST",
      body: JSON.stringify({
        projectId: String(projectId),
        artifactId: artifact.artifactId,
        objective: "android-marker-v1",
      }),
      headers: { "content-type": "application/json" },
    });
    let result;
    const deadline = Date.now() + 180_000;
    while (Date.now() < deadline) {
      result = await request(
        `/api/octa/rea/proofs/${started.id}?projectId=${projectId}`,
      );
      if (!["running", "queued"].includes(result.state)) break;
      await new Promise((ok) => setTimeout(ok, 1000));
    }
    if (!result?.verified) throw Error("web_proof_not_verified");
    proofIds.push(started.id);
  }
  const lesson = await request("/api/octa/rea/proofs/memory", {
    method: "POST",
    body: JSON.stringify({
      projectId: String(projectId),
      proofRunIds: proofIds,
    }),
    headers: { "content-type": "application/json" },
  });
  const recalled = await request(
    `/api/octa/rea/proofs/memory?projectId=${projectId}`,
  );
  const report = {
    kind: "real_web_queue_engine_smoke",
    identity: "mock_signed_local_identity",
    userId: String(userId),
    projectId: String(projectId),
    proofIds,
    lessonId: lesson.lessonId,
    recalled: recalled.lessons.length,
    targetExecuted: false,
  };
  await writeFile(
    join(output, "report.json"),
    JSON.stringify(report, null, 2),
    { mode: 0o600 },
  );
  console.log(JSON.stringify(report));
} finally {
  await db.close();
}
