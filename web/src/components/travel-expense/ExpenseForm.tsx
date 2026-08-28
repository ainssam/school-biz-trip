"use client";

import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { DownloadActions } from "./DownloadActions";
import { ImportCandidateList } from "./ImportCandidateList";
import { ImportPanel } from "./ImportPanel";
import { RouteEditor, transportFor } from "./RouteEditor";
import { useRecentSuggestions } from "@/hooks/useRecentSuggestions";
import { useTripDraftQueue } from "@/hooks/useTripDraftQueue";
import type { TripImportCandidate } from "@/lib/import/types";
import {
  candidateToDraft,
  type TravelExpenseDraftInput,
} from "@/lib/travel-expense/draft";
import {
  travelExpenseSchema,
  type TravelType,
} from "@/lib/travel-expense/schema";
import {
  validateTravelExpenseDraft,
  validationLabel,
} from "@/lib/travel-expense/validation";
import {
  formatFareForOutput,
  makeBatchDownloadFilename,
  makeDownloadFilename,
  makeReturnRoute,
  sumFare,
} from "@/lib/travel-expense/transform";
import { downloadBlob } from "@/lib/download";
import {
  defaultTemplateId,
  getTemplateById,
  templateCatalog,
} from "@/lib/templates/template-registry";

const defaultSchool = getTemplateById(defaultTemplateId).school;

