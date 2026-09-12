import { expect, test } from '@playwright/test';

// 针对构建产物 + 浏览器内存 Mock API（无需 Electron/显示环境）
test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('应用外壳与导航', async ({ page }) => {
  await expect(page.locator('.brand')).toContainText('古籍修复工作台');
  for (const label of ['进度看板', '扫描标注', '纸墨样本', '材料推荐', '修复工序', '前后对比', '修复档案']) {
    await expect(page.getByRole('button', { name: label })).toBeVisible();
  }
});

test('进度看板：阶段漏斗与风险清单', async ({ page }) => {
  await page.getByRole('button', { name: '载入样例' }).click();
  await expect(page.getByText('《稼轩长短句》样卷')).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: '进度看板' }).click();
  await expect(page.getByRole('heading', { name: '项目进度与风险看板' })).toBeVisible();
  // 样例第三叶走完全链路（有修复后图）→ 出现“已对比”阶段
  await expect(page.locator('.funnel').getByText('已对比')).toBeVisible();
  // 样例预置两条未解决批注 → 触发“批注未闭环”风险
  await expect(page.locator('.risks').getByText('批注未闭环')).toBeVisible();
  // 分叶表列出三叶，点击叶名跳回标注页
  await expect(page.locator('.folio-row')).toHaveCount(3);
  await page.locator('.folio-row .link').first().click();
  await expect(page.locator('.folio-strip')).toBeVisible();
});

test('载入内置样例后可以浏览标注页', async ({ page }) => {
  await page.getByRole('button', { name: '载入样例' }).click();
  await expect(page.getByText('《稼轩长短句》样卷')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('.folio-thumb')).toHaveCount(3);
  // 第三叶才有预置的虫孔/撕裂标注，切过去
  await page.locator('.folio-thumb').nth(2).click();
  await expect(page.locator('canvas').first()).toBeVisible();
  await expect(page.locator('.stats-card').getByText('虫蛀')).toBeVisible({ timeout: 8_000 });
  await expect(page.locator('.stats-card').getByText('撕裂')).toBeVisible();
});

test('切换视图：样本 → 推荐材料', async ({ page }) => {
  await page.getByRole('button', { name: '载入样例' }).click();
  await page.getByRole('button', { name: '纸墨样本' }).click();
  await expect(page.getByRole('heading', { name: '纸张与墨色样本库' })).toBeVisible();
  await page.getByRole('button', { name: '推荐材料' }).first().click();
  await expect(page.getByRole('heading', { name: '修补材料库与推荐' })).toBeVisible();
  await expect(page.locator('.rec-head').first()).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText(/Mock|近似|厚度/).first()).toBeVisible();
});

test('新建空项目并记录一道工序', async ({ page }) => {
  await page.getByRole('button', { name: '新建项目' }).first().click();
  await page.locator('#p-name').fill('Playwright 临时卷');
  await page.getByRole('button', { name: '创建' }).click();
  // 新建后自动选中，进入标注视图
  await expect(page.locator('.folio-strip')).toBeVisible({ timeout: 5_000 });

  await page.getByRole('button', { name: '修复工序' }).click();
  await page.getByRole('button', { name: '记一道工序' }).click();
  await page.getByPlaceholder('如：虫孔嵌补').fill('干揭分离');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('干揭分离')).toBeVisible();
});

test('批注：发表并标记解决', async ({ page }) => {
  await page.getByRole('button', { name: '载入样例' }).click();
  await page.getByRole('button', { name: '批注', exact: true }).click();
  await page.locator('.composer textarea').fill('此处建议改用净皮棉连');
  await page.getByRole('button', { name: /发表/ }).click();
  const row = page.locator('.c-list li').filter({ hasText: '此处建议改用净皮棉连' });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: '标记解决' }).click();
  await expect(row).toHaveClass(/resolved/);
});
