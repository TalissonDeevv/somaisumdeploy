import { test,expect } from '@playwright/test';
test('as doze preferências persistem, inclusive antes de criar um save',async({page})=>{
  await page.goto('/');await page.locator('[data-action="settings"]').click();
  await page.locator('[data-setting="volume"]').focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');
  await page.locator('[data-setting="muted"]').check();await page.locator('[data-setting="ambience"]').check();
  await page.locator('[data-setting="ambienceVolume"]').focus();await page.keyboard.press('End');
  await page.locator('[data-action="settings-access"]').click();
  await page.locator('[data-setting="textSpeed"]').selectOption('slow');await page.locator('[data-setting="reducedMotion"]').check();await page.locator('[data-setting="highContrast"]').check();await page.locator('[data-setting="uiScale"]').selectOption('large');
  await page.screenshot({path:'test-results/v2-settings-accessibility.png'});
  await page.locator('[data-action="settings-play"]').click();await page.locator('[data-setting="moveSpeed"]').selectOption('fast');
  for(const key of ['objectLabels','showControls','celebrations'])await page.locator(`[data-setting="${key}"]`).uncheck();
  await page.locator('[data-action="back-settings"]').click();await page.reload();await page.locator('[data-action="settings"]').click();
  await expect(page.locator('[data-setting="muted"]')).toBeChecked();await expect(page.locator('[data-setting="ambience"]')).toBeChecked();await expect(page.locator('[data-setting="volume"]')).toHaveValue('0.05');await expect(page.locator('[data-setting="ambienceVolume"]')).toHaveValue('1');
  await page.locator('[data-action="settings-access"]').click();await expect(page.locator('[data-setting="textSpeed"]')).toHaveValue('slow');await expect(page.locator('[data-setting="highContrast"]')).toBeChecked();await expect(page.locator('[data-setting="reducedMotion"]')).toBeChecked();await expect(page.locator('[data-setting="uiScale"]')).toHaveValue('large');
  await page.locator('[data-action="settings-play"]').click();await expect(page.locator('[data-setting="moveSpeed"]')).toHaveValue('fast');for(const key of ['objectLabels','showControls','celebrations'])await expect(page.locator(`[data-setting="${key}"]`)).not.toBeChecked();
  await expect(page.locator('body')).toHaveClass('reduced-motion high-contrast');
});
