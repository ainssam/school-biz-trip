"use client";

import { useState } from "react";
import { ExpenseForm } from "./ExpenseForm";
import { GuideView } from "./GuideView";

type View = "form" | "guide";

export function TravelExpenseApp() {
  const [view, setView] = useState<View>("form");

  return (
    <main className="app-shell">
      <header className="hero">
        <div className="hero-inner">
          <div>
            <p className="hero-kicker">학교 출장 서류 · 한 번에 정리</p>
            <h1>여비정산 신청서,<br />빈칸만 고르면 완성됩니다.</h1>
            <p className="hero-copy">원본 한글 양식의 여백과 표를 그대로 유지해 HWP와 PDF로 만듭니다. 입력 내용은 저장하지 않습니다.</p>
          </div>
          <div className="hero-mark" aria-hidden="true"><span>출장</span><strong>정산</strong><small>FORM 03</small></div>
        </div>
      </header>
      <div className="content-shell">
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
      <div aria-labelledby={view === "form" ? "form-tab" : "guide-tab"} id={view === "form" ? "form-panel" : "guide-panel"} role="tabpanel">
        {view === "form" ? <ExpenseForm /> : <GuideView />}
      </div>
      </div>
      <footer className="site-footer">원본 파일은 수정하지 않으며, 생성 결과는 사용자의 기기에만 내려받습니다.</footer>
    </main>
  );
}
