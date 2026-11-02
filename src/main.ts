import Phaser from 'phaser';
import './style.css';
import './v3/style.css';
import { V3Controller } from './v3/controller';
import { chapterObjective } from './v3/events';
import { releaseNotes } from './v3/content';
import { OfficeScene, type ObjectId } from './game/OfficeScene';
import { GameAudio } from './game/audio';
import { missions, blocks, initialProgram } from './core/missions';
import { evaluate, logLines } from './core/validation';
import { SaveStore, freshProgress, completeMission } from './core/state';
import { practices, lessons, evaluatePractice, type Practice } from './core/academy';
import { campaignXP, rooms, levelInfo, badges, finishPractice, finishLesson } from './core/progression';
import type { MissionId, Program, Progress, Evaluation, AccessProgram, LoopProgram, DebugProgram, ReleaseProgram } from './core/types';

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const safe = (value: unknown) => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const btn = (label: string, action: string, cls = '', extra = '') => `<button class="${cls}" data-action="${action}" ${extra}>${label}</button>`;
const tag = (text: string) => `<span class="eyebrow">${text}</span>`;
const store = new SaveStore({ getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) });
let saved = store.load();
let progress: Progress = saved ?? freshProgress();
progress.settings = store.loadSettings() ?? progress.settings;
let started = false;
let screen = 'menu';
let returnScreen = 'menu';
let missionId: MissionId = 0;
let program: Program = initialProgram(0);
let report: Evaluation | null = null;
let hintLevel = 0;
let stepIndex = 1;
let launchFailure = false;
let activePractice: Practice | null = null;
let lessonId = 'l1';
let lessonPage = 0;
let lessonAnswer: number | null = null;
let settingsTab = 'sound';
let nearby = '';
let textTimer: ReturnType<typeof setInterval> | undefined;
let completeText = '';
let focusBefore: HTMLElement | null = null;
const drafts = new Map<number | string, Program>();
const audio = new GameAudio(() => progress.settings);
window.addEventListener('pointerdown', () => audio.unlock(), { once: true });
window.addEventListener('keydown', () => audio.unlock(), { once: true });