function today(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function defaultValues(): TravelExpenseDraftInput {
  const date = today();
  return {
    templateId: defaultTemplateId,
    school: defaultSchool,
    position: "교사",
    name: "",
    tripStart: date,
    tripEnd: date,
    applicationDate: date,
    destination: "",
    purpose: "",
    travelType: "public",
    routes: [
      {
        date,
        transport: "철도",
        from: "",
        to: "",
        grade: "제2호",
        fare: 0,
      },
    ],
    lodging: { paid: null, actual: null, reason: "" },
    meals: { paid: null, actual: null, reason: "" },
    attachments: [],
    attachmentOther: "",
  };
}

const attachmentOptions = [
  ["fuel", "주유영수증"],
  ["parking", "주차영수증"],
  ["toll", "하이패스 영수증"],
  ["rail", "철도승차권(영수증)"],
  ["bus", "버스 승차권(영수증)"],
  ["lodging", "숙박 영수증"],
  ["other", "기타"],
] as const;

export function ExpenseForm() {
  const { recent, remember, clear } = useRecentSuggestions();
  const queue = useTripDraftQueue();
  const [schoolMode, setSchoolMode] = useState(defaultSchool);
  const [positionMode, setPositionMode] = useState("교사");
  const [busy, setBusy] = useState<"hwp" | "pdf" | null>(null);
  const [status, setStatus] = useState("");
  const [confirmedSignature, setConfirmedSignature] = useState<string | null>(null);
  const { control, register, getValues, reset, setValue } =
    useForm<TravelExpenseDraftInput>({ defaultValues: defaultValues() });
  const { fields, append, remove } = useFieldArray({ control, name: "routes" });
  const values = useWatch({ control });
  const travelType = useWatch({ control, name: "travelType" }) ?? "public";
  const templateId =
    useWatch({ control, name: "templateId" }) ?? defaultTemplateId;
  const routeValues = useWatch({ control, name: "routes" }) ?? [];
  const totalFare = sumFare(routeValues);
  const currentValues = values as TravelExpenseDraftInput;
  const liveDrafts = queue.drafts.map((draft) =>
    draft.candidate.id === queue.selectedId
      ? { ...draft, values: currentValues }
      : draft,
  );
  const validations = Object.fromEntries(
    liveDrafts.map((draft) => [
      draft.candidate.id,
      validateTravelExpenseDraft(draft.values),
    ]),
  );
  const currentValidation = validateTravelExpenseDraft(currentValues);
  const batchMode = liveDrafts.length > 0;
  const includedDraftEntries = batchMode
    ? liveDrafts
        .map((draft, index) => ({ draft, displayIndex: index + 1 }))
        .filter(({ draft }) => draft.included)
    : [];
  const includedDrafts = includedDraftEntries.map(({ draft }) => draft);
  const downloadReady = batchMode
    ? includedDrafts.length > 0 &&
      includedDrafts.every(
        (draft) =>
          draft.candidate.status !== "unsupported" &&
          validations[draft.candidate.id]?.valid,
      )
    : currentValidation.valid;
  const validationMessages = currentValidation.messages;

  function syncSelectModes(next: TravelExpenseDraftInput) {
    setSchoolMode(next.school === defaultSchool ? defaultSchool : "__other");
    setPositionMode(
      ["교사", "교감", "교장", "교육행정직"].includes(next.position)
        ? next.position
        : "__other",
    );
  }

  function importCandidates(candidates: TripImportCandidate[]) {
    queue.appendCandidates(candidates, templateId);
    const first =
      candidates.find((candidate) => candidate.status !== "unsupported") ??
      candidates[0];
    if (!first) return;
    const next = candidateToDraft(first, templateId);
    reset(next);
    syncSelectModes(next);
    setConfirmedSignature(null);
  }

  function selectDraft(id: string) {
    const next = queue.select(id, getValues());
    reset(next);
    syncSelectModes(next);
    setConfirmedSignature(null);
  }

  function removeDraft(id: string) {
    const index = queue.drafts.findIndex((draft) => draft.candidate.id === id);
    const remaining = queue.drafts.filter(
      (draft) => draft.candidate.id !== id,
    );
    queue.remove(id);
    if (queue.selectedId !== id) return;
    const next =
      remaining[Math.min(index, Math.max(0, remaining.length - 1))]?.values;
    const replacement = next ?? defaultValues();
    reset(replacement);
    syncSelectModes(replacement);
  }

  function changeTravelType(next: TravelType) {
    setValue("travelType", next);
    const transport = transportFor(next);
    getValues("routes").forEach((_, index) => {
      setValue(`routes.${index}.transport`, transport);
      setValue(`routes.${index}.fare`, next === "public" ? 0 : "미기재");
    });
  }

  function addReturnRoute() {
    if (fields.length >= 4) return;
    const returnRoute = makeReturnRoute(getValues("routes.0"));
    append({
      ...returnRoute,
      date: getValues("tripEnd"),
      transport: transportFor(travelType),
      fare: travelType === "public" ? returnRoute.fare : "미기재",
    });
  }

  async function download(format: "hwp" | "pdf") {
    setStatus("");
    const currentValues = getValues();
    const requestedDrafts = batchMode
      ? liveDrafts.filter((draft) => draft.included).map((draft) => draft.values)
      : [currentValues];
    const parsedResults = requestedDrafts.map((draft) =>
      travelExpenseSchema.safeParse(draft),
    );
    const failedIndexes = parsedResults.flatMap((result, index) =>
      result.success
        ? []
        : [batchMode ? includedDraftEntries[index].displayIndex : index + 1],
    );
    if (failedIndexes.length > 0 || requestedDrafts.length === 0) {
      if (requestedDrafts.length === 0) {
        setStatus("출력에 포함할 출장 건을 한 건 이상 선택해 주세요.");
      } else if (batchMode) {
        setStatus(
          `직접 입력이 필요한 출장 건: ${failedIndexes
            .join(", ")}번`,
        );
      } else {
        const failed = parsedResults[0];
        const labels =
          failed && !failed.success
            ? Array.from(
                new Set(
                  failed.error.issues.map((issue) =>
                    validationLabel(issue.path),
                  ),
                ),
              )
            : [];
        setStatus(`다음 필수 입력을 확인해 주세요: ${labels.join(", ")}`);
      }
      return;
    }
    const parsedItems = parsedResults.map((result) => {
      if (!result.success) throw new Error("unreachable");
      return result.data;
    });

    setBusy(format);
    setStatus(`${format.toUpperCase()} 파일을 만들고 있습니다.`);
    try {
      const response = await fetch(`/api/generate/${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batchMode ? parsedItems : parsedItems[0]),
      });
      if (!response.ok) throw new Error("generation-failed");
      downloadBlob(
        await response.blob(),
        batchMode
          ? makeBatchDownloadFilename(parsedItems.length, format)
          : makeDownloadFilename(parsedItems[0], format),
      );
      for (const parsed of parsedItems) {
        remember(parsed.school, [
          ...parsed.routes.flatMap((route) => [route.from, route.to]),
          parsed.destination,
        ]);
      }
      setStatus(`${format.toUpperCase()} 파일을 내려받았습니다.`);
    } catch {
      setStatus(
        `${format.toUpperCase()} 파일을 만들지 못했습니다. 입력은 그대로 유지됩니다. 다시 시도해 주세요.`,
      );
    } finally {
      setBusy(null);
    }
  }

  const hasOtherAttachment = values.attachments?.includes("other");
  const attachmentSummary = values.attachments?.length
    ? values.attachments
        .map((value) => {
          const label = attachmentOptions.find(([key]) => key === value)?.[1];
          if (value === "other" && values.attachmentOther) {
            return `${label}: ${values.attachmentOther}`;
          }
          return label;
        })
        .filter(Boolean)
        .join(", ")
    : "—";
  const reviewSignature = JSON.stringify(
    batchMode ? includedDrafts.map((draft) => draft.values) : currentValues,
  );
  const reviewConfirmed =
    downloadReady && confirmedSignature === reviewSignature;
  const reviewItems = [
    travelType === ""
      ? "출장유형: 직접 선택 필요"
      : travelType === "public"
      ? `대중교통 운임 합계: ${totalFare.toLocaleString("ko-KR")}원`
      : `${travelTypeLabel(travelType)}: 운임 금액 없음`,
    hasExpense(values.lodging)
      ? `숙박비: ${expenseSummary(values.lodging)}`
      : "숙박비: 정산 없음",
    hasExpense(values.meals)
      ? `식비: ${expenseSummary(values.meals)}`
      : "식비: 정산 없음",
    attachmentSummary === "—"
      ? "첨부서류: 없음"
      : `첨부서류: ${attachmentSummary}`,
  ];

  return (
    <div className="workspace-grid">
      <form className="expense-form" onSubmit={(event) => event.preventDefault()}>
        <ImportPanel onCandidates={importCandidates} />
        <ImportCandidateList
          drafts={queue.drafts}
          onIncludedChange={queue.setIncluded}
          onRemove={removeDraft}
          onSelect={selectDraft}
          selectedId={queue.selectedId}
          validations={validations}
        />
        <section className="form-section template-section" aria-labelledby="template-title">
          <div className="section-heading">
            <div>
              <span className="section-kicker">00</span>
              <h2 id="template-title">사용 양식</h2>
            </div>
            <span className="section-note">지역·학교·연도별</span>
          </div>
          <div className="field-grid">
            <label>
              <span>사용 양식</span>
              <select
                aria-label="사용 양식"
                value={templateId}
                onChange={(event) => {
                  const nextTemplate = getTemplateById(event.target.value);
                  setValue("templateId", nextTemplate.id);
                  setValue("school", nextTemplate.school);
                  setSchoolMode(nextTemplate.school);
                }}
              >
                {templateCatalog.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.region} · {template.school} · {template.year}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="form-section" aria-labelledby="applicant-title">
          <div className="section-heading">
            <div>
              <span className="section-kicker">01</span>
              <h2 id="applicant-title">신청자 정보</h2>
            </div>
            <span className="required-note">* 필수 입력</span>
          </div>
          <div className="field-grid field-grid-three">
            <label>
              <span>소속 *</span>
              <select
                aria-label="소속"
                value={schoolMode}
                onChange={(event) => {
                  const next = event.target.value;
                  setSchoolMode(next);
                  if (next !== "__other") setValue("school", next);
                  else setValue("school", "");
                }}
              >
                <option value={defaultSchool}>{defaultSchool}</option>
                {recent.schools
                  .filter((school) => school !== defaultSchool)
                  .map((school) => (
                    <option key={school}>{school}</option>
                  ))}
                <option value="__other">다른 학교 입력</option>
              </select>
            </label>
            {schoolMode === "__other" && (
              <label>
                <span>다른 학교명 *</span>
                <input
                  aria-label="다른 학교명"
                  maxLength={20}
                  placeholder="학교명을 입력하세요"
                  {...register("school")}
                />
                <FieldError message={validationMessages.school} />
              </label>
            )}
            <label>
              <span>직급(직위) *</span>
              <select
                aria-label="직급(직위)"
                value={positionMode}
                onChange={(event) => {
                  const next = event.target.value;
                  setPositionMode(next);
                  setValue("position", next === "__other" ? "" : next);
                }}
              >
                <option>교사</option>
                <option>교감</option>
                <option>교장</option>
                <option>교육행정직</option>
                <option value="__other">직접 입력</option>
              </select>
            </label>
            {positionMode === "__other" && (
              <label>
                <span>직급 직접 입력 *</span>
                <input maxLength={12} {...register("position")} />
              </label>
            )}
            <label>
              <span>성명 *</span>
              <input
                aria-label="성명 *"
                autoComplete="name"
                maxLength={10}
                placeholder="신청인 성명"
                {...register("name")}
              />
              <FieldError message={validationMessages.name} />
            </label>
          </div>
        </section>

        <section className="form-section" aria-labelledby="trip-title">
          <div className="section-heading">
            <div>
              <span className="section-kicker">02</span>
              <h2 id="trip-title">출장 정보</h2>
            </div>
          </div>
          <div className="field-grid field-grid-three">
            <label>
              <span>시작일 *</span>
              <input
                aria-label="시작일 *"
                type="date"
                {...register("tripStart", {
                  onChange: (event) =>
                    setValue("routes.0.date", event.target.value),
                })}
              />
            </label>
            <label>
              <span>종료일 *</span>
              <input
                aria-label="종료일 *"
                type="date"
                {...register("tripEnd", {
                  onChange: (event) => {
                    if (fields.length > 1) {
                      setValue("routes.1.date", event.target.value);
                    }
                  },
                })}
              />
              <FieldError message={validationMessages.tripEnd} />
            </label>
            <label>
              <span>작성일 *</span>
              <input aria-label="작성일 *" type="date" {...register("applicationDate")} />
            </label>
            <label className="field-span-two">
              <span>출장지 *</span>
              <input
                aria-label="출장지 *"
                list="recent-places"
                maxLength={36}
                placeholder="기관명 또는 지역"
                {...register("destination")}
              />
              <FieldError message={validationMessages.destination} />
            </label>
            <label>
              <span>출장유형 *</span>
              <select
                aria-label="출장유형"
                value={travelType}
                onChange={(event) =>
                  changeTravelType(event.target.value as TravelType)
                }
              >
                <option value="">직접 선택</option>
                <option value="public">대중교통</option>
                <option value="car">자가용</option>
                <option value="ride">차량동승</option>
                <option value="charter">전세버스</option>
              </select>
            </label>
            <label className="field-span-three">
              <span>출장목적 *</span>
              <input
                aria-label="출장목적 *"
                maxLength={60}
                placeholder="출장명령서와 동일하게 입력하세요"
                {...register("purpose")}
              />
              <FieldError message={validationMessages.purpose} />
            </label>
          </div>
          <datalist id="recent-places">
            {recent.places.map((place) => (
              <option key={place} value={place} />
            ))}
          </datalist>
        </section>

        <RouteEditor
          append={append}
          fields={fields}
          onAddReturn={addReturnRoute}
          register={register}
          remove={remove}
          travelType={travelType}
          validationMessages={validationMessages}
        />
        <FieldError message={validationMessages.routes} />

        <section className="form-section form-section-wide" aria-labelledby="cost-title">
          <div className="section-heading">
            <div>
              <span className="section-kicker">04</span>
              <h2 id="cost-title">비용과 첨부</h2>
            </div>
            <span className="section-note">선택 입력 · 없으면 비워두기</span>
          </div>
          <div className="cost-grid">
            <div className="cost-block">
              <h3>숙박비</h3>
              <label>
                <span>지급받은 금액</span>
                <input
                  inputMode="numeric"
                  min="0"
                  type="number"
                  {...register("lodging.paid", {
                    setValueAs: optionalAmount,
                  })}
                />
              </label>
              <label>
                <span>실제 소요액</span>
                <input
                  inputMode="numeric"
                  min="0"
                  type="number"
                  {...register("lodging.actual", {
                    setValueAs: optionalAmount,
                  })}
                />
              </label>
              <label>
                <span>초과지출 사유</span>
                <input maxLength={36} {...register("lodging.reason")} />
              </label>
            </div>
            <div className="cost-block">
              <h3>식비</h3>
              <label>
                <span>지급받은 금액</span>
                <input
                  inputMode="numeric"
                  min="0"
                  type="number"
                  {...register("meals.paid", {
                    setValueAs: optionalAmount,
                  })}
                />
              </label>
              <label>
                <span>실제 소요액</span>
                <input
                  inputMode="numeric"
                  min="0"
                  type="number"
                  {...register("meals.actual", {
                    setValueAs: optionalAmount,
                  })}
                />
              </label>
              <label>
                <span>초과지출 사유</span>
                <input maxLength={36} {...register("meals.reason")} />
              </label>
            </div>
          </div>
          <fieldset className="attachment-fieldset">
            <legend>첨부서류</legend>
            <div className="check-grid">
              {attachmentOptions.map(([value, label]) => (
                <label className="check-option" key={value}>
                  <input type="checkbox" value={value} {...register("attachments")} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            {hasOtherAttachment && (
              <label className="other-attachment">
                <span>기타 첨부서류명 *</span>
                <input maxLength={30} {...register("attachmentOther")} />
                <FieldError message={validationMessages.attachmentOther} />
              </label>
            )}
          </fieldset>
        </section>
      </form>

      <aside className="document-dock" aria-label="입력내용 미리보기">
        <div className="dock-tab">작성 중</div>
        <div className="document-preview">
          <p className="preview-form-label">별지 제3호서식</p>
          <h2>여비정산 신청서</h2>
          <dl>
            <div><dt>소속</dt><dd>{values.school || "—"}</dd></div>
            <div><dt>직급(직위)</dt><dd>{values.position || "—"}</dd></div>
            <div><dt>성명</dt><dd>{values.name || "—"}</dd></div>
            <div><dt>일정</dt><dd>{values.tripStart || "—"} ~ {values.tripEnd || "—"}</dd></div>
            <div><dt>출장지</dt><dd>{values.destination || "—"}</dd></div>
            <div><dt>목적</dt><dd>{values.purpose || "—"}</dd></div>
            <div><dt>출장유형</dt><dd>{travelTypeLabel(travelType)}</dd></div>
            <div><dt>운임 합계</dt><dd>{totalFare.toLocaleString("ko-KR")}원</dd></div>
            <div><dt>숙박비</dt><dd>{expenseSummary(values.lodging)}</dd></div>
            <div><dt>식비</dt><dd>{expenseSummary(values.meals)}</dd></div>
            <div><dt>첨부서류</dt><dd>{attachmentSummary}</dd></div>
          </dl>
          <section className="preview-routes" aria-label="이동 경로 미리보기">
            <h3>이동 경로</h3>
            {routeValues.map((route, index) => (
              <div className="preview-route-row" key={index}>
                <span>{route.date || "—"}</span>
                <strong>{route.from || "—"} → {route.to || "—"}</strong>
                <span>{route.transport || "—"}</span>
                <span>{fareText(route.fare)}</span>
              </div>
            ))}
          </section>
          <p className="privacy-note">
            입력 내용은 문서 생성에만 사용되며 서버에 보관하지 않습니다.
          </p>
        </div>
        {status && (
          <p className="status-message" role="status">
            {status}
          </p>
        )}
        <section className="download-review" aria-labelledby="download-review-title">
          <h3 id="download-review-title">내려받기 전 확인</h3>
          <ul>
            {reviewItems.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <div
            aria-label="실시간 필수 입력"
            aria-live="polite"
            className={downloadReady ? "live-validation complete" : "live-validation"}
          >
            {downloadReady ? (
              <strong>필수 입력이 모두 완료되었습니다.</strong>
            ) : batchMode ? (
              <>
                <strong>아직 입력이 필요한 출장 건이 있습니다.</strong>
                <ul>
                  {includedDraftEntries.map(({ draft, displayIndex }) => {
                    const result = validations[draft.candidate.id];
                    return result?.valid ? null : (
                      <li key={draft.candidate.id}>
                        출장 건 {displayIndex}: {result?.labels.join(", ") || "입력 내용"}
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <span>필요한 입력: {currentValidation.labels.join(", ")}</span>
            )}
          </div>
          <label className="review-confirm">
            <input
              checked={reviewConfirmed}
              disabled={!downloadReady}
              onChange={(event) =>
                setConfirmedSignature(event.target.checked ? reviewSignature : null)
              }
              type="checkbox"
            />
            <span>입력 내용을 확인했습니다.</span>
          </label>
        </section>
        <DownloadActions
          batch={queue.drafts.length > 0}
          busy={busy}
          confirmed={reviewConfirmed}
          onDownload={download}
          ready={downloadReady}
        />
        <button className="clear-button" onClick={clear} type="button">
          최근 학교·장소 지우기
        </button>
      </aside>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <span className="field-error">{message}</span> : null;
}

function travelTypeLabel(type: TravelType | ""): string {
  return {
    "": "직접 선택",
    public: "대중교통",
    car: "자가용",
    ride: "차량동승",
    charter: "전세버스",
  }[type];
}

function fareText(fare: unknown): string {
  const formatted = formatFareForOutput(
    fare === "미기재" || typeof fare === "number" ? fare : undefined,
  );
  return formatted ? `${formatted}원` : "";
}

function expenseSummary(
  detail: { paid?: number | null; actual?: number | null; reason?: string } | undefined,
): string {
  if (!detail || (detail.paid == null && detail.actual == null && !detail.reason)) {
    return "—";
  }
  const paid = detail.paid == null ? "—" : `${detail.paid.toLocaleString("ko-KR")}원`;
  const actual = detail.actual == null ? "—" : `${detail.actual.toLocaleString("ko-KR")}원`;
  return `지급 ${paid} / 실제 ${actual}${detail.reason ? ` / ${detail.reason}` : ""}`;
}

function hasExpense(
  detail: { paid?: number | null; actual?: number | null; reason?: string } | undefined,
): boolean {
  return Boolean(
    detail && (detail.paid != null || detail.actual != null || detail.reason),
  );
}

function optionalAmount(value: unknown): number | null {
  return value === "" || value == null ? null : Number(value);
}
