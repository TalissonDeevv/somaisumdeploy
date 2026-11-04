import {test,expect,type Page} from '@playwright/test';
async function click(page:Page,action:string){const inOverlay=page.locator('#overlay [data-action="'+action+'"]');if(await inOverlay.count())await inOverlay.last().click();else await page.locator('#hud [data-action="'+action+'"]').click();}
async function hold(page:Page,key:string,ms:number){await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);}
const save=(page:Page)=>page.evaluate(()=>JSON.parse(localStorage.getItem('so-mais-um-deploy.v1')!).v3);
const name=(page:Page,text:string)=>page.getByRole('button',{name:text,exact:true}).click();
async function start(page:Page){
 await page.goto('/');await click(page,'new');await click(page,'v3-reveal');await click(page,'v3-choice-0');await click(page,'v3-choice-0');
 await page.keyboard.press('e');await click(page,'v3-opening-up-1');await click(page,'v3-opening-up-2');await click(page,'v3-opening-run');await click(page,'v3-office');
}
test('home mostra todos os personagens e leva à missão',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await click(page,'v3-characters');await expect(page.locator('#dialog-title')).toHaveText('Personagens');
 await expect(page.locator('.cast-roster button')).toHaveCount(7);await page.waitForTimeout(150);await page.screenshot({path:'test-results/characters-talisson.png'});
 await click(page,'character-view-luiz');await expect(page.locator('.cast-detail h2')).toHaveText('Luiz Dela');await page.screenshot({path:'test-results/characters-luiz.png'});
 await click(page,'character-view-indo');await expect(page.locator('.cast-detail h2')).toHaveText('Indo Ali');await page.screenshot({path:'test-results/characters-indo.png'});
 await click(page,'character-go-indo');await expect(page.locator('#dialog-title')).toHaveText('Indo Ali');await click(page,'v3-reveal');await expect(page.locator('#v3-dialogue-text')).toContainText('telinha');
 expect(errors).toEqual([]);
});
test('Talisson pausa quando Byte sai, mostra balão e chama de volta',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await start(page);
 await hold(page,'d',1100);await expect(page.locator('#dialog-title')).toHaveText('Talisson Souza');await page.waitForTimeout(300);await page.screenshot({path:'test-results/talisson-talk.png'});
 await hold(page,'a',1100);await expect(page.locator('#overlay')).toBeEmpty();expect((await save(page)).dialoguePaused).toBe(true);
 await page.waitForTimeout(400);await page.screenshot({path:'test-results/talisson-balloon.png'});
 await hold(page,'d',1200);await expect(page.locator('#dialog-title')).toHaveText('Talisson Souza');await click(page,'v3-reveal');await expect(page.locator('#v3-dialogue-text')).toContainText('Ei, Byte');await page.screenshot({path:'test-results/talisson-reminder.png'});
 await click(page,'v3-choice-0');await click(page,'v3-reveal');await expect(page.locator('#v3-dialogue-text')).toContainText('Cada ID');
 expect((await save(page)).dialoguePaused).toBe(false);await click(page,'v3-choice-0');
 await name(page,'Observar a demonstração com falha');await click(page,'v3-skip');await click(page,'v3-dialogue');await click(page,'v3-reveal');await expect(page.locator('#v3-dialogue-text')).toContainText('pistas');
 await name(page,'Onde encontro as pistas?');await name(page,'Ir para a área de demonstração');
 await expect(page.locator('#overlay')).toBeEmpty();expect((await save(page)).dialoguePaused).toBe(false);await expect(page.locator('.room-caption')).toContainText('DEMONSTRAÇÃO');
 expect(errors).toEqual([]);
});
test('missão do Luiz do começo ao fim na feira',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await start(page);await page.keyboard.press('m');await click(page,'room-4');await page.waitForTimeout(500);await page.screenshot({path:'test-results/fair-guests.png'});
 await hold(page,'s',250);await hold(page,'a',750);await expect(page.locator('#interaction')).toContainText('Luiz');await page.keyboard.press('e');await expect(page.locator('#dialog-title')).toHaveText('Luiz Dela');await click(page,'v3-reveal');await page.screenshot({path:'test-results/luiz-talk.png'});
 await click(page,'v3-choice-0');await expect(page.locator('#dialog-title')).toHaveText('Texto não é número');
 await page.getByRole('button',{name:/Trocar a vírgula/}).click();await click(page,'v3-activity-orders');await expect(page.locator('.brief-messages,.v3-command-list').first()).toBeVisible();
 await click(page,'v3-skip');await expect(page.locator('#v3-report .mentor')).toContainText('Luiz');await page.screenshot({path:'test-results/luiz-bug.png'});
 await page.locator('[data-v3field="conversion"]').selectOption('strip');await page.locator('[data-v3field="listeners"]').selectOption('1');await click(page,'v3-skip');await expect(page.locator('#v3-sim')).toContainText('R$ 200,00');
 await page.locator('[data-v3field="conversion"]').selectOption('decimal');await page.locator('[data-v3field="reset"]').check();
 await click(page,'v3-skip');await expect(page.locator('#v3-report .feedback')).toContainText('roteiro');
 await click(page,'v3-order-add-new');await click(page,'v3-order-add-pao');await click(page,'v3-order-add-pay');await click(page,'v3-skip');await expect(page.locator('#v3-report .feedback')).toContainText('Objetivo atingido');await page.screenshot({path:'test-results/luiz-fixed.png'});
 await click(page,'v3-complete');await click(page,'v3-talk-luiz');await click(page,'v3-reveal');await expect(page.locator('#v3-dialogue-text')).toContainText('última rodada');
 await click(page,'v3-choice-0');await expect(page.locator('.counter-view')).toContainText('R$ 3,50');await expect(page.locator('.guest-final')).toContainText('botão era verde');await page.screenshot({path:'test-results/luiz-final.png'});
 await click(page,'v3-office');expect((await save(page)).results['guest-luiz']).toContain('finished');
 expect(errors).toEqual([]);
});
test('missão da Indo: briefing, cálculo e apresentação',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await click(page,'v3-characters');await click(page,'character-view-indo');await click(page,'character-go-indo');
 await click(page,'v3-choice-0');await expect(page.locator('#dialog-title')).toContainText('Variáveis');
 await page.getByRole('button',{name:/nenhuma vaga/}).click();await click(page,'v3-activity-budget');await expect(page.locator('.brief-messages')).toContainText('botão que faz tudo');
 await click(page,'v3-skip');await expect(page.locator('.budget-table tr.off')).not.toHaveCount(0);await expect(page.locator('#v3-report .mentor')).toContainText('Indo');await page.screenshot({path:'test-results/indo-bug.png'});
 await page.locator('[data-v3field="telas"]').selectOption('6');await page.locator('[data-v3field="vague"]').uncheck();await page.locator('[data-v3field="protoCount"]').selectOption('1');await page.locator('[data-v3field="desktopCond"]').selectOption('desktop');
 await click(page,'v3-skip');await expect(page.locator('#v3-report .feedback')).toContainText('Objetivo atingido');await expect(page.locator('.budget-table tr.off')).toHaveCount(0);await page.screenshot({path:'test-results/indo-fixed.png'});
 await click(page,'v3-complete');await click(page,'v3-talk-indo');await click(page,'v3-choice-0');await expect(page.locator('.guest-final')).toContainText('R$ 2200,00');await page.screenshot({path:'test-results/indo-final.png'});
 expect(errors).toEqual([]);
});
