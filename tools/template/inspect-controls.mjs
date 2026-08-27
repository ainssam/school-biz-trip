import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

const [filePath, scriptsPath] = process.argv.slice(2);
const rhwp = await import(
  pathToFileURL(path.join(scriptsPath, "vendor/rhwp/rhwp.js")).href
);
await rhwp.default({
  module_or_path: readFileSync(path.join(scriptsPath, "vendor/rhwp/rhwp_bg.wasm")),
});

globalThis.measureTextWidth ??= (_font, text) => text.length * 5.5;
const document = new rhwp.HwpDocument(new Uint8Array(readFileSync(filePath)));
try {
  const controls = [];
  for (let section = 0; section < document.getSectionCount(); section += 1) {
    for (let paragraph = 0; paragraph < document.getParagraphCount(section); paragraph += 1) {
      let textBox = -1;
      try {
        textBox = document.getTextBoxControlIndex(section, paragraph);
      } catch {}
      controls.push({ section, paragraph, textBox });
    }
  }
  process.stdout.write(JSON.stringify(controls));
} finally {
  document.free();
}
