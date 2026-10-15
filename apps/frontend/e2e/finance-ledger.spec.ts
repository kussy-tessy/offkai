import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page, request }) => {
	await request.post("/api/reset");
	await page.setViewportSize({ width: 390, height: 844 });
});

test("参加費を一覧と部分徴収から記録できる", async ({ page }) => {
	const pageErrors: string[] = [];
	page.on("pageerror", (error) => pageErrors.push(error.message));
	await page.goto("/collection");

	const table = page.getByRole("table", { name: "参加費の徴収" });
	await expect(table.locator("thead th")).toHaveText([
		"",
		"参加者",
		"参加費",
		"参加費未徴収額",
		"個別請求",
		"",
	]);
	const firstRow = table.locator("tbody tr").first();
	await expect(firstRow.locator("td").nth(0).getByRole("checkbox")).toHaveCount(
		1,
	);
	await expect(firstRow.locator("td").nth(1)).toContainText("通常参加A");

	await page
		.getByRole("button", { name: "通常参加Aの部分徴収", exact: true })
		.click();
	const drawer = page.getByRole("dialog");
	const breakdown = drawer
		.getByText("参加費の明細", { exact: true })
		.locator("..");
	await expect(breakdown).toContainText("日ロケ");
	await expect(breakdown).toContainText("4,000円");
	await expect(breakdown).toContainText("土泊");
	await expect(breakdown).toContainText("10,000円");
	await expect(breakdown).toContainText("合計");
	await expect(breakdown).toContainText("14,000円");
	await expect(drawer.getByLabel("方法", { exact: true })).toHaveCount(0);
	await expect(drawer.getByLabel("支払った人", { exact: true })).toHaveCount(0);
	await drawer.getByLabel(/^徴収する請求/).selectOption("base:day:a");
	await drawer.getByLabel("今回徴収した金額").fill("500");
	await drawer.getByRole("button", { name: "保存", exact: true }).click();
	await expect(drawer).toBeHidden();
	await expect(firstRow.locator("td").nth(2)).toHaveText("14,000円");
	await expect(firstRow.locator("td").nth(3)).toHaveText("13,500円");

	await page.getByRole("checkbox", { name: /通常参加B.*一括徴収/ }).click();
	await page
		.getByRole("dialog")
		.getByRole("button", { name: "徴収する", exact: true })
		.click();
	await expect(page.getByRole("status")).toContainText("14,000円");
	await page.getByRole("checkbox", { name: "未収がある人だけ表示" }).click();
	await expect(table.getByText("通常参加B", { exact: true })).toHaveCount(0);
	await expect
		.poll(() =>
			page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
		)
		.toBe(true);
	expect(pageErrors).toEqual([]);
});

