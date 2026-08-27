"use client";

import { useState } from "react";
import { ExpenseForm } from "./ExpenseForm";
import { GuideView } from "./GuideView";

type View = "form" | "guide";

export function TravelExpenseApp() {
  const [view, setView] = useState<View>("form");

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <h1>여비정산 신청서</h1>
          <nav aria-label="여비정산 메뉴" className="tab-bar" role="tablist">
            <button
              aria-controls="form-panel"
              aria-selected={view === "form"}
              id="form-tab"
              onClick={() => setView("form")}
              role="tab"
              type="button"
            >
              신청서 작성
            </button>
            <button
              aria-controls="guide-panel"
              aria-selected={view === "guide"}
              id="guide-tab"
              onClick={() => setView("guide")}
              role="tab"
              type="button"
            >
              작성요령
            </button>
          </nav>
          <p className="header-privacy">개인정보 보호</p>
        </div>
      </header>
      <div className="content-shell">
      <div aria-labelledby={view === "form" ? "form-tab" : "guide-tab"} id={view === "form" ? "form-panel" : "guide-panel"} role="tabpanel">
        {view === "form" ? <ExpenseForm /> : <GuideView />}
      </div>
      </div>
      <footer className="site-footer">
        <span>원본 파일은 수정하지 않으며, 생성 결과는 사용자의 기기에만 내려받습니다.</span>
        <span>
          제작: 서아인 · 자료 오류·정정·삭제 요청: {" "}
          <a href="mailto:ainssam@ai.cne.go.kr">ainssam@ai.cne.go.kr</a>
        </span>
      </footer>
    </main>
  );
}
