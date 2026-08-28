import { describe, expect, it } from "vitest";
import {
  parsePdfPageItems,
  parsePositionedPdfPages,
  type PositionedPdfText,
} from "./pdf";

function applicationItems(overrides: PositionedPdfText[] = []): PositionedPdfText[] {
  return [
    { text: "2026.08.26", x: 520, y: 780, width: 70 },
    { text: "직급", x: 60, y: 700, width: 30 },
    { text: "성명", x: 150, y: 700, width: 30 },
    { text: "출장목적", x: 250, y: 700, width: 60 },
    { text: "출장기간", x: 390, y: 700, width: 60 },
    { text: "출장지", x: 520, y: 700, width: 45 },
    { text: "교사", x: 65, y: 660, width: 25 },
    { text: "가상교사", x: 150, y: 660, width: 45 },
    { text: "합성 연수", x: 245, y: 660, width: 70 },
    { text: "2026.08.27부터", x: 390, y: 670, width: 90 },
    { text: "2026.08.28까지", x: 390, y: 650, width: 90 },
    { text: "가상기관", x: 520, y: 660, width: 55 },
    ...overrides,
  ];
}

describe("PDF 출장 신청서 인식", () => {
  it("머리글 아래의 값을 열별 출장 필드로 연결한다", () => {
    const result = parsePdfPageItems(applicationItems(), {
      fileName: "synthetic.pdf",
      fileType: "pdf",
      page: 1,
    });

    expect(result.values).toMatchObject({
      position: "교사",
      name: "가상교사",
      applicationDate: "2026-08-26",
      purpose: "합성 연수",
      tripStart: "2026-08-27",
      tripEnd: "2026-08-28",
      destination: "가상기관",
    });
  });

  it("출장기간에 날짜가 하나면 하루 출장으로 연결한다", () => {
    const items = applicationItems().filter(
      (item) => !item.text.includes("2026.08.28"),
    );

    const result = parsePdfPageItems(items, {
      fileName: "single-day.pdf",
      fileType: "pdf",
      page: 1,
    });

    expect(result.values.tripStart).toBe("2026-08-27");
    expect(result.values.tripEnd).toBe("2026-08-27");
  });

  it("여러 페이지를 페이지 순서대로 독립 후보로 유지한다", () => {
    const pages = Array.from({ length: 4 }, (_, index) =>
      applicationItems([
        { text: `페이지${index + 1}`, x: 250, y: 640, width: 50 },
      ]),
    );

    const result = parsePositionedPdfPages(pages, "four-pages.pdf");

    expect(result).toHaveLength(4);
    expect(result.map((item) => item.source.page)).toEqual([1, 2, 3, 4]);
  });

  it("텍스트가 없는 페이지를 지원하지 않는 내용으로 표시한다", () => {
    const [result] = parsePositionedPdfPages([[]], "scan.pdf");

    expect(result.status).toBe("unsupported");
    expect(result.included).toBe(false);
    expect(result.issues).toContain("텍스트를 읽을 수 없는 PDF 페이지");
  });

  it("출장기간 날짜가 세 개면 임의 범위를 고르지 않는다", () => {
    const result = parsePdfPageItems(
      applicationItems([
        { text: "2026.08.29", x: 390, y: 630, width: 70 },
      ]),
      { fileName: "ambiguous.pdf", fileType: "pdf", page: 1 },
    );

    expect(result.values.tripStart).toBeUndefined();
    expect(result.values.tripEnd).toBeUndefined();
    expect(result.issues).toContain("출장기간 직접 입력 필요");
  });
});
