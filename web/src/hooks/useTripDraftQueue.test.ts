import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TripImportCandidate } from "@/lib/import/types";
import { useTripDraftQueue } from "./useTripDraftQueue";

function candidate(id: string, name: string): TripImportCandidate {
  return {
    id,
    source: {
      fileName: "synthetic.xlsx",
      fileType: "xlsx",
      sheetName: id,
    },
    status: "needs-review",
    values: {
      name,
      tripStart: "2026-08-27",
      tripEnd: "2026-08-27",
    },
    recognizedFields: ["name", "tripStart", "tripEnd"],
    issues: ["출장지 직접 입력 필요"],
    included: true,
  };
}

describe("출장 초안 큐", () => {
  it("추가한 후보 순서를 유지하고 첫 후보를 선택한다", () => {
    const { result } = renderHook(() => useTripDraftQueue());

    act(() =>
      result.current.appendCandidates(
        [candidate("first", "가상A"), candidate("second", "가상B")],
        "bokja-2026",
      ),
    );

    expect(result.current.drafts.map((draft) => draft.candidate.id)).toEqual([
      "first",
      "second",
    ]);
    expect(result.current.selectedId).toBe("first");
  });

  it("다른 후보를 선택할 때 현재 폼 수정값을 먼저 저장한다", () => {
    const { result } = renderHook(() => useTripDraftQueue());
    act(() =>
      result.current.appendCandidates(
        [candidate("first", "가상A"), candidate("second", "가상B")],
        "bokja-2026",
      ),
    );
    const edited = {
      ...result.current.drafts[0].values,
      purpose: "사용자가 수정한 목적",
    };

    let selectedName = "";
    act(() => {
      selectedName = result.current.select("second", edited).name;
    });

    expect(result.current.drafts[0].values.purpose).toBe(
      "사용자가 수정한 목적",
    );
    expect(result.current.selectedId).toBe("second");
    expect(selectedName).toBe("가상B");
  });

  it("출력 제외는 초안을 삭제하지 않고 포함 상태만 바꾼다", () => {
    const { result } = renderHook(() => useTripDraftQueue());
    act(() =>
      result.current.appendCandidates(
        [candidate("first", "가상A")],
        "bokja-2026",
      ),
    );

    act(() => result.current.setIncluded("first", false));

    expect(result.current.drafts).toHaveLength(1);
    expect(result.current.drafts[0].included).toBe(false);
  });

  it("선택한 초안을 지우면 다음 남은 초안을 선택한다", () => {
    const { result } = renderHook(() => useTripDraftQueue());
    act(() =>
      result.current.appendCandidates(
        [candidate("first", "가상A"), candidate("second", "가상B")],
        "bokja-2026",
      ),
    );

    act(() => result.current.remove("first"));

    expect(result.current.drafts.map((draft) => draft.candidate.id)).toEqual([
      "second",
    ]);
    expect(result.current.selectedId).toBe("second");
  });
});
