"use client";

import { parsePdfBuffer } from "./pdf";
import type { TripImportCandidate } from "./types";
import { parseXlsxBuffer } from "./xlsx";

function unsupportedCandidate(
  file: File,
  index: number,
  issue: string,
): TripImportCandidate {
  return {
    id: `upload-${index + 1}:unsupported`,
    source: {
      fileName: file.name,
      fileType: "unsupported",
    },
    status: "unsupported",
    values: {},
    recognizedFields: [],
    issues: [issue],
    included: false,
  };
}

export async function readTripFiles(
  files: File[],
): Promise<TripImportCandidate[]> {
  const results: TripImportCandidate[] = [];
  for (const [index, file] of files.entries()) {
    const extension = file.name.split(".").at(-1)?.toLowerCase();
    if (extension !== "xlsx" && extension !== "pdf") {
      results.push(
        unsupportedCandidate(
          file,
          index,
          "지원하는 파일 형식은 XLSX와 PDF입니다.",
        ),
      );
      continue;
    }

    try {
      const data = await file.arrayBuffer();
      const candidates =
        extension === "xlsx"
          ? await parseXlsxBuffer(data, file.name)
          : await parsePdfBuffer(data, file.name);
      results.push(
        ...candidates.map((candidate) => ({
          ...candidate,
          id: `upload-${index + 1}:${candidate.id}`,
        })),
      );
    } catch {
      results.push(
        unsupportedCandidate(file, index, "파일 내용을 읽을 수 없습니다."),
      );
    }
  }
  return results;
}
