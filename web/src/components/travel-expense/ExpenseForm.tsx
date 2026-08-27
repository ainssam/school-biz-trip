"use client";

import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { DownloadActions } from "./DownloadActions";
import { RouteEditor, transportFor } from "./RouteEditor";
import { useRecentSuggestions } from "@/hooks/useRecentSuggestions";
import {
  travelExpenseSchema,
  type TravelExpenseInput,
  type TravelType,
} from "@/lib/travel-expense/schema";
import {
  makeDownloadFilename,
  makeReturnRoute,
  sumFare,
} from "@/lib/travel-expense/transform";

const defaultSchool = "복자여자고등학교";

function today(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function defaultValues(): TravelExpenseInput {
  const date = today();
  return {
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
  const [schoolMode, setSchoolMode] = useState(defaultSchool);
  const [positionMode, setPositionMode] = useState("교사");
  const [busy, setBusy] = useState<"hwp" | "pdf" | null>(null);
  const [status, setStatus] = useState("");
  const [validationMessages, setValidationMessages] = useState<
    Record<string, string>
  >({});

  const { control, register, getValues, setValue } =
    useForm<TravelExpenseInput>({ defaultValues: defaultValues() });
  const { fields, append, remove } = useFieldArray({ control, name: "routes" });
  const values = useWatch({ control });
  const travelType = useWatch({ control, name: "travelType" }) ?? "public";
  const routeValues = useWatch({ control, name: "routes" }) ?? [];
  const totalFare = sumFare(routeValues);

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
    append(makeReturnRoute(getValues("routes.0")));
  }

  async function download(format: "hwp" | "pdf") {
    setStatus("");
    const parsed = travelExpenseSchema.safeParse(getValues());
    if (!parsed.success) {
      const messages: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        if (!messages[key]) messages[key] = issue.message;
      }
      setValidationMessages(messages);
      setStatus("입력 내용을 확인한 뒤 다시 내려받아 주세요.");
      return;
    }

    setValidationMessages({});
    setBusy(format);
    setStatus(`${format.toUpperCase()} 파일을 만들고 있습니다.`);
    try {
      const response = await fetch(`/api/generate/${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!response.ok) throw new Error("generation-failed");
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = makeDownloadFilename(parsed.data, format);
      anchor.click();
      URL.revokeObjectURL(url);
      remember(parsed.data.school, [
        ...parsed.data.routes.flatMap((route) => [route.from, route.to]),
        parsed.data.destination,
      ]);
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

  return (
    <div className="workspace-grid">
      <form className="expense-form" onSubmit={(event) => event.preventDefault()}>
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
              <input type="date" {...register("tripStart")} />
            </label>
            <label>
              <span>종료일 *</span>
              <input type="date" {...register("tripEnd")} />
              <FieldError message={validationMessages.tripEnd} />
            </label>
            <label>
              <span>작성일 *</span>
              <input type="date" {...register("applicationDate")} />
            </label>
            <label className="field-span-two">
              <span>출장지 *</span>
              <input
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
                <option value="public">대중교통</option>
                <option value="car">자가용</option>
                <option value="ride">차량동승</option>
                <option value="charter">전세버스</option>
              </select>
            </label>
            <label className="field-span-three">
              <span>출장목적 *</span>
              <input
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
        />
        <FieldError message={validationMessages.routes} />

        <section className="form-section form-section-wide" aria-labelledby="cost-title">
          <div className="section-heading">
            <div>
              <span className="section-kicker">04</span>
              <h2 id="cost-title">비용과 첨부</h2>
            </div>
            <span className="section-note">해당 항목만 입력</span>
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
                    setValueAs: (value) => (value === "" ? null : Number(value)),
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
                    setValueAs: (value) => (value === "" ? null : Number(value)),
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
                    setValueAs: (value) => (value === "" ? null : Number(value)),
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
                    setValueAs: (value) => (value === "" ? null : Number(value)),
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
            <div><dt>성명</dt><dd>{values.name || "—"}</dd></div>
            <div><dt>일정</dt><dd>{values.tripStart || "—"} ~ {values.tripEnd || "—"}</dd></div>
            <div><dt>출장지</dt><dd>{values.destination || "—"}</dd></div>
            <div><dt>목적</dt><dd>{values.purpose || "—"}</dd></div>
            <div><dt>운임 합계</dt><dd>{totalFare.toLocaleString("ko-KR")}원</dd></div>
          </dl>
          <p className="privacy-note">
            입력 내용은 문서 생성에만 사용되며 서버에 보관하지 않습니다.
          </p>
        </div>
        {status && (
          <p className="status-message" role="status">
            {status}
          </p>
        )}
        <DownloadActions busy={busy} onDownload={download} />
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
