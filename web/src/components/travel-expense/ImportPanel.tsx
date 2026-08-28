"use client";

import { useState } from "react";
import { readTripFiles } from "@/lib/import/read-files.client";
import type { TripImportCandidate } from "@/lib/import/types";

type ImportPanelProps = {
  onCandidates: (candidates: TripImportCandidate[]) => void;
};

export function ImportPanel({ onCandidates }: ImportPanelProps) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function importFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setStatus("출장 신청서를 분석하고 있습니다.");
    try {
      const candidates = await readTripFiles(Array.from(files));
      onCandidates(candidates);
      const recognized = candidates.filter(
        (candidate) => candidate.status !== "unsupported",
      ).length;
      setStatus(
        recognized > 0
          ? `출장 ${recognized}건을 인식했습니다.`
          : "인식할 수 있는 출장 신청서가 없습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="trip-import-title"
      className="form-section import-section"
    >
      <div className="section-heading">
        <div>
          <span className="section-kicker">불러오기</span>
          <h2 id="trip-import-title">출장 신청서 자동 입력</h2>
        </div>
        <span className="section-note">XLSX · 텍스트 PDF</span>
      </div>
      <label className="import-dropzone">
        <span>{busy ? "분석 중…" : "출장 신청서 파일 선택"}</span>
        <input
          accept=".xlsx,.pdf"
          aria-label="출장 신청서 파일"
          disabled={busy}
          multiple
          onChange={(event) => void importFiles(event.target.files)}
          type="file"
        />
        <small>여러 파일을 한 번에 선택할 수 있습니다.</small>
      </label>
      <p className="import-privacy">
        원본 파일은 브라우저 안에서만 분석하며 서버에 업로드하지 않습니다.
      </p>
      {status && <p role="status">{status}</p>}
    </section>
  );
}