test("区分別収支・経費の直接記録・協力金と配分の個別設定", async ({ page }) => {
	const pageErrors: string[] = [];
	page.on("pageerror", (error) => pageErrors.push(error.message));
	await page.goto("/settlement");

	await expect(
		page.getByRole("button", { name: "入出金を記録", exact: true }),
	).toHaveCount(0);
	await expect(page.getByText("一時立替", { exact: true })).toHaveCount(0);
	const day = page.locator("section.card").filter({
		has: page.getByRole("heading", { name: "日ロケ", exact: true }),
	});
	await day.getByRole("button", { name: "支出を追加", exact: true }).click();
	let drawer = page.getByRole("dialog");
	await expect(drawer.getByLabel(/^精算区分/)).toHaveCount(0);
	await drawer.getByRole("button", { name: "キャンセル", exact: true }).click();

	await day.getByRole("button", { name: "収入を追加", exact: true }).click();
	drawer = page.getByRole("dialog");
	await expect(drawer.getByLabel(/^精算区分/)).toHaveCount(0);
	await expect(drawer.locator("h3")).toContainText("日ロケ");
	await expect(drawer.getByLabel("費目", { exact: true })).toHaveAttribute(
		"placeholder",
		"例: 〇〇さんからカンパ",
	);
	await expect(
		drawer.getByRole("checkbox", {
			name: "この金額を受領済みとして同時に記録する",
		}),
	).toBeChecked();
	await drawer.getByLabel("費目", { exact: true }).fill("応援カンパ");
	await drawer.getByLabel("金額", { exact: true }).fill("3000");
	await drawer.getByRole("button", { name: "保存", exact: true }).click();
	await expect(drawer).toBeHidden();
	await expect(day).toContainText("応援カンパ");

	await expect(day).toContainText("参加費");
	await expect(day).toContainText("12,000円");
	await expect(day.getByRole("button", { name: "費目を追加" })).toHaveCount(0);
	await day.getByRole("button", { name: "支出を追加", exact: true }).click();
	drawer = page.getByRole("dialog");
	await expect(drawer.getByLabel("通常参加Aの重み")).toHaveCount(0);
	await drawer.getByLabel("内容", { exact: true }).fill("更衣室");
	await drawer.getByLabel("金額", { exact: true }).fill("900");
	await expect(
		drawer.getByText("この金額を支払済みとして同時に記録する"),
	).toHaveCount(0);
	await drawer.getByRole("button", { name: "保存", exact: true }).click();
	await expect(drawer).toBeHidden();
	await expect(day).toContainText("更衣室");
	await expect(day).toContainText("6,900円");
	await day.getByRole("button", { name: "支出を追加", exact: true }).click();
	drawer = page.getByRole("dialog");
	await drawer.getByLabel("内容", { exact: true }).fill("車出し");
	await drawer.getByRole("radio", { name: "協力金", exact: true }).check();
	await drawer.getByLabel("1人あたりの金額").fill("500");
	await drawer
		.getByRole("checkbox", { name: "通常参加A", exact: true })
		.check();
	await drawer
		.getByRole("checkbox", { name: "通常参加B", exact: true })
		.check();
	await expect(drawer.getByLabel("通常参加Aの協力金")).toHaveCount(0);
	await expect(drawer).toContainText("合計 1,000円");
	await drawer.getByRole("checkbox", { name: "個人別に金額を変える" }).check();
	await drawer.getByLabel("通常参加Bの協力金").fill("700");
	await drawer.getByRole("radio", { name: "個別", exact: true }).check();
	await drawer.getByLabel("途中参加Cの重み").fill("0.5");
	await drawer.getByRole("button", { name: "保存", exact: true }).click();
	await expect(drawer).toBeHidden();
	await day.getByRole("button", { name: "車出しを編集" }).click();
	drawer = page.getByRole("dialog");
	await expect(
		drawer.getByRole("checkbox", { name: "個人別に金額を変える" }),
	).toBeChecked();
	await expect(drawer.getByLabel("通常参加Bの協力金")).toHaveValue("700");
	await drawer.evaluate((node) => {
		node.scrollTop = 400;
	});
	await expect
		.poll(() =>
			drawer.locator("h3").evaluate((node) => {
				const rect = node.getBoundingClientRect();
				return rect.top >= 0 && rect.bottom < innerHeight;
			}),
		)
		.toBe(true);
	await expect(drawer.getByLabel("途中参加Cの重み")).toHaveValue("0.5");
	await expect(drawer.locator("h3")).toContainText("日ロケ");
	await drawer.getByRole("button", { name: "キャンセル", exact: true }).click();

	await expect(
		page.getByRole("button", { name: "別会計の支払いを追加", exact: true }),
	).toHaveCount(0);
	await expect
		.poll(() =>
			page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
		)
		.toBe(true);
	await page.setViewportSize({ width: 1280, height: 900 });
	const incomeHeading = day.getByRole("heading", { name: "収入", exact: true });
	const expenseHeading = day.getByRole("heading", {
		name: "支出",
		exact: true,
	});
	const left = await incomeHeading.boundingBox();
	const right = await expenseHeading.boundingBox();
	expect(left!.x).toBeLessThan(right!.x);
	await page.setViewportSize({ width: 390, height: 844 });
	await day.evaluate((node) =>
		window.scrollTo(0, node.getBoundingClientRect().top + window.scrollY + 80),
	);
	await expect
		.poll(() =>
			day
				.getByRole("heading", { name: "日ロケ", exact: true })
				.evaluate((node) => {
					const rect = node.getBoundingClientRect();
					return rect.top >= 0 && rect.top < 100;
				}),
		)
		.toBe(true);
	expect(pageErrors).toEqual([]);
});

