import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const root = path.resolve(import.meta.dirname, "..");
const source = path.resolve(root, "../reference/ion-dist/assets/v1");
const target = path.join(root, "public/assets/composer");
const files = ["c838f53ee-DqwARLA7.json", "cf27cae7f-IGfSpeOJ.js"];
await fs.mkdir(target, { recursive: true });
const records = [];
for (const name of files) {
  const bytes = await fs.readFile(path.join(source, name));
  await fs.writeFile(path.join(target, name), bytes);
  records.push({
    name,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
await fs.writeFile(
  path.join(target, "provenance.json"),
  JSON.stringify(
    {
      source: "Local Claude Desktop 2.110.1 installation",
      purpose: "Private local UI study; original assets retain their ownership",
      modification:
        "None; original ClawdLaptop animation and independent Lottie SVG player",
      files: records,
    },
    null,
    2,
  ) + "\n",
);
console.log(`Prepared ${records.length} original composer animation assets`);
