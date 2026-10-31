import { it, expect } from "vitest";
import { createReaProjection } from "./rea-projection";
it("uses a stable primary key across retries without exposing projections to generic memory", async () => {
  const rows = new Map<string, any>();
  const collection = {
    updateOne: async (filter: any, update: any) => {
      if (!rows.has(filter._id)) rows.set(filter._id, update.$setOnInsert);
    },
    updateMany: async () => {},
    aggregate: () => ({ toArray: async () => [] }),
  };
  const memory = createReaProjection(collection, async () => [[0.1, 0.2]]);
  const drawer = {
    userId: "owner",
    wing: { kind: "projeto" as const, label: "project" },
    room: "rea-success",
    kind: "artefato" as const,
    text: "Generic verified procedure",
    sourceRef: "rea:lesson:1",
    meta: { reaLessonId: "lesson" },
  };
  await memory.write([drawer]);
  await memory.write([drawer]);
  expect(rows.size).toBe(1);
  await memory.write([{ ...drawer, userId: "other" }]);
  expect(rows.size).toBe(2);
});
