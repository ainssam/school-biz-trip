"use client";

import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { readTripFiles } from "@/lib/import/read-files.client";
import type { TripImportCandidate } from "@/lib/import/types";

type ImportPanelProps = {
  onCandidates: (candidates: TripImportCandidate[]) => void;
};

export function ImportPanel({ onCandidates }: ImportPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function importFiles(files: File[]) {
    if (files.length === 0) return;
    setBusy(true);
    setStatus("출장 신청서를 분석하고 있습니다.");
    try {
      const candidates = await readTripFiles(files);
      onCandidates(candidates);
      const recognized = candidates.filter(
        (candidate) => candidate.status !== "unsupported",
      ).length;
      setStatus(
        recognized > 0
          ? `출장 ${recognized}건을 인식했습니다.`
          : "인식할 수 있는 출장 신청서가 없습니다.",
      );
    } catch {
      setStatus("파일을 읽지 못했습니다. XLSX 또는 텍스트 PDF인지 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    void importFiles(files);
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
      <div className="import-dropzone">
        <input
          accept=".xlsx,.pdf"
          aria-label="출장 신청서 파일"
          className="import-file-input"
          disabled={busy}
          multiple
          onChange={handleFileChange}
          ref={inputRef}
          type="file"
        />
        <button
          aria-label="엑셀·PDF 파일 선택"
          className="import-file-button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          <span aria-hidden="true">＋</span>
          {busy ? "파일 분석 중…" : "엑셀·PDF 파일 선택"}
        </button>
        <div className="import-file-help">
          <strong>출장 신청서 파일을 선택하세요.</strong>
          <small>엑셀(.xlsx)·텍스트 PDF · 여러 파일 동시 선택 가능</small>
        </div>
      </div>
      <p className="import-privacy">
        원본 파일은 브라우저 안에서만 분석하며 서버에 업로드하지 않습니다.
      </p>
      {status && <p role="status">{status}</p>}
    </section>
  );
}
