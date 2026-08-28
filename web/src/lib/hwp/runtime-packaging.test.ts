import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const rhwpPackagePath = path.join(
  process.cwd(),
  "vendor/claw-hwp/vendor/rhwp/package.json",
);

describe("Vercel HWP 런타임 패키징", () => {
  it("vendored rhwp 파일을 ES 모듈로 해석하도록 표시한다", () => {
    const packageJson = JSON.parse(readFileSync(rhwpPackagePath, "utf8")) as {
      type?: string;
    };

    expect(packageJson.type).toBe("module");
  });
});
