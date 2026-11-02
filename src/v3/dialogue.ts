import type { Progress } from '../core/types';
import { talissonPortrait } from '../game/TalissonPixels';
import type { ActivityId, Fact } from './types';
export type Expression='curious'|'thinking'|'happy'|'focused';
export type DialogueAction={kind:'node';node:string}|{kind:'demo';fixed:boolean}|{kind:'activity';id:ActivityId}|{kind:'leave'}|{kind:'finish'}|{kind:'explain';correct:boolean};
export interface DialogueChoice {label:string;action:DialogueAction}
export interface DialogueNode {id:string;speaker:string;expression:Expression;text:string;choices:DialogueChoice[];fact?:Fact}
const next=(label:string,node:string):DialogueChoice=>({label,action:{kind:'node',node}});
const leave:DialogueChoice={label:'Continuar jogando',action:{kind:'leave'}};
export function dialogueNode(id:string,p:Progress):DialogueNode{
 const f=p.v3.facts,done=f.includes('finished');
 const base={id,speaker:'Talisson Souza',expression:'curious' as Expression,text:'',choices:[] as DialogueChoice[]};
 switch(id){
  case 'reminder':return {...base,expression:'focused',text:p.v3.opening==='new'?'Byte! Antes de ir para os estandes, o painel do escritório ainda precisa ligar. Quer retomar nossa conversa ou consultar o caderno?':f.includes('finished')?'Byte, nossa apresentação está pronta. Podemos rever a explicação, se quiser.':'Byte, vamos terminar o que começamos? '+(f.includes('corrected')?'A correção já está pronta; falta apresentar e explicar o resultado.':f.includes('hypothesis')?'Você já encontrou a causa. Falta aplicar a proteção por ID no banco.':f.includes('observed')?'Ainda precisamos seguir as pistas e testar a hipótese para a demonstração.':'Quero te mostrar o comportamento esperado antes dos testes.'),choices:[next('Retomar de onde parei',p.v3.dialogueNode),next('Relembrar a regra da tarefa','rule'),leave]};
  case 'lead-log':return {...base,text:'O terminal de registros está na bancada à esquerda da demonstração. O bilhete do buffer fica na mesa mais abaixo. Compare os IDs antes e depois de reconectar. Pode ir: quando voltar, seguimos do ponto em que parou.',choices:[leave,next('Antes, quero rever a regra.','rule')]};
  case 'intro':return {...base,fact:'met',text:'Oi, Byte. Eu sou Talisson. A Feira Conecta vai reunir projetos e gente curiosa da cidade. Rafa precisa de um sistema para receber todo mundo; eu estou preparando uma demonstração. Vamos fazer essas ideias funcionarem?',choices:[next('Como eu começo?','intro-panel'),next('Que demonstração é essa?','intro-demo')]};
  case 'intro-demo':return {...base,expression:'thinking',text:'Uma lista de inscrições que recebe dados de dois aparelhos. O exemplo pequeno funciona, mas quero testar reenvios antes da apresentação. Quando estiver pronto, me encontre na área de demonstração.',choices:[next('Primeiro, vou conhecer o escritório.','intro-panel')]};
  case 'intro-panel':return {...base,text:'Comece pelo painel da mesa. Ele está desligado: prepare a energia, carregue o painel e então ligue. Mova-se com suas teclas de direção e interaja perto dele. Depois, a primeira mensagem de Rafa chega ao computador.',choices:[leave,next('Guardar o convite para investigar depois.','intro-invite')]};
  case 'intro-invite':return {...base,text:'Combinado. Não há relógio correndo. O mapa mostra o caminho até a feira e o seu caderno guarda o próximo passo.',choices:[leave]};
  case 'rule':return {...base,fact:'rule',expression:'focused',text:'Cada ID representa uma inscrição. Duas pessoas podem ter o mesmo nome. Um reenvio do mesmo ID deve atualizar os dados, sem criar outra pessoa. A17 também pode chegar com e-mail corrigido.',choices:[next('Entendi. Vamos observar os eventos.','greeting')]};
  case 'network':return {...base,expression:'thinking',text:'A reconexão dispara o reenvio, mas não explica sozinha a cópia. O banco mantém dados. Compare o que acontece com o cache temporário nesse mesmo momento.',choices:[next('Vou examinar o terminal e o bilhete.','greeting')]};
  case 'cache':return {...base,expression:'focused',text:f.includes('hypothesis')?'Seu teste mostrou o ponto: a reconexão esvazia o cache, mas A17 continua no banco. A proteção só existia no cache. Precisamos usar o ID onde os registros são guardados.':'Essa hipótese é plausível. Para sustentá-la, precisamos das duas pistas e de um roteiro que realmente produza a cópia. Use o caderno para conferir o que já encontrou.',choices:[{label:'Construir um teste de reenvio',action:{kind:'activity',id:'tests'}},leave]};
  case 'wrong-explanation':return {...base,expression:'thinking',text:'Ocultar uma linha muda a aparência, mas o banco ainda guarda cópias. Nossa solução precisa continuar correta depois da reconexão. Quer tentar explicar por outro caminho?',choices:[next('Vou pensar no ID e na persistência.','greeting')]};
  case 'explained':return {...base,expression:'happy',text:'Isso. A função procura o ID no banco: atualiza quem existe e insere quem é novo. O cache pode desaparecer; a identidade continua protegida. O teste de reenvio agora faz parte da demonstração.',choices:[{label:done?'Rever o encerramento':'Encerrar a apresentação',action:{kind:'finish'}},leave]};
  case 'completed':return {...base,expression:'happy',text:'A apresentação ficou pronta, Byte. Você não só corrigiu uma lista: descobriu uma sequência que faltava nos testes e explicou por que a correção funciona. Guarde esta pequena placa da demonstração no escritório.',choices:[leave,next('Relembrar a causa do bug','explained')]};
 }
 const choices:DialogueChoice[]=[];
 if(!f.includes('rule'))choices.push(next('Qual é o comportamento esperado?','rule'));else choices.push(next('Relembrar a regra das inscrições','rule'));
 if(f.includes('rule'))choices.push({label:f.includes('corrected')?'Apresentar a demonstração corrigida':'Observar a demonstração com falha',action:{kind:'demo',fixed:f.includes('corrected')}});
 if(f.includes('observed')&&!done){choices.push(next('Onde encontro as pistas?','lead-log'),next('Será que é só a rede?','network'),next('E se o cache for a única proteção?','cache'));}
 if(f.includes('presented')&&!f.includes('explained'))choices.push({label:'A correção usa ID no banco e atualiza o reenvio.',action:{kind:'explain',correct:true}},{label:'Basta ocultar nomes repetidos na tela.',action:{kind:'explain',correct:false}});
 if(f.includes('explained')&&!done)choices.push({label:'Encerrar a apresentação',action:{kind:'finish'}});
 if(done)choices.push(next('Como ficou nossa apresentação?','completed'));
 choices.push(leave);
 return {...base,id:'greeting',fact:'met',expression:done?'happy':f.includes('observed')?'thinking':'curious',text:done?'A17 voltou a ser só uma inscrição. Quer rever a explicação ou experimentar outro roteiro?':f.includes('presented')?'A demonstração terminou sem cópias e preservou o e-mail recente. Como você explicaria a causa e a correção?':f.includes('observed')?'Você viu a diferença entre o exemplo simples e o reenvio após reconectar. O terminal e o bilhete do buffer ajudam a seguir o rastro.':'Byte, que bom que veio. A demonstração pequena funciona. Quero conferir uma sequência com inscrições e reenvios antes de apresentar. Pode investigar comigo?',choices};
}
export function remember(p:Progress,node:DialogueNode){
 const last=p.v3.history.at(-1);if(last?.node===node.id&&last.text===node.text)return;
 p.v3.history.push({speaker:node.speaker,text:node.text,node:node.id});if(p.v3.history.length>80)p.v3.history.shift();
}
export function portrait(expression:Expression){return talissonPortrait(expression==='happy');}