test("イベント収支は別会計を除外し、各欄の末尾に合計を表示する", async ({
	page,
	request,
}) => {
	const commands = [
		{
			action: "put",
			resource: "charges",
			value: {
				id: "hat",
				personId: "a",
				categoryId: null,
				title: "帽子",
				amount: 500,
				note: "",
			},
		},
		{
			action: "put",
			resource: "expenses",
			value: {
				id: "hat-payment",
				categoryId: null,
				title: "帽子代",
				amount: 500,
				kind: "independent",
				allocation: { mode: "weights", rows: [] },
				payerId: null,
				recipients: [],
				note: "",
			},
		},
		{ action: "collectPlanned", personId: "a" },
	];
	for (const [revision, command] of commands.entries()) {
		const response = await request.post("/api/ledger", {
			data: { ...command, revision, requestId: crypto.randomUUID() },
		});
		expect(response.ok(), await response.text()).toBe(true);
	}
	await page.goto("/settlement");
	const summary = page.getByLabel("イベントの収支");
	const cards = summary.locator(".card");
	await expect(cards.nth(0)).toContainText("見込 32,000円");
	await expect(cards.nth(0)).toContainText("受領済み 14,000円");
	await expect(cards.nth(1)).toContainText("6,000円");
	await expect(cards.nth(2)).toContainText("見込 26,000円");
	await expect(cards.nth(2)).toContainText("受領済み収入 − 支出 8,000円");
	const day = page.locator("section.card").filter({
		has: page.getByRole("heading", { name: "日ロケ", exact: true }),
	});
	for (const [heading, total, button] of [
		["収入", "収入合計", "収入を追加"],
		["支出", "支出合計", "支出を追加"],
	]) {
		const column = day
			.getByRole("heading", { name: heading, exact: true })
			.locator("../..");
		await expect(column.locator(":scope > :last-child")).toContainText(total);
		await expect(
			column.getByRole("button", { name: button, exact: true }),
		).toHaveText("");
	}
});

test("収入・支出の直接配分は金額一致を確認して保存する", async ({ page }) => {
	await page.goto("/settlement");
	const night = page
		.locator("section.card")
		.filter({ has: page.getByRole("heading", { name: "土泊", exact: true }) });
	for (const kind of ["支出", "収入"]) {
		await night
			.getByRole("button", { name: `${kind}を追加`, exact: true })
			.click();
		const drawer = page.getByRole("dialog");
		await expect(drawer.getByLabel(/^精算区分/)).toHaveCount(0);
		await expect(drawer.getByLabel(/^支払元/)).toHaveCount(0);
		if (kind === "支出") {
			await expect(
				drawer.getByRole("radio", { name: "通常", exact: true }),
			).toBeChecked();
			await expect(drawer.getByRole("radio")).toHaveCount(4);
		}
		await drawer
			.getByLabel(kind === "支出" ? "内容" : "費目", { exact: true })
			.fill("配分テスト");
		await drawer.getByLabel("金額", { exact: true }).fill("1000");
		await drawer.getByRole("radio", { name: "個別", exact: true }).check();
		await expect(drawer.getByRole("button", { name: /全員[01]/ })).toHaveCount(
			0,
		);
		await expect(
			drawer.getByLabel("この区分の参加者", { exact: true }),
		).toHaveCount(2);
		await drawer.getByLabel("配分方法").selectOption("fixed");
		await expect(
			drawer.getByRole("button", { name: "保存", exact: true }),
		).toBeDisabled();
		await drawer.getByLabel("通常参加Aの金額").fill("600");
		await drawer.getByLabel("通常参加Bの金額").fill("400");
		await expect(
			drawer.getByRole("button", { name: "保存", exact: true }),
		).toBeEnabled();
		await drawer.getByRole("button", { name: "保存", exact: true }).click();
		await expect(drawer).toBeHidden();
	}
});

test("金額欄は数式で入力でき、配分行はコンパクトに表示する", async ({
	page,
}) => {
	await page.goto("/settlement");
	const day = page.locator("section.card").filter({
		has: page.getByRole("heading", { name: "日ロケ", exact: true }),
	});
	for (const kind of ["収入", "支出"]) {
		await day
			.getByRole("button", { name: `${kind}を追加`, exact: true })
			.click();
		const drawer = page.getByRole("dialog");
		await drawer
			.getByLabel(kind === "収入" ? "費目" : "内容", { exact: true })
			.fill("数式テスト");
		await drawer.getByLabel("金額", { exact: true }).fill("500*2");
		await drawer.getByRole("radio", { name: "個別", exact: true }).check();
		const row = drawer.locator(".allocation-row").first();
		expect((await row.boundingBox())!.height).toBeLessThanOrEqual(44);
		const group = row.locator("xpath=ancestor::fieldset");
		expect(
			await group.evaluate((node) => getComputedStyle(node).backgroundColor),
		).toBe("rgba(0, 0, 0, 0)");
		await drawer.getByLabel("配分方法").selectOption("fixed");
		await drawer.getByLabel("通常参加Aの金額").fill("300+300");
		await drawer.getByLabel("通常参加Bの金額").fill("200*2");
		await drawer.getByLabel("途中参加Cの金額").fill("0");
		await drawer.getByLabel("途中参加Cの金額").blur();
		await expect(
			drawer.getByRole("button", { name: "保存", exact: true }),
		).toBeEnabled();
		await drawer.getByLabel("金額", { exact: true }).fill("1/0");
		await drawer.getByLabel("金額", { exact: true }).blur();
		await expect(drawer).toBeVisible();
		expect(
			await drawer
				.getByLabel("金額", { exact: true })
				.evaluate((node: HTMLInputElement) => node.checkValidity()),
		).toBe(false);
		await drawer.getByLabel("金額", { exact: true }).fill("500*2");
		await drawer.getByRole("button", { name: "保存", exact: true }).click();
		await expect(drawer).toBeHidden();
	}
});

