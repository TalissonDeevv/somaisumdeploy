import {test,expect,type Page} from '@playwright/test';
async function click(page:Page,action:string){const inOverlay=page.locator('#overlay [data-action="'+action+'"]');if(await inOverlay.count())await inOverlay.last().click();else await page.locator('#hud [data-action="'+action+'"]').click();}
async function hold(page:Page,key:string,ms:number){await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);}
async function field(page:Page,key:string,value:string){await page.locator('[data-v3field="'+key+'"]').selectOption(value);}
async function finish(page:Page){await click(page,'v3-skip');await expect(page.locator('#v3-report .feedback')).toContainText('Objetivo atingido');await click(page,'v3-complete');}
async function newJourney(page:Page){
 await page.goto('/');await click(page,'new');await expect(page.locator('#dialog-title')).toHaveText('Talisson Souza');
 await click(page,'v3-reveal');await expect(page.locator('#v3-dialogue-text')).toContainText('Feira Conecta');
 await click(page,'v3-choice-0');await click(page,'v3-choice-0');
 await page.keyboard.press('e');await expect(page.locator('#dialog-title')).toHaveText('Uma luz para começar.');
 await click(page,'v3-opening-run');await expect(page.locator('#opening-feedback')).toContainText('dependência');
 await click(page,'v3-opening-up-1');await click(page,'v3-opening-up-2');await click(page,'v3-opening-run');await click(page,'v3-office');
}
test('V3 integrada: abertura, proximidade, capítulo e seis formatos com consequência persistida',async({page})=>{
 const errors:string[]=[],external:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{(window as unknown as {opens:string[]}).opens=[];window.open=((url:unknown)=>{(window as unknown as {opens:string[]}).opens.push(String(url));return null;}) as typeof window.open;});
 await newJourney(page);await page.screenshot({path:'test-results/v3-studio-1280.png'});
 await hold(page,'d',1100);await expect(page.locator('#dialog-title')).toHaveText('Talisson Souza');
 await page.screenshot({path:'test-results/v3-talisson-dialogue-1280.png'});
 await hold(page,'a',1200);await page.waitForTimeout(200);await expect(page.locator('#overlay')).toBeEmpty();
 await expect(page.locator('canvas')).toHaveAttribute('data-byte-direction','left');await page.waitForTimeout(150);await expect(page.locator('canvas')).toHaveAttribute('data-byte-direction','left');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('so-mais-um-deploy.v1')!).v3.dialoguePaused)).toBe(true);
 await page.screenshot({path:'test-results/v3-byte-left-1280.png'});
 await hold(page,'d',1000);await expect(page.locator('#dialog-title')).toHaveText('Talisson Souza');
 await page.getByRole('button',{name:'Relembrar a regra da tarefa',exact:true}).click();await click(page,'v3-choice-0');
 await page.getByRole('button',{name:'Observar a demonstração com falha',exact:true}).click();await click(page,'v3-skip');
 await expect(page.locator('.records-view .duplicate')).not.toHaveCount(0);await click(page,'v3-world');await page.screenshot({path:'test-results/v3-demo-bug-world-1280.png'});await page.keyboard.press('Escape');
 await page.keyboard.press('m');await click(page,'room-5');
 await hold(page,'w',300);await hold(page,'a',1600);await expect(page.locator('#interaction')).toContainText('Terminal');await page.keyboard.press('e');await expect(page.locator('#dialog-title')).toContainText('banco não esqueceu');
 await page.keyboard.press('Escape');await hold(page,'s',550);await expect(page.locator('#interaction')).toContainText('Bilhete');await page.keyboard.press('e');
 await expect(page.locator('#dialog-title')).toHaveText('Bilhete do buffer');
 // Events, variables, lists and functions are taught before use.
 await click(page,'v3-activity-investigation');await expect(page.locator('#dialog-title')).toHaveText('Eventos mudam o estado');await click(page,'v3-concept-answer-1');await click(page,'v3-hub');
 for(const [concept,answer]of [['variables',1],['lists',2],['functions',0]] as const){await click(page,'v3-concept-'+concept);await click(page,'v3-concept-answer-'+answer);await click(page,'v3-hub');}
 await click(page,'v3-activity-investigation');await page.locator('[data-v3field="evidence-1"]').check();await page.locator('[data-v3field="evidence-4"]').check();await field(page,'hypothesis','cache');await finish(page);await click(page,'v3-hub');
 await click(page,'v3-activity-tests');await click(page,'v3-event-reconnect');await click(page,'v3-event-retryA');await page.locator('[data-v3field="negative-paid"]').uncheck();await finish(page);await click(page,'v3-hub');
 await click(page,'v3-activity-data');await field(page,'identity','id');await field(page,'strategy','upsert');await page.locator('[data-v3field="persistent"]').check();await click(page,'v3-step');await click(page,'v3-step');
 await expect(page.locator('.sim-vars')).toContainText('registros');await finish(page);await click(page,'v3-dialogue');
 await page.getByRole('button',{name:'Apresentar a demonstração corrigida',exact:true}).click();await click(page,'v3-skip');await expect(page.locator('.records-view>div')).toHaveCount(2);
 await click(page,'v3-world');await page.screenshot({path:'test-results/v3-demo-fixed-world-1280.png'});await click(page,'v3-dialogue');
 await page.getByRole('button',{name:'A correção usa ID no banco e atualiza o reenvio.',exact:true}).click();await page.getByRole('button',{name:'Encerrar a apresentação',exact:true}).click();
 await expect(page.locator('#dialog-title')).toHaveText('O bug ficou na história.');await expect(page.getByRole('button',{name:'Compartilhar no Discord'})).toBeVisible();
 const chapterXP=await page.evaluate(()=>JSON.parse(localStorage.getItem('so-mais-um-deploy.v1')!).v3.facts);
 expect(chapterXP).toContain('finished');await click(page,'v3-office');await page.keyboard.press('j');await expect(page.locator('.note')).toContainText('Capítulo concluído');await page.screenshot({path:'test-results/v3-notebook-1280.png'});
 await click(page,'v3-office');await click(page,'v3-modes');await click(page,'v3-mode-challenges');
 // Reusable robot routine; a loop block is used on the return path.
 await click(page,'v3-activity-route');await click(page,'v3-cmd-remove-commands-1');await field(page,'routeTarget','routine');for(const c of ['N','N','E','E','drop'])await click(page,'v3-add-'+c);
 await field(page,'routeTarget','commands');for(const c of ['call','2S','E','pick','call'])await click(page,'v3-add-'+c);
 await finish(page);await expect(page.locator('.reward')).toContainText('função reutilizada');await click(page,'v3-hub');
 await click(page,'v3-activity-debug');await field(page,'comparison','>');await field(page,'line','2');await finish(page);await click(page,'v3-hub');
 await click(page,'v3-old-lessons');await click(page,'lesson-l3');for(let i=0;i<3;i++)await click(page,'lesson-next');await click(page,'answer-1');await page.keyboard.press('Escape');
 await click(page,'v3-modes');await click(page,'v3-mode-lab');await click(page,'v3-activity-circuit');
 for(const [a,z]of [['ticket','and'],['paid','and'],['and','or'],['team','or'],['or','gate']]){await field(page,'origin',a);await field(page,'destination',z);await click(page,'v3-connect');}
 await finish(page);await click(page,'v3-office');await page.keyboard.press('m');await click(page,'room-4');
 await page.setViewportSize({width:1920,height:1080});await page.screenshot({path:'test-results/v3-fair-1920.png'});
 await page.keyboard.press('m');await click(page,'room-5');await page.screenshot({path:'test-results/v3-demonstration-1920.png'});
 await page.keyboard.press('j');await click(page,'v3-history');await expect(page.locator('.conversation-history')).toContainText('Talisson Souza');await page.keyboard.press('Escape');
 // Real saved consequences survive a fresh renderer.
 await page.reload();await click(page,'continue');const save=await page.evaluate(()=>JSON.parse(localStorage.getItem('so-mais-um-deploy.v1')!));
 expect(save.version).toBe(3);expect(save.v3.activityCompleted.sort()).toEqual(['circuit','data','debug','investigation','route','tests']);expect(save.v3.optional).toEqual(expect.arrayContaining(['reusable-route','reusable-data','negative-test']));
 expect(save.v3.facts).toContain('finished');expect(save.room).toBe(5);
 external.push(...await page.evaluate(()=>(window as unknown as {opens:string[]}).opens));expect(external).toEqual([]);expect(errors).toEqual([]);
});
test('save V2, arquivos inválidos, confirmação, exportação e controles sem conflitos',async({page})=>{
 await newJourney(page);await page.keyboard.press('Escape');await click(page,'v3-saves');
 await page.locator('#v3-import').setInputFiles({name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{broken')});await expect(page.locator('#import-status')).toContainText('Save inválido');
 await page.locator('#v3-import').setInputFiles({name:'large.json',mimeType:'application/json',buffer:Buffer.alloc(131073,32)});await expect(page.locator('#import-status')).toContainText('grande demais');
 const legacy={version:2,current:2,completed:[0,1],attempts:[2,1,0,0,0],hints:[1,0,0,0,0],practiceCompleted:[],lessonCompleted:[],practiceAttempts:{},room:0,settings:{volume:.4,muted:true,textSpeed:'instant',reducedMotion:true,ambience:false,ambienceVolume:.15,highContrast:true,uiScale:'large',moveSpeed:'normal',objectLabels:true,showControls:true,celebrations:false}};
 const file={name:'v2-save.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacy))};
 await page.locator('#v3-import').setInputFiles(file);await expect(page.locator('#dialog-title')).toHaveText('Importar este progresso?');await click(page,'v3-saves');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('so-mais-um-deploy.v1')!).current)).toBe(0);
 await page.locator('#v3-import').setInputFiles(file);await click(page,'v3-import-confirm');await expect(page.locator('.mission-status')).toContainText('O loop infinito');
 await expect(page.locator('body')).toHaveClass('reduced-motion high-contrast');await expect(page.locator('.xp-widget')).toContainText('240 XP');
 await click(page,'v3-controls');await click(page,'v3-remap-interact');await page.keyboard.press('w');await expect(page.locator('[role="status"]').last()).toContainText('já controla Cima');await page.keyboard.press('f');
 await click(page,'v3-office');await page.keyboard.press('e');await expect(page.locator('#overlay')).toBeEmpty();await page.keyboard.press('f');await expect(page.locator('#dialog-title')).toHaveText('O loop infinito');await page.keyboard.press('Escape');
 await page.reload();await click(page,'continue');await expect(page.locator('.key-guide')).toContainText('F');await click(page,'v3-controls');await click(page,'v3-restore-controls');await click(page,'v3-office');
 await page.keyboard.press('Escape');await click(page,'v3-saves');const downloadPromise=page.waitForEvent('download');await click(page,'v3-export');const download=await downloadPromise;expect(download.suggestedFilename()).toBe('byte-save-v3.json');
 await page.setViewportSize({width:1920,height:1080});await page.screenshot({path:'test-results/v3-save-settings-1920.png'});
});
test('BETA, comunidade explícita, prévia de feedback e falha de clipboard',async({page})=>{
 await page.addInitScript(()=>{(window as unknown as {opens:unknown[]}).opens=[];window.open=((...args:unknown[])=>{(window as unknown as {opens:unknown[]}).opens.push(args);return null;}) as typeof window.open;Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(Error('denied'))}});});
 await page.goto('/');await expect(page.locator('.beta-badge')).toHaveText('BETA');await expect(page.locator('.beta-line')).toContainText('3.0.0-beta.1');await page.screenshot({path:'test-results/v3-home-1280.png'});
 expect(await page.evaluate(()=>(window as unknown as {opens:unknown[]}).opens)).toEqual([]);
 await click(page,'v3-community');await expect(page.locator('#community-address')).toHaveValue('https://discord.talissonsouza.com.br');await click(page,'v3-community-copy');await expect(page.locator('#clipboard-status')).toContainText('Não foi possível copiar');
 await click(page,'v3-feedback');await page.locator('[name="category"]').selectOption('Bug');await page.locator('[name="what"]').fill('Exemplo de relato local');await page.locator('[name="expected"]').fill('Esperava ver uma saída');await expect(page.locator('#feedback-preview')).toHaveValue(/Exemplo de relato local/);
 await click(page,'v3-feedback-copy');await expect(page.locator('#clipboard-status')).toContainText('Não foi possível copiar');await click(page,'v3-community-open');
 expect(await page.evaluate(()=>(window as unknown as {opens:unknown[]}).opens)).toEqual([['https://discord.talissonsouza.com.br','_blank','noopener,noreferrer']]);
});
