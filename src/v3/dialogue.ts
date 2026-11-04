import type { Progress } from '../core/types';
import { characterPortrait, type CharacterId } from '../game/CharacterPixels';
import { guestStage, talissonStage, type GuestId } from './events';
import type { ActivityId, Fact } from './types';
export type Expression='curious'|'thinking'|'happy'|'focused';
export type DialogueAction={kind:'node';node:string}|{kind:'demo';fixed:boolean}|{kind:'activity';id:ActivityId}|{kind:'leave'}|{kind:'accept'}|{kind:'go';room:number}|{kind:'finish'}|{kind:'explain';correct:boolean}|{kind:'final';id:GuestId};
export interface DialogueChoice {label:string;action:DialogueAction}
export interface DialogueNode {id:string;speaker:string;character:CharacterId;expression:Expression;text:string;choices:DialogueChoice[];fact?:Fact}
const next=(label:string,node:string):DialogueChoice=>({label,action:{kind:'node',node}});
// "leave" pauses the conversation, so Talisson calls Byte back. "accept" means Byte went to do what was asked.
const leave:DialogueChoice={label:'Agora não, volto depois',action:{kind:'leave'}};
const accept=(label:string):DialogueChoice=>({label,action:{kind:'accept'}});
const activity=(label:string,id:ActivityId):DialogueChoice=>({label,action:{kind:'activity',id}});
const DEMO_ROOM=5;