test("過徴収と区分別の精算案・調整額を表示する", async ({ page, request }) => {
	const commands = [
		{ action: "collectPlanned", personId: "a" },
		{
			action: "put",
			resource: "categories",
			value: {
				id: "day",
				questionId: "q-day",
				name: "日ロケ",
				baseAmount: 3000,
				memberIds: ["a", "b", "c"],
			},
		},
		{
			action: "put",
			resource: "adjustments",
			value: {
				id: "adjust-a",
				personId: "a",
				mode: "delta",
				amount: -200,
				note: "調整理由",
			},
		},
	];
	for (const [revision, command] of commands.entries()) {
		const response = await request.post("/api/ledger", {
			data: { ...command, revision, requestId: crypto.randomUUID() },
		});
		expect(response.ok(), await response.text()).toBe(true);
	}
	await page.goto("/collection");
	const first = page
		.getByRole("table", { name: "参加費の徴収" })
		.locator("tbody tr")
		.first();
	await expect(first.locator("td").nth(3)).toContainText("-1,000円");
	await expect(first).toContainText("過徴収");
	await page.goto("/settlement");
	const table = page.getByRole("table", { name: "個人別の返金額" });
	await expect(table.locator("thead th")).toHaveText([
		"参加者名",
		"返金総額",
		"土泊",
		"日ロケ",
		"端数処理前の合計",
		"調整額",
	]);
	await expect(table.locator("tbody tr").first()).toContainText("-200");
	await table.getByRole("button", { name: "通常参加A", exact: true }).click();
	const details = page.getByRole("region", { name: "個人別の精算内訳" });
	await expect(
		details.getByRole("heading", { name: "日ロケ", exact: true }),
	).toBeVisible();
	await expect(
		details.getByRole("heading", { name: "土泊", exact: true }),
	).toBeVisible();
	await expect(
		details.locator("p").filter({ hasText: "フェリー代" }),
	).toContainText("-3,000円");
	await expect(
		details.locator("section").filter({
			has: page.getByRole("heading", { name: "日ロケ", exact: true }),
		}),
	).toContainText("参加費（予定）");
	await expect(details.locator("dl").first()).toContainText("9,800円");
	await expect(details.locator("dl").first()).toContainText("-200円");
	await expect(details.locator("dl").last()).toContainText("返金 10,800円");
	await expect(details).toContainText("参加費（過徴収）");
	await expect(details).toContainText("+1,000円");
	await expect(
		page.getByLabel("イベントの収支").locator(".card").nth(3),
	).toContainText("200円");
});

