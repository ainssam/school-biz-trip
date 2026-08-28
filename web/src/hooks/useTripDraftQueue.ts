"use client";

import { useState } from "react";
import type { TripImportCandidate } from "@/lib/import/types";
import {
  candidateToDraft,
  type TravelExpenseDraftInput,
} from "@/lib/travel-expense/draft";

export type QueuedTripDraft = {
  candidate: TripImportCandidate;
  values: TravelExpenseDraftInput;
  included: boolean;
};

export function useTripDraftQueue() {
  const [drafts, setDrafts] = useState<QueuedTripDraft[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function appendCandidates(
    candidates: TripImportCandidate[],
    templateId: string,
  ): void {
    const additions = candidates.map((candidate) => ({
      candidate,
      values: candidateToDraft(candidate, templateId),
      included: candidate.included,
    }));
    setDrafts((current) => [...current, ...additions]);
    const firstEditable =
      additions.find((draft) => draft.candidate.status !== "unsupported") ??
      additions[0];
    setSelectedId((current) => current ?? firstEditable?.candidate.id ?? null);
  }

  function saveSelected(values: TravelExpenseDraftInput): void {
    if (!selectedId) return;
    setDrafts((current) =>
      current.map((draft) =>
        draft.candidate.id === selectedId ? { ...draft, values } : draft,
      ),
    );
  }

  function select(
    id: string,
    currentValues: TravelExpenseDraftInput,
  ): TravelExpenseDraftInput {
    const target = drafts.find((draft) => draft.candidate.id === id);
    if (!target) throw new Error("선택할 출장 초안을 찾을 수 없습니다.");
    if (selectedId) {
      setDrafts((current) =>
        current.map((draft) =>
          draft.candidate.id === selectedId
            ? { ...draft, values: currentValues }
            : draft,
        ),
      );
    }
    setSelectedId(id);
    return target.values;
  }

  function setIncluded(id: string, included: boolean): void {
    setDrafts((current) =>
      current.map((draft) =>
        draft.candidate.id === id ? { ...draft, included } : draft,
      ),
    );
  }

  function remove(id: string): void {
    const index = drafts.findIndex((draft) => draft.candidate.id === id);
    if (index < 0) return;
    const remaining = drafts.filter((draft) => draft.candidate.id !== id);
    setDrafts(remaining);
    if (selectedId === id) {
      setSelectedId(
        remaining[Math.min(index, Math.max(0, remaining.length - 1))]?.candidate
          .id ?? null,
      );
    }
  }

  return {
    drafts,
    selectedId,
    appendCandidates,
    saveSelected,
    select,
    setIncluded,
    remove,
  };
}
