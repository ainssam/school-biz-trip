import { describe, expect, it } from "vitest";
import path from "node:path";

describe("학교별 템플릿 레지스트리", () => {
  it("템플릿 ID로 학교·지역·연도와 파일 구성을 찾는다", async () => {
    const modulePath = "./template-registry";
    const registryModule = await import(/* @vite-ignore */ modulePath).catch(
      () => null,
    );

    expect(registryModule?.getTemplateById("bokja-2026")).toMatchObject({
      id: "bokja-2026",
      label: "복자여자고등학교 2026",
      region: "충청남도",
      school: "복자여자고등학교",
      year: 2026,
    });
  });

  it("등록되지 않은 템플릿 ID는 거부한다", async () => {
    const modulePath = "./template-registry";
    const registryModule = await import(/* @vite-ignore */ modulePath).catch(
      () => null,
    );

    expect(() => registryModule?.getTemplateById("unknown-template")).toThrow(
      "등록되지 않은 템플릿",
    );
  });

  it("선택한 템플릿의 HWP·PDF와 필드맵 경로를 함께 불러온다", async () => {
    const modulePath = "./template-assets";
    const assetModule = await import(/* @vite-ignore */ modulePath).catch(
      () => null,
    );
    const assets = await assetModule?.loadTemplateAssets("bokja-2026");

    expect(path.basename(assets?.hwpPath ?? "")).toBe(
      "travel-expense-template.hwp",
    );
    expect(path.basename(assets?.pdfPath ?? "")).toBe(
      "travel-expense-template.pdf",
    );
    expect(assets?.hwpFieldMap.table).toEqual({
      section: 0,
      paragraph: 3,
      control: 0,
    });
    expect(assets?.pdfFieldMap.school).toMatchObject({
      x: 103,
      y: 658,
      align: "center",
    });
  });
});
