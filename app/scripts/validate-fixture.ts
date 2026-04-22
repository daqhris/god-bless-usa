import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DirectorOutputSchema } from "../src/director/schema.js";

const path = process.argv[2] ?? "scenes/fixtures/01-eyewitness.example.json";
const raw = await readFile(resolve(path), "utf8");
const parsed = DirectorOutputSchema.safeParse(JSON.parse(raw));
if (parsed.success) {
  process.stdout.write(
    `OK — ${parsed.data.scene_id}: ${parsed.data.segments.length} segments validate against the director schema.\n`,
  );
} else {
  process.stderr.write(
    `INVALID:\n${parsed.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n")}\n`,
  );
  process.exit(1);
}