test("確定なしで返金し、カンパ保存後は差額を即反映する", async ({
	page,
	request,
}) => {
	for (const [revision, command] of [
		{ action: "collectPlanned", personId: "a" },
	].entries()) {
		const response = await request.post("/api/ledger", {
			data: { ...command, revision, requestId: crypto.randomUUID() },
		});
		expect(response.ok()).toBe(true);
	}
	await page.goto("/refund");
	await expect(
		page.getByRole("heading", { name: "返金・追加徴収", exact: true }),
	).toBeVisible();
	const table = page.getByRole("table").first();
	await expect(table.locator("thead th")).toHaveText([
		"返金",
		"参加者",
		"今の返金／追加徴収",
		"別会計",
		"返金済み",
		"追加徴収済み",
		"操作",
	]);
	const row = table.locator("tbody tr").first();
	await expect(row.locator("td").nth(2)).toHaveText("返金 11,000円");
	await row.getByRole("checkbox").click();
	await expect(row.locator("td").nth(2)).toHaveText("精算済み");
	await expect(row.locator("td").nth(4)).toHaveText("11,000円");
	await expect(row.locator("td").nth(5)).toHaveText("0円");
	const saved = await request.post("/api/ledger", {
		data: {
			revision: 2,
			requestId: crypto.randomUUID(),
			action: "put",
			resource: "incomes",
			value: {
				id: "after-refund",
				categoryId: "day",
				title: "追加カンパ",
				amount: 900,
				note: "",
				allocation: {
					mode: "weights",
					rows: ["a", "b", "c"].map((personId) => ({ personId, value: 1 })),
				},
			},
		},
	});
	expect(saved.ok(), await saved.text()).toBe(true);
	await page.reload();
	await expect(row.locator("td").nth(2)).toHaveText("返金 300円");
	await expect(row.locator("td").nth(4)).toHaveText("11,000円");
	await page.goto("/settlement");
	await expect(
		page.getByRole("button", { name: "差額を確認して確定" }),
	).toHaveCount(0);

	await expect(page.getByText(/現金で/)).toHaveCount(0);
});

test("参加者を固定した手動調整を保存・解除できる", async ({
	page,
	request,
}) => {
	await page.goto("/settlement");
	const row = page
		.getByRole("table", { name: "個人別の返金額" })
		.locator("tbody tr")
		.first();
	const open = () =>
		row.getByRole("button", { name: "通常参加Aの調整", exact: true }).click();
	const dialog = page.getByRole("dialog", {
		name: "通常参加Aの返金の手動調整を編集",
	});
	await open();
	await expect(dialog.getByRole("combobox")).toHaveCount(0);
	await expect(
		dialog.getByRole("radio", { name: "調整しない", exact: true }),
	).toBeChecked();
	await dialog.getByRole("radio", { name: "加算・減算", exact: true }).check();
	await dialog.getByRole("spinbutton").fill("-200");
	await dialog.getByRole("button", { name: "保存", exact: true }).click();
	await expect(dialog).toHaveCount(0);
	await expect(row.locator("td").last()).toContainText("-200");
	await open();
	await expect(
		dialog.getByRole("radio", { name: "加算・減算", exact: true }),
	).toBeChecked();
	await dialog
		.getByRole("radio", { name: "返金総額を指定", exact: true })
		.check();
	await dialog.getByRole("spinbutton").fill("1234");
	await dialog.getByRole("button", { name: "保存", exact: true }).click();
	await expect(dialog).toHaveCount(0);
	await expect(row.locator("td").nth(1)).toHaveText("1,234");
	await open();
	await dialog.getByRole("radio", { name: "調整しない", exact: true }).check();
	await expect(dialog.getByRole("spinbutton")).toHaveCount(0);
	await dialog.getByRole("button", { name: "保存", exact: true }).click();
	await expect(dialog).toHaveCount(0);
	const data = await (await request.get("/api/ledger")).json();
	expect(data.state.adjustments).toHaveLength(0);
	await expect(row.locator("td").nth(1)).toHaveText("11,000");
	await expect(row.getByRole("button", { name: /解除/ })).toHaveCount(0);
});

test("未徴収を残して返金した人は予定参加費を再徴収しない", async ({
	page,
	request,
}) => {
	const initial = await (await request.get("/api/ledger")).json();
	const charge = initial.state.charges.find(
		(c: { personId: string; categoryId: string }) =>
			c.personId === "a" && c.categoryId === "day",
	);
	const response = await request.post("/api/ledger", {
		data: {
			action: "put",
			resource: "payments",
			revision: 0,
			requestId: crypto.randomUUID(),
			value: {
				id: "partial-fee",
				kind: "collection",
				referenceId: charge.id,
				amount: 5000,
				at: new Date().toISOString(),
				note: "",
				migrated: false,
			},
		},
	});
	expect(response.ok()).toBe(true);
	await page.goto("/refund");
	const row = page
		.getByRole("table", { name: "返金・追加徴収" })
		.locator("tbody tr")
		.first();
	await expect(row).toContainText("返金 2,000円");
	await row.getByRole("checkbox").click();
	await expect(row).toContainText("精算済み");
	await page.goto("/collection");
	const collection = page
		.getByRole("table", { name: "参加費の徴収" })
		.locator("tbody tr")
		.first();
	await expect(collection.getByRole("checkbox")).toHaveCount(0);
	await expect(collection).toContainText("差額で精算済み");
	await expect(
		collection.getByRole("button", { name: "通常参加Aの部分徴収" }),
	).toHaveCount(0);
	const saved = await (await request.get("/api/ledger")).json();
	const blocked = await request.post("/api/ledger", {
		data: {
			action: "collectPlanned",
			personId: "a",
			revision: saved.revision,
			requestId: crypto.randomUUID(),
		},
	});
	expect(blocked.ok()).toBe(false);
});

