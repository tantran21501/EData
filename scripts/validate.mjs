import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve("public/data");
const files = (await fs.readdir(root)).filter((file) => file.endsWith(".json"));
if (!files.includes("manifest.json")) throw new Error("manifest.json is missing");

for (const file of files) {
  const value = JSON.parse(await fs.readFile(path.join(root, file), "utf8"));
  if (value.schema_version !== 1) throw new Error(`${file}: unsupported schema_version`);
  if (!value.generated_at) throw new Error(`${file}: generated_at is missing`);
  if (Array.isArray(value.items) && value.count !== value.items.length) {
    throw new Error(`${file}: count does not match items.length`);
  }
}

console.log(`Validated ${files.length} JSON files.`);
