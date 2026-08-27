import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

const [filePath, scriptsPath, section, paragraph, control, cell] = process.argv.slice(2);
if (!filePath || !scriptsPath) {
  throw new Error("filePath와 claw-hwp scriptsPath가 필요합니다.");
}

const rhwp = await import(
  pathToFileURL(path.join(scriptsPath, "vendor/rhwp/rhwp.js")).href
);
await rhwp.default({
  module_or_path: readFileSync(path.join(scriptsPath, "vendor/rhwp/rhwp_bg.wasm")),
});

globalThis.measureTextWidth ??= (font, text) =>
  text.length * (Number.parseFloat(font) || 10) * 0.55;

const document = new rhwp.HwpDocument(new Uint8Array(readFileSync(filePath)));
try {
  const sec = Number(section);
  const para = Number(paragraph);
  const ctrl = Number(control);
  const cellIndex = Number(cell);
  const count = document.getCellParagraphCount(sec, para, ctrl, cellIndex);
  const paragraphs = [];
  for (let index = 0; index < count; index += 1) {
    let text = "";
    try {
      text = document.getTextInCell(sec, para, ctrl, cellIndex, index, 0, 100000);
    } catch {}
    paragraphs.push({ index, characters: text.length });
  }
  process.stdout.write(JSON.stringify({ count, paragraphs }));
} finally {
  document.free();
}
