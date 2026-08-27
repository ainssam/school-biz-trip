const guides = [
  {
    title: "제출기한과 묶는 순서",
    body: "여비 정산신청서는 출장 후 반드시 7일 이내에 제출합니다. 스테이플러 대신 정산서 → 교통비 관련 영수증 → 출장신청서 출력물 순으로 클립 고정합니다. 교통비 영수증이 없으면 영수증은 생략합니다.",
  },
  {
    title: "출장명령서와 NEIS",
    body: "출장 일시와 목적은 출장명령서와 동일하게 작성합니다. NEIS 출장신청의 이동사항에는 자가용·철도·버스·전세버스 등 교통수단을 표시합니다.",
  },
  {
    title: "식비·일비 지급",
    body: "실제 교통비(자가용은 대중교통 요금 기준), 식비 25,000원, 일비 25,000원을 지급합니다. 차량 동승 또는 교통비 영수증이 없어도 식비와 일비 지급을 위해 정산서를 제출합니다.",
  },
  {
    title: "당일·숙박 출장",
    body: "당일 출장은 교통비만 정산하고, 1박 2일 출장은 숙박비와 교통비를 정산합니다. 출장기관에서 숙식을 제공하면 숙식비를 지급하지 않으며 관련 공문을 제출합니다.",
  },
  {
    title: "자가용과 차량동승",
    body: "자가용은 금액을 적지 않고 출장지 주유영수증 또는 고속도로 영수증을 첨부합니다. 교통비는 운전자에게만 지급하며 동승자의 식비와 일비는 동일하게 지급합니다.",
  },
  {
    title: "대중교통과 전세버스",
    body: "기차·버스 등 대중교통은 승차권 영수증을 첨부하고 실제 금액을 적습니다. 전세버스 출장도 정산서를 제출하며 식비와 일비(1/2 감액)만 지급합니다.",
  },
  {
    title: "숙박비와 법인카드",
    body: "숙박비는 학교 법인카드로 결제합니다. 실비 인정 상한은 도내 7만원, 광역 8만원, 서울 10만원이며 출장 전에 행정실에서 법인카드를 수령합니다.",
  },
  {
    title: "인정되는 영수증",
    body: "현금영수증 또는 신용카드 영수증만 인정합니다. 간이영수증은 인정하지 않습니다.",
  },
] as const;

export function GuideView() {
  return (
    <section className="guide-view" aria-labelledby="guide-title">
      <div className="guide-intro">
        <p className="eyebrow">원본 안내문 기준</p>
        <h2 id="guide-title">제출 전에 이것만 확인하세요</h2>
        <p>
          학교별 내부 절차가 다르면 소속 학교 행정실 안내를 우선 확인하세요.
          원본에 포함된 교직원 실명은 공개 화면에서 제외했습니다.
        </p>
      </div>
      <div className="guide-grid">
        {guides.map((guide, index) => (
          <article className="guide-card" key={guide.title}>
            <span className="guide-index" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3>{guide.title}</h3>
            <p>{guide.body}</p>
          </article>
        ))}
      </div>
      <aside className="notice-strip">
        정산서를 제출하지 않으면 출장 여부를 확인하기 어려워 여비가 지급되지 않을 수
        있습니다.
      </aside>
    </section>
  );
}
