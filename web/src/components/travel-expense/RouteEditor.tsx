import type {
  FieldArrayWithId,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
  UseFormRegister,
} from "react-hook-form";
import type { TravelExpenseInput, TravelType } from "@/lib/travel-expense/schema";

type RouteEditorProps = {
  fields: FieldArrayWithId<TravelExpenseInput, "routes", "id">[];
  register: UseFormRegister<TravelExpenseInput>;
  travelType: TravelType;
  append: UseFieldArrayAppend<TravelExpenseInput, "routes">;
  remove: UseFieldArrayRemove;
  onAddReturn: () => void;
};

const transportOptions = [
  "철도",
  "고속버스",
  "시외버스",
  "자가용",
  "차량동승",
  "전세버스",
] as const;

export function RouteEditor({
  fields,
  register,
  travelType,
  append,
  remove,
  onAddReturn,
}: RouteEditorProps) {
  const publicTransit = travelType === "public";

  return (
    <section className="form-section form-section-wide" aria-labelledby="route-title">
      <div className="section-heading">
        <div>
          <span className="section-kicker">03</span>
          <h2 id="route-title">이동 경로</h2>
        </div>
        <span className="section-note">최대 4개 구간</span>
      </div>

      <div className="route-list">
        {fields.map((field, index) => (
          <fieldset className="route-card" key={field.id}>
            <legend>경로 {index + 1}</legend>
            <div className="route-grid">
              <label>
                <span>일자</span>
                <input
                  aria-label={`일자 ${index + 1}`}
                  type="date"
                  {...register(`routes.${index}.date`)}
                />
              </label>
              <label>
                <span>교통편</span>
                <select
                  aria-label={`교통편 ${index + 1}`}
                  {...register(`routes.${index}.transport`)}
                >
                  {transportOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>출발지</span>
                <input
                  aria-label={`출발지 ${index + 1}`}
                  maxLength={16}
                  placeholder="예: 천안"
                  {...register(`routes.${index}.from`)}
                />
              </label>
              <label>
                <span>도착지</span>
                <input
                  aria-label={`도착지 ${index + 1}`}
                  maxLength={16}
                  placeholder="예: 서울"
                  {...register(`routes.${index}.to`)}
                />
              </label>
              <label>
                <span>등급</span>
                <select
                  aria-label={`등급 ${index + 1}`}
                  {...register(`routes.${index}.grade`)}
                >
                  <option value="제2호">제2호</option>
                  <option value="제1호">제1호</option>
                  <option value="미기재">미기재</option>
                </select>
              </label>
              <label>
                <span>금액</span>
                {publicTransit ? (
                  <input
                    aria-label={`금액 ${index + 1}`}
                    inputMode="numeric"
                    min="0"
                    type="number"
                    {...register(`routes.${index}.fare`, {
                      setValueAs: (value) => Number(value || 0),
                    })}
                  />
                ) : (
                  <input
                    aria-label={`금액 ${index + 1}`}
                    readOnly
                    value="미기재"
                  />
                )}
              </label>
            </div>
            {fields.length > 1 && (
              <button
                className="text-button danger-text"
                onClick={() => remove(index)}
                type="button"
              >
                이 경로 삭제
              </button>
            )}
          </fieldset>
        ))}
      </div>

      <div className="route-actions">
        <button
          className="button button-quiet"
          disabled={fields.length >= 4}
          onClick={onAddReturn}
          type="button"
        >
          돌아오는 경로 자동 추가
        </button>
        <button
          className="text-button"
          disabled={fields.length >= 4}
          onClick={() =>
            append({
              date: fieldDate(fields[0]?.date),
              transport: publicTransit ? "철도" : transportFor(travelType),
              from: "",
              to: "",
              grade: "제2호",
              fare: publicTransit ? 0 : "미기재",
            })
          }
          type="button"
        >
          + 경로 직접 추가
        </button>
      </div>
    </section>
  );
}

function fieldDate(date: string | undefined): string {
  return date || new Date().toISOString().slice(0, 10);
}

export function transportFor(travelType: TravelType): string {
  return {
    public: "철도",
    car: "자가용",
    ride: "차량동승",
    charter: "전세버스",
  }[travelType];
}
