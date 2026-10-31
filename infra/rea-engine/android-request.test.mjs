import { test } from "node:test";
import assert from "node:assert/strict";
import { androidArgs } from "./android-request.mjs";
const stored = {
  scopeKey: "a".repeat(64),
  createdAt: Date.now(),
  name: "app.apk",
};
test("static Android references are allowed but arbitrary commands, flags and foreign scopes are denied", () => {
  assert.deepEqual(
    androidArgs(
      {
        scopeKey: stored.scopeKey,
        goal: "references",
        className: "example.Marker",
      },
      stored,
    ),
    ["trace-android-references", "example.Marker"],
  );
  assert.throws(() =>
    androidArgs({ scopeKey: "b".repeat(64), goal: "overview" }, stored),
  );
  assert.throws(() =>
    androidArgs(
      {
        scopeKey: stored.scopeKey,
        goal: "overview",
        args: ["--output", "/etc"],
      },
      stored,
    ),
  );
  assert.throws(() =>
    androidArgs(
      {
        scopeKey: stored.scopeKey,
        goal: "method",
        className: "../../etc",
        methodName: "x",
      },
      stored,
    ),
  );
  assert.throws(() =>
    androidArgs(
      { scopeKey: stored.scopeKey, goal: "overview" },
      { ...stored, createdAt: 0 },
    ),
  );
});
