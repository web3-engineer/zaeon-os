import { reaBridgeConfigurado, type ReaEnv } from "../rea";
import { androidCommand, APK_MAX_BYTES } from "./policy";
import type { AndroidRequest } from "./types";
/** Internal server client. Handles and master token never enter the model/browser. */
export class AndroidBridge {
  constructor(
    private env: ReaEnv = process.env,
    private fetcher: typeof fetch = fetch,
  ) {}
  private async post(path: string, body: object, signal?: AbortSignal) {
    if (!reaBridgeConfigurado(this.env)) throw Error("engine_unavailable");
    const response = await this.fetcher(
      this.env.REA_BRIDGE_URL!.replace(/\/+$/, "") + path,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: this.env.REA_BRIDGE_TOKEN!, ...body }),
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(12 * 60_000)])
          : AbortSignal.timeout(12 * 60_000),
      },
    );
    const result = await response.json();
    if (!response.ok || !result.ok)
      throw Error(response.status === 429 ? "engine_busy" : "engine_failed");
    return result;
  }
  async upload(bytes: Buffer, scopeKey: string) {
    if (
      !/^[a-f0-9]{64}$/.test(scopeKey) ||
      !bytes.length ||
      bytes.length > APK_MAX_BYTES
    )
      throw Error("invalid_upload");
    const result = await this.post("/upload", {
      scopeKey,
      artifactName: "artifact.apk",
      artifactBase64: bytes.toString("base64"),
    });
    if (!/^[a-f0-9]{32}$/.test(result.handle)) throw Error("invalid_handle");
    return result.handle as string;
  }
  async analyze(
    handle: string,
    scopeKey: string,
    request: AndroidRequest,
    signal?: AbortSignal,
  ): Promise<unknown> {
    if (!/^[a-f0-9]{32}$/.test(handle) || !/^[a-f0-9]{64}$/.test(scopeKey))
      throw Error("invalid_handle");
    androidCommand(request);
    // Pick known fields; never spread arbitrary input into a bridge request.
    const params =
      request.goal === "search"
        ? { query: request.query }
        : request.goal === "overview"
          ? {}
          : {
              className: request.className,
              ...(request.goal === "method"
                ? { methodName: request.methodName }
                : {}),
            };
    const result = await this.post(
      "/android",
      { handle, scopeKey, goal: request.goal, ...params },
      signal,
    );
    if (!result.evidence || typeof result.evidence !== "object")
      throw Error("invalid_evidence");
    return result.evidence;
  }
}
