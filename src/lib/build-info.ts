import { readFileSync } from "node:fs";
import { join } from "node:path";

export type BuildInfo = {
  /** Short git commit hash, or "dev" when there's no build-info.json (e.g.
   * `npm run dev`/`npm test` outside Docker -- see Dockerfile). */
  commitShort: string;
  branch: string;
  /** ISO 8601 UTC timestamp the Docker image was built, or null when
   * running outside a built image. */
  builtAt: string | null;
};

let cached: BuildInfo | undefined;

/**
 * Reads public/build-info.json, written by the Dockerfile's builder stage
 * at image build time from the git checkout being built -- lets the same
 * image tell you what it actually is (prod and staging are separately
 * built images from possibly different commits). Falls back to "dev"
 * outside a built image (local `npm run dev`, tests) rather than throwing.
 */
export function getBuildInfo(): BuildInfo {
  if (cached) {
    return cached;
  }

  try {
    const raw = readFileSync(join(process.cwd(), "public", "build-info.json"), "utf8");
    const parsed = JSON.parse(raw) as Partial<BuildInfo>;

    cached = {
      branch: parsed.branch ?? "unknown",
      builtAt: parsed.builtAt ?? null,
      commitShort: parsed.commitShort ?? "dev",
    };
  } catch {
    cached = { branch: "local", builtAt: null, commitShort: "dev" };
  }

  return cached;
}
