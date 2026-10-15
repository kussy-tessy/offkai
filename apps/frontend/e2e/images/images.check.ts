import { expect, test } from "@playwright/test";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7ioAAAAASUVORK5CYII=",
  "base64",
);

test("guide supports repeated single uploads, viewing and deletion", async ({
  page,
}, testInfo) => {
  const stored: { id: string; width: number; height: number; url: string }[] =
    [];
  let freshUrls = 0;
  await page.route(
    "**/api/offkai-event/test-event/participant-guide/images**",
    async (route) => {
      const req = route.request();
      const id = new URL(req.url()).pathname.split("/images/")[1];
      if (req.method() === "POST") {
        expect(req.headers()["content-type"]).toBe("application/octet-stream");
        expect(req.postDataBuffer()?.length).toBe(png.length);
        stored.push({
          id,
          width: 1,
          height: 1,
          url: `data:image/png;base64,${png.toString("base64")}`,
        });
        return route.fulfill({ status: 201, json: { id } });
      }
      if (req.method() === "DELETE") {
        stored.splice(
          stored.findIndex((image) => image.id === id),
          1,
        );
        return route.fulfill({ status: 204 });
      }
      freshUrls++;
      return route.fulfill({
        json: id ? stored.find((image) => image.id === id) : stored,
      });
    },
  );
  await page.goto("/?guide=edit");
  await expect(page.getByText("案内画像はまだありません。")).toBeVisible();
  for (const name of ["first.png", "second.png"]) {
    await page
      .locator("input[type=file]")
      .setInputFiles({ name, mimeType: "image/png", buffer: png });
    await page
      .getByRole("button", { name: "アップロード", exact: true })
      .click();
    await expect(page.locator("input[type=file]")).toBeEnabled();
    await expect(page.getByText(name, { exact: true })).toHaveCount(0);
  }
  await expect(
    page.getByRole("button", { name: /案内画像\d+を拡大/ }),
  ).toHaveCount(2);
  const beforeOpen = freshUrls;
  await page.getByRole("button", { name: "案内画像2を拡大" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(freshUrls).toBe(beforeOpen + 1);
  await expect(page.locator(".pswp__counter")).toHaveText("2 / 2");
  if (testInfo.project.name === "mobile") {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: 70, y: 400, id: 0 }],
    });
    for (let x = 90; x <= 350; x += 20) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: 400, id: 0 }],
      });
      await page.waitForTimeout(16);
    }
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } else {
    await page.getByRole("button", { name: "前の画像" }).click();
  }
  await expect(page.locator(".pswp__counter")).toHaveText("1 / 2");
  if (testInfo.project.name === "mobile") {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: 350, y: 400, id: 0 }],
    });
    for (let x = 330; x >= 70; x -= 20) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: 400, id: 0 }],
      });
      await page.waitForTimeout(16);
    }
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } else {
    await page.getByRole("button", { name: "次の画像" }).click();
  }
  await expect(page.locator(".pswp__counter")).toHaveText("2 / 2");
  await page.getByRole("button", { name: "閉じる", exact: true }).click();
  await page.getByRole("button", { name: "案内画像1を削除" }).click();
  await page.getByRole("button", { name: "削除する", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /案内画像\d+を拡大/ }),
  ).toHaveCount(1);
  await page.goto("/?guide=view");
  await expect(
    page.getByRole("button", { name: "案内画像1を拡大" }),
  ).toBeVisible();
  await expect(page.locator("input[type=file]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /削除/ })).toHaveCount(0);
});
test("selection, validation and retry do not resend successful images", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("input[type=file]").setInputFiles([
    { name: "good.png", mimeType: "image/png", buffer: png },
    { name: "retry.png", mimeType: "image/png", buffer: png },
    { name: "photo.heic", mimeType: "image/heic", buffer: png },
    { name: "large.png", mimeType: "image/png", buffer: Buffer.alloc(1025) },
  ]);
  await expect(page.getByRole("alert")).toContainText("HEIC");
  await expect(page.getByRole("alert")).toContainText("large.png");
  await page.getByRole("button", { name: "アップロード", exact: true }).click();
  await expect(
    page.getByText("アップロードに失敗しました。再試行できます。"),
  ).toBeVisible();
  await page.getByRole("button", { name: "未完了の画像を再送信" }).click();
  await expect(page.getByTestId("results")).toHaveText("good.png,retry.png");
  await page.getByRole("button", { name: "good.pngを一覧から外す" }).click();
  await expect(
    page.getByRole("img", { name: "good.png", exact: true }),
  ).toHaveCount(0);
});