// The one thing that moves the task forward right now. Greeting and reminder both offer it first.
function stepChoice(p:Progress):DialogueChoice{
 switch(talissonStage(p)){
  case 'rule':return next('Qual é o comportamento esperado?','rule');
  case 'observe':return {label:'Observar a demonstração com falha',action:{kind:'demo',fixed:false}};
  case 'clues':return next('Onde encontro as pistas?','lead-log');
  case 'trace':return next('Tenho as duas pistas. E agora?','lead-trace');
  case 'fix':return next('Como a gente corrige isso?','lead-fix');
  case 'present':return {label:'Apresentar a demonstração corrigida',action:{kind:'demo',fixed:true}};
  case 'explain':return next('Explicar o que descobri','greeting');
  case 'finish':return {label:'Encerrar a apresentação',action:{kind:'finish'}};
  default:return next('Como ficou nossa apresentação?','completed');
 }
}
function reminderText(p:Progress){
 const call='Ei, Byte! Aqui! ';
 if(p.v3.opening==='new')return call+'Antes da demonstração, o painel do escritório ainda precisa ligar. Depois a gente continua de onde parou.';
 switch(talissonStage(p)){
  case 'rule':return call+'Você saiu antes de eu explicar a regra. Sem ela a gente não sabe o que é certo ou errado na demonstração. Vem cá.';
  case 'observe':return call+'A regra você já sabe. Falta só ver a falha acontecer. Eu executo e você observa. Bora?';
  case 'clues':return call+'Não esquece da nossa tarefa! '+(p.v3.facts.includes('log')?'Você já viu o terminal; falta o bilhete do buffer.':p.v3.facts.includes('note')?'Você já leu o bilhete; falta o terminal de registros.':'Falta examinar o terminal de registros e o bilhete do buffer.');
  case 'trace':return call+'As pistas estão com você! Agora falta provar: seguir o rastro e montar o teste que revela a cópia.';
  case 'fix':return call+'Você já achou a causa. Falta aplicar a proteção por ID no banco, na bancada de dados.';
  case 'present':return call+'A correção está pronta e a demonstração também. Só falta apresentar. Vamos?';
  case 'explain':return call+'A demonstração passou, mas ainda quero ouvir de você: por que a correção funciona?';
  case 'finish':return call+'Está tudo pronto. Só falta encerrar a apresentação com você do meu lado.';
  default:return 'Byte, nossa apresentação ficou pronta. Podemos rever a explicação, se quiser.';
 }
}
function talissonNode(id:string,p:Progress):DialogueNode{
 const f=p.v3.facts,done=f.includes('finished'),stage=talissonStage(p),inDemo=p.room===DEMO_ROOM;
 const base={id,speaker:'Talisson Souza',character:'talisson' as CharacterId,expression:'curious' as Expression,text:'',choices:[] as DialogueChoice[]};
 const goToDemo:DialogueChoice=inDemo?accept('Certo, vou examinar.'):{label:'Ir para a área de demonstração',action:{kind:'go',room:DEMO_ROOM}};
 switch(id){
  case 'reminder':{
   const step=p.v3.opening==='new'?accept('Vou ligar o painel agora'):stepChoice(p),resume=p.v3.dialogueNode;
   return {...base,expression:'focused',text:reminderText(p),choices:[step,...(resume!=='greeting'&&!done?[next('Retomar de onde parei',resume)]:[]),...(f.includes('rule')?[next('Relembrar a regra da tarefa','rule')]:[]),done?accept('Até mais, Talisson'):leave]};
  }
  case 'lead-log':return {...base,expression:'focused',text:(inDemo?'Está tudo aqui nesta sala. ':'Está tudo na área de demonstração, é só ir pelo mapa. ')+'O terminal de registros fica na bancada à esquerda e o bilhete do buffer na mesa mais abaixo. Compare os IDs antes e depois de reconectar. Quando terminar, volta aqui.',choices:[goToDemo,next('Antes, quero rever a regra.','rule'),leave]};
  case 'lead-trace':return {...base,expression:'thinking',text:'Agora a gente precisa de prova, não de palpite. Siga o rastro da execução até o momento em que a cópia aparece e monte um teste que faça a falha acontecer de propósito. Pode ser na ordem que preferir.',choices:[...(p.v3.activityCompleted.includes('investigation')?[]:[activity('Investigar o rastro','investigation')]),...(p.v3.activityCompleted.includes('tests')?[]:[activity('Construir o teste de reenvio','tests')]),next('Será que é só a rede?','network'),next('E se o cache for a única proteção?','cache'),leave]};
  case 'lead-fix':return {...base,expression:'focused',text:'Seu teste mostrou o ponto: a reconexão esvazia o cache, mas A17 continua no banco. A proteção só existia no cache. Ajusta o salvarInscrição para procurar o ID no banco: atualiza quem existe, insere quem é novo.',choices:[activity('Corrigir salvarInscrição','data'),leave]};
  case 'intro':return {...base,fact:'met',text:'Oi, Byte. Eu sou Talisson. A Feira Conecta vai reunir projetos e gente curiosa da cidade. Rafa precisa de um sistema para receber todo mundo; eu estou preparando uma demonstração. Vamos fazer essas ideias funcionarem?',choices:[next('Como eu começo?','intro-panel'),next('Que demonstração é essa?','intro-demo')]};
  case 'intro-demo':return {...base,expression:'thinking',text:'Uma lista de inscrições que recebe dados de dois aparelhos. O exemplo pequeno funciona, mas quero testar reenvios antes da apresentação. Quando estiver pronto, é só vir falar comigo.',choices:[next('Primeiro, vou conhecer o escritório.','intro-panel')]};
  case 'intro-panel':return {...base,text:'Comece pelo painel da mesa. Ele está desligado: prepare a energia, carregue o painel e então ligue. Mova-se com suas teclas de direção e interaja perto dele. Depois, a primeira mensagem de Rafa chega ao computador.',choices:[accept('Vou ligar o painel'),next('Guardar o convite para investigar depois.','intro-invite')]};
  case 'intro-invite':return {...base,text:'Combinado. Não há relógio correndo. O mapa mostra o caminho até a feira e o seu caderno guarda o próximo passo.',choices:[accept('Combinado')]};
  case 'rule':return {...base,fact:'rule',expression:'focused',text:'Cada ID representa uma inscrição. Duas pessoas podem ter o mesmo nome. Um reenvio do mesmo ID deve atualizar os dados, sem criar outra pessoa. A17 também pode chegar com e-mail corrigido.',choices:[next('Entendi. O que fazemos agora?','greeting'),leave]};
  case 'network':return {...base,expression:'thinking',text:'A reconexão dispara o reenvio, mas não explica sozinha a cópia. O banco mantém dados. Compare o que acontece com o cache temporário nesse mesmo momento.',choices:[next('Faz sentido. O que falta?','greeting'),leave]};
  case 'cache':return {...base,expression:'focused',text:f.includes('hypothesis')?'É isso. A reconexão esvazia o cache, mas A17 continua no banco. A proteção só existia no cache. Precisamos usar o ID onde os registros são guardados.':'Essa hipótese é plausível. Para sustentá-la, precisamos das duas pistas e de um roteiro que realmente produza a cópia. Use o caderno para conferir o que já encontrou.',choices:[f.includes('hypothesis')?activity('Corrigir salvarInscrição','data'):activity('Construir um teste de reenvio','tests'),next('O que falta para a demonstração?','greeting'),leave]};
  case 'wrong-explanation':return {...base,expression:'thinking',text:'Ocultar uma linha muda a aparência, mas o banco ainda guarda cópias. Nossa solução precisa continuar correta depois da reconexão. Quer tentar explicar por outro caminho?',choices:[next('Vou pensar no ID e na persistência.','greeting'),leave]};
  case 'explained':return {...base,expression:'happy',text:'Isso. A função procura o ID no banco: atualiza quem existe e insere quem é novo. O cache pode desaparecer; a identidade continua protegida. O teste de reenvio agora faz parte da demonstração.',choices:[{label:done?'Rever o encerramento':'Encerrar a apresentação',action:{kind:'finish'}},leave]};
  case 'completed':return {...base,expression:'happy',text:'A apresentação ficou pronta, Byte. Você não só corrigiu uma lista: descobriu uma sequência que faltava nos testes e explicou por que a correção funciona. Guarde esta pequena placa da demonstração no escritório.',choices:[accept('Valeu, Talisson'),next('Relembrar a causa do bug','explained')]};
 }
 const texts:Record<string,string>={
  rule:'Byte, que bom que veio. A demonstração pequena funciona. Quero conferir uma sequência com inscrições e reenvios antes de apresentar. Pode investigar comigo?',
  observe:'Regra combinada. Agora vamos ver o problema acontecer de verdade: eu executo cinco eventos em sequência e você observa a lista de inscrições.',
  clues:'Você viu a diferença entre o exemplo simples e o reenvio após reconectar. Agora a gente segue as pistas: o terminal de registros e o bilhete do buffer.',
  trace:'Boa, você examinou as duas pistas. O mesmo ID aparece antes e depois de reconectar. Falta transformar isso em prova.',
  fix:'Você provou a causa: a proteção só existia no cache. Agora é corrigir onde importa, no banco.',
  present:'A função está corrigida. Hora da verdade: a mesma sequência, com reenvios, na frente de todo mundo.',
  explain:'A demonstração terminou sem cópias e preservou o e-mail recente. Como você explicaria a causa e a correção?',
  finish:'Explicação perfeita. Podemos encerrar a apresentação?',
  done:'A17 voltou a ser só uma inscrição. Quer rever a explicação ou experimentar outro roteiro?',
 };
 const choices:DialogueChoice[]=stage==='explain'
  ?[{label:'A correção usa ID no banco e atualiza o reenvio.',action:{kind:'explain',correct:true}},{label:'Basta ocultar nomes repetidos na tela.',action:{kind:'explain',correct:false}}]
  :[stepChoice(p)];
 if(stage==='clues'||stage==='trace')choices.push(next('Será que é só a rede?','network'),next('E se o cache for a única proteção?','cache'));
 if(stage!=='rule')choices.push(next('Relembrar a regra das inscrições','rule'));
 choices.push(done?accept('Até mais, Talisson'):leave);
 return {...base,id:'greeting',fact:'met',expression:done?'happy':stage==='present'||stage==='finish'?'happy':f.includes('observed')?'thinking':'curious',text:texts[stage],choices};
}
function guestNode(id:string,p:Progress):DialogueNode{
 const who:GuestId=id.startsWith('luiz')?'luiz':'indo',stage=guestStage(p,who);
 if(who==='luiz'){
  const base={id,speaker:'Luiz Dela',character:'luiz' as CharacterId,expression:'curious' as Expression,text:'',choices:[] as DialogueChoice[]};
  const open=activity(stage==='start'?'Bora testar no terminal':'Voltar ao terminal','orders'),bye=accept('Volto já, Luiz');
  switch(id){
   case 'luiz-why':return {...base,expression:'thinking',text:'Se eu soubesse! A IA montou as telas, ligou os botões, ficou lindo. Pedi para corrigir o preço e ela respondeu “pronto, está resolvido”. Agora o café é de graça. Tecnicamente os clientes não reclamaram.',choices:[open,bye]};
   case 'luiz-read':return {...base,expression:'thinking',text:'Li… quer dizer, vi que ele existe. Tem bastante linha. Parecia confiante. Você acha que eu deveria entender o que está escrito ali antes de mostrar para os expositores?',choices:[next('Deveria. Vamos ver linha por linha.','luiz-hello'),bye]};
   case 'luiz-ai':return {...base,expression:'happy',text:'Vou continuar usando IA, claro. Só que agora eu leio o que ela escreveu, testo mais de um caso e confiro o resultado antes de dizer que está pronto. Até porque “está pronto” virou minha frase menos favorita.',choices:[accept('Boa, Luiz')]};
   case 'luiz-end':return {...base,expression:'happy',text:'Agora eu sei por que funciona. Antes eu só sabia que o botão era verde.',choices:[next('Vai continuar usando IA?','luiz-ai'),accept('Boa apresentação, Luiz')]};
  }
  if(stage==='done')return {...base,id:'luiz-hello',expression:'happy',text:'Os expositores adoraram. E os cafés custam um real, como deveriam. Agora eu sei por que funciona. Antes eu só sabia que o botão era verde.',choices:[next('Vai continuar usando IA?','luiz-ai'),activity('Rever o terminal','orders'),accept('Até mais, Luiz')]};
  if(stage==='ready')return {...base,id:'luiz-hello',expression:'happy',text:'Byte, passou! Mas na primeira demonstração também tinha passado, então estou desconfiado de mim mesmo. Os expositores estão chegando. Vamos fazer uma última rodada de pedidos na frente deles?',choices:[{label:'Fazer a última rodada',action:{kind:'final',id:'luiz'}},activity('Quero testar mais um pouco','orders'),bye]};
  if(stage==='progress')return {...base,id:'luiz-hello',expression:'thinking',text:'E aí, achou o problema? Eu fico aqui olhando com cara de quem entende. Se precisar, é só me perguntar. Ou melhor: me explica depois, porque eu quero entender.',choices:[open,next('Você leu o código que a IA gerou?','luiz-read'),bye]};
  return {...base,id:'luiz-hello',text:'Byte, olha esse sistema que eu fiz! Tem cardápio, carrinho, tudo. Só tem um detalhe: dois cafés deram duzentos reais. Eu pedi pra IA corrigir e agora o café tá grátis. Acho melhor você dar uma olhada.',choices:[open,next('Por que dois cafés viraram duzentos?','luiz-why'),bye]};
 }
 const base={id,speaker:'Indo Ali',character:'indo' as CharacterId,expression:'curious' as Expression,text:'',choices:[] as DialogueChoice[]};
 const open=activity(stage==='start'?'Vamos organizar o briefing':'Voltar à calculadora','budget'),bye=accept('Já volto, Indo');
 switch(id){
  case 'indo-brief':return {...base,expression:'thinking',text:'Começou com uma telinha. Depois vieram cardápio, login, perfil, pedidos, pagamento e ajuda. Aí “aproveita e faz para desktop”, “dá para clicar no protótipo?” e, meu favorito, “um botão que faz tudo”. Está tudo espalhado em mensagens.',choices:[open,bye]};
  case 'indo-scope':return {...base,expression:'thinking',text:'Quando o pedido muda, o preço muda. Se a proposta só mostra um número final, parece que estou inventando. Com o cálculo aberto, dá para mostrar o que cada “coisinha” custa.',choices:[open,bye]};
  case 'indo-end':return {...base,expression:'happy',text:'O cliente olhou o painel e entendeu na hora o que cada serviço custa. Até desistiu do botão que faz tudo. Por enquanto.',choices:[accept('Boa, Indo')]};
 }
 if(stage==='done')return {...base,id:'indo-hello',expression:'happy',text:'Proposta aprovada! Agora, quando aparecer “mais uma coisinha”, eu mostro quanto ela custa. E olha que já apareceu.',choices:[next('Como o cliente reagiu?','indo-end'),activity('Rever a calculadora','budget'),accept('Até mais, Indo')]};
 if(stage==='ready')return {...base,id:'indo-hello',expression:'happy',text:'As quatro combinações bateram! Serviço por serviço, sem cobrar nada duas vezes. O cliente chegou. Me ajuda a apresentar o painel do projeto?',choices:[{label:'Apresentar a proposta',action:{kind:'final',id:'indo'}},activity('Conferir mais uma vez','budget'),bye]};
 if(stage==='progress')return {...base,id:'indo-hello',expression:'thinking',text:'Conseguiu olhar o orçamento? Tem uma opção cobrando duas vezes e outra que não muda nada no total. Antes de mandar, preciso entender o que está acontecendo.',choices:[open,next('Por que abrir o cálculo?','indo-scope'),bye]};
 return {...base,id:'indo-hello',text:'Quando ele falou “é só uma telinha”, eu achei que ia ser tranquilo. Agora tem aplicativo, versão desktop e um botão que “faz tudo”. Me ajuda a organizar isso antes que apareça mais uma telinha?',choices:[open,next('O que o cliente pediu, afinal?','indo-brief'),bye]};
}
export const isGuestNode=(id:string)=>id.startsWith('luiz')||id.startsWith('indo');
export function dialogueNode(id:string,p:Progress):DialogueNode{return isGuestNode(id)?guestNode(id,p):talissonNode(id,p);}
export function remember(p:Progress,node:DialogueNode){
 const last=p.v3.history.at(-1);if(last?.node===node.id&&last.text===node.text)return;
 p.v3.history.push({speaker:node.speaker,text:node.text,node:node.id});if(p.v3.history.length>80)p.v3.history.shift();
}
export function portrait(node:DialogueNode){return characterPortrait(node.character,node.expression==='happy');}
