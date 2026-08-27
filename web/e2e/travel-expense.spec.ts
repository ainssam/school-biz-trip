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
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "PDF 내려받기" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(
    /^여비정산신청서_테스트교사_\d{4}-\d{2}-\d{2}\.pdf$/,
  );
});
