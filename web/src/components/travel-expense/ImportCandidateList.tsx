"use client";

import type { QueuedTripDraft } from "@/hooks/useTripDraftQueue";
import type { DraftValidation } from "@/lib/travel-expense/validation";

type ImportCandidateListProps = {
  drafts: QueuedTripDraft[];
  validations: Record<string, DraftValidation>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onIncludedChange: (id: string, included: boolean) => void;
  onRemove: (id: string) => void;
};

function sourceLabel(draft: QueuedTripDraft): string {
  const source = draft.candidate.source;
  if (source.fileType === "pdf") {
    return `${source.fileName} > ${source.page ?? 1}쪽`;
  }
  if (source.fileType === "xlsx") {
    const locator = source.row
      ? `${source.row}행`
      : source.block
        ? `${source.block}번 양식`
        : "시트";
    return `${source.fileName} > ${source.sheetName ?? "시트"} > ${locator}`;
  }
  return source.fileName;
}

export function ImportCandidateList({
  drafts,
  validations,
  selectedId,
  onSelect,
  onIncludedChange,
  onRemove,
}: ImportCandidateListProps) {
  if (drafts.length === 0) return null;
  return (
    <section
      aria-labelledby="candidate-list-title"
      className="form-section candidate-section"
    >
      <div className="section-heading">
        <div>
          <span className="section-kicker">인식 결과</span>
          <h2 id="candidate-list-title">출장 건 확인</h2>
        </div>
        <span className="section-note">{drafts.length}건</span>
      </div>
      <ol className="candidate-list">
        {drafts.map((draft, index) => {
          const selected = draft.candidate.id === selectedId;
          const validation = validations[draft.candidate.id];
          const issues =
            draft.candidate.status === "unsupported"
              ? draft.candidate.issues
              : validation?.labels ?? [];
          return (
            <li className={selected ? "candidate-card selected" : "candidate-card"} key={draft.candidate.id}>
              <button
                aria-current={selected ? "true" : undefined}
                className="candidate-select"
                onClick={() => onSelect(draft.candidate.id)}
                type="button"
              >
                <strong>출장 건 {index + 1}</strong>
                <span>{sourceLabel(draft)}</span>
                <small>
                  {draft.candidate.status === "unsupported"
                    ? "지원하지 않는 내용"
                    : validation?.valid
                      ? "입력 완료"
                      : `${issues.length}개 입력 필요`}
                </small>
              </button>
              {issues.length > 0 && (
                <ul className="candidate-issues">
                  {issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              )}
              <div className="candidate-actions">
                <label>
                  <input
                    checked={draft.included}
                    disabled={draft.candidate.status === "unsupported"}
                    onChange={(event) =>
                      onIncludedChange(draft.candidate.id, event.target.checked)
                    }
                    type="checkbox"
                  />
                  <span>출력에 포함</span>
                </label>
                <button
                  className="text-button danger-text"
                  onClick={() => onRemove(draft.candidate.id)}
                  type="button"
                >
                  목록에서 제거
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
