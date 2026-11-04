import { expect, test, type Page } from '@playwright/test';
async function click(page: Page,action:string){const overlay=page.locator(`#overlay [data-action="${action}"]`);if(await overlay.count())await overlay.last().click();else await page.locator(`#hud [data-action="${action}"]`).click();}
async function hold(page: Page, key: string, duration: number) { await page.keyboard.down(key); await page.waitForTimeout(duration); await page.keyboard.up(key); }
async function openCurrent(page: Page) { await page.keyboard.press('e'); await expect(page.locator('#dialog-title')).toBeVisible(); await click(page, 'open-challenge'); }
async function set(page: Page, path: string, value: string) { await page.locator(`[data-field="${path}"]`).selectOption(value); }
async function solveAccess(page: Page, prefix = '') { await set(page, `${prefix}ops.0`, 'E'); await set(page, `${prefix}ops.1`, 'OU'); }
async function solveLoop(page: Page, prefix = '') { await set(page, `${prefix}inclusive`, 'true'); await set(page, `${prefix}step`, '1'); }
async function solveDebug(page: Page, prefix = '') { await set(page, `${prefix}key`, 'id'); await set(page, `${prefix}point`, 'banco'); }
async function deliver(page: Page) { await click(page, 'run'); await expect(page.getByText('✓ Testes passaram')).toBeVisible(); await click(page, 'deliver'); await click(page, 'office'); }
test('campanha completa com movimento, falhas, dicas, save, final e revisita', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await expect(page.locator('.game-logo')).toBeVisible();
  await page.screenshot({ path: 'test-results/menu-1280.png' });
  await click(page, 'new'); await click(page,'v3-choice-0'); await click(page,'v3-choice-0'); await page.keyboard.press('e'); await click(page,'v3-opening-up-1'); await click(page,'v3-opening-up-2'); await click(page,'v3-opening-run'); await click(page,'v3-office');
  await expect(page.locator('#interaction')).toContainText('Computador');
  // Movement changes the object within reach. Modal input must not leak to movement.
  await hold(page, 's', 900); await expect(page.locator('#interaction')).not.toContainText('Computador');
  await hold(page, 'w', 900); await expect(page.locator('#interaction')).toContainText('Computador');
  await page.keyboard.press('Escape'); await expect(page.locator('#dialog-title')).toHaveText('Uma pausa no projeto.');
  await hold(page, 's', 650); await page.keyboard.press('Escape'); await page.keyboard.press('e');
  await expect(page.locator('#dialog-title')).toHaveText('Na minha máquina funciona');
  await click(page, 'reveal'); await expect(page.locator('#dialogue')).toContainText('Feira Conecta');
  await click(page, 'open-challenge'); await click(page, 'run'); await expect(page.locator('.feedback')).toContainText('precisa de');
  await click(page, 'hint'); await expect(page.locator('.hint-box')).toContainText('fornece os dados');
  await click(page, 'up-2'); await click(page, 'up-1'); await click(page, 'up-2'); await click(page, 'up-3'); await click(page, 'up-4');
  await page.screenshot({ path: 'test-results/mission-1-1280.png' });
  await deliver(page); await expect(page.locator('.mission-status')).toContainText('Entrou quem não devia');
  await page.screenshot({ path: 'test-results/office-1280.png' });
  await openCurrent(page); await solveAccess(page); await deliver(page);
  // A real reload verifies persistence, not a fabricated unlocked state.
  await page.reload(); await click(page, 'continue'); await expect(page.locator('.mission-status')).toContainText('O loop infinito');
  await openCurrent(page); await click(page, 'run'); await expect(page.locator('.feedback')).toContainText('interrompida com segurança');
  await click(page, 'step'); await expect(page.locator('.trace')).toContainText('Passo 2');
  await solveLoop(page); await deliver(page);
  await openCurrent(page); await expect(page.locator('.logs')).toContainText('RETRY'); await solveDebug(page); await deliver(page);
  await openCurrent(page); await click(page, 'launch'); await expect(page.locator('.feedback')).toContainText('Consequência');
  await expect(page.locator('.mission-status')).toContainText('5/5');
  await solveAccess(page, 'access.'); await solveLoop(page, 'loop.'); await solveDebug(page, 'debug.');
  await click(page, 'run'); await expect(page.getByText('✓ Testes passaram')).toBeVisible();
  await page.setViewportSize({ width: 1920, height: 1080 }); await page.screenshot({ path: 'test-results/release-1920.png', fullPage: true });
  await click(page, 'launch'); await expect(page.locator('#dialog-title')).toContainText('Deu deploy.');
  await page.screenshot({ path: 'test-results/ending-1920.png' });
  await click(page, 'office'); await page.screenshot({ path: 'test-results/office-final-1920.png' });
  await page.keyboard.press('Escape'); await click(page, 'board'); await click(page, 'mission-0');
  await expect(page.locator('.challenge-heading')).toContainText('REVISITA');
  await click(page, 'reset'); await expect(page.locator('.code-block').first()).toContainText('Iniciar sistema');
  await page.keyboard.press('Escape'); await page.reload(); await click(page, 'continue');
  await expect(page.locator('.mission-status')).toContainText('Entrega feita');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('so-mais-um-deploy.v1')!));
  expect(saved.current).toBe(5); expect(saved.completed).toEqual([0, 1, 2, 3, 4]); expect(saved.hints[0]).toBe(1);
  // Continue the same real save through every new lesson, experiment and room.
  await click(page,'lessons');
  const answers=[1,2,1,1,0,1,2,1];
  for(let i=0;i<8;i++){
    await click(page,`lesson-l${i+1}`);for(let step=0;step<3;step++)await click(page,'lesson-next');
    if(i===0){await click(page,'answer-0');await expect(page.locator('.feedback')).toContainText('Tente outra');}
    await click(page,`answer-${answers[i]}`);await expect(page.locator('.feedback')).toContainText('Conceito entendido');
    if(i===0)await page.screenshot({path:'test-results/v2-lesson.png'});
    await click(page,'lessons');
  }
  await click(page,'office');await page.keyboard.press('m');await expect(page.locator('[data-action="room-3"]')).toBeEnabled();
  await click(page,'room-0');await click(page,'academy');await click(page,'practice-p1');
  const orders=[['Aquecer água','Colocar pó no filtro','Coar o café','Servir na caneca'],['Instalar ferramentas','Compilar estilos','Compilar scripts','Testar o pacote','Publicar arquivos'],['Ler os dados','Criar cópia','Verificar a cópia','Limpar temporários']];
  async function solveOrder(labels:string[]){for(let index=0;index<labels.length;index++){let at=(await page.locator('.code-block').allTextContents()).findIndex(t=>t.includes(labels[index]));while(at>index){await click(page,`up-${at}`);at--;}}}
  for(let n=1;n<=12;n++){
    if(n!==1){await click(page,`lab-room-${Math.floor((n-1)/3)}`);await click(page,`practice-p${n}`);}
    if(n<=3)await solveOrder(orders[n-1]);
    else if(n===4){await set(page,'atoms.0','ingresso');await set(page,'atoms.1','pago');await set(page,'atoms.2','verdadeiro');}
    else if(n===5||n===6){for(const [i,value] of ['ingresso','pago','equipe'].entries())await set(page,`atoms.${i}`,value);await set(page,'ops.0','OU');if(n===5)await set(page,'ops.1','OU');}
    else if(n<=9){await set(page,'start',String(n===7?0:n===8?2:3));await set(page,'end',String(n===7?3:n===8?8:12));await set(page,'step',String(n===7?1:n===8?2:3));await set(page,'inclusive','true');}
    else await solveDebug(page);
    await click(page,'run');await expect(page.getByText('✓ Testes passaram')).toBeVisible();await click(page,'deliver');
    if(n===1){await expect(page.locator('.xp-reward')).toHaveText('+60 XP');await click(page,'office');await page.keyboard.press('m');await expect(page.locator('[data-action="room-3"]')).toBeEnabled();await click(page,'room-3');await page.screenshot({path:'test-results/v2-room-3.png'});await click(page,'academy');}
    else await click(page,'academy');
  }
  await click(page,'office');await page.keyboard.press('p');await expect(page.locator('#dialog-title')).toContainText('Nível 10');await expect(page.locator('.profile-xp')).toContainText('1860 XP');await page.screenshot({path:'test-results/v2-profile.png'});
  // A completed exercise can be revisited, but must not award XP twice.
  await click(page,'office');await click(page,'academy');await click(page,'lab-room-3');await click(page,'practice-p12');await click(page,'run');await click(page,'deliver');await expect(page.locator('.xp-reward')).toContainText('Conceito reforçado');
  for(const room of [0,1,2,3]){if(await page.locator('#overlay [data-action="office"]').count())await click(page,'office');await page.keyboard.press('m');await click(page,`room-${room}`);await page.screenshot({path:`test-results/v2-room-${room}.png`});}
  await page.reload();await click(page,'continue');await expect(page.locator('.room-caption')).toContainText('TERRAÇO');await expect(page.locator('.xp-widget')).toContainText('1860 XP');
  expect(errors).toEqual([]);
});
test('save corrompido, configurações e confirmação de novo jogo', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('so-mais-um-deploy.v1', '{invalido'));
  await page.goto('/'); await expect(page.locator('#overlay').getByText(/Save inválido/)).toBeVisible(); await expect(page.locator('[data-action="continue"]')).toHaveCount(0);
  await click(page, 'new'); await click(page,'v3-choice-0'); await click(page,'v3-choice-0'); await page.keyboard.press('e'); await click(page,'v3-opening-up-1'); await click(page,'v3-opening-up-2'); await click(page,'v3-opening-run'); await click(page,'v3-office'); await page.keyboard.press('Escape'); await click(page, 'settings');
  await page.locator('[data-setting="muted"]').check();await click(page,'settings-access');await page.locator('[data-setting="reducedMotion"]').check();
  await page.locator('[data-setting="textSpeed"]').selectOption('instant'); await click(page, 'back-settings'); await click(page, 'menu');
  await click(page, 'new'); await expect(page.locator('#dialog-title')).toHaveText('Começar outra campanha?'); await click(page, 'menu'); await click(page, 'continue');
  await page.keyboard.press('e'); await expect(page.locator('#dialogue')).toContainText('Feira Conecta');
  await expect(page.locator('body')).toHaveClass('reduced-motion');
});
test('menus e bloqueios de missão funcionam pelo teclado', async ({ page }) => {
  await page.goto('/'); await page.keyboard.press('Enter'); await page.keyboard.press('Escape');
  await page.keyboard.press('Escape'); await click(page, 'board');
  await expect(page.locator('[data-action="mission-1"]')).toBeDisabled();
  await expect(page.locator('[data-action="mission-4"]')).toBeDisabled();
  await page.keyboard.press('Escape'); await click(page, 'v3-controls');
  await expect(page.locator('#dialog-title')).toContainText('Suas teclas');
  await page.keyboard.press('Shift+Tab'); await expect(page.locator('[data-action="v3-intro"]')).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.locator('[data-action="close"]')).toBeFocused();
});
