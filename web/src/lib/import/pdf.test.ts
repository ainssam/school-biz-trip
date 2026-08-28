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

  it("출장지 뒤의 서명 머리글이 붙어도 출장지 열을 구분한다", () => {
    const items = applicationItems().map((item) =>
      item.text === "출장지"
        ? { ...item, text: "출장지 서명 또는 날인", width: 120 }
        : item,
    );

    const result = parsePdfPageItems(items, {
      fileName: "joined-header.pdf",
      fileType: "pdf",
      page: 1,
    });

    expect(result.status).not.toBe("unsupported");
    expect(result.values.destination).toBe("가상기관");
  });

  it("글자와 짧은 간격으로 분리 저장된 머리글을 복원한다", () => {
    const body = applicationItems()
      .filter((item) => item.y !== 700)
      .map((item) => {
        if (item.text === "교사") return { ...item, x: 53 };
        if (item.text === "가상교사") return { ...item, x: 120 };
        if (item.text === "합성 연수") return { ...item, x: 196 };
        if (item.text.includes("부터") || item.text.includes("까지")) {
          return { ...item, x: 324 };
        }
        if (item.text === "가상기관") return { ...item, x: 408 };
        return item;
      });
    const splitHeaders: PositionedPdfText[] = [
      { text: "직", x: 53, y: 700, width: 10 },
      { text: " ", x: 63, y: 700, width: 15 },
      { text: "급", x: 78, y: 700, width: 10 },
      { text: " ", x: 88, y: 700, width: 32 },
      { text: "성", x: 120, y: 700, width: 10 },
      { text: " ", x: 130, y: 700, width: 15 },
      { text: "명", x: 145, y: 700, width: 10 },
      { text: " ", x: 155, y: 700, width: 41 },
      { text: "출", x: 196, y: 700, width: 10 },
      { text: " ", x: 206, y: 700, width: 10 },
      { text: "장", x: 216, y: 700, width: 10 },
      { text: " ", x: 226, y: 700, width: 10 },
      { text: "목", x: 236, y: 700, width: 10 },
      { text: " ", x: 246, y: 700, width: 10 },
      { text: "적", x: 256, y: 700, width: 10 },
      { text: " ", x: 266, y: 700, width: 58 },
      { text: "출장기간", x: 324, y: 700, width: 40 },
      { text: " ", x: 364, y: 700, width: 44 },
      { text: "출", x: 408, y: 700, width: 10 },
      { text: " ", x: 418, y: 700, width: 10 },
      { text: "장", x: 428, y: 700, width: 10 },
      { text: " ", x: 438, y: 700, width: 10 },
      { text: "지", x: 448, y: 700, width: 10 },
    ];

    const scale = 1.6;
    const jitteredHeaders = splitHeaders
      .filter((item) => item.text.trim())
      .map((item, index) => ({
        ...item,
        x: item.x * scale,
        width: item.width * scale,
        y: item.y + ((index % 3) - 1) * 0.8,
      }));
    const scaledBody = body.map((item) => ({
      ...item,
      x: item.x * scale,
      width: item.width * scale,
    }));
    const result = parsePdfPageItems([...jitteredHeaders, ...scaledBody], {
      fileName: "split-header.pdf",
      fileType: "pdf",
      page: 1,
    });

    expect(result.status).not.toBe("unsupported");
    expect(result.values.name).toBe("가상교사");
    expect(result.values.destination).toBe("가상기관");
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