test("未徴収から最終負担だけ追加徴収し、内部状態や切替操作は表示しない", async ({
	page,
}) => {
	await page.goto("/refund");
	const rows = page
		.getByRole("table", { name: "返金・追加徴収" })
		.locator("tbody tr");
	await expect(rows.first()).toContainText("追加徴収 3,000円");
	await rows
		.first()
		.getByRole("button", { name: "通常参加Aの追加徴収", exact: true })
		.click();
	const dialog = page.getByRole("dialog");
	await dialog.getByRole("button", { name: "保存", exact: true }).click();
	await expect(dialog).toHaveCount(0);
	await expect(rows.first()).toContainText("精算済み");
	await expect(page.getByText("差額精算中", { exact: true })).toHaveCount(0);
	await expect(page.getByText("参加費徴収中", { exact: true })).toHaveCount(0);
	await expect(
		page.getByRole("button", { name: /差額精算に切り替える/ }),
	).toHaveCount(0);
	await expect(rows.nth(2)).toContainText("精算済み");
	await page.reload();
	await expect(rows.nth(2)).toContainText("精算済み");
	await page.goto("/collection");
	const collection = page
		.getByRole("table", { name: "参加費の徴収" })
		.locator("tbody tr");
	await expect(collection.first().getByRole("checkbox")).toHaveCount(0);
	await expect(collection.first().locator("td").first()).toHaveText(
		"差額で精算済み",
	);
});

test("返金後も別会計の未徴収を表示し、その画面で集金できる", async ({
	page,
	request,
}) => {
	const post = async (command: object) => {
		const state = await (await request.get("/api/ledger")).json();
		const response = await request.post("/api/ledger", {
			data: {
				...command,
				revision: state.revision,
				requestId: crypto.randomUUID(),
			},
		});
		expect(response.ok(), await response.text()).toBe(true);
	};
	await post({ action: "collectPlanned", personId: "a" });
	await post({
		action: "put",
		resource: "charges",
		value: {
			id: "hat-unpaid",
			personId: "a",
			categoryId: null,
			title: "帽子代",
			amount: 1000,
			note: "",
			confirmed: true,
		},
	});
	await page.goto("/refund");
	const row = page
		.getByRole("table", { name: "返金・追加徴収" })
		.locator("tbody tr")
		.first();
	await expect(row).toContainText("返金 11,000円");
	await expect(row).toContainText("未徴収 1,000円");
	await row.getByRole("checkbox").click();
	await expect(row).toContainText("イベント分は精算済み");
	await expect(row.getByRole("checkbox")).not.toBeChecked();
	await page.goto("/collection");
	const collection = page
		.getByRole("table", { name: "参加費の徴収" })
		.locator("tbody tr")
		.first();
	await expect(collection.getByRole("checkbox")).toBeChecked();
	await expect(collection.getByRole("checkbox")).toBeDisabled();
	await expect(collection).toContainText("別会計 1,000円 が未収");
	await page.goto("/refund");
	await row
		.getByRole("button", { name: "通常参加Aの別会計を集金", exact: true })
		.click();
	const dialog = page.getByRole("dialog", { name: "別会計の集金" });
	await expect(dialog).toContainText("帽子代");
	await expect(dialog.getByRole("spinbutton")).toHaveValue("1000");
	await expect(dialog.getByText("参加費の明細", { exact: true })).toHaveCount(
		0,
	);
	await dialog.getByRole("button", { name: "保存", exact: true }).click();
	await expect(dialog).toHaveCount(0);
	await expect(row.locator("td").nth(2)).toHaveText("精算済み");
	await expect(row.locator("td").nth(3)).toHaveText("—");
	await expect(row.getByRole("checkbox")).toBeChecked();
	const saved = await (await request.get("/api/ledger")).json();
	expect(
		saved.state.payments.filter(
			(p: { kind: string; referenceId: string }) =>
				p.kind === "collection" && p.referenceId === "hat-unpaid",
		),
	).toHaveLength(1);
	expect(saved.calculation.participants[0].remaining).toBe(0);
});