function persist() { if (started) { store.save(progress);store.saveSettings(progress.settings); saved = structuredClone(progress); } renderHud(); }
function renderHud() {
  const m = missions[Math.min(progress.current, 4)], info=levelInfo(progress);
  $('#hud').innerHTML = `<header class="hud-header"><div class="wordmark"><span class="terminal-icon">&gt;_</span><div>SÓ MAIS UM <b>DEPLOY</b><small>UM JOGO DE TALISSON SOUZA</small></div></div>
    <div class="mission-status">${tag(progress.current === 5 ? 'FEIRA CONECTA · NO AR' : `PROJETO FEIRA CONECTA · ${progress.current + 1}/5`)}<strong>${progress.current === 5 ? 'Entrega feita. Café merecido.' : m.title}</strong></div>
    <nav aria-label="Menu do jogo">${btn('Modos', 'v3-modes', 'quiet')}${btn('Caderno', 'v3-notebook', 'quiet')}${btn('Aprender', 'lessons', 'quiet')}${btn('Experimentos','academy','quiet')}${btn('Ⅱ <span class="wide">Pausar</span>', 'pause', 'quiet')}</nav></header>
    ${started ? `<div class="room-caption">${tag(rooms[progress.room].name.toUpperCase())}<span>Byte · ${info.rank} · ${{story:'História',lab:'Laboratório',challenges:'Desafios'}[progress.v3.mode]}</span><div class="room-tools">${btn('Mapa','map','quiet')}${btn('Perfil','profile','quiet')}${btn('Controles','v3-controls','quiet')}</div></div><div class="xp-widget">${btn(`NV. ${info.level} <span>${info.xp} XP</span>`,'profile','quiet')}<div class="xp-track"><i style="width:${info.ratio*100}%"></i></div><small>${info.next?`${info.next-info.xp} XP para o próximo nível`:'Nível máximo · continue criando'}</small></div>` : ''}
    <footer class="hud-footer"><div class="key-guide"><kbd>${safe([progress.settings.bindings.up,progress.settings.bindings.left,progress.settings.bindings.down,progress.settings.bindings.right].join(' ').toUpperCase())}</kbd><span>ou setas · mover</span><kbd>${safe(progress.settings.bindings.interact.toUpperCase())}</kbd><span>interagir</span><kbd>Esc</kbd><span>fechar</span></div><div id="interaction">${nearby ? `<kbd>${safe(progress.settings.bindings.interact.toUpperCase())}</kbd> ${safe(nearby)}` : 'Aproxime-se dos objetos para interagir'}</div><span class="save-status" role="status">${store.error ? safe(store.error) : started ? '◇ Salvo neste dispositivo' : 'SEM PRESSA. SEM PRAZO REAL.'}</span></footer>`;
  $('#hud').classList.toggle('hidden', !started);
  $('.key-guide').classList.toggle('hidden',!progress.settings.showControls);
}
function setNearby(value: string) { nearby = value; const el = document.querySelector('#interaction'); if (el) el.innerHTML = value ? `<kbd>${safe(progress.settings.bindings.interact.toUpperCase())}</kbd> ${safe(value)}` : 'Aproxime-se dos objetos para interagir'; }
function modal(name: string, content: string, wide = false) {
  clearInterval(textTimer); textTimer = undefined; completeText = '';
  if (screen === 'office' || screen === 'menu') focusBefore = document.activeElement as HTMLElement;
  screen = name;
  $('#hud').inert = true;
  $('#overlay').className = name === 'menu' ? 'menu-overlay' : 'modal-overlay';
  $('#overlay').innerHTML = name === 'menu' ? content : `<section class="panel ${wide ? 'panel-wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div class="panel-top"><span class="window-dots" aria-hidden="true">● ● ●</span><span>conecta / ${name === 'challenge' ? 'workspace' : 'mensagens'}</span>${btn('×', 'close', 'close', 'aria-label="Fechar janela"')}</div>${content}</section>`;
  queueMicrotask(() => ($('#overlay button:not([disabled]), #overlay select, #overlay input') as HTMLElement | null)?.focus({ preventScroll: true }));
}
function office() {
  if(!started){menu();return;}
  v3.stop();
  clearInterval(textTimer); screen = 'office'; $('#hud').inert = false; $('#overlay').innerHTML = ''; $('#overlay').className = ''; renderHud();
  if (focusBefore?.isConnected) focusBefore.focus({ preventScroll: true }); else document.body.focus();
}
function menu() {
  v3.stop();started = false; renderHud();officeScene.home(true);
  modal('menu', `<div class="menu-backdrop"></div><main class="title-menu"><div class="beta-line"><span class="beta-badge">BETA</span><span>v${__APP_VERSION__}</span></div><img class="game-logo" src="./assets/logo.png" alt="Só Mais Um Deploy">
    <p class="beta-message">Um jogo em construção, uma comunidade cheia de ideias. Explore a versão beta e ajude a criar os próximos capítulos do Byte.</p>
    ${saved?`<p class="resume-caption"><strong>${saved.current<5?missions[saved.current].title:'Feira Conecta entregue'}</strong><small>${safe(chapterObjective(saved))}</small><span>${saved.current}/5 missões · ${saved.v3.activityCompleted.length}/6 novas atividades</span></p>`:''}
    <div class="menu-buttons">${saved?btn('Continuar →','continue','primary'):''}${btn('Nova jornada ↗','new',saved?'':'primary')}${btn('Modos de jogo','v3-modes','',saved?'':'disabled')}${btn('Configurações','settings')}${btn('Créditos','credits')}</div>
    <details class="local-news"><summary>Nesta versão</summary><ul>${releaseNotes.map(n=>`<li>${n}</li>`).join('')}</ul></details>
    ${store.error?`<p class="notice">${safe(store.error)}</p>`:''}<small class="menu-credit">AUTORIA · TALISSON SOUZA</small></main>
    <section class="home-community"><span class="eyebrow">IDEIAS PARA OS PRÓXIMOS CAPÍTULOS</span><h2>Ajude a construir o próximo deploy</h2><p>Curtiu o jogo? Tem uma ideia, encontrou um bug ou quer contar como foi sua experiência? Entre no Discord do Talisson e participe da comunidade de Só Mais Um Deploy.</p>${btn('Entrar na comunidade','v3-community-open')}<small>Abre o Discord no navegador.</small>${btn('Copiar endereço / preparar relato','v3-community','quiet')}</section>`);
}
function newGame() {
  if (saved) { modal('confirm', `<div class="content">${tag('NOVO COMEÇO')}<h1 id="dialog-title">Começar outra campanha?</h1><p>O progresso salvo (${saved.current}/5 missões) será substituído. Suas configurações serão mantidas.</p><div class="actions">${btn('Manter meu progresso', 'menu', 'primary')}${btn('Apagar e começar', 'confirm-new', 'danger')}</div></div>`); return; }
  beginNew();
}
function beginNew() {
  progress = freshProgress(progress.settings); started = true; drafts.clear();officeScene.home(false); officeScene.switchRoom(0); persist();v3.intro();
}
function message(id: MissionId) {
  activePractice=null;missionId = id; const m = missions[id];
  modal('message', `<div class="content">${tag(`CAIXA DE ENTRADA · MISSÃO ${id + 1}`)}<h1 id="dialog-title">${m.title}</h1><div class="sender"><span class="avatar">${m.sender[0]}</span><div><strong>${m.sender}</strong><small>${m.sender === 'Rafa' ? 'Organização da Feira Conecta' : 'Mentora de desenvolvimento'}</small></div><span class="local-tag">mensagem local</span></div><p id="dialogue" class="dialogue"></p><div class="mentor">${safe(m.mentor)}</div><div class="actions">${btn('Abrir tarefa →', 'open-challenge', 'primary')}${btn('Exibir texto completo', 'reveal', 'quiet')}</div></div>`);
  completeText = m.message; const element = $('#dialogue');
  if (progress.settings.textSpeed === 'instant' || progress.settings.reducedMotion) element.textContent = completeText;
  else { let i = 0; textTimer = setInterval(() => { i += 3; element.textContent = completeText.slice(0, i); if (i >= completeText.length) clearInterval(textTimer); }, progress.settings.textSpeed === 'slow' ? 70 : 28); }
}
function interact(id: ObjectId) {
  audio.play();
  if(id==='talisson'){v3.approach();return;}
  if(id==='registrations'){v3.inspect('log');return;}
  if(id==='buffer-note'){v3.inspect('note');return;}
  if(id==='data-bench'){v3.openActivity('data');return;}
  if(id==='service'){v3.openActivity('route');return;}
  if(id==='gate'){v3.openActivity('circuit');return;}
  if(id==='vacancies'){v3.openActivity('debug');return;}
  if(id==='demo-door'){travel(5);return;}
  if(id==='seat'){officeScene.react('sit');modal('seat',`<div class="content">${tag('UMA PAUSA NO MUNDO')}<h1 id="dialog-title">O próximo passo pode esperar.</h1><p>Byte se senta por um instante. Seu caderno continua com as descobertas e o próximo objetivo.</p><div class="actions">${btn('Consultar caderno','v3-notebook')}${btn('Levantar e continuar','office','primary')}</div></div>`);return;}
  if(id==='notice'){officeScene.react('examine');modal('notice',`<div class="content">${tag('BILHETE DE RAFA')}<h1 id="dialog-title">Uma feira, muitas pequenas partes.</h1><p>“Byte, Talisson está preparando a demonstração. Noa organiza as entregas e a catraca. O mapa leva você até os estandes.”</p>${btn('Ver destinos','map','primary')}${btn('Guardar e voltar','office','quiet')}</div>`);return;}
  if(id==='npc-noa'){modal('noa',`<div class="content">${tag('NOA / PERSONAGEM FICTÍCIA')}<h1 id="dialog-title">A equipe está de olho.</h1><p>${progress.v3.activityCompleted.includes('circuit')?'A fiação da catraca agora respeita os oito cenários. Já conferiu um caso em que a pessoa tem ingresso, mas não pagou?':'Estou conferindo os estandes. As entregas seguem uma grade, e a catraca precisa de uma regra que bloqueie entradas inválidas. Escolha onde ajudar primeiro.'}</p><div class="actions">${btn('Programar entregas','v3-activity-route','primary')}${btn('Conferir catraca','v3-activity-circuit')}${btn('Voltar','office','quiet')}</div></div>`);return;}
  if(id==='computer'&&progress.room===0&&progress.v3.opening==='new'){v3.opening();return;}
  if(id==='computer'&&progress.room===1){v3.openActivity('route');return;}
  if(id==='computer'&&progress.room===2){v3.openActivity('debug');return;}
  if(id==='computer'&&progress.room===3){v3.customize();return;}
  if(id==='board'&&progress.room!==0){v3.notebook();return;}
  if(id==='door'){map();return;}
  if(id==='lab'){academy();return;}
  if(id==='shelf'){lessonList();return;}
  if(progress.room!==0){
    if(id==='computer'){academy();return;}
    if(id==='board'){profile();return;}
    if(id==='window'){modal('room-info',`<div class="content">${tag(rooms[progress.room].label)}<h1 id="dialog-title">${rooms[progress.room].name}</h1><p>${rooms[progress.room].description}</p><div class="mentor">Lia · ${['','Monte uma regra, teste os oito cenários e compare os resultados. Os parênteses também são peças do seu raciocínio.','Um servidor executa o que você programou. Observe a atualização do contador antes de culpar a máquina.','Dados contam histórias. Compare identidades e reenvios para encontrar o ponto certo da correção.'][progress.room]}</div>${btn('Abrir laboratório','academy','primary')}${btn('Voltar','office','quiet')}</div>`);return;}
  }
  if (id === 'computer') { if (progress.current === 5) ending(); else message(progress.current as MissionId); }
  if (id === 'board') board();
  if (id === 'plant') modal('plant', `<div class="content">${tag('UMA PAUSA')}<h1 id="dialog-title">A única coisa que pede água.</h1><p>A planta não sabe o que é um deploy. Pelo aspecto das folhas, está vivendo muito bem assim.</p><p class="mentor">Não existe cronômetro nesta campanha. Pode respirar, ler e tentar de novo.</p>${btn('Pausa concluída', 'office', 'primary')}</div>`);
  if (id === 'window') modal('window', `<div class="content">${tag('A CIDADE LÁ FORA')}<h1 id="dialog-title">${progress.current === 5 ? 'A feira já começou.' : 'Luzes acesas, ideias também.'}</h1><p>${progress.current === 5 ? 'Do outro lado da rua, as primeiras pessoas entram na Feira Conecta. O painel chama a próxima senha. Desta vez, só uma vez.' : 'No centro da cidade, a equipe prepara os estandes da Feira Conecta. Aqui dentro, cada pequeno conserto aproxima a abertura.'}</p>${btn('Voltar', 'office', 'primary')}</div>`);
}
function board() {
  modal('board', `<div class="content">${tag('QUADRO DE TAREFAS')}<h1 id="dialog-title">Cinco passos até a feira.</h1><p>Os desafios concluídos ficam disponíveis para revisitar.</p><div class="task-list">${missions.map(m => `<div><span class="task-number">${m.id < progress.current ? '✓' : m.id + 1}</span><div><strong>${m.title}</strong><small>${m.subject}</small></div>${btn(m.id < progress.current ? 'Revisitar' : m.id === progress.current ? 'Ler mensagem' : 'Bloqueado', `mission-${m.id}`, 'quiet', m.id > progress.current ? 'disabled' : '')}</div>`).join('')}</div>${progress.current === 5 ? btn('Ver resumo da campanha', 'ending', 'primary') : btn('Voltar ao escritório', 'office', 'primary')}</div>`, true);
}
function option(value: string | number, label: string, selected: string | number) { return `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`; }
function select(label: string, path: string, value: string | number, options: [string | number, string][]) { return `<label>${label}<select data-field="${path}">${options.map(([v, l]) => option(v, l, value)).join('')}</select></label>`; }
function accessEditor(p: AccessProgram, prefix = '') {
  const names: Record<string,string> = activePractice?.atoms ? { ingresso:activePractice.atoms[0],pago:activePractice.atoms[1],equipe:activePractice.atoms[2] } : {};
  return `<div class="logic-line">${p.atoms.map((a, i) => `${i === 0 && p.group === 'left' || i === 1 && p.group === 'right' ? '<span class="paren">(</span>' : ''}${select(`Condição ${i + 1}`, `${prefix}atoms.${i}`, a, ['ingresso', 'pago', 'equipe', 'verdadeiro', 'falso'].map(v => [v, names[v]??v]))}${i === 1 && p.group === 'left' || i === 2 && p.group === 'right' ? '<span class="paren">)</span>' : ''}${i < 2 ? select(`Operador ${i + 1}`, `${prefix}ops.${i}`, p.ops[i], [['E', 'E'], ['OU', 'OU']]) : ''}`).join('')}</div>${select('Agrupar primeiro', `${prefix}group`, p.group, [['left', '(A operador B) operador C'], ['right', 'A operador (B operador C)']])}<p class="micro">${activePractice?.atoms?'Cada bloco representa uma pergunta de sim ou não.':'ingresso = tem ingresso · pago = pagamento confirmado · equipe = organização'}</p>`;
}
function loopEditor(p: LoopProgram, prefix = '') {
  return `<div class="field-grid">${select('Início', `${prefix}start`, p.start, [0, 1, 2, 3, 5].map(n => [n, String(n)]))}${select('Comparação', `${prefix}inclusive`, String(p.inclusive), [['false', '< menor que'], ['true', '≤ menor ou igual']])}${select('Limite', `${prefix}end`, p.end, [0, 3, 4, 5, 6, 7,8,9,12,13].map(n => [n, String(n)]))}${select('Incremento', `${prefix}step`, p.step, [-1, 0, 1, 2,3].map(n => [n, String(n)]))}</div><pre class="code-preview">contador ← ${p.start}\nenquanto contador ${p.inclusive ? '≤' : '<'} ${p.end}:\n  emitir senha(contador)\n  contador ← contador + (${p.step})</pre>`;
}
function debugEditor(p: DebugProgram, prefix = '') {
  return `<div class="field-grid">${select('Identificar pela chave', `${prefix}key`, p.key, [['nome', 'Nome'], ['email', 'E-mail'], ['id', 'ID único']])}${select('Inserir ou atualizar onde?', `${prefix}point`, p.point, [['tela', 'Na tela · ocultar repetidas'], ['entrada', 'Na entrada · antes do buffer'], ['banco', 'No banco local · gravar por chave']])}</div><div class="flow"><span>tablet</span> → <span>entrada</span> → <span>buffer / reenvio</span> → <span>banco</span> → <span>tela</span></div>`;
}
function editor() {
  const availableBlocks=activePractice?.blocks??blocks;
  if (missionId === 0) return `<div class="block-stack">${(program as string[]).map((id, i,order) => `<div class="code-block"><span class="line-number">${String(i + 1).padStart(2, '0')}</span><span>${availableBlocks.find(b => b.id === id)!.label}</span><div>${btn('↑', `up-${i}`, 'move', `aria-label="Mover ${availableBlocks.find(b => b.id === id)!.label} para cima" ${i === 0 ? 'disabled' : ''}`)}${btn('↓', `down-${i}`, 'move', `aria-label="Mover ${availableBlocks.find(b => b.id === id)!.label} para baixo" ${i === order.length-1 ? 'disabled' : ''}`)}</div></div>`).join('')}</div>`;
  if (missionId === 1) return accessEditor(program as AccessProgram);
  if (missionId === 2) return loopEditor(program as LoopProgram);
  if (missionId === 3) return `<details open><summary>Histórico da sincronização</summary><pre class="logs">${activePractice?.records?activePractice.records.map((r,i)=>`ENVIO ${i+1} · ${r.id} · ${r.nome} · ${r.email}`).join('\n'):logLines.join('\n')}</pre></details>${debugEditor(program as DebugProgram)}`;
  const p = program as ReleaseProgram;
  return `<div class="integration"><h3>01 / Validar acesso</h3>${accessEditor(p.access, 'access.')}<h3>02 / Processar a fila</h3>${loopEditor(p.loop, 'loop.')}<h3>03 / Impedir duplicações</h3>${debugEditor(p.debug, 'debug.')}</div>`;
}
function openChallenge() {
  program = structuredClone(drafts.get(activePractice?.id??missionId) ?? activePractice?.initial ?? initialProgram(missionId)); report = null; hintLevel = 0; stepIndex = 1; launchFailure = false; renderChallenge();
}
function assess(){return activePractice?evaluatePractice(activePractice,program):evaluate(missionId,program);}
function reportHtml() {
  const preview = report ?? assess();
  return `<div class="report-title">${tag(report ? 'SAÍDA DO TESTE' : 'CASOS DE TESTE')}<span class="test-count">${report ? `${report.cases.filter(c => c.passed).length}/${report.cases.length} passaram` : `${preview.cases.length} verificações`}</span></div>${report ? `<div class="feedback ${report.passed ? 'pass' : 'fail'}" role="status"><strong>${report.passed ? '✓ Testes passaram' : launchFailure ? '⚠ Piloto interrompido' : '× Vamos investigar'}</strong><p>${safe(report.feedback)}</p>${launchFailure ? '<p>Consequência: o piloto local foi suspenso para evitar entradas inválidas, fila travada ou inscrições incorretas. Corrija o pacote e tente lançar novamente.</p>' : ''}</div>` : '<p class="micro">Prepare a solução e execute. O resultado é calculado a partir dos seus blocos.</p>'}
    <div class="case-list">${preview.cases.map(c => `<div class="case ${report ? c.passed ? 'case-pass' : 'case-fail' : ''}"><strong>${report ? c.passed ? '✓' : '×' : '·'} ${safe(c.input)}</strong><span>Esperado: ${safe(c.expected)}</span>${report ? `<span>Obtido: ${safe(c.actual)}</span>` : ''}</div>`).join('')}</div>
    ${report ? `<details ${missionId === 2 ? 'open' : ''}><summary>Rastro da execução</summary><pre class="trace">${safe((missionId === 2 ? report.trace.slice(0, stepIndex) : report.trace).join('\n'))}</pre>${missionId === 2 && stepIndex < report.trace.length ? btn('Próximo passo →', 'step', 'quiet') : ''}</details>` : ''}`;
}
function renderChallenge() {
  const m = activePractice??missions[missionId],topic=missions[missionId].subject;
  const attempts=activePractice?progress.practiceAttempts[activePractice.id]??0:progress.attempts[missionId];
  modal('challenge', `<div class="challenge-heading">${tag(activePractice?`LABORATÓRIO / ${topic.toUpperCase()} · +${activePractice.xp} XP NA PRIMEIRA CONCLUSÃO`:`MISSÃO ${missionId + 1} / ${topic.toUpperCase()}${missionId < progress.current ? ' · REVISITA' : ''}`)}<h1 id="dialog-title">${m.title}</h1><p>${m.objective}</p></div><div class="challenge-grid"><div class="workspace"><div class="section-title"><h2>Sua solução</h2>${btn('↺ Reiniciar', 'reset', 'quiet')}</div><div class="rules"><strong>Regras do sistema</strong><p>${m.rules}</p></div><details class="teach-card"><summary>◈ Entender antes de resolver</summary><p>${lessons[[0,2,4,6,3][missionId]].pages[0]}</p><p>${lessons[[0,2,4,6,3][missionId]].pages[1]}</p><p class="micro">${activePractice?.explanation??lessons[[0,2,4,6,3][missionId]].pages[2]}</p></details><div id="editor">${editor()}</div><div class="hint-box">${btn(`? Dica ${Math.min(hintLevel + 1, 3)}/3`, 'hint', 'quiet')}<span>${hintLevel ? m.hints[hintLevel - 1] : 'Travou? As dicas estão aqui, sem penalidade.'}</span></div></div><aside class="test-panel" aria-label="Resultados dos testes">${reportHtml()}</aside></div><div class="challenge-footer"><span id="attempts">${attempts} execuções · ${activePractice?'aprenda no seu ritmo':`${progress.hints[missionId]} dicas consultadas`}</span><div class="actions">${activePractice?btn('← Laboratório','academy','quiet'):''}${btn('▶ Executar testes', 'run', 'primary')}${missionId === 4 ? btn('Lançar projeto ↗', 'launch', report?.passed ? 'primary' : 'secondary') : report?.passed ? btn(activePractice?'Concluir exercício →':'Entregar tarefa →', 'deliver', 'primary') : ''}</div></div>`, true);
}
function changed() { drafts.set(activePractice?.id??missionId, structuredClone(program)); report = null; launchFailure = false; }
function run(launch = false) {
  if(activePractice)progress.practiceAttempts[activePractice.id]=(progress.practiceAttempts[activePractice.id]??0)+1;else progress.attempts[missionId]++;
  persist(); report = assess(); stepIndex = 1; launchFailure = launch && !report.passed;
  officeScene.react(report.passed?'success':'think');audio.play(report.passed); if (launch && report.passed) deliver(); else renderChallenge();
}
function deliver() {
  if (!report?.passed) return;
  const before=levelInfo(progress).level;
  if(activePractice){
    const first=finishPractice(progress,activePractice.id);persist();rewardNotice(first?activePractice.xp:0,before);
    modal('practice-success',`<div class="content">${tag('EXPERIMENTO CONCLUÍDO')}<h1 id="dialog-title">${activePractice.title}</h1><div class="xp-reward">${first?`+${activePractice.xp} XP`:'Conceito reforçado ✓'}</div><p>${activePractice.explanation}</p><div class="mentor">Lia · Tente explicar com suas palavras por que a solução funciona. Entender o motivo vale mais que decorar os blocos.</div><div class="actions">${btn('Próximo experimento →','academy','primary')}${btn('Explorar a sala','office')}</div></div>`);return;
  }
  const m = missions[missionId], review = missionId < progress.current;
  if (!review) { completeMission(progress, missionId); persist(); }
  rewardNotice(review?0:campaignXP[missionId],before);
  audio.play(true);
  if (missionId === 4 && !review) { ending(); return; }
  modal('success', `<div class="content">${tag(review ? 'REVISITA CONCLUÍDA' : `MISSÃO ${missionId + 1} CONCLUÍDA`)}<div class="success-symbol">✓</div><h1 id="dialog-title">${review ? 'Conceito revisitado.' : 'Pequeno conserto. Grande alívio.'}</h1><p>${safe(m.success)}</p><div class="reward"><span>✦</span><div><small>${review ? 'CONQUISTA JÁ DESBLOQUEADA' : 'NOVIDADE NO ESCRITÓRIO'}</small><strong>${m.reward}</strong></div></div>${btn(review ? 'Voltar ao escritório' : 'Ver o escritório →', 'office', 'primary')}<p class="micro">${review ? 'Seu avanço na campanha foi preservado.' : 'Progresso salvo. A próxima mensagem está no computador.'}</p></div>`);
}
function ending() {
  modal('ending', `<div class="content ending">${tag('FEIRA CONECTA · LANÇAMENTO CONCLUÍDO')}<img class="ending-hero" src="./assets/personagem.png" alt="Seu personagem após a entrega"><h1 id="dialog-title">Deu deploy.<br><span>E deu certo.</span></h1><p>${missions[4].success}</p><p class="mentor">Lia · Já pode fechar o editor. Sério. A planta também está precisando de companhia.</p><div class="performance"><div><strong>5/5</strong><span>missões concluídas</span></div><div><strong>${progress.attempts.reduce((a, b) => a + b, 0)}</strong><span>execuções</span></div><div><strong>${progress.hints.reduce((a, b) => a + b, 0)}</strong><span>dicas consultadas</span></div></div><p class="micro">Cada tentativa fez parte da entrega. Obrigado por jogar.</p><div class="actions">${btn('Curtir o escritório →', 'office', 'primary')}${btn('Revisitar desafios', 'board')}${btn('Créditos', 'credits', 'quiet')}</div>${v3.completionCommunity('campaign')}</div>`, true);
}
function settings() {
  returnScreen = screen === 'pause' || screen === 'office' ? 'pause' : 'menu';
  settingsTab='sound';renderSettings();
}
function renderSettings(){
  const s=progress.settings;
  const toggle=(key:keyof Progress['settings'],label:string)=>`<label class="toggle"><input type="checkbox" data-setting="${key}" ${s[key]?'checked':''}>${label}</label>`;
  const choice=(key:keyof Progress['settings'],label:string,options:[string,string][])=>`<label>${label}<select data-setting="${key}">${options.map(([v,l])=>option(v,l,String(s[key]))).join('')}</select></label>`;
  const sound=`<label class="range-label">Volume dos efeitos <output id="volume-label">${Math.round(s.volume*100)}%</output><input type="range" data-setting="volume" aria-label="Volume dos efeitos" min="0" max="1" step="0.05" value="${s.volume}"></label>${toggle('muted','Silenciar todo o áudio')}${toggle('ambience','Ambiência procedural do escritório')}<label class="range-label">Volume da ambiência <output id="ambienceVolume-label">${Math.round(s.ambienceVolume*100)}%</output><input type="range" data-setting="ambienceVolume" aria-label="Volume da ambiência" min="0" max="1" step="0.05" value="${s.ambienceVolume}"></label><p class="micro">Um som ambiente suave, sem músicas ou arquivos externos. O silêncio desativa também a ambiência.</p>${btn('Ouvir efeito','sound','quiet')}`;
  const access=`${choice('textSpeed','Velocidade das mensagens',[['normal','Normal'],['slow','Devagar'],['instant','Texto imediato']])}${toggle('reducedMotion','Movimento reduzido')}${toggle('highContrast','Alto contraste')}${choice('uiScale','Tamanho dos textos da interface',[['compact','Compacto'],['normal','Normal'],['large','Ampliado']])}<p class="micro">O movimento reduzido remove saltos, balanço e partículas. Braços e pernas continuam sinalizando o deslocamento. Sem flashes.</p>`;
  const play=`${choice('moveSpeed','Velocidade do Byte',[['relaxed','Tranquila · 75%'],['normal','Normal · 100%'],['fast','Ágil · 135%']])}${toggle('objectLabels','Mostrar marcadores de interação')}${toggle('showControls','Mostrar a legenda de controles')}${toggle('celebrations','Celebrar conclusões com partículas')}<div class="actions">${btn('Alternar tela cheia','fullscreen')}${btn('Consultar controles','help','quiet')}</div><p class="micro">Não há prazo obrigatório, perda de XP ou penalidade por dicas. Os atalhos M, P e L abrem mapa, perfil e laboratório.</p>`;
  modal('settings',`<div class="content">${tag('DO SEU JEITO')}<h1 id="dialog-title">Configurações</h1><div class="tab-bar">${[['sound','Áudio'],['access','Acessibilidade'],['play','Jogo']].map(([id,label])=>btn(label,`settings-${id}`,settingsTab===id?'selected':'quiet')).join('')}</div><div class="settings-body">${settingsTab==='sound'?sound:settingsTab==='access'?access:play}</div><div class="actions">${btn('Concluído','back-settings','primary')}</div><p id="fullscreen-status" class="micro" role="status"></p></div>`);
}
function applySettings(){
  document.body.classList.toggle('reduced-motion',progress.settings.reducedMotion);
  document.body.classList.toggle('high-contrast',progress.settings.highContrast);
  document.body.dataset.uiScale=progress.settings.uiScale;audio.syncAmbience();
}
function rewardNotice(xp:number,before:number){
  if(!xp)return;
  const info=levelInfo(progress), unlocked=rooms.filter(r=>r.level>before&&r.level<=info.level);
  officeScene.react('success');officeScene.celebrate();audio.play(true);
  const notice=document.createElement('div');notice.className='xp-toast';notice.setAttribute('role','status');
  notice.innerHTML=`<b>+${xp} XP</b><span>${info.level>before?`NÍVEL ${info.level} · ${info.rank}`:'Boa! Mais um conceito na mochila.'}</span>${unlocked.map(r=>`<small>Nova sala: ${r.name}</small>`).join('')}`;
  document.body.append(notice);setTimeout(()=>notice.remove(),6500);
}
function map(){
  const info=levelInfo(progress);
  modal('map',`<div class="content">${tag('EDIFÍCIO CONECTA / MAPA')}<h1 id="dialog-title">Espaço para suas próximas ideias.</h1><p>Conclua missões, lições e exercícios para ganhar XP. Cada sala abre uma nova área do laboratório.</p><div class="room-grid">${rooms.map(r=>`<article class="room-card ${r.level>info.level?'locked':''}" style="--room-accent:${r.accent}"><div class="room-mini room-mini-${r.id}"><i></i><i></i><i></i><b>${String(r.id+1).padStart(2,'0')}</b></div>${tag(r.label)}<h2>${r.name}</h2><p>${r.description}</p><small>${r.level>info.level?`Desbloqueia no nível ${r.level}`:r.id===progress.room?'Você está aqui':`Disponível · nível ${r.level}`}</small>${btn(r.level>info.level?`Nível ${r.level} necessário`:r.id===progress.room?'Explorar esta sala →':'Viajar para a sala →',`room-${r.id}`,r.level<=info.level?'primary':'',r.level>info.level?'disabled':'')}</article>`).join('')}</div><div class="actions">${btn('Ver meu progresso','profile')}${btn('Voltar','office','quiet')}</div></div>`,true);
}
function travel(id:number){
  if(!rooms[id]||rooms[id].level>levelInfo(progress).level)return;
  progress.room=id;audio.cue(id===2?'server':'elevator');officeScene.switchRoom(id);persist();office();officeScene.react('wave');
}
function profile(){
  const info=levelInfo(progress), names=['Sequência','Lógica booleana','Laços e limites','Identidade e dados'];
  modal('profile',`<div class="content">${tag('BYTE / CADERNETA DE DESENVOLVEDOR')}<h1 id="dialog-title">Nível ${info.level} · ${info.rank}</h1><div class="profile-xp"><b>${info.xp} XP</b><div class="xp-track"><i style="width:${info.ratio*100}%"></i></div><small>${info.next?`${info.next-info.xp} XP até o nível ${info.level+1}`:'Todos os níveis alcançados'}</small></div><div class="performance"><div><strong>${progress.current}/5</strong><span>missões</span></div><div><strong>${progress.lessonCompleted.length}/8</strong><span>lições</span></div><div><strong>${progress.practiceCompleted.length}/12</strong><span>experimentos</span></div><div><strong>${rooms.filter(r=>r.level<=info.level).length}/6</strong><span>salas</span></div></div><h2>O que você está aprendendo</h2><div class="skill-grid">${names.map((name,i)=>{const n=+(progress.completed.includes(i))+progress.lessonCompleted.filter(id=>Math.floor(lessons.findIndex(l=>l.id===id)/2)===i).length+progress.practiceCompleted.filter(id=>practices.find(t=>t.id===id)?.kind===i).length;return `<div><strong>${name}</strong><span>${n}/6 marcos</span><div class="xp-track"><i style="width:${n/6*100}%"></i></div></div>`;}).join('')}</div><h2>Conquistas</h2><div class="badge-grid">${badges(progress).map(b=>`<div class="badge ${b.done?'earned':''}"><b>${b.done?'✦':'◇'} ${b.name}</b><small>${b.description}</small></div>`).join('')}</div><details><summary>Desempenho da campanha</summary><table class="stats-table"><thead><tr><th>Missão</th><th>Execuções</th><th>Dicas</th></tr></thead><tbody>${missions.map(m=>`<tr><td>${m.title}</td><td>${progress.attempts[m.id]}</td><td>${progress.hints[m.id]}</td></tr>`).join('')}</tbody></table></details><p class="micro">XP vem da primeira conclusão de cada atividade. Repetir reforça o aprendizado, sem criar XP infinito. Dicas não reduzem as recompensas.</p><div class="actions">${btn('Mapa de salas','map','primary')}${btn('Aprender algo novo','lessons')}${btn('Voltar','office','quiet')}</div></div>`,true);
}
function academy(room=progress.room){
  const info=levelInfo(progress);
  modal('academy',`<div class="content">${tag('LABORATÓRIO / 12 EXPERIMENTOS')}<h1 id="dialog-title">Aprender fazendo.</h1><p>Problemas novos, resultados reais. Cada primeira conclusão vale <strong>60 XP</strong>. Experimente, use dicas e explique o que mudou.</p><div class="tab-bar">${rooms.slice(0,4).map(r=>btn(`${r.level>info.level?'◇ ':''}${r.name}`,`lab-room-${r.id}`,r.id===room?'selected':'quiet')).join('')}</div><div class="lesson-grid">${practices.filter(t=>t.room===room).map(t=>`<article class="activity-card"><span class="activity-icon">${['⇅','&','↻','#'][t.kind]}</span>${tag(missions[t.kind].subject)}<h2>${t.title}</h2><p>${t.objective}</p><small>${progress.practiceCompleted.includes(t.id)?'✓ Concluído · revisita livre':'+60 XP na primeira conclusão'}</small>${btn(rooms[t.room].level>info.level?`Sala abre no nível ${rooms[t.room].level}`:progress.practiceCompleted.includes(t.id)?'Revisitar':'Experimentar →',`practice-${t.id}`,'primary',rooms[t.room].level>info.level?'disabled':'')}</article>`).join('')}</div><div class="actions">${btn('Ver lições explicadas','lessons')}${btn('Mapa das salas','map')}${btn('Voltar ao escritório','office','quiet')}</div></div>`,true);
}
function lessonList(){
  modal('lessons',`<div class="content">${tag('ACADEMIA DA LIA / 8 LIÇÕES')}<h1 id="dialog-title">Entenda o porquê.</h1><p>Três explicações curtas e uma pergunta por lição. Aprenda no seu ritmo; acertar a revisão pela primeira vez rende <strong>35 XP</strong>.</p><div class="lesson-grid">${lessons.map((l,i)=>`<article class="activity-card compact-card">${tag(`${String(i+1).padStart(2,'0')} / ${l.concept}`)}<h2>${l.title}</h2><small>${progress.lessonCompleted.includes(l.id)?'✓ Aprendido · pode revisar':'+35 XP · leitura + prática'}</small>${btn(progress.lessonCompleted.includes(l.id)?'Revisar':'Aprender →',`lesson-${l.id}`,'quiet')}</article>`).join('')}</div><div class="actions">${btn('Ir para os experimentos','academy','primary')}${btn('Voltar','office','quiet')}</div></div>`,true);
}
function lesson(){
  const l=lessons.find(l=>l.id===lessonId)!;
  const correct=lessonAnswer===l.correct;
  modal('lesson',`<div class="content lesson-reader">${tag(`LIA EXPLICA / ${l.concept.toUpperCase()}`)}<div class="lesson-progress">${[0,1,2,3].map(i=>`<span class="${i<=lessonPage?'active':''}"></span>`).join('')}</div><h1 id="dialog-title">${l.title}</h1>${lessonPage<3?`<span class="lesson-page-number">0${lessonPage+1} / CONCEITO</span><p class="lesson-text">${l.pages[lessonPage]}</p><div class="lesson-visual">${['ENTRADA → ETAPAS → SAÍDA','A + B → DEPENDÊNCIAS','VERDADEIRO / FALSO','ESPERADO = OBTIDO','INÍCIO → CONDIÇÃO → ATUALIZAÇÃO','0, 1, 2, 3 → PARAR','ID → PESSOA','REENVIO → MESMO REGISTRO'][lessons.indexOf(l)]}</div><div class="actions">${lessonPage?btn('← Anterior','lesson-prev'):''}${btn(lessonPage===2?'Vamos praticar →':'Próxima explicação →','lesson-next','primary')}</div>`:`<span class="lesson-page-number">04 / SUA VEZ</span><h2 class="quiz-question">${l.question}</h2><div class="quiz-answers">${l.answers.map((a,i)=>btn(`${String.fromCharCode(65+i)} · ${a}`,`answer-${i}`,lessonAnswer===i?'selected':'')).join('')}</div>${lessonAnswer!==null?`<div class="feedback ${correct?'pass':'fail'}" role="status"><strong>${correct?'✓ Conceito entendido!':'↻ Tente outra vez, sem perder nada.'}</strong><p>${correct?l.feedback:`Revise a regra: ${l.pages[1]}`}</p></div>`:''}<div class="actions">${btn('← Rever conceito','lesson-prev','quiet')}${correct?btn('Continuar aprendendo →','lessons','primary'):''}</div>`}<div class="lesson-exit">${btn('Voltar às lições','lessons','quiet')}</div></div>`);
}
function pause() {
  if (!started) return;
  v3.stop();modal('pause', `<div class="content">${tag('SEM PRESSA')}<h1 id="dialog-title">Uma pausa no projeto.</h1><p>${safe(chapterObjective(progress))}</p><div class="menu-buttons">${btn('Continuar jogando →','office','primary')}${btn('Quadro de tarefas','board')}${btn('Modos de jogo','v3-modes')}${btn('Caderno do Byte','v3-notebook')}${btn('Configurações','settings')}${btn('Controles e remapeamento','v3-controls')}${btn('Exportar / importar save','v3-saves')}${btn('Comunidade e feedback','v3-community')}${btn('Personalizar escritório','v3-customize')}${btn('Menu inicial','menu','quiet')}</div></div>`);
}
function continueGame() {
  if (!saved) return;
  const settings = { ...progress.settings };
  progress = structuredClone(saved); progress.settings = settings; started = true;officeScene.home(false); officeScene.switchRoom(progress.room);office();
}
function help() { v3.controls(); }
function credits() {
  modal('credits', `<div class="content">${tag('FEITO COM CAFÉ E DEPENDÊNCIAS')}<img class="credits-logo" src="./assets/logo.png" alt="Só Mais Um Deploy"><h1 id="dialog-title">Créditos</h1><p><strong>Autoria · Talisson Souza</strong></p><p>Logo e personagem fornecidos por Talisson Souza.<br>Seis ambientes, rig direcional do Byte e áudio procedural criados para este jogo. Talisson foi representado em pixel art a partir da foto fornecida pelo autor, sem óculos, com fones brancos e camiseta preta, conforme a orientação mais recente. O Byte jogável foi modelado a partir da referência enviada.</p><p class="micro">Tecnologia: Phaser 3, TypeScript, Vite e Electron.<br>Phaser · MIT / Richard Davey e contribuidores.<br>Vite · MIT / Evan You e contribuidores.<br>TypeScript · Apache-2.0 / Microsoft.<br>Electron · MIT / OpenJS Foundation e contribuidores.<br>Licenças das dependências incluídas no pacote desktop.</p>${btn('Comunidade e feedback','v3-community')}${btn('Voltar', started ? 'office' : 'menu', 'primary')}</div>`);
}
function close() {
  v3.stop();
  if (screen === 'menu') return;
  if (screen === 'confirm') { menu(); return; }
  if (screen === 'settings') { if (returnScreen === 'pause') pause(); else menu(); return; }
  if (started) office(); else menu();
}
document.addEventListener('click', e => {
  const button = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]'); if (!button || button.disabled) return;
  audio.play(); const action = button.dataset.action!;
  if(action==='v3-modes'&&!started&&saved){progress=structuredClone(saved);started=true;officeScene.home(false);officeScene.switchRoom(progress.room);renderHud();}
  if(v3.handle(action))return;
  const actions: Record<string, () => void> = { new: newGame, 'confirm-new': beginNew, continue: continueGame, office, menu, pause, help, settings, credits, board, ending, close, map,profile,academy,lessons:lessonList,
    'lesson-next':()=>{lessonPage=Math.min(3,lessonPage+1);lesson();},'lesson-prev':()=>{lessonPage=Math.max(0,lessonPage-1);lessonAnswer=null;lesson();},
    fullscreen:()=>{const request=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();void request.catch(()=>{const el=document.querySelector('#fullscreen-status');if(el)el.textContent='Este navegador não permitiu tela cheia. Você pode maximizar a janela.';});},
    'back-settings': () => returnScreen === 'pause' ? pause() : menu(), 'open-challenge': openChallenge, run: () => run(), launch: () => run(true), deliver, sound: () => audio.play(true), reveal: () => { clearInterval(textTimer); $('#dialogue').textContent = completeText; }, step: () => { stepIndex++; renderChallenge(); }, reset: () => { program = structuredClone(activePractice?.initial??initialProgram(missionId)); changed(); renderChallenge(); }, hint: () => { if (hintLevel < 3) { hintLevel++; if(!activePractice)progress.hints[missionId]++; persist(); } renderChallenge(); } };
  if (actions[action]) actions[action]();
  else if (/^(up|down)-\d$/.test(action)) {
    const [dir, raw] = action.split('-'), i = Number(raw), j = i + (dir === 'up' ? -1 : 1); const order = program as string[];
    if (j >= 0 && j < order.length) { [order[i], order[j]] = [order[j], order[i]]; changed(); renderChallenge(); }
  } else if (/^mission-\d$/.test(action)) {
    const id = Number(action.split('-')[1]); if (id > progress.current || id > 4) return;
    activePractice=null;missionId = id as MissionId; if (id < progress.current) openChallenge(); else message(missionId);
  } else if(/^room-\d$/.test(action)){travel(Number(action.split('-')[1]));
  } else if(/^lab-room-\d$/.test(action)){academy(Number(action.split('-')[2]));
  } else if(action.startsWith('practice-')){
    const task=practices.find(t=>t.id===action.slice(9));if(!task||rooms[task.room].level>levelInfo(progress).level)return;
    activePractice=task;missionId=task.kind;openChallenge();
  } else if(action.startsWith('lesson-')){
    const id=action.slice(7);if(!lessons.some(l=>l.id===id))return;lessonId=id;lessonPage=0;lessonAnswer=null;lesson();
  } else if(action.startsWith('answer-')){
    if(screen!=='lesson'||lessonPage!==3)return;lessonAnswer=Number(action.slice(7));const l=lessons.find(l=>l.id===lessonId)!;
    if(lessonAnswer===l.correct){const before=levelInfo(progress).level;if(finishLesson(progress,l.id)){persist();rewardNotice(35,before);}}
    else officeScene.react('think');lesson();
  } else if(action.startsWith('settings-')){
    settingsTab=action.slice(9);renderSettings();
  }
});
document.addEventListener('change', e => {
  const input = e.target as HTMLInputElement; const field = input.dataset.field;
  if(input.hasAttribute('data-v3import')){const file=input.files?.[0];if(file)void v3.importFile(file);return;}
  if(v3.handleField(input))return;
  if (field && screen === 'challenge') {
    const path = field.split('.'); let target = program as unknown as Record<string, unknown>;
    for (const key of path.slice(0, -1)) target = target[key] as Record<string, unknown>;
    const key = path.at(-1)!; target[key] = ['start', 'end', 'step'].includes(key) ? Number(input.value) : key === 'inclusive' ? input.value === 'true' : input.value;
    changed();
    // Keep focus on the matching field after the pseudocode and tests are refreshed.
    renderChallenge(); queueMicrotask(() => document.querySelector<HTMLElement>(`[data-field="${field}"]`)?.focus({ preventScroll: true }));
  }
});
document.addEventListener('input', e => {
  const input = e.target as HTMLInputElement; const key = input.dataset.setting as keyof Progress['settings'] | undefined;
  if(input.closest('#feedback-form')){v3.previewFeedback();return;}
  if (!key) return;
  const settings=progress.settings as unknown as Record<string,unknown>;
  if(key==='volume'||key==='ambienceVolume'){settings[key]=Number(input.value);$(`#${key}-label`).textContent=`${Math.round(Number(input.value)*100)}%`;}
  else if(input.type==='checkbox')settings[key]=input.checked;
  else settings[key]=input.value;
  applySettings();store.saveSettings(progress.settings);persist();
});
document.addEventListener('keydown', e => {
  if(v3.captureKey(e))return;
  const key=e.key===' '?'space':e.key.toLowerCase(),bindings=progress.settings.bindings;
  if(screen==='office'&&!e.repeat){if(key===bindings.map){e.preventDefault();map();}else if(key===bindings.profile){e.preventDefault();profile();}else if(key===bindings.lab){e.preventDefault();progress.v3.mode='lab';persist();v3.hub();}else if(key===bindings.notebook){e.preventDefault();v3.notebook();}else if(key===bindings.wave){e.preventDefault();officeScene.react('wave');}else if(key===bindings.pause){e.preventDefault();pause();return;}}
  if (e.key === 'Escape') { e.preventDefault(); if (screen === 'office') pause(); else close(); }
  if (e.key !== 'Tab' || screen === 'office') return;
  const elements = [...document.querySelectorAll<HTMLElement>('#overlay button:not([disabled]), #overlay select, #overlay input, #overlay textarea, #overlay summary, #overlay a[href]')];
  const first = elements[0], last = elements.at(-1);
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
  if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
});
window.addEventListener('blur', () => {audio.quiet();v3.stop(false); if (screen === 'office') pause(); });
window.addEventListener('focus',()=>audio.syncAmbience());
applySettings();
const officeScene = new OfficeScene({ blocked: () => screen !== 'office'&&screen!=='dialogue-world', completed: () => progress.current, reducedMotion: () => progress.settings.reducedMotion, interact, nearby: setNearby,
  speed:()=>({relaxed:.75,normal:1,fast:1.35}[progress.settings.moveSpeed]),labels:()=>progress.settings.objectLabels,celebrations:()=>progress.settings.celebrations,
  progress:()=>progress,bindings:()=>progress.settings.bindings,menu:()=>screen==='menu',cue:name=>audio.cue(name),npcAway:()=>v3.away() });
