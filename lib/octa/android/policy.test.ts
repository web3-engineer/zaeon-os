import { it, expect } from "vitest";
import { androidCommand, requireAccess, assertArtifactOwner } from "./policy";
const access = {
  userId: "u",
  projectId: "p",
  runId: "r",
  leaseId: "l",
  identityVerified: true,
};
it("builds typed static references without exposing arbitrary flags", () => {
  expect(
    androidCommand({ goal: "references", className: "example.Marker" }),
  ).toEqual(["trace-android-references", "example.Marker"]);
  expect(() =>
    androidCommand({
      goal: "method",
      className: "../../secret",
      methodName: "marker",
    }),
  ).toThrow();
  expect(() => androidCommand({ goal: "capture" as any })).toThrow();
});
it("denies unverified identities and other projects regardless of artifact identifier", () => {
  expect(() => requireAccess({ ...access, identityVerified: false })).toThrow();
  expect(() =>
    assertArtifactOwner(access, {
      ownerId: "u",
      projectId: "other",
      expiresAt: null,
    }),
  ).toThrow();
  expect(() =>
    assertArtifactOwner(access, {
      ownerId: "u",
      projectId: "p",
      expiresAt: new Date(0),
    }),
  ).toThrow(/expired/);
});
