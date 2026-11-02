const { _electron: electron, expect } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const executablePath = path.resolve('release/win-unpacked/Só Mais Um Deploy.exe');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-smoke-'));
const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
const errors = [], network = [];
let app;
async function launch() {
  app = await electron.launch({ executablePath, args: [`--user-data-dir=${profile}`], env });
  const page = await app.firstWindow(); page.on('pageerror', e => errors.push(e.message)); page.on('request', req => { if (/^https?:/.test(req.url())) network.push(req.url()); });
  await page.waitForLoadState('load'); return page;
}
(async () => {
  fs.mkdirSync('test-results', { recursive: true });
  let page = await launch();
  await expect(page.locator('.game-logo')).toBeVisible();
  expect(page.url().startsWith('file:///')).toBe(true);
  const win = await app.browserWindow(page);
  const prefs = await win.evaluate(w => { const p = w.webContents.getLastWebPreferences(); return { contextIsolation: p.contextIsolation, nodeIntegration: p.nodeIntegration, sandbox: p.sandbox }; });
  expect(prefs).toEqual({ contextIsolation: true, nodeIntegration: false, sandbox: true });
  expect(await page.evaluate(() => typeof window.require)).toBe('undefined');
  await page.screenshot({ path: 'test-results/desktop-menu.png' });
  await page.locator('[data-action="new"]').click(); await page.locator('[data-action="office"]').click();
  await expect(page.locator('#interaction')).toContainText('Computador'); await page.keyboard.press('e');
  await page.locator('[data-action="open-challenge"]').click();
  for (const action of ['up-2', 'up-1', 'up-2', 'up-3', 'up-4', 'run']) await page.locator(`[data-action="${action}"]`).click();
  await expect(page.getByText('✓ Testes passaram')).toBeVisible(); await page.locator('[data-action="deliver"]').click();
  await page.locator('[data-action="office"]').click(); await expect(page.locator('.mission-status')).toContainText('Entrou quem não devia');
  // The packaged renderer also runs the new teaching loop and unlocks a room.
  async function click(action){const overlay=page.locator(`#overlay [data-action="${action}"]`);if(await overlay.count())await overlay.last().click();else await page.locator(`#hud [data-action="${action}"]`).click();}
  for(const [id,answer] of [['l1',1],['l2',2]]){
    await click('lessons');await click(`lesson-${id}`);for(let i=0;i<3;i++)await click('lesson-next');await click(`answer-${answer}`);await page.keyboard.press('Escape');
  }
  await click('academy');await click('practice-p1');
  for(const [index,label] of ['Aquecer água','Colocar pó no filtro','Coar o café','Servir na caneca'].entries()){
    let at=(await page.locator('.code-block').allTextContents()).findIndex(t=>t.includes(label));while(at>index){await click(`up-${at}`);at--;}
  }
  await click('run');await expect(page.getByText('✓ Testes passaram')).toBeVisible();await click('deliver');await click('office');
  await page.keyboard.press('m');await page.locator('[data-action="room-1"]').click();await expect(page.locator('.room-caption')).toContainText('OFICINA');await expect(page.locator('.xp-widget')).toContainText('230 XP');
  await page.screenshot({ path: 'test-results/desktop-office.png' });
  await app.close(); app = null;
  page = await launch(); await page.locator('[data-action="continue"]').click();
  await expect(page.locator('.mission-status')).toContainText('Entrou quem não devia');
  await expect(page.locator('.room-caption')).toContainText('OFICINA');await expect(page.locator('.xp-widget')).toContainText('230 XP');
  expect(errors).toEqual([]); expect(network).toEqual([]);
  const report = { result: 'passed', executablePath, profile, checks: ['Local file loading', 'Isolated sandbox / no renderer Node', 'Logo and procedural Byte rig', 'Office interaction', 'Mission 1 blocks and tests', 'Delivery unlocks mission 2', 'Two lessons and one extra experiment', '230 XP unlocks workshop', 'Room and progress survive application relaunch', 'No HTTP requests'], errors, network };
  fs.writeFileSync('test-results/desktop-report.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { if (app) await app.close(); });
