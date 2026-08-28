import { expect, test, type Page } from "@playwright/test";

async function fillValidForm(page: Page) {
  await page.getByPlaceholder("신청인 성명").fill("테스트교사");
  await page.getByPlaceholder("기관명 또는 지역").fill("서울 교육연수원");
  await page
    .getByPlaceholder("출장명령서와 동일하게 입력하세요")
    .fill("교육과정 담당자 연수 참석");
  await page.getByLabel("출발지 1").fill("천안");
  await page.getByLabel("도착지 1").fill("서울");
  await page.getByLabel("금액 1").fill("12000");
}

test("신청서를 작성해 HWP를 내려받는다", async ({ page }) => {
  await page.goto("/");
  await fillValidForm(page);
  await page.getByRole("button", { name: "돌아오는 경로 자동 추가" }).click();
  await page.getByRole("checkbox", { name: "입력 내용을 확인했습니다." }).check();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "HWP 내려받기" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(
    /^여비정산신청서_테스트교사_\d{4}-\d{2}-\d{2}\.hwp$/,
  );
  await expect(page.getByRole("status")).toContainText("내려받았습니다");
});

test("모바일에서 작성요령을 보고 PDF를 내려받는다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "작성요령" }).click();
  await expect(page.getByText(/출장 후 반드시 7일 이내/)).toBeVisible();
  await page.getByRole("tab", { name: "신청서 작성" }).click();
  await fillValidForm(page);
  await page.getByRole("checkbox", { name: "입력 내용을 확인했습니다." }).check();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "PDF 내려받기" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(
    /^여비정산신청서_테스트교사_\d{4}-\d{2}-\d{2}\.pdf$/,
  );
});

test("출장유형을 바꿔도 React 입력 제어 경고가 발생하지 않는다", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");
  await page.getByLabel("출장유형").selectOption("car");
  await page.getByLabel("출장유형").selectOption("public");

  expect(
    consoleErrors.filter((message) =>
      message.includes("changing an uncontrolled input"),
    ),
  ).toEqual([]);
  expect(
    consoleErrors.filter((message) =>
      message.includes("changing a controlled input to be uncontrolled"),
    ),
  ).toEqual([]);
});

test("시작일과 종료일을 가는 경로와 돌아오는 경로에 자동 반영한다", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("시작일 *").fill("2026-09-01");
  await expect(page.getByLabel("일자 1")).toHaveValue("2026-09-01");
  await page.getByLabel("종료일 *").fill("2026-09-03");
  await page.getByRole("button", { name: "돌아오는 경로 자동 추가" }).click();

  await expect(page.getByLabel("일자 1")).toHaveValue("2026-09-01");
  await expect(page.getByLabel("일자 2")).toHaveValue("2026-09-03");
});

test("차량동승은 운임·숙박비·식비 없이 확인 후 내려받는다", async ({ page }) => {
  await page.goto("/");
  await fillValidForm(page);
  await page.getByLabel("출장유형").selectOption("ride");
  await expect(page.getByLabel("금액 1")).toHaveValue("");
  await expect(page.getByText("차량동승: 운임 금액 없음")).toBeVisible();
  await expect(page.getByText("숙박비: 정산 없음")).toBeVisible();
  await expect(page.getByText("식비: 정산 없음")).toBeVisible();

  await page.getByRole("checkbox", { name: "입력 내용을 확인했습니다." }).check();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "HWP 내려받기" }).click();
  await downloadPromise;

  await expect(page.getByRole("status")).toContainText("내려받았습니다");
  await expect(page.getByRole("status")).not.toContainText("경로 1 금액");
});
