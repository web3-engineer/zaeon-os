import { runTextGeneration } from "@/lib/studio/text-pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  return runTextGeneration("timeline", req);
}
