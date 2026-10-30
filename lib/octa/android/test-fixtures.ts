import type { Oracle } from "./types";
export const jar =
  "6e5eacf500b64292bfb73c49797c1958f6ee44646e43e868039ae7feb573ff75";
export const oracle: Oracle = {
  fixtureId: "A",
  artifactSha256: "a".repeat(64),
  sourceHash: "b".repeat(64),
  facts: {
    packageName: "space.zaeon.rea.fixturea",
    versionCode: 1,
    activity: "space.zaeon.rea.fixturea.MainActivity",
    className: "space.zaeon.rea.fixturea.ProofMarker",
    methodSignature: "marker()Ljava/lang/String;",
    returnedLiteral: "ZAEON_REA_FIXTURE_A",
    internetDeclared: false,
  },
};
export function documents() {
  const engine = {
    name: "jadx-headless-mcp",
    version: "0.7.1",
    artifact_sha256: jar,
  };
  const base = {
    subject: { digest: { sha256: oracle.artifactSha256 } },
    provider: { id: "jadx", version: "0.7.1" },
  };
  return JSON.parse(
    JSON.stringify([
      {
        ...base,
        operation: "inspect_android_package",
        normalized_result: {
          engine,
          package_name: oracle.facts.packageName,
          version_code: "1",
          permissions: [],
          manifest: {
            status: "complete",
            text: `<manifest package="${oracle.facts.packageName}" android:versionCode="1"><application><activity android:name="${oracle.facts.activity}" /></application></manifest>`,
          },
        },
      },
      {
        ...base,
        operation: "search_android_classes",
        normalized_result: {
          engine,
          coverage: "complete",
          matches: [oracle.facts.className],
          duplicate_names: [],
        },
      },
      {
        ...base,
        operation: "inspect_android_method",
        normalized_result: {
          engine,
          class_name: oracle.facts.className,
          method: {
            name: "marker",
            dex_descriptor: "()Ljava/lang/String;",
            overload_index: 0,
          },
          overload_count: 1,
          body_status: "available",
          representation: "java",
          fell_back: false,
          source: {
            status: "complete",
            text: 'public final class ProofMarker { public static String marker() { return "ZAEON_REA_FIXTURE_A"; } }',
          },
        },
      },
    ]),
  ) as any[];
}
