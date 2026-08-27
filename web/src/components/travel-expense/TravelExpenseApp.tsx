"use client";

import { useState } from "react";

type View = "form" | "guide";

export function TravelExpenseApp() {
  const [view, setView] = useState<View>("form");

  return (
    <main>
      <nav aria-label="여비정산 메뉴" role="tablist">
        <button
          aria-selected={view === "form"}
          onClick={() => setView("form")}
          role="tab"
          type="button"
        >
          신청서 작성
        </button>
        <button
          aria-selected={view === "guide"}
          onClick={() => setView("guide")}
          role="tab"
          type="button"
        >
          작성요령
        </button>
      </nav>
    </main>
  );
}