new Phaser.Game({ type: Phaser.AUTO, width: 960, height: 540, parent: 'world', backgroundColor: '#101923', pixelArt: true, roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, render: { antialias: false },
  scene: officeScene });
const v3=new V3Controller({
 progress:()=>progress,persist,modal,office,travel,firstMessage:()=>message(0),oldLessons:lessonList,
 replaceSave:next=>{progress=next;started=true;saved=structuredClone(next);drafts.clear();applySettings();officeScene.home(false);officeScene.switchRoom(progress.room);persist();office();},
 react:mood=>officeScene.react(mood),frame:(id,frame)=>officeScene.showSimulation(id,frame),
 conversation:html=>{screen='dialogue-world';$('#overlay').className='world-dialogue-overlay';$('#overlay').innerHTML='<section class="panel world-dialogue" role="dialog" aria-labelledby="dialog-title">'+html+'</section>';$('#hud').inert=false;queueMicrotask(()=>document.querySelector<HTMLElement>('#overlay button')?.focus({preventScroll:true}));},
 world:html=>{screen='world-simulation';$('#overlay').className='world-simulation-overlay';$('#overlay').innerHTML=html;$('#hud').inert=true;},
 reward:rewardNotice,audio:name=>audio.cue(name),refreshWorld:()=>officeScene.invalidate(),
});
menu();
