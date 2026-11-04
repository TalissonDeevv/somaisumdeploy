import type { Progress } from '../core/types';
import { MAX_SAVE_BYTES, parseSave } from '../core/state';
import { levelInfo } from '../core/progression';
import { activities, conceptLessons, initialActivity, COMMUNITY_URL } from './content';
import { activityRequirement, chapterObjective, defaultBindings, emit, guestActivity, guestStage, setGuestFlag, type GuestId } from './events';
import { dialogueNode, isGuestNode, portrait, remember, type DialogueAction } from './dialogue';
import { demoFrames, DEMO_EVENTS, ORDER_CHECK, runActivity } from './interpreters';
import { characterStanding } from '../game/CharacterPixels';
import { simulationView, sensorNames } from './simulationView';
import { button as b, eyebrow as tag, escapeHTML as e, pick } from './ui';
import type { ActivityId, ActivityProgram, ActivityRun, Control, GameMode, NodeId, OrderEvent, ServiceCommand, SimFrame } from './types';

export interface V3Hooks {
 progress:()=>Progress; persist:()=>void; modal:(name:string,html:string,wide?:boolean)=>void;
 office:()=>void; travel:(room:number)=>void; firstMessage:()=>void; oldLessons:()=>void;
 replaceSave:(progress:Progress)=>void; react:(mood:'wave'|'think'|'success'|'error'|'type'|'examine'|'talk'|'sit')=>void;
 conversation:(html:string,side:'left'|'right')=>void;
 frame:(id:ActivityId|null,frame:SimFrame|null)=>void; world:(html:string)=>void;
 reward:(xp:number,before:number)=>void; audio:(cue:string)=>void; refreshWorld:()=>void;
}
const nodeNames:Record<NodeId,string>={ticket:'Ingresso',paid:'Pago',team:'Equipe',and:'E',or:'OU',gate:'Catraca'};
const commandNames:Record<ServiceCommand,string>={N:'↑ Norte',S:'↓ Sul',E:'→ Leste',W:'← Oeste',pick:'Coletar kit',drop:'Entregar kit',call:'Chamar função','2N':'Repetir 2 × norte','2E':'Repetir 2 × leste','2S':'Repetir 2 × sul','2W':'Repetir 2 × oeste'};
const orderNames:Record<OrderEvent,string>={cafe:'Pedir café (“1,00”)',pao:'Pedir pão de queijo (“3,50”)',pay:'Pagar e enviar ao balcão',new:'Nova compra'};
const activityGuest=(id:ActivityId):GuestId|null=>(Object.entries(guestActivity).find(([,a])=>a===id)?.[0] as GuestId|undefined)??null;
const guestName:Record<GuestId,string>={luiz:'Luiz',indo:'Indo'};
const controlNames:Record<Control,string>={up:'Cima',down:'Baixo',left:'Esquerda',right:'Direita',interact:'Interagir',map:'Mapa',profile:'Perfil',lab:'Laboratório',notebook:'Caderno',wave:'Acenar',pause:'Pausar'};
export class V3Controller {
 private activity:ActivityId='route'; private program:ActivityProgram=initialActivity('route');
 private run:ActivityRun|null=null;private index=0;private variant=0;private hint=0;private runs=0;
 private timer?:ReturnType<typeof setInterval>;private textTimer?:ReturnType<typeof setInterval>;
 private worldView=false;private demo:boolean|null=null;private origin:NodeId='ticket';private destination:NodeId='and';
 private routeTarget:'commands'|'routine'='commands';private node='greeting';private importCandidate:Progress|null=null;
 private capture:Control|null=null;private remapMessage='';private openingOrder=['ligar','energia','carregar'];
 private conceptId='variables';private conceptAnswer:number|null=null;private clipboardMessage='';
 private dialogueVisible=false;private conceptReturn:ActivityId|null=null;
 constructor(private h:V3Hooks){}
 get p(){return this.h.progress();}
 stop(clearWorld=true){if(this.dialogueVisible&&!isGuestNode(this.node)){this.p.v3.dialoguePaused=!this.p.v3.facts.includes('finished');if(this.node!=='reminder')this.p.v3.dialogueNode=this.node;this.h.persist();}this.dialogueVisible=false;clearInterval(this.timer);this.timer=undefined;clearInterval(this.textTimer);if(clearWorld){this.worldView=false;this.h.frame(null,null);}}
 approach(){this.sync();this.dialogue(this.p.v3.dialoguePaused?'reminder':'greeting');}
 guest(id:GuestId){this.dialogue(id+'-hello');}
 // Walking away only pauses a conversation that is open; a task Byte accepted stays accepted.
 away(){if(this.dialogueVisible){this.stop();this.h.office();}}
 private closeTalk(){this.dialogueVisible=false;this.stop();}
 private shell(name:string,content:string,wide=false){clearInterval(this.textTimer);this.h.modal(name,'<div class="content v3-content">'+content+'</div>',wide);}
 private sync(){
  const s=this.p.v3;if(s.activityCompleted.includes('tests')&&s.activityCompleted.includes('investigation')&&['observed','log','note'].every(f=>s.facts.includes(f as 'observed')))emit(this.p,{type:'fact',fact:'hypothesis'});
  if(s.activityCompleted.includes('data'))emit(this.p,{type:'fact',fact:'corrected'});
 }
 intro(){this.stop();this.dialogue('intro');}
 modes(){
  this.stop();this.shell('modes',tag('TRÊS FORMAS DE JOGAR')+'<h1 id="dialog-title">O mesmo mundo. Novas perguntas.</h1><div class="v3-mode-grid">'+([
   ['story','História','Campanha da feira, conversas e investigação com Talisson.'],
   ['lab','Laboratório','Experimente entradas e regras. Avance por eventos e compare o estado.'],
   ['challenges','Desafios','Oito formatos com metas, variações predefinidas e melhor solução local.'],
  ] as const).map(([id,title,text])=>'<article><span class="activity-icon">'+({story:'◈',lab:'⌘',challenges:'◇'}[id])+'</span><h2>'+title+'</h2><p>'+text+'</p>'+b('Entrar →','mode-'+id,'primary')+'</article>').join('')+'</div><p class="micro">Os modos compartilham as mesmas simulações e validadores. Revisitas não duplicam XP. Sem tempo obrigatório.</p>',true);
 }
 hub(){
  this.stop();const mode=this.p.v3.mode;
  this.shell('v3-hub',tag(mode==='lab'?'LABORATÓRIO / EXPERIMENTAÇÃO':'DESAFIOS / OITO FORMATOS')+'<h1 id="dialog-title">Programar para transformar.</h1><p>Escolha um problema. A cena acompanha a execução real; o relatório continua disponível. Os pré-requisitos dependem dos conceitos demonstrados, não só do nível.</p><div class="v3-concept-links">'+b('Variáveis','concept-variables','quiet')+b('Listas','concept-lists','quiet')+b('Funções','concept-functions','quiet')+b('Estado e eventos','concept-events','quiet')+b('Tipos de dados','concept-types','quiet')+b('Rever condições','old-lessons','quiet')+'</div><div class="lesson-grid">'+activities.map(a=>{
   const need=activityRequirement(this.p,a.id),complete=this.p.v3.activityCompleted.includes(a.id);
   return '<article class="activity-card">'+tag(a.format)+'<h2>'+a.title+'</h2><p>'+a.objective+'</p><small>'+e(a.difficulty)+' · '+(complete?'✓ concluído':a.xp+' XP na primeira conclusão')+'</small>'+(need?'<p class="micro">Pré-requisito: '+e(need)+'</p>'+b('Revisar e aprender','review-'+a.id):b(mode==='lab'?'Experimentar →':'Aceitar desafio →','activity-'+a.id,'primary'))+'</article>';
  }).join('')+'</div><div class="actions">'+b('Trocar modo','modes')+b('Caderno do Byte','notebook')+b('Voltar ao mundo','office','primary')+'</div>',true);
 }
 openActivity(id:ActivityId){
  this.stop();const guestId=activityGuest(id);if(guestId&&guestStage(this.p,guestId)==='start'){setGuestFlag(this.p,guestId,'met');this.h.persist();this.h.refreshWorld();}
  const need=activityRequirement(this.p,id);if(need){this.conceptReturn=id;const task=activities.find(a=>a.id===id)!;if(task.concepts.length)this.concept(task.concepts.find(c=>!this.p.v3.concepts.includes(c))??task.concepts[0]);else this.h.oldLessons();return;}
  this.activity=id;this.program=initialActivity(id);this.run=null;this.index=0;this.hint=0;this.runs=0;this.variant=0;this.demo=null;this.workbench();
 }
 private programEditor():string{
  const p=this.program;
  if(p.kind==='route'){
   const list=(items:ServiceCommand[],target:string)=>'<ol class="v3-command-list">'+items.map((c,i)=>'<li><b>'+e(commandNames[c])+'</b><span>'+b('↑','cmd-up-'+target+'-'+i,'move',i===0)+b('↓','cmd-down-'+target+'-'+i,'move',i===items.length-1)+b('×','cmd-remove-'+target+'-'+i,'move')+'</span></li>').join('')+'</ol>';
   return '<div class="v3-route-editor">'+pick('Adicionar blocos em','routeTarget',this.routeTarget,[['commands','Programa principal'],['routine','Função reutilizável']])+'<div class="command-palette">'+(Object.keys(commandNames) as ServiceCommand[]).filter(c=>this.routeTarget!=='routine'||c!=='call').map(c=>b(commandNames[c],'add-'+c,'quiet')).join('')+'</div><h3>Programa principal</h3>'+list(p.commands,'commands')+'<h3>função <input aria-label="Nome da função" data-v3field="routineName" value="'+e(p.name)+'" maxlength="24"></h3>'+list(p.routine,'routine')+'<p class="micro">“Chamar função” executa o corpo abaixo do nome. Objetivo opcional: reutilizar a rotina nas duas entregas.</p></div>';
  }
  if(p.kind==='circuit')return '<div class="node-palette">'+(Object.keys(nodeNames) as NodeId[]).map(n=>b(nodeNames[n],'node-'+n,this.origin===n?'selected':'quiet')).join('')+'</div><p class="micro">Clique em uma origem e depois no destino para ligar. Ou use os seletores abaixo.</p><div class="field-grid">'+pick('Origem','origin',this.origin,Object.entries(nodeNames))+pick('Destino','destination',this.destination,Object.entries(nodeNames))+'</div>'+b('Conectar origem → destino','connect','primary')+'<ol class="edge-list">'+p.edges.map(([a,z],i)=>'<li>'+e(nodeNames[a])+' → '+e(nodeNames[z])+b('Remover','edge-'+i,'quiet')+'</li>').join('')+'</ol>';
  if(p.kind==='debug')return '<div class="field-grid">'+pick('Vagas iniciais','capacity',p.capacity,[0,1,2,3,4,5,6].map(n=>[n,String(n)]))+pick('Condição antes de aprovar','comparison',p.comparison,[['>=','vagas ≥ 0'],['>','vagas > 0']])+pick('Atualização das vagas','change',p.change,[[-1,'Subtrair 1'],[0,'Não mudar'],[1,'Somar 1']])+pick('Primeira linha responsável','line',p.line,[[1,'1 · Inicialização'],[2,'2 · Condição de entrada'],[3,'3 · Atualização'],[4,'4 · Bloqueio']])+'</div><p class="micro">As linhas executadas ficam destacadas. Pause antes da quarta pessoa e examine vagas.</p>';
  if(p.kind==='tests')return '<div class="command-palette">'+DEMO_EVENTS.map(id=>b(({A17:'Inscrever A17',B28:'Inscrever B28',reconnect:'Reconectar',retryA:'Reenviar A17',retryB:'Reenviar B28'})[id],'event-'+id,'quiet')).join('')+'</div><ol class="v3-command-list">'+p.events.map((id,i)=>'<li><b>'+e(id)+'</b>'+b('↑','event-up-'+i,'move',i===0)+b('×','event-remove-'+i,'move')+'</li>').join('')+'</ol><h3>Objetivo opcional: um caso negativo</h3><p class="micro">A catraca antiga usa OU entre todos os sensores. Encontre uma entrada que deveria ser bloqueada, mas passa.</p><div class="v3-checkboxes">'+(['ticket','paid','team'] as const).map((key,i)=>'<label><input type="checkbox" data-v3field="negative-'+key+'" '+(p.negative[key]?'checked':'')+'>'+sensorNames(0)[i]+'</label>').join('')+'</div>';
  if(p.kind==='data')return '<div class="function-card"><h3>função salvarInscrição(registro)</h3>'+pick('Consultar identidade por','identity',p.identity,[['name','Nome'],['email','E-mail'],['id','ID único']])+pick('Se já existe','strategy',p.strategy,[['append','Inserir outra cópia'],['ignore','Ignorar o novo envio'],['upsert','Atualizar; inserir se não existe']])+'<label class="toggle"><input type="checkbox" data-v3field="persistent" '+(p.persistent?'checked':'')+'>Consultar e proteger no banco persistente</label><p class="micro">A mesma função é chamada pelo tablet e pelo quiosque. Avance para observar inclusão, consulta e atualização da lista.</p></div>';
  if(p.kind==='orders')return '<div class="command-palette">'+(Object.keys(orderNames) as OrderEvent[]).map(id=>b(orderNames[id],'order-add-'+id,'quiet')).join('')+'</div><h3>Roteiro de teste no terminal</h3><ol class="v3-command-list">'+p.script.map((id,i)=>'<li><b>'+e(orderNames[id])+'</b><span>'+b('↑','order-up-'+i,'move',i===0)+b('×','order-remove-'+i,'move')+'</span></li>').join('')+'</ol><h3>Trechos do código gerado pela IA</h3><div class="field-grid">'+pick('Converter o preço','conversion',p.conversion,[['ai','Number(preco) || 0'],['strip','Tirar a vírgula e converter'],['decimal','Trocar vírgula por ponto e converter']])+pick('Ouvintes do botão Pedir','listeners',p.listeners,[[2,'Dois: clique e toque'],[1,'Um por botão']])+'</div><label class="toggle"><input type="checkbox" data-v3field="reset" '+(p.reset?'checked':'')+'>Zerar total e itens ao abrir uma nova compra</label>';
  if(p.kind==='budget')return '<div class="brief-messages"><p><b>Cliente</b> É só uma telinha! Cardápio, login, perfil, pedidos, pagamento e ajuda.</p><p><b>Cliente</b> Aproveita e faz a versão desktop?</p><p><b>Cliente</b> Dá para clicar no protótipo, né?</p><p><b>Cliente</b> Ah, e um botão que faz tudo.</p><p><b>Anotação da Indo</b> 4 h por tela, R$ 50 por hora. Valores fictícios para o desafio.</p></div><h3>Variáveis</h3><div class="field-grid">'+pick('telas','telas',p.telas,[1,3,6,8].map(n=>[n,String(n)]))+pick('horas por tela','horas',p.horas,[2,4,8].map(n=>[n,n+' h']))+pick('valor por hora','valor',p.valor,[25,50,100].map(n=>[n,'R$ '+n]))+'</div><h3>Regras do cálculo</h3><div class="field-grid">'+pick('Protótipo entra na conta','protoCount',p.protoCount,[[2,'Duas vezes'],[1,'Uma vez']])+pick('Somar desktop quando','desktopCond',p.desktopCond,[['prototipo','prototipo for verdadeiro'],['desktop','desktop for verdadeiro']])+'</div><label class="toggle"><input type="checkbox" data-v3field="vague" '+(p.vague?'checked':'')+'>Cobrar R$ 999 pelo “botão que faz tudo”</label>';
  const rows=demoFrames(DEMO_EVENTS,{kind:'data',identity:'id',strategy:'ignore',persistent:false});
  return '<div class="evidence-list">'+rows.map((f,i)=>'<label><input type="checkbox" data-v3field="evidence-'+i+'" '+(p.evidence.includes(i)?'checked':'')+'><span><b>Passo '+i+' · '+e(f.label)+'</b><small>Banco: '+(f.records??[]).map(r=>r.id).join(', ')+' / cache: '+e(f.vars.cache??'')+'</small></span></label>').join('')+'</div>'+pick('Hipótese apoiada pelas evidências','hypothesis',p.hypothesis,[['network','A rede sozinha duplica qualquer pessoa'],['name','As duas Anas são a mesma pessoa'],['cache','O cache era a única proteção; o banco não verifica ID']]);
 }
 private currentFrame(){return this.run?.frames[this.index]??{label:'Execute ou avance um passo para examinar o estado.',vars:{},output:[]};}
 private workbench(){
  const task=activities.find(a=>a.id===this.activity)!;
  this.h.react(this.demo!==null?'examine':'type');
  const variantText=this.variant===1?(this.activity==='route'?'Variação B: destinos em (2,1) e (5,1).':'Variação B: (agendado OU prioritário) E documento.'):'';
  this.shell('workbench',tag((this.demo!==null?'DEMONSTRAÇÃO / ':this.p.v3.mode.toUpperCase()+' / ')+task.format)+'<h1 id="dialog-title">'+task.title+'</h1><p>'+task.objective+'</p><div class="v3-workbench"><section><div class="rules"><strong>Regras</strong><p>'+e(task.rules)+'</p>'+(variantText?'<p><b>'+variantText+'</b></p>':'')+'</div>'+(this.demo===null?this.programEditor():'<p>Talisson executa uma sequência predefinida de cinco eventos. Você pode pausar, avançar ou ir ao resultado.</p>')+'<div class="hint-box">'+b('Dica '+Math.min(this.hint+1,3)+'/3','hint','quiet')+'<span>'+e(this.hint?task.hints[this.hint-1]:'Observe primeiro. As dicas não retiram XP.')+'</span></div>'+(this.demo===null&&['route','circuit'].includes(this.activity)?b('Cenário '+(this.variant===0?'A → B':'B → A'),'variant','quiet'):'')+'</section><section class="v3-simulation"><div id="v3-sim">'+simulationView(this.program,this.currentFrame(),this.variant)+'</div><div class="sim-controls">'+this.playbackControls()+'</div><div id="v3-report">'+this.report()+'</div></section></div><div class="actions v3-bottom">'+(this.demo===null?b('Reiniciar atividade','reset'):b('Voltar à conversa','dialogue'))+(activityGuest(this.activity)?b('Falar com '+guestName[activityGuest(this.activity)!],'talk-'+activityGuest(this.activity),'quiet'):'')+b('Ver no cenário','world')+b('Caderno','notebook','quiet')+'<span id="v3-completion">'+this.completeButton()+'</span></div>',true);
 }
 private playbackControls(){return b(this.timer?'Pausar':'Executar','play','primary')+b('Passo →','step')+b('Ir ao resultado','skip','quiet');}
 private completeButton(){return this.run&&this.index===this.run.frames.length-1?(this.demo!==null?b('Conversar sobre o resultado','dialogue','primary'):this.run.passed?b('Concluir e aplicar ao mundo','complete','primary'):''):'';}
 private report(){
  if(!this.run)return '<p class="micro">A entrada e a execução determinam a saída. Nada é enviado a um servidor.</p>';
  const atEnd=this.index===this.run.frames.length-1;
  return (atEnd?'<div class="feedback '+(this.run.passed?'pass':'fail')+'" role="status"><strong>'+(this.run.passed?'✓ Objetivo atingido':'↻ Resultado para investigar')+'</strong><p>'+e(this.run.feedback)+'</p></div>'+(this.run.comment?'<p class="mentor">'+e(this.run.comment)+'</p>':''):'<p class="micro">Passo '+this.index+' de '+(this.run.frames.length-1)+'. O relatório final aparece ao terminar.</p>')+'<details><summary>Relatório técnico da execução</summary><pre class="trace">'+e(this.run.frames.slice(0,this.index+1).map((f,i)=>i+' · '+f.label+' / '+JSON.stringify(f.vars)).join('\n'))+'</pre></details>';
 }
 private execute(){
  clearInterval(this.timer);this.timer=undefined;this.run=runActivity(this.program,this.variant);this.index=0;this.runs++;
  this.h.audio('test');this.h.frame(this.activity,this.currentFrame());this.workbench();
  if(this.program.kind==='route'||this.program.kind==='data')this.h.audio('type');
 }
 private reachedEnd(){
  if(!this.run||this.index!==this.run.frames.length-1)return;
  clearInterval(this.timer);this.timer=undefined;
  this.p.v3.results[this.activity]=(this.run.passed?'OK · ':'Investigar · ')+this.run.feedback.slice(0,360);
  if(this.demo!==null&&(!this.demo||this.run.passed)){emit(this.p,{type:'fact',fact:this.demo?'presented':'observed'});}
  this.sync();this.h.persist();this.h.react(this.run.passed?'success':'think');
 }
 private paint(){
  const focused=(document.activeElement as HTMLElement|null)?.dataset.action;
  this.h.frame(this.activity,this.currentFrame());this.reachedEnd();
  if(this.worldView){this.renderWorld();if(focused)document.querySelector<HTMLElement>('[data-action="'+focused+'"]')?.focus({preventScroll:true});return;}
  const sim=document.querySelector('#v3-sim');if(sim)sim.innerHTML=simulationView(this.program,this.currentFrame(),this.variant);
  const report=document.querySelector('#v3-report');if(report)report.innerHTML=this.report();
  const controls=document.querySelector('.sim-controls');if(controls)controls.innerHTML=this.playbackControls();
  const complete=document.querySelector('#v3-completion');if(complete)complete.innerHTML=this.completeButton();
  if(focused)document.querySelector<HTMLElement>('[data-action="'+focused+'"]')?.focus({preventScroll:true});
 }
 private advance(){if(!this.run){this.execute();return;}this.index=Math.min(this.index+1,this.run.frames.length-1);this.paint();}
 private play(){
  if(this.timer){clearInterval(this.timer);this.timer=undefined;this.paint();return;}
  if(!this.run)this.execute();
  if(this.index===this.run!.frames.length-1){this.index=0;}
  if(this.p.settings.reducedMotion){this.index=this.run!.frames.length-1;this.paint();return;}
  this.timer=setInterval(()=>this.advance(),550);this.paint();
 }
 private renderWorld(){
  this.h.world('<aside class="world-playback"><div>'+tag('SIMULAÇÃO NO CENÁRIO')+'<strong>'+e(this.currentFrame().label)+'</strong><p>'+Object.entries(this.currentFrame().vars).map(([k,v])=>e(k)+': '+e(v)).join(' · ')+'</p></div><div class="actions">'+this.playbackControls()+b('Voltar à bancada','bench')+this.completeButton()+'</div></aside>');
 }
 private complete(){
  if(!this.run?.passed||this.index!==this.run.frames.length-1||this.demo!==null)return;
  const before=levelInfo(this.p).level,task=activities.find(a=>a.id===this.activity)!;
  const first=emit(this.p,{type:'activity',id:this.activity,instructions:this.run.instructions,runs:this.runs,optional:this.run.optional});
  if(this.activity==='investigation')emit(this.p,{type:'hypothesis',value:'cache'});
  this.sync();this.h.persist();this.h.refreshWorld();this.h.reward(first?task.xp:0,before);this.stop();
  this.shell('v3-success',tag('SOLUÇÃO APLICADA')+'<h1 id="dialog-title">'+task.title+'</h1><div class="xp-reward">'+(first?'+'+task.xp+' XP':'Conceito reforçado ✓')+'</div><p>'+e(this.run.feedback)+'</p>'+(this.run.optional.length?'<div class="reward">Objetivo opcional registrado: '+this.run.optional.map(id=>e(({ 'reusable-route':'função reutilizada nas entregas','reusable-data':'salvarInscrição reutilizada','negative-test':'caso negativo adicional'} as Record<string,string>)[id])).join(', ')+'</div>':'')+'<p class="mentor">'+e(activityGuest(this.activity)?'Volte e conte para '+guestName[activityGuest(this.activity)!]+': falta mostrar o resultado.':chapterObjective(this.p))+'</p><div class="actions">'+(activityGuest(this.activity)?b('Contar para '+guestName[activityGuest(this.activity)!],'talk-'+activityGuest(this.activity),'primary')+b('Voltar à feira','office'):b('Ver a consequência','office','primary')+b('Conversar com Talisson','dialogue'))+b('Outros desafios','hub')+'</div>');
 }
 dialogue(node='greeting'){
  this.stop();this.node=node;const guestTalk=isGuestNode(node);if(!guestTalk){if(node!=='reminder')this.p.v3.dialogueNode=node;this.p.v3.dialoguePaused=false;}const d=dialogueNode(node,this.p);if(d.fact)emit(this.p,{type:'fact',fact:d.fact});remember(this.p,d);this.h.persist();this.h.react('talk');this.h.audio('dialogue');
  const html='<div class="content"><div class="dialogue-layout">'+portrait(d)+'<div>'+tag(d.speaker.split(' ')[0].toUpperCase()+' / CONVERSA NO CENÁRIO')+'<h1 id="dialog-title">'+d.speaker+'</h1><p id="v3-dialogue-text" class="dialogue"></p><div class="dialogue-choices">'+d.choices.map((c,i)=>b(e(c.label),'choice-'+i,i===0?'primary':'')).join('')+'</div><div class="actions">'+b('Texto completo','reveal','quiet')+b('Histórico','history','quiet')+b('Continuar depois','office','quiet')+'</div><p class="micro">Você pode se afastar com as teclas de movimento. A conversa fica guardada.</p></div></div></div>';
  if(node.startsWith('intro'))this.h.modal('dialogue',html);else this.h.conversation(html,d.character==='talisson'?'left':'right');
  this.dialogueVisible=true;
  const el=document.querySelector('#v3-dialogue-text')!;
  if(this.p.settings.textSpeed==='instant'||this.p.settings.reducedMotion)el.textContent=d.text;
  else {let count=0;this.textTimer=setInterval(()=>{if(!el.isConnected){clearInterval(this.textTimer);return;}count+=3;el.textContent=d.text.slice(0,count);if(count>=d.text.length)clearInterval(this.textTimer);},this.p.settings.textSpeed==='slow'?60:25);}
 }
 private choose(action:DialogueAction){
  if(action.kind==='node'){if(action.node==='network'||action.node==='cache')emit(this.p,{type:'hypothesis',value:action.node});this.dialogue(action.node);}
  if(action.kind==='leave'){this.stop();this.h.office();}
  if(action.kind==='accept'){this.closeTalk();this.h.office();}
  if(action.kind==='go'){this.closeTalk();this.h.travel(action.room);}
  if(action.kind==='final')this.guestFinal(action.id);
  if(action.kind==='activity'){this.closeTalk();this.openActivity(action.id);}
  if(action.kind==='explain'){if(action.correct)emit(this.p,{type:'fact',fact:'explained'});this.h.persist();this.dialogue(action.correct?'explained':'wrong-explanation');}
  if(action.kind==='demo'){
   if(!this.p.v3.facts.includes('rule')){this.dialogue('rule');return;}
   this.closeTalk();this.activity='data';this.program={kind:'data',identity:'id',strategy:action.fixed?'upsert':'ignore',persistent:action.fixed};this.demo=action.fixed;this.run=null;this.index=0;this.execute();
  }
  if(action.kind==='finish'){
   const before=levelInfo(this.p).level,first=emit(this.p,{type:'fact',fact:'finished'});
   if(!this.p.v3.facts.includes('finished')){this.dialogue();return;}
   this.h.persist();this.h.refreshWorld();this.h.reward(first?220:0,before);this.stop();
   this.shell('chapter-end',tag('CAPÍTULO CONCLUÍDO')+'<h1 id="dialog-title">O bug ficou na história.</h1><p>Talisson · A demonstração preservou os IDs e o último envio. O cache é uma otimização; a identidade do registro é responsabilidade do banco.</p><div class="reward">Lembrança desbloqueada: placa da demonstração, disponível na personalização.</div>'+this.completionCommunity('chapter')+'<div class="actions">'+b('Continuar jogando','office','primary')+b('Escolher decoração','customize')+b('Rever a conversa','dialogue')+'</div>');
  }
 }
 private guestFinal(id:GuestId){
  this.closeTalk();setGuestFlag(this.p,id,'finished');this.h.persist();this.h.refreshWorld();this.h.react('success');this.h.audio('test');
  const orders=id==='luiz',run=runActivity(orders?{kind:'orders',script:ORDER_CHECK,conversion:'decimal',listeners:1,reset:true}:{kind:'budget',telas:6,horas:4,valor:50,vague:false,protoCount:1,desktopCond:'desktop'}),last=run.frames.at(-1)!;
  const panel=orders?(last.counter??[]).map(o=>'<div><span>Pedido '+o.id+' · '+e(o.itens)+'</span><b>'+e(o.total)+'</b></div>').join(''):(last.breakdown??[]).map(([k,v])=>'<div><span>'+e(k)+'</span><b>'+e(v)+'</b></div>').join('')+'<div><span><strong>App + desktop + protótipo</strong></span><b>'+e(last.vars.total)+'</b></div>';
  this.shell('guest-final',tag(orders?'ÚLTIMA RODADA / PRAÇA DE ALIMENTAÇÃO':'APRESENTAÇÃO / PAINEL DO PROJETO')+'<div class="guest-final">'+characterStanding(id,true)+'<div><h1 id="dialog-title">'+(orders?'O balcão recebeu tudo certo.':'A proposta ficou clara.')+'</h1><div class="counter-view"><strong>'+(orders?'BALCÃO':'PAINEL DO PROJETO')+'</strong>'+panel+'</div><p class="mentor">'+(orders?'Luiz · Agora eu sei por que funciona. Antes eu só sabia que o botão era verde.':'Indo · Agora, quando aparecer “mais uma coisinha”, eu mostro quanto ela custa.')+'</p></div></div><div class="actions">'+b('Voltar à feira','office','primary')+b('Conversar mais','talk-'+id)+'</div>');
 }
 notebook(){
  this.stop();const s=this.p.v3;
  this.shell('notebook',tag('CADERNO DO BYTE')+'<h1 id="dialog-title">Você estava investigando…</h1><div class="note"><strong>O bug que só aparece na apresentação</strong><p>'+e(chapterObjective(this.p))+'</p></div><div class="notebook-grid"><section><h2>Pistas encontradas</h2>'+(['rule','observed','log','note','hypothesis','corrected','presented'] as const).map(f=>'<p>'+ (s.facts.includes(f)?'✓ ':'◇ ')+e(({rule:'Cada ID identifica uma inscrição.',observed:'A demonstração simples difere da reconexão.',log:'Registros mostram o mesmo ID antes e depois.',note:'O buffer preserva dados; o cache é descartável.',hypothesis:'O teste expôs proteção apenas em cache.',corrected:'salvarInscrição protege por ID no banco.',presented:'A apresentação corrigida passou pelos reenvios.'})[f])+'</p>').join('')+'<h2>Hipóteses investigadas</h2><p>'+e(s.hypotheses.join(', ')||'Ainda nenhuma.')+'</p></section><section><h2>Conceitos apresentados</h2><p>'+e(s.concepts.join(', ')||'Consulte as lições antes de avançar.')+'</p><h2>Resultados importantes</h2>'+Object.entries(s.results).map(([id,result])=>'<p><b>'+e(activities.find(a=>a.id===id)?.title)+'</b><br>'+e(result)+'</p>').join('')+'<h2>Lembranças</h2><p>'+(s.facts.includes('finished')?'Placa da demonstração de Talisson.':'A primeira lembrança virá com a apresentação.')+'</p></section></div><div class="actions">'+b('Ir à demonstração','visit-demo','primary')+b('Perguntar a Talisson','dialogue')+b('Histórico de diálogos','history')+b('Voltar','office','quiet')+'</div>',true);
 }
 inspect(kind:'log'|'note'){
  this.stop();if(!this.p.v3.facts.includes('observed')){this.shell('inspection',tag('OBSERVAÇÃO')+'<h1 id="dialog-title">Primeiro, veja o problema acontecer.</h1><p>Os registros e o bilhete serão mais úteis depois de observar a demonstração com Talisson.</p>'+b('Conversar com Talisson','dialogue','primary'));return;}
  emit(this.p,{type:'fact',fact:kind});this.sync();this.h.persist();this.h.react('examine');
  this.shell('inspection',tag('PISTA ENCONTRADA')+'<h1 id="dialog-title">'+(kind==='log'?'O banco não esqueceu.':'Bilhete do buffer')+'</h1>'+(kind==='log'?'<pre class="logs">'+e(demoFrames(DEMO_EVENTS,{kind:'data',identity:'id',strategy:'ignore',persistent:false}).map((f,i)=>i+' · '+f.label+' / banco ['+(f.records??[]).map(r=>r.id).join(', ')+'] / cache '+f.vars.cache).join('\n'))+'</pre>':'<p>“Após reconectar: reenviar o buffer pendente. O cache em memória é recriado. Os dados do banco local permanecem.”</p><p class="mentor">Byte · Então cache vazio não significa banco vazio…</p>')+'<div class="actions">'+b('Investigar o rastro','activity-investigation','primary')+b('Construir um teste','activity-tests')+b('Caderno','notebook')+b('Voltar','office','quiet')+'</div>');
 }
 concept(id:string,fromActivity=true){
  this.stop();if(!fromActivity)this.conceptReturn=null;this.conceptId=id;this.conceptAnswer=null;this.renderConcept();
 }
 private renderConcept(){
  const l=conceptLessons.find(l=>l.id===this.conceptId)!;
  this.shell('concept',tag('LIA EXPLICA / CONCEITO DA V3')+'<h1 id="dialog-title">'+l.title+'</h1><p class="lesson-text">'+l.text+'</p><pre class="code-preview">'+e(l.example)+'</pre><h2>'+l.question+'</h2><div class="quiz-answers">'+l.answers.map((text,i)=>b(e(text),'concept-answer-'+i,this.conceptAnswer===i?'selected':'')).join('')+'</div>'+(this.conceptAnswer!==null?'<div class="feedback '+(this.conceptAnswer===l.correct?'pass':'fail')+'">'+(this.conceptAnswer===l.correct?'✓ Conceito demonstrado. Agora aplique na simulação.':'↻ Leia o estado antes de decidir. Pode tentar outra resposta sem perder progresso.')+'</div>':'')+'<div class="actions">'+(this.conceptReturn&&!activityRequirement(this.p,this.conceptReturn)?b('Continuar a atividade →','activity-'+this.conceptReturn,'primary'):'')+b('Voltar aos desafios','hub',this.conceptReturn&&!activityRequirement(this.p,this.conceptReturn)?'':'primary')+b('Voltar ao mundo','office','quiet')+'</div>');
 }
 opening(){
  this.stop();this.shell('opening',tag('PRIMEIROS PASSOS / PAINEL DO ESCRITÓRIO')+'<h1 id="dialog-title">Uma luz para começar.</h1><p>O painel está apagado. Energia precisa vir antes do carregamento; ligar vem por último. Use os botões para organizar.</p><div class="opening-panel '+(this.p.v3.opening==='done'?'is-on':'')+'">'+(this.p.v3.opening==='done'?'PAINEL PRONTO ✓':'SEM SINAL ···')+'</div><ol class="v3-command-list">'+this.openingOrder.map((id,i)=>'<li><b>'+({energia:'Preparar energia',carregar:'Carregar painel',ligar:'Ligar painel'} as Record<string,string>)[id]+'</b>'+b('↑','opening-up-'+i,'move',i===0)+'</li>').join('')+'</ol><p id="opening-feedback" role="status"></p><div class="actions">'+b('Executar no painel','opening-run','primary')+b('Voltar ao escritório','office')+b('Ouvir Talisson de novo','intro','quiet')+'</div>');
 }
 completionCommunity(kind:'chapter'|'campaign'){
  if(this.p.v3.invites.includes(kind))return b('Comunidade e feedback','community','quiet');
  this.p.v3.invites.push(kind);this.h.persist();
  return '<section class="completion-community"><h2>O próximo desafio pode começar com uma ideia sua.</h2><p>Compartilhe sua experiência no nosso Discord.</p>'+b('Compartilhar no Discord','community-open')+'<small>Abre o Discord no navegador. Participar é opcional.</small></section>';
 }
 community(){
  this.stop();this.shell('community',tag('COMUNIDADE E FEEDBACK')+'<h1 id="dialog-title">Ajude a construir o próximo deploy</h1><p>Curtiu o jogo? Tem uma ideia, encontrou um bug ou quer contar como foi sua experiência? Entre no Discord do Talisson e participe da comunidade de Só Mais Um Deploy.</p><p class="micro">Um espaço para ideias, problemas, opiniões, conversas sobre desafios e novidades compartilhadas pelo autor. A participação é opcional.</p><div class="actions">'+b('Entrar na comunidade','community-open','primary')+b('Enviar uma ideia ou relatar um problema','feedback')+'</div><p class="micro">Abre o Discord no navegador.</p><label>Endereço da comunidade<input readonly id="community-address" value="'+COMMUNITY_URL+'"></label>'+b('Copiar endereço','community-copy','quiet')+'<p id="clipboard-status" role="status">'+e(this.clipboardMessage)+'</p><div class="actions">'+b('Voltar ao jogo','office')+'</div>');
 }
 async openCommunity(){
  try{
   if(window.deployCommunity){const ok=await window.deployCommunity.open();this.clipboardMessage=ok?'Solicitação de abertura enviada ao navegador.':'Não foi possível abrir. Copie o endereço e abra no seu navegador.';}
   else {window.open(COMMUNITY_URL,'_blank','noopener,noreferrer');this.clipboardMessage='Solicitação de abertura enviada. Se a nova aba não abriu, copie o endereço abaixo.';}
  }catch{this.clipboardMessage='Não foi possível abrir. Copie o endereço e abra no seu navegador.';}
  const status=document.querySelector('#clipboard-status');if(status)status.textContent=this.clipboardMessage;else this.community();
 }
 private async copy(text:string){
  try{if(!navigator.clipboard)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(text);this.clipboardMessage='Copiado. Você decide onde compartilhar.';}
  catch{this.clipboardMessage='Não foi possível copiar automaticamente. Selecione o texto abaixo e copie manualmente.';const textarea=document.querySelector<HTMLTextAreaElement>('#feedback-preview');textarea?.focus();textarea?.select();const input=document.querySelector<HTMLInputElement>('#community-address');input?.focus();input?.select();}
  const el=document.querySelector('#clipboard-status');if(el)el.textContent=this.clipboardMessage;
 }
 feedback(){
  this.stop();this.shell('feedback',tag('RELATO LOCAL / NADA É ENVIADO')+'<h1 id="dialog-title">Enviar uma ideia ou relatar um problema</h1><p>O relato será copiado para você compartilhar no Discord. Nada é enviado automaticamente.</p><form id="feedback-form"><label>Categoria<select name="category"><option>Ideia</option><option>Bug</option><option>Dificuldade para entender</option><option>Opinião geral</option></select></label><div class="field-grid">'+[['what','O que aconteceu?'],['expected','O que você esperava?'],['where','Em qual missão ou cena?'],['steps','Como reproduzir?']].map(([id,label])=>'<label>'+label+' (opcional)<textarea name="'+id+'" maxlength="600" rows="2"></textarea></label>').join('')+'</div></form><label>Prévia do relato<textarea id="feedback-preview" readonly rows="8"></textarea></label><p class="micro">Somente versão, modo e identificador local da cena são preenchidos automaticamente. Não anexamos logs, saves ou dados pessoais.</p><div class="actions">'+b('Copiar relato','feedback-copy','primary')+b('Abrir Discord','community-open')+b('Voltar','community','quiet')+'</div><p id="clipboard-status" role="status"></p>',true);this.previewFeedback();
 }
 previewFeedback(){
  const form=document.querySelector<HTMLFormElement>('#feedback-form');if(!form)return;
  const data=new FormData(form),text=['Só Mais Um Deploy '+__APP_VERSION__,'Categoria: '+data.get('category'),'Modo: '+this.p.v3.mode,'Cena: room-'+this.p.room,...[['what','O que aconteceu'],['expected','O que esperava'],['where','Missão/cena informada'],['steps','Como reproduzir']].filter(([key])=>data.get(key)).map(([key,label])=>label+': '+String(data.get(key)).slice(0,600))].join('\n');
  const preview=document.querySelector<HTMLTextAreaElement>('#feedback-preview');if(preview)preview.value=text;
 }
 saves(){
  this.stop();this.shell('save-tools',tag('SEU PROGRESSO / NESTE DISPOSITIVO')+'<h1 id="dialog-title">Levar o Byte com você.</h1><p>Exporte um arquivo JSON local. Para importar, escolha um save de até 128 KiB, confira a prévia e confirme a substituição. Saves V1 e V2 são migrados.</p><div class="actions">'+b('Exportar save','export','primary')+'</div><label class="import-label">Importar arquivo de progresso<input type="file" accept=".json,application/json" id="v3-import" data-v3import></label><p id="import-status" role="status"></p><div class="actions">'+b('Voltar ao jogo','office')+'</div>');
 }
 async importFile(file:File){
  const invalid=(text:string)=>{const el=document.querySelector('#import-status');if(el)el.textContent=text;};
  if(file.size>MAX_SAVE_BYTES){invalid('Arquivo grande demais. O limite é 128 KiB.');return;}
  try{const parsed=parseSave(await file.text());if(!parsed){invalid('Save inválido, corrompido ou de versão incompatível. Seu progresso atual foi preservado.');return;}this.importCandidate=parsed;this.shell('import-confirm',tag('CONFIRA ANTES DE SUBSTITUIR')+'<h1 id="dialog-title">Importar este progresso?</h1><p>'+parsed.current+'/5 missões, '+parsed.lessonCompleted.length+' lições antigas, '+parsed.v3.activityCompleted.length+' atividades novas. Nível '+levelInfo(parsed).level+'. O progresso deste dispositivo será substituído.</p><div class="actions">'+b('Cancelar, manter meu progresso','saves','primary')+b('Confirmar substituição','import-confirm','danger')+'</div>');}catch{invalid('Não foi possível ler o arquivo. Seu progresso foi preservado.');}
 }
 controls(){
  this.stop();this.shell('controls',tag('CONTROLES / REMAPEAMENTO')+'<h1 id="dialog-title">Suas teclas, sem conflitos.</h1><p>Selecione uma ação e pressione uma letra ou número. Esc cancela a captura. As setas continuam disponíveis para mover e Esc sempre fecha janelas.</p><div class="bindings-grid">'+Object.entries(controlNames).map(([id,name])=>'<div><span>'+name+'</span>'+b(this.capture===id?'Pressione uma tecla…':e(this.p.settings.bindings[id as Control]),'remap-'+id,this.capture===id?'selected':'')+'</div>').join('')+'</div><p role="status">'+e(this.remapMessage)+'</p><div class="actions">'+b('Restaurar padrões','restore-controls')+b('Voltar','office','primary')+b('Rever a abertura','intro','quiet')+'</div>',true);
 }
 captureKey(event:KeyboardEvent){
  if(this.capture&&!document.querySelector('.bindings-grid'))this.capture=null;
  if(!this.capture)return false;
  event.preventDefault();event.stopPropagation();
  const key=event.key.toLowerCase()===' '?'space':event.key.toLowerCase();
  if(key==='escape'){this.capture=null;this.remapMessage='Alteração cancelada.';this.controls();return true;}
  if(!/^(?:[a-z0-9]|space)$/.test(key)){this.remapMessage='Use uma letra, número ou Espaço.';this.controls();return true;}
  const conflict=Object.entries(this.p.settings.bindings).find(([id,value])=>value===key&&id!==this.capture);
  if(conflict){this.remapMessage='Essa tecla já controla '+controlNames[conflict[0] as Control]+'. Escolha outra ou cancele com Esc.';this.controls();return true;}
  this.p.settings.bindings[this.capture]=key;this.capture=null;this.remapMessage='Controle atualizado e salvo.';this.h.persist();this.controls();return true;
 }
 customize(){
  this.stop();const d=this.p.v3.decor;
  this.shell('customize',tag('ESCRITÓRIO / PONTOS SEGUROS')+'<h1 id="dialog-title">Um canto com a sua história.</h1><p>As posições são predefinidas e preservam a circulação. Nenhum item é comprado.</p>'+pick('Planta desbloqueada na missão 1','decor-plant',d.plant,[['left','Perto da estante'],['right','Perto da janela lateral'],['hidden','Guardar planta']])+'<div class="v3-checkboxes">'+(['lamp','certificate','souvenir','gift'] as const).map(key=>'<label><input type="checkbox" data-v3field="decor-'+key+'" '+(d[key]?'checked':'')+' '+((key==='lamp'&&this.p.current<3)||(key==='certificate'&&this.p.current<4)||(key==='souvenir'&&this.p.current<5)||(key==='gift'&&!this.p.v3.facts.includes('finished'))?'disabled':'')+'>'+({lamp:'Luminária · missão 3',certificate:'Certificado · missão 4',souvenir:'Lembrança da Feira Conecta · final',gift:'Placa de Talisson · capítulo novo'})[key]+'</label>').join('')+'</div><p class="micro">As escolhas acompanham o save e o cenário do menu.</p><div class="actions">'+b('Ver no escritório','customize-visit','primary')+b('Voltar','office')+'</div>');
 }
 handleField(input:HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement){
  const field=input.dataset.v3field;if(!field)return false;
  if(field.startsWith('decor-')){const key=field.slice(6) as keyof typeof this.p.v3.decor;const d=this.p.v3.decor as unknown as Record<string,unknown>;d[key]=key==='plant'?input.value:(input as HTMLInputElement).checked;this.h.persist();this.h.refreshWorld();return true;}
  if(field==='routeTarget'){this.routeTarget=input.value as 'commands'|'routine';this.workbench();return true;}
  if(field==='origin'||field==='destination'){this[field]=input.value as NodeId;return true;}
  const p=this.program;
  if(field==='routineName'&&p.kind==='route')p.name=input.value;
  if(p.kind==='debug'){if(field==='capacity'||field==='change'||field==='line')p[field]=Number(input.value);if(field==='comparison')p.comparison=input.value as '>'|'>=';}
  if(p.kind==='data'){if(field==='identity')p.identity=input.value as typeof p.identity;if(field==='strategy')p.strategy=input.value as typeof p.strategy;if(field==='persistent')p.persistent=(input as HTMLInputElement).checked;}
  if(p.kind==='tests'&&field.startsWith('negative-'))p.negative[field.slice(9) as keyof typeof p.negative]=(input as HTMLInputElement).checked;
  if(p.kind==='orders'){if(field==='conversion')p.conversion=input.value as typeof p.conversion;if(field==='listeners')p.listeners=Number(input.value) as 1|2;if(field==='reset')p.reset=(input as HTMLInputElement).checked;}
  if(p.kind==='budget'){if(field==='telas'||field==='horas'||field==='valor')p[field]=Number(input.value);if(field==='protoCount')p.protoCount=Number(input.value) as 1|2;if(field==='desktopCond')p.desktopCond=input.value as typeof p.desktopCond;if(field==='vague')p.vague=(input as HTMLInputElement).checked;}
  if(p.kind==='investigation'){if(field==='hypothesis')p.hypothesis=input.value as typeof p.hypothesis;if(field.startsWith('evidence-')){const index=Number(field.slice(9));p.evidence=(input as HTMLInputElement).checked?[...new Set([...p.evidence,index])]:p.evidence.filter(i=>i!==index);}}
  clearInterval(this.timer);this.timer=undefined;this.run=null;this.index=0;this.h.frame(null,null);
  const report=document.querySelector('#v3-report');if(report)report.innerHTML='Entrada alterada. Execute novamente para avaliar.';
  const complete=document.querySelector('#v3-completion');if(complete)complete.innerHTML='';
  return true;
 }
 handle(action:string):boolean{
  if(!action.startsWith('v3-'))return false;
  const a=action.slice(3);
  if(a==='office'){this.stop();this.h.office();return true;}
  if(a==='modes')this.modes();
  else if(a.startsWith('mode-')){this.p.v3.mode=a.slice(5) as GameMode;this.h.persist();if(this.p.v3.mode==='story')this.h.office();else this.hub();}
  else if(a==='hub')this.hub();
  else if(a==='old-lessons')this.h.oldLessons();
  else if(a.startsWith('review-')){const id=a.slice(7) as ActivityId;this.conceptReturn=id;const task=activities.find(t=>t.id===id)!;const missing=task.concepts.find(c=>!this.p.v3.concepts.includes(c));if(missing)this.concept(missing);else this.h.oldLessons();}
  else if(a.startsWith('activity-'))this.openActivity(a.slice(9) as ActivityId);
  else if(a==='intro')this.intro();
  else if(a==='dialogue')this.dialogue();
  else if(a==='resume-talk')this.dialogue(this.node==='reminder'?'greeting':this.node);
  else if(a.startsWith('talk-'))this.guest(a.slice(5) as GuestId);
  else if(a.startsWith('choice-')){const d=dialogueNode(this.node,this.p),choice=d.choices[Number(a.slice(7))];if(choice){this.p.v3.history.push({speaker:'Byte',text:choice.label,node:'choice'});if(this.p.v3.history.length>80)this.p.v3.history.shift();this.choose(choice.action);}}
  else if(a==='reveal'){clearInterval(this.textTimer);const el=document.querySelector('#v3-dialogue-text');if(el)el.textContent=dialogueNode(this.node,this.p).text;}
  else if(a==='history'){this.stop();this.shell('history',tag('CONVERSAS LOCAIS')+'<h1 id="dialog-title">Histórico de diálogos</h1><div class="conversation-history">'+this.p.v3.history.map(l=>'<p><b>'+e(l.speaker)+'</b><br>'+e(l.text)+'</p>').join('')+'</div>'+b('Voltar à conversa','resume-talk','primary'));}
  else if(a==='notebook')this.notebook();
  else if(a==='visit-demo'){this.h.travel(5);}
  else if(a==='community')this.community();
  else if(a==='community-open')void this.openCommunity();
  else if(a==='community-copy')void this.copy(COMMUNITY_URL);
  else if(a==='feedback')this.feedback();
  else if(a==='feedback-copy'){this.previewFeedback();void this.copy(document.querySelector<HTMLTextAreaElement>('#feedback-preview')?.value??'');}
  else if(a==='saves')this.saves();
  else if(a==='export'){const blob=new Blob([JSON.stringify(this.p,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='byte-save-v3.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  else if(a==='import-confirm'&&this.importCandidate){this.stop();this.h.replaceSave(this.importCandidate);this.importCandidate=null;}
  else if(a==='controls')this.controls();
  else if(a.startsWith('remap-')){this.capture=a.slice(6) as Control;this.remapMessage='Aguardando sua tecla.';this.controls();}
  else if(a==='restore-controls'){this.p.settings.bindings=defaultBindings();this.capture=null;this.remapMessage='Padrões restaurados.';this.h.persist();this.controls();}
  else if(a==='customize')this.customize();
  else if(a==='customize-visit'){this.h.travel(0);}
  else if(a.startsWith('concept-answer-')){this.conceptAnswer=Number(a.slice(15));const l=conceptLessons.find(c=>c.id===this.conceptId)!;if(this.conceptAnswer===l.correct){const before=levelInfo(this.p).level,first=emit(this.p,{type:'concept',concept:l.id});this.h.persist();this.h.reward(first?35:0,before);}this.renderConcept();}
  else if(a.startsWith('concept-'))this.concept(a.slice(8),false);
  else if(a==='opening')this.opening();
  else if(a.startsWith('opening-up-')){const i=Number(a.slice(11));if(i>0)[this.openingOrder[i],this.openingOrder[i-1]]=[this.openingOrder[i-1],this.openingOrder[i]];this.opening();}
  else if(a==='opening-run'){
   const ok=this.openingOrder.join(',')==='energia,carregar,ligar',el=document.querySelector('#opening-feedback');
   if(!ok){if(el)el.textContent='Ainda falta uma dependência: energia → carregar → ligar.';this.h.react('think');}
   else{const before=levelInfo(this.p).level,first=emit(this.p,{type:'opening'});this.h.persist();this.h.refreshWorld();this.h.reward(first?40:0,before);this.shell('opening-done',tag('PAINEL ATIVADO')+'<h1 id="dialog-title">Agora tem sinal.</h1><p>Byte · Energia, dados e saída. O painel acendeu. Chegou a primeira mensagem de Rafa.</p><div class="actions">'+b('Ver o painel no escritório','office','primary')+b('Ler a mensagem de Rafa','first-message')+'</div>');}
  }
  else if(a==='first-message')this.h.firstMessage();
  else if(a==='play')this.play();
  else if(a==='step'){clearInterval(this.timer);this.timer=undefined;this.advance();}
  else if(a==='skip'){if(!this.run)this.execute();this.index=this.run!.frames.length-1;this.paint();}
  else if(a==='reset'){this.stop();this.program=initialActivity(this.activity);this.run=null;this.index=0;this.demo=null;this.workbench();}
  else if(a==='world'){if(!this.run)this.execute();this.worldView=true;this.h.frame(this.activity,this.currentFrame());this.renderWorld();}
  else if(a==='bench'){this.worldView=false;this.workbench();}
  else if(a==='complete')this.complete();
  else if(a==='hint'){this.hint=Math.min(3,this.hint+1);this.workbench();}
  else if(a==='variant'){this.stop();this.variant=1-this.variant;this.run=null;this.index=0;this.workbench();}
  else if(a.startsWith('add-')&&this.program.kind==='route'){if(this.program[this.routeTarget].length<(this.routeTarget==='routine'?16:40))this.program[this.routeTarget].push(a.slice(4) as ServiceCommand);this.run=null;this.workbench();}
  else if(a.startsWith('cmd-')&&this.program.kind==='route'){const [,op,target,raw]=a.split('-'),list=this.program[target as 'commands'|'routine'],i=Number(raw);if(op==='remove')list.splice(i,1);else{const j=i+(op==='up'?-1:1);if(j>=0&&j<list.length)[list[i],list[j]]=[list[j],list[i]];}this.run=null;this.workbench();}
  else if(a==='connect'&&this.program.kind==='circuit'){if(this.program.edges.length<12&&!this.program.edges.some(([x,y])=>x===this.origin&&y===this.destination))this.program.edges.push([this.origin,this.destination]);this.run=null;this.workbench();}
  else if(a.startsWith('node-')){const node=a.slice(5) as NodeId;if(['ticket','paid','team'].includes(node))this.origin=node;else{this.destination=node;this.handle('v3-connect');}this.workbench();}
  else if(a.startsWith('edge-')&&this.program.kind==='circuit'){this.program.edges.splice(Number(a.slice(5)),1);this.run=null;this.workbench();}
  else if(a.startsWith('order-add-')&&this.program.kind==='orders'){if(this.program.script.length<16)this.program.script.push(a.slice(10) as OrderEvent);this.run=null;this.index=0;this.workbench();}
  else if(a.startsWith('order-remove-')&&this.program.kind==='orders'){this.program.script.splice(Number(a.slice(13)),1);this.run=null;this.index=0;this.workbench();}
  else if(a.startsWith('order-up-')&&this.program.kind==='orders'){const i=Number(a.slice(9)),s=this.program.script;if(i>0)[s[i],s[i-1]]=[s[i-1],s[i]];this.run=null;this.index=0;this.workbench();}
  else if(a.startsWith('event-remove-')&&this.program.kind==='tests'){this.program.events.splice(Number(a.slice(13)),1);this.run=null;this.workbench();}
  else if(a.startsWith('event-up-')&&this.program.kind==='tests'){const i=Number(a.slice(9));if(i>0)[this.program.events[i],this.program.events[i-1]]=[this.program.events[i-1],this.program.events[i]];this.run=null;this.workbench();}
  else if(a.startsWith('event-')&&this.program.kind==='tests'){if(this.program.events.length<16)this.program.events.push(a.slice(6) as typeof DEMO_EVENTS[number]);this.run=null;this.workbench();}
  return true;
 }
}