test("desktop drop accepts images", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  await page.goto("/");
  await page
    .locator('[aria-label="画像アップロード"] > div')
    .first()
    .evaluate((element) => {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(
        new File([new Uint8Array([1, 2, 3])], "dropped.png", {
          type: "image/png",
        }),
      );
      element.dispatchEvent(
        new DragEvent("drop", { bubbles: true, dataTransfer }),
      );
    });
  await expect(page.getByText("dropped.png", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "アップロード", exact: true }).click();
  await expect(page.getByTestId("results")).toHaveText("dropped.png");
});

test("viewer opens, zooms, closes and reopens", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "画像を開く", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const zoom = page
    .locator(".pswp__zoom-wrap")
    .filter({ has: page.locator("img") })
    .first();
  await expect(page.locator(".pswp__img").first()).toBeVisible();
  const before = await zoom.getAttribute("style");
  if (testInfo.project.name === "mobile") {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: 170, y: 350, id: 0 },
        { x: 220, y: 400, id: 1 },
      ],
    });
    for (let i = 1; i <= 8; i++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          { x: 170 - i * 10, y: 350 - i * 10, id: 0 },
          { x: 220 + i * 10, y: 400 + i * 10, id: 1 },
        ],
      });
      await page.waitForTimeout(20);
    }
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } else {
    await page.getByRole("button", { name: "拡大・縮小" }).click();
  }
  await expect.poll(() => zoom.getAttribute("style")).not.toBe(before);
  await page.getByRole("button", { name: "閉じる", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("open")).toHaveText("false");
  await expect(
    page.getByRole("button", { name: "画像を開く", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "画像を開く", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("kigurumi upload, thumbnail, replace and delete", async ({ page }) => {
  let uploads = 0;
  let deleted = false;
  await page.route("**/api/kigurumi/test-kigurumi/image**", async route => {
    if (route.request().method() === "POST") {
      uploads++;
      expect(route.request().headers()["content-type"]).toBe("application/octet-stream");
      return route.fulfill({ json: { ok: true } });
    }
    if (route.request().method() === "DELETE") { deleted = true; return route.fulfill({ status: 204 }); }
    return route.fulfill({ json: { url: `data:image/png;base64,${png.toString("base64")}`, width: 1, height: 1 } });
  });
  await page.goto("/kigurumi.html?edit");
  for (const label of ["画像を登録", "画像を変更"]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await page.locator("input[type=file]").setInputFiles({ name: "character.png", mimeType: "image/png", buffer: png });
    await page.getByRole("button", { name: "アップロード", exact: true }).click();
    await expect(page.getByRole("img", { name: "キャラ(作品)", exact: true })).toBeVisible();
    await expect(page.locator("input[type=file]")).toHaveCount(0);
  }
  expect(uploads).toBe(2);
  await page.getByRole("button", { name: "キャラ(作品)の画像を拡大" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "画像を削除", exact: true }).click();
  await expect(page.getByRole("button", { name: "画像を登録", exact: true })).toBeVisible();
  expect(deleted).toBe(true);
});

test("kigurumi name link fetches a fresh image without displaying a thumbnail", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/kigurumi/test-kigurumi/image**", async route => {
    requests++;
    expect(new URL(route.request().url()).searchParams.get("eventId")).toBe("test-event");
    return route.fulfill({ json: { url: `data:image/png;base64,${png.toString("base64")}`, width: 1, height: 1 } });
  });
  await page.goto("/kigurumi.html");
  await expect(page.getByRole("button", { name: "キャラ(作品)の画像を拡大" })).toBeVisible();
  await expect(page.locator("img")).toHaveCount(0);
  expect(requests).toBe(0);
  await page.getByRole("button", { name: "キャラ(作品)の画像を拡大" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(requests).toBe(1);
});
