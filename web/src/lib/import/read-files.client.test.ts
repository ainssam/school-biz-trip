import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TripImportCandidate } from "./types";

const xlsxCandidate: TripImportCandidate = {
  id: "xlsx-source",
  source: { fileName: "first.xlsx", fileType: "xlsx", sheetName: "신청서" },
  status: "recognized",
  values: { name: "가상교사A" },
  recognizedFields: ["name"],
  issues: [],
  included: true,
};
const pdfCandidate: TripImportCandidate = {
  id: "pdf-source",
  source: { fileName: "second.pdf", fileType: "pdf", page: 1 },
  status: "recognized",
  values: { name: "가상교사B" },
  recognizedFields: ["name"],
  issues: [],
  included: true,
};

vi.mock("./xlsx", () => ({
  parseXlsxBuffer: vi.fn(async () => [xlsxCandidate]),
}));
vi.mock("./pdf", () => ({
  parsePdfBuffer: vi.fn(async () => [pdfCandidate]),
}));

describe("출장 신청서 파일 라우팅", () => {
  beforeEach(() => vi.clearAllMocks());

  it("XLSX와 PDF 결과를 사용자가 고른 파일 순서로 합친다", async () => {
    const { readTripFiles } = await import("./read-files.client");
    const result = await readTripFiles([
      new File(["xlsx"], "first.xlsx"),
      new File(["pdf"], "second.PDF"),
    ]);

    expect(result.map((item) => item.values.name)).toEqual([
      "가상교사A",
      "가상교사B",
    ]);
    expect(result.map((item) => item.id)).toEqual([
      "upload-1:xlsx-source",
      "upload-2:pdf-source",
    ]);
  });

  it("지원하지 않는 파일이 있어도 다음 유효 파일 분석을 계속한다", async () => {
    const { readTripFiles } = await import("./read-files.client");
    const result = await readTripFiles([
      new File(["text"], "notes.txt"),
      new File(["xlsx"], "first.xlsx"),
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      status: "unsupported",
      included: false,
      issues: ["지원하는 파일 형식은 XLSX와 PDF입니다."],
    });
    expect(result[1].values.name).toBe("가상교사A");
  });

  it("손상된 한 파일이 다른 파일의 인식 결과를 없애지 않는다", async () => {
    const { parsePdfBuffer } = await import("./pdf");
    vi.mocked(parsePdfBuffer).mockRejectedValueOnce(new Error("broken"));
    const { readTripFiles } = await import("./read-files.client");

    const result = await readTripFiles([
      new File(["bad"], "broken.pdf"),
      new File(["xlsx"], "first.xlsx"),
    ]);

    expect(result[0].status).toBe("unsupported");
    expect(result[0].issues).toEqual(["파일 내용을 읽을 수 없습니다."]);
    expect(result[1].values.name).toBe("가상교사A");
  });
});
