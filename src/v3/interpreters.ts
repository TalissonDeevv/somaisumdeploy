import type { ActivityProgram, ActivityRun, BudgetProgram, BudgetRow, DemoEvent, DataProgram, OrderEvent, OrdersProgram, Person, PriceConversion, SimFrame, ServiceCommand, CircuitProgram, NodeId } from './types';
import { orderEventIds } from './types';
export const DEMO_EVENTS:DemoEvent[]=['A17','B28','reconnect','retryA','retryB'];
export const people:Record<string,Person>={A17:{id:'A17',name:'Ana',email:'ana@local'},B28:{id:'B28',name:'Ana',email:'palestra@local'},retryA:{id:'A17',name:'Ana',email:'ana.novo@local'},retryB:{id:'B28',name:'Ana',email:'palestra@local'}};
export function validActivityProgram(value:unknown):value is ActivityProgram{
 if(!value||typeof value!=='object')return false;
 const p=value as Record<string,unknown>,arr=(v:unknown,n:number,allowed:readonly string[])=>Array.isArray(v)&&v.length<=n&&v.every(x=>typeof x==='string'&&allowed.includes(x));
 if(p.kind==='route')return arr(p.commands,40,['N','S','E','W','pick','drop','call','2N','2E','2S','2W'])&&arr(p.routine,16,['N','S','E','W','pick','drop','2N','2E','2S','2W'])&&typeof p.name==='string'&&/^[a-zA-ZÀ-ÿ][a-zA-ZÀ-ÿ0-9]{0,23}$/.test(p.name);
 if(p.kind==='circuit')return Array.isArray(p.edges)&&p.edges.length<=12&&p.edges.every(edge=>Array.isArray(edge)&&edge.length===2&&edge.every(n=>['ticket','paid','team','and','or','gate'].includes(n)));
 if(p.kind==='debug')return Number.isInteger(p.capacity)&&Number(p.capacity)>=0&&Number(p.capacity)<=6&&['>','>='].includes(String(p.comparison))&&[-1,0,1].includes(Number(p.change))&&typeof p.change==='number'&&Number.isInteger(p.line)&&Number(p.line)>=1&&Number(p.line)<=4;
 if(p.kind==='tests'){const n=p.negative as Record<string,unknown>|undefined;return arr(p.events,16,DEMO_EVENTS)&&!!n&&['ticket','paid','team'].every(k=>typeof n[k]==='boolean');}
 if(p.kind==='data')return ['id','name','email'].includes(String(p.identity))&&['append','upsert','ignore'].includes(String(p.strategy))&&typeof p.persistent==='boolean';
 if(p.kind==='orders')return arr(p.script,16,orderEventIds)&&['ai','strip','decimal'].includes(String(p.conversion))&&(p.listeners===1||p.listeners===2)&&typeof p.reset==='boolean';
 if(p.kind==='budget')return [p.telas,p.horas,p.valor].every(n=>Number.isInteger(n)&&Number(n)>=0&&Number(n)<=500)&&typeof p.vague==='boolean'&&(p.protoCount===1||p.protoCount===2)&&['desktop','prototipo'].includes(String(p.desktopCond));
 if(p.kind==='investigation')return Array.isArray(p.evidence)&&p.evidence.length<=6&&new Set(p.evidence).size===p.evidence.length&&p.evidence.every(x=>Number.isInteger(x)&&x>=0&&x<=5)&&['cache','network','name'].includes(String(p.hypothesis));
 return false;
}
const frame=(label:string,vars:SimFrame['vars'],extra:Partial<SimFrame>={}):SimFrame=>({label,vars,output:[],...extra});
export function demoFrames(events:DemoEvent[],program:DataProgram):SimFrame[]{
 const bank:Person[]=[],cache=new Set<string>();const frames:SimFrame[]=[frame('Estado inicial',{cache:'vazio',registros:0},{records:[]})];
 if(events.length>16||events.some(e=>!DEMO_EVENTS.includes(e)))return [frame('Entrada inválida: até 16 eventos conhecidos.',{}, {failure:true})];
 for(const event of events){
  if(event==='reconnect'){cache.clear();frames.push(frame('Reconexão: cache apagado; banco preservado.',{evento:'reconectar',cache:'vazio',registros:bank.length},{records:structuredClone(bank)}));continue;}
  const record={...people[event]},key=record[program.identity];
  const found=program.persistent?bank.findIndex(p=>p[program.identity]===key):cache.has(key)?bank.findIndex(p=>p[program.identity]===key):-1;
  const source=event.startsWith('retry')?'quiosque / reenvio':'tablet / inscrição';
  if(found<0||program.strategy==='append')bank.push(record);
  else if(program.strategy==='upsert')bank[found]=record;
  cache.add(key);
  const duplicate=bank.filter(r=>r.id===record.id).length>1;
  frames.push(frame(source+' → salvarInscrição('+record.id+')',{evento:event,cache:[...cache].join(', '),registros:bank.length},{records:structuredClone(bank),failure:duplicate,output:[duplicate?'ID duplicado no banco':found<0?'Registro incluído':'Registro encontrado']}));
 }
 return frames;
}
export const menuItems:Record<'cafe'|'pao',{name:string;price:string;value:number}>={cafe:{name:'Café',price:'1,00',value:1},pao:{name:'Pão de queijo',price:'3,50',value:3.5}};
export const money=(n:number)=>'R$ '+n.toFixed(2).replace('.',',');
export function convertPrice(text:string,conversion:PriceConversion):number{
 if(conversion==='ai')return Number(text)||0; // "1,00" is NaN, and || 0 silently turns it into free coffee.
 if(conversion==='strip')return Number(text.replace(',',''));
 return Number(text.replace(',','.'));
}
function orderFrames(script:OrderEvent[],program:OrdersProgram):{frames:SimFrame[];diverged:boolean}{
 let total=0,expected=0,items:string[]=[],wanted:string[]=[],diverged=false;const counter:{id:number;itens:string;total:string}[]=[];
 const state=(evento:string,extra:Record<string,string|number>={})=>({evento,...extra,total:money(total),esperado:money(expected),itens:items.length});
 const frames:SimFrame[]=[frame('Terminal pronto. O total começa em '+money(0)+'.',state('início'),{counter:[],line:0})];
 const push=(label:string,vars:SimFrame['vars'],line:number)=>{const failure=Math.abs(total-expected)>1e-9||items.length!==wanted.length;diverged=diverged||failure;frames.push(frame(label,vars,{line,failure,counter:structuredClone(counter)}));};
 for(const event of script){
  if(event==='cafe'||event==='pao'){
   const item=menuItems[event];expected+=item.value;wanted.push(item.name);
   for(let fire=1;fire<=program.listeners;fire++){
    const value=convertPrice(item.price,program.conversion);total+=value;items.push(item.name);
    push(fire===1?'Clique em Pedir '+item.name+': preço "'+item.price+'" virou '+value:'O mesmo clique disparou de novo: '+item.name+' entrou duas vezes.',state('pedir '+item.name,{preco:'"'+item.price+'" (texto)',convertido:value}),fire===1?1:2);
   }
  }else if(event==='pay'){
   counter.push({id:counter.length+1,itens:items.join(', ')||'vazio',total:money(total)});
   push('Pedido enviado ao balcão: '+money(total)+'.',state('pagar'),3);
  }else{
   expected=0;wanted=[];if(program.reset){total=0;items=[];}
   push(program.reset?'Nova compra: carrinho e total zerados.':'Nova compra: o total anterior continuou acumulado.',state('nova compra'),4);
  }
 }
 return {frames,diverged};
}
export const ORDER_CHECK:OrderEvent[]=['cafe','cafe','pay','new','pao','pay'];
function runOrders(program:OrdersProgram):ActivityRun{
 const {frames,diverged}=orderFrames(program.script,program),check=orderFrames(ORDER_CHECK,program);
 const s=program.script,lastNew=s.lastIndexOf('new'),before=s.slice(0,Math.max(lastNew,0)),after=lastNew<0?[]:s.slice(lastNew+1);
 const ordered=(list:OrderEvent[])=>list.some(e=>e==='cafe'||e==='pao');
 const coverage=lastNew>=0&&ordered(before)&&before.includes('pay')&&ordered(after)&&after.includes('pay');
 const correct=program.conversion==='decimal'&&program.listeners===1&&program.reset&&!check.diverged;
 const passed=correct&&coverage&&!diverged;
 const last=frames.at(-1);frames.push(frame(passed?'Rodada conferida: o balcão recebeu os valores certos.':'Resultado do roteiro: compare obtido e esperado.',{...last?.vars,evento:'fim'},{line:0,failure:!passed&&diverged,counter:last?.counter??[]}));
 const hit200=frames.some(f=>f.vars.total==='R$ 200,00');
 const feedback=passed?'Conversão correta, um evento por clique e estado zerado na nova compra. O roteiro testou além do primeiro exemplo e o balcão recebeu tudo certo.':
  program.conversion==='ai'?'O café está saindo de graça. Number("1,00") dá NaN e o || 0 transforma isso em zero sem avisar ninguém. Revise a conversão do preço.':
  program.conversion==='strip'?'Tirar a vírgula transforma R$ 1,00 em 100. O preço precisa virar 1. Revise a conversão.':
  program.listeners===2?'O preço está certo, mas um clique registra o pedido duas vezes. Veja o passo “disparou de novo” e revise o botão.':
  !program.reset?'Os valores estão certos, mas a nova compra pode herdar o total anterior. Teste uma nova compra e revise o estado.':
  !coverage?'O código parece certo, mas seu roteiro ainda não prova isso. Teste pedir, pagar, abrir uma nova compra, pedir de novo e pagar.':
  'Ainda há divergência entre obtido e esperado. Avance passo a passo até a primeira diferença.';
 const comment=passed?'Luiz · Espera, então funcionou porque a gente entendeu, e não porque eu pedi com jeitinho?':
  hit200?'Luiz · OLHA OS DUZENTOS REAIS! Foi exatamente isso. Ainda bem que agora dá para ver de onde veio.':
  program.conversion==='ai'?'Luiz · Esse é o conserto da IA. Ela disse que estava pronto. Por que o erro não aparece em lugar nenhum?':
  program.conversion==='strip'?'Luiz · Mas sem a vírgula não fica mais limpo? Ah. Cem reais o café. Entendi.':
  program.listeners===2?'Luiz · Mas eu só cliquei uma vez! Será que tem dois lugares ouvindo o mesmo botão?':
  !program.reset?'Luiz · Então o cliente novo paga o café do anterior? Isso explica a reclamação de ontem.':
  'Luiz · Na primeira demonstração também funcionou. O que mais a gente pode testar?';
 return {frames,passed,feedback,comment,optional:[],instructions:Math.max(1,program.script.length)};
}
export const BUDGET_SCENARIOS=[{cenario:'Só aplicativo',desktop:false,prototipo:false},{cenario:'App + desktop',desktop:true,prototipo:false},{cenario:'App + protótipo',desktop:false,prototipo:true},{cenario:'App + desktop + protótipo',desktop:true,prototipo:true}];
const BRIEF={telas:6,horas:4,valor:50};
const budgetTotal=(p:BudgetProgram,desktop:boolean,prototipo:boolean)=>{
 const base=p.telas*p.horas*p.valor,addDesktop=(p.desktopCond==='desktop'?desktop:prototipo)?p.telas*2*p.valor:0,addProto=prototipo?8*p.valor*p.protoCount:0,addVague=p.vague?999:0;
 return {base,addDesktop,addProto,addVague,total:base+addDesktop+addProto+addVague};
};
const breakdown=(b:ReturnType<typeof budgetTotal>):[string,string][]=>[['Base das telas',money(b.base)],['Versão desktop',money(b.addDesktop)],['Protótipo navegável',money(b.addProto)],...(b.addVague?[['Botão que faz tudo (chute)',money(b.addVague)] as [string,string]]:[])];
function runBudget(program:BudgetProgram):ActivityRun{
 const right:BudgetProgram={kind:'budget',...BRIEF,vague:false,protoCount:1,desktopCond:'desktop'},rows:BudgetRow[]=[];
 const frames=[frame('Variáveis lidas: '+program.telas+' tela(s), '+program.horas+' h por tela, '+money(program.valor)+' por hora.',{telas:program.telas,horas:program.horas,valor:money(program.valor)},{budget:[],line:1})];
 for(const s of BUDGET_SCENARIOS){
  const got=budgetTotal(program,s.desktop,s.prototipo),want=budgetTotal(right,s.desktop,s.prototipo).total;
  rows.push({cenario:s.cenario,esperado:want,obtido:got.total});
  frames.push(frame(s.cenario+': '+money(got.total)+(got.total===want?' ✓':' · esperado '+money(want)),{desktop:s.desktop?'sim':'não',prototipo:s.prototipo?'sim':'não',base:money(got.base),'+desktop':money(got.addDesktop),'+protótipo':money(got.addProto),total:money(got.total)},{budget:structuredClone(rows),failure:got.total!==want,line:s.desktop?3:2,breakdown:breakdown(got)}));
 }
 const passed=rows.every(r=>r.esperado===r.obtido),full=budgetTotal(program,true,true);
 frames.push(frame(passed?'Painel do projeto organizado: proposta pronta.':'Revise as linhas com diferença.',{total:money(full.total)},{budget:structuredClone(rows),failure:!passed,breakdown:breakdown(full)}));
 const scope=program.telas===BRIEF.telas&&program.horas===BRIEF.horas&&program.valor===BRIEF.valor;
 const feedback=passed?'As quatro combinações batem. Cada serviço entra uma vez, a condição testa a variável certa e o pedido sem definição virou pergunta para o cliente.':
  !scope?'As variáveis ainda não refletem o briefing. Releia as mensagens: quantas telas foram citadas? Quantas horas e qual valor a Indo anotou?':
  program.vague?'“Um botão que faz tudo” não tem definição, então qualquer preço é chute. Tire da conta e devolva como pergunta para o cliente.':
  program.protoCount===2?'O protótipo está sendo cobrado duas vezes: compare “App + protótipo” com o esperado.':
  'Ligar o desktop não muda o total do jeito certo. Veja qual variável a condição está testando.';
 const comment=passed?'Indo · Agora, quando aparecer “mais uma coisinha”, eu mostro quanto ela custa.':
  !scope?'Indo · Ele disse “uma telinha”, mas conta comigo as telas que ele citou nas mensagens…':
  program.vague?'Indo · O que esse botão faz? Se nem o cliente sabe, como eu cobro?':
  program.protoCount===2?'Indo · Duas vezes o protótipo? Se eu mando assim, perco o cliente. Ou o juízo.':
  'Indo · Marquei desktop e o número nem se mexeu. Mas marquei só protótipo e o desktop entrou na conta. Estranho, né?';
 return {frames,passed,feedback,comment,optional:[],instructions:6};
}
function runData(program:DataProgram):ActivityRun{
 const frames=demoFrames(DEMO_EVENTS,program),actual=frames.at(-1)?.records??[];
 const expected=[{...people.retryA},{...people.retryB}];
 const passed=actual.length===2&&expected.every(e=>actual.some(a=>JSON.stringify(a)===JSON.stringify(e)));
 return {frames,passed,feedback:passed?'A mesma função foi aplicada aos dois emissores. Reenvios atualizam por ID; a lista mantém duas Anas e o e-mail recente.':'A lista deve preservar A17 e B28 e aplicar o último envio. Compare identidade, inserção/atualização e proteção persistente.',optional:passed?['reusable-data']:[],instructions:3};
}
function runRoute(program:Extract<ActivityProgram,{kind:'route'}>,variant:number):ActivityRun{
 const targetY=variant===1?1:2,targets=[{x:2,y:targetY},{x:5,y:targetY}],pickups=[{x:0,y:4},{x:3,y:4}];
 let x=0,y=4,carrying=false,calls=0,steps=0,error='';const delivered=new Set<number>(),taken=new Set<number>();
 const frames=[frame('Robô pronto',{entregas:0,passos:0},{point:{x,y,carrying},visited:[]})];
 const allowed:ServiceCommand[]=['N','S','E','W','pick','drop','call','2N','2E','2S','2W'];
 if(program.commands.length>40||program.routine.length>16||program.commands.some(c=>!allowed.includes(c))||program.routine.some(c=>!allowed.includes(c)||c==='call')||!/^[a-zA-ZÀ-ÿ][a-zA-ZÀ-ÿ0-9]{0,23}$/.test(program.name))return {frames,passed:false,feedback:'Programa inválido: até 40 comandos, rotina de até 16 blocos sem chamadas e nome simples.',optional:[],instructions:0};
 const execute=(commands:ServiceCommand[]):void=>{
  for(const command of commands){
   if(error)return;
   if(command==='call'){if(!program.routine.length){error='A função está vazia.';return;}calls++;execute(program.routine);continue;}
   if(command.startsWith('2')){execute([command[1] as ServiceCommand,command[1] as ServiceCommand]);continue;}
   if(++steps>64){error='Limite de 64 passos alcançado.';return;}
   if(command==='pick'){const index=pickups.findIndex(p=>p.x===x&&p.y===y);if(carrying||index<0||taken.has(index)){error='Colete em uma estação com kit disponível e mãos livres.';return;}carrying=true;taken.add(index);}
   else if(command==='drop'){const index=targets.findIndex(p=>p.x===x&&p.y===y);if(!carrying||index<0||delivered.has(index)){error='Entregue um kit em uma estação de destino ainda vazia.';return;}carrying=false;delivered.add(index);}
   else{
    const nx=x+(command==='E'?1:command==='W'?-1:0),ny=y+(command==='S'?1:command==='N'?-1:0);
    if(nx<0||nx>6||ny<0||ny>4||(nx===1&&ny===3)||(nx===4&&ny===3)){error='O robô encontrou a borda ou uma caixa. Revise o caminho.';return;}x=nx;y=ny;
   }
   frames.push(frame(command==='pick'?'Kit coletado':command==='drop'?'Kit entregue':'Mover '+command,{entregas:delivered.size,passos:steps,chamadas:calls},{point:{x,y,carrying},visited:[...delivered].map(String)}));
  }
 };
 execute(program.commands);if(error)frames.push(frame(error,{passos:steps},{point:{x,y,carrying},failure:true}));
 const passed=!error&&delivered.size===2;
 return {frames,passed,feedback:passed?'Os dois kits chegaram. A execução respeitou o mapa e as estações.':error||'Ainda falta entregar um dos kits. Observe a posição final e os destinos.',optional:passed&&calls>=2?['reusable-route']:[],instructions:program.commands.length+program.routine.length};
}
function runCircuit(program:CircuitProgram,variant:number):ActivityRun{
 const nodes:NodeId[]=['ticket','paid','team','and','or','gate'],edges=program.edges;
 const frames:SimFrame[]=[];let invalid='';
 if(edges.length>12||edges.some(([a,b])=>!nodes.includes(a)||!nodes.includes(b)||a==='gate'||['ticket','paid','team'].includes(b)||a===b)||new Set(edges.map(e=>e.join(':'))).size!==edges.length)invalid='Conexão inválida ou repetida.';
 const evalNode=(node:NodeId,input:boolean[],stack=new Set<NodeId>()):boolean=>{
  const index=['ticket','paid','team'].indexOf(node);if(index>=0)return input[index];
  if(stack.has(node)){invalid='Ciclo detectado. A saída não pode alimentar a própria origem.';return false;}
  const incoming=edges.filter(e=>e[1]===node).map(e=>e[0]);
  if((node==='gate'&&incoming.length!==1)||(node!=='gate'&&incoming.length<2)){invalid='A catraca recebe uma saída; E/OU precisam de ao menos duas entradas.';return false;}
  const next=new Set(stack);next.add(node);const values=incoming.map(n=>evalNode(n,input,next));return node==='and'?values.every(Boolean):node==='or'?values.some(Boolean):values[0];
 };
 let passed=true;
 for(let mask=0;mask<8;mask++){const input=[!!(mask&4),!!(mask&2),!!(mask&1)],actual=invalid?false:evalNode('gate',input),expected=variant===1?(input[0]||input[1])&&input[2]:(input[0]&&input[1])||input[2];const ok=actual===expected&&!invalid;passed&&=ok;frames.push(frame('Caso '+(mask+1)+': '+(ok?'resultado correto':'divergência'),{esperado:expected?'liberar':'bloquear',obtido:actual?'liberar':'bloquear'},{inputs:input,gate:actual,failure:!ok}));}
 return {frames,passed,feedback:passed?'A fiação respeita a regra nas oito combinações. O estado da catraca segue a saída calculada.':invalid||'Uma combinação divergiu. Veja os sensores, os parênteses representados pelas conexões e a saída da catraca.',optional:[],instructions:edges.length};
}
export function runActivity(program:ActivityProgram,variant=0):ActivityRun{
 if(!validActivityProgram(program)||![0,1].includes(variant))return {frames:[frame('Entrada inválida. Use os blocos e parâmetros conhecidos.',{},{failure:true})],passed:false,feedback:'A entrada foi recusada pelo interpretador limitado.',optional:[],instructions:0};
 if(program.kind==='orders')return runOrders(program);
 if(program.kind==='budget')return runBudget(program);
 if(program.kind==='route')return runRoute(program,variant);
 if(program.kind==='circuit')return runCircuit(program,variant);
 if(program.kind==='data')return runData(program);
 if(program.kind==='debug'){
  const frames=[frame('vagas ← '+program.capacity,{vagas:program.capacity,aprovados:0},{line:1})];let vacancies=program.capacity,approved=0;
  if(!Number.isInteger(vacancies)||vacancies<0||vacancies>6||![-1,0,1].includes(program.change)||!['>','>='].includes(program.comparison))return {frames,passed:false,feedback:'Parâmetros inválidos.',optional:[],instructions:3};
  for(let i=1;i<=4;i++){const accept=program.comparison==='>'?vacancies>0:vacancies>=0;frames.push(frame('Pessoa '+i+': testar vagas '+program.comparison+' 0',{pessoa:i,vagas:vacancies,aprovados:approved},{line:2,gate:accept,failure:accept!==(i<=3)}));if(accept){approved++;vacancies+=program.change;frames.push(frame('Aprovar e atualizar vagas',{pessoa:i,vagas:vacancies,aprovados:approved},{line:3,gate:accept,failure:vacancies<0}));}}
  const passed=approved===3&&vacancies===0&&program.line===2&&program.capacity===3;
  return {frames,passed,feedback:passed?'A condição da linha 2 é verificada antes da atualização. A quarta pessoa permanece fora; vagas termina em zero.':'Localize a primeira aprovação indevida e a linha que decide a entrada. A sala começa com três vagas e cada aprovação consome uma.',optional:[],instructions:3};
 }
 if(program.kind==='tests'){
  const buggy:DataProgram={kind:'data',identity:'id',strategy:'ignore',persistent:false};
  const frames=demoFrames(program.events,buggy);const found=frames.some(f=>f.failure);
  const {ticket,paid,team}=program.negative,wrongGate=ticket||paid||team,expectedGate=(ticket&&paid)||team;
  const negative=wrongGate!==expectedGate;frames.push(frame('Teste adicional da catraca antiga (OU indevido)',{ingresso:+ticket,pago:+paid,equipe:+team,esperado:expectedGate?'liberar':'bloquear',obtido:wrongGate?'liberar':'bloquear'},{gate:wrongGate,inputs:[ticket,paid,team],failure:negative}));
  return {frames,passed:found,feedback:found?'Seu teste revelou cópias do mesmo ID após a perda do cache. Um exemplo simples sem reconexão não detectava essa falha.':'Esse roteiro ainda não produz duplicação. Inclua uma inscrição, uma reconexão e um evento para o mesmo ID; observe banco e cache.',optional:found&&negative?['negative-test']:[],instructions:program.events.length};
 }
 const frames=demoFrames(DEMO_EVENTS,{kind:'data',identity:'id',strategy:'ignore',persistent:false});
 const evidence=program.evidence;
 const valid=((evidence.includes(1)&&evidence.includes(4))||(evidence.includes(2)&&evidence.includes(5)))&&program.hypothesis==='cache';
 return {frames,passed:valid,feedback:valid?'A17 existe antes da reconexão e duplica depois. O cache foi apagado, mas o banco não; proteger apenas o cache é a causa.':'Selecione a inscrição original de A17 e o reenvio que criou a cópia. A hipótese precisa explicar por que a mesma rede funciona no exemplo simples.',optional:[],instructions:evidence.length};
}
