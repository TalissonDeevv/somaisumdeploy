import { describe, expect, it } from 'vitest';
import { freshProgress, parseSave } from '../src/core/state';
import { dialogueNode } from '../src/v3/dialogue';
import { emit, guestCall, guestStage, setGuestFlag, talissonCall } from '../src/v3/events';
import { convertPrice, runActivity } from '../src/v3/interpreters';
import { GRID, looks } from '../src/game/CharacterPixels';
import type { ActivityProgram, Fact } from '../src/v3/types';

const order:Fact[]=['met','rule','observed','log','note','hypothesis','corrected','presented','explained','finished'];
const reach=(p:ReturnType<typeof freshProgress>,facts:Fact[])=>{for(const fact of facts)emit(p,{type:'fact',fact});};

describe('Talisson: continuar, pausar e finalizar',()=>{
 it('cada etapa da tarefa oferece um próximo passo e a opção de sair',()=>{
  const p=freshProgress();p.v3.opening='done';
  for(let i=0;i<=order.length;i++){
   const node=dialogueNode('greeting',p);
   expect(node.text.length).toBeGreaterThan(20);expect(node.choices.length).toBeGreaterThanOrEqual(2);
   expect(node.choices.some(c=>c.action.kind==='leave'||c.action.kind==='accept')).toBe(true);
   for(const choice of node.choices)if(choice.action.kind==='node')expect(dialogueNode(choice.action.node,p).text.length).toBeGreaterThan(10);
   if(i<order.length)emit(p,{type:'fact',fact:order[i]});
  }
 });
 it('o lembrete chama o Byte e aponta a tarefa real',()=>{
  const p=freshProgress();p.v3.opening='done';p.v3.dialoguePaused=true;
  reach(p,['met','rule']);const reminder=dialogueNode('reminder',p);
  expect(reminder.text).toContain('Ei, Byte');expect(reminder.choices[0].action).toEqual({kind:'demo',fixed:false});
  reach(p,['observed','log']);expect(dialogueNode('reminder',p).text).toContain('bilhete');
 });
 it('o balão aparece quando a conversa foi pausada ou quando a vez é dele, e some no fim',()=>{
  const p=freshProgress();expect(talissonCall(p)).toBeNull();
  p.v3.opening='done';expect(talissonCall(p)).toContain('regra');
  reach(p,['met','rule','observed']);expect(talissonCall(p)).toBeNull();
  p.v3.dialoguePaused=true;expect(talissonCall(p)).toContain('pistas');expect(talissonCall(p,true)).toContain('Vem');
  reach(p,['log','note','hypothesis','corrected','presented','explained','finished']);expect(talissonCall(p)).toBeNull();
 });
 it('save com etapa nova da conversa é válido e etapa desconhecida é recusada',()=>{
  const p=freshProgress();p.v3.dialogueNode='lead-fix';expect(parseSave(JSON.stringify(p))?.v3.dialogueNode).toBe('lead-fix');
  p.v3.dialogueNode='inventado';expect(parseSave(JSON.stringify(p))).toBeNull();
 });
});

describe('Missão do Luiz: terminal de pedidos',()=>{
 const good:ActivityProgram={kind:'orders',script:['cafe','cafe','pay','new','pao','pay'],conversion:'decimal',listeners:1,reset:true};
 it('a IA deixa grátis, tirar a vírgula multiplica por cem, o ponto acerta',()=>{
  expect(convertPrice('1,00','ai')).toBe(0);expect(convertPrice('1,00','strip')).toBe(100);expect(convertPrice('3,50','decimal')).toBe(3.5);
 });
 it('código certo com bom roteiro passa e o balcão recebe os valores',()=>{
  const run=runActivity(good);expect(run.passed).toBe(true);
  expect(run.frames.at(-1)?.counter).toEqual([{id:1,itens:'Café, Café',total:'R$ 2,00'},{id:2,itens:'Pão de queijo',total:'R$ 3,50'}]);
 });
 it('reproduz os duzentos reais do Luiz',()=>{
  const run=runActivity({...good,script:['cafe','cafe'],conversion:'strip'});
  expect(run.frames.some(f=>f.vars.total==='R$ 200,00')).toBe(true);expect(run.passed).toBe(false);expect(run.comment).toContain('DUZENTOS');
 });
 it.each([['clique duplo',{listeners:2}],['total herdado',{reset:false}],['conversão errada',{conversion:'ai'}]] as const)('%s reprova',(_,change)=>{
  expect(runActivity({...good,...change} as ActivityProgram).passed).toBe(false);
 });
 it('código certo com roteiro fraco ainda não prova nada',()=>{
  const run=runActivity({...good,script:['cafe','pay']});expect(run.passed).toBe(false);expect(run.feedback).toContain('roteiro');
 });
 it('roteiro inválido é recusado',()=>{expect(runActivity({...good,script:['hack']} as unknown as ActivityProgram).passed).toBe(false);});
});

describe('Missão da Indo: orçamento',()=>{
 const good:ActivityProgram={kind:'budget',telas:6,horas:4,valor:50,vague:false,protoCount:1,desktopCond:'desktop'};
 it('as quatro combinações batem e cada serviço entra uma vez',()=>{
  const run=runActivity(good);expect(run.passed).toBe(true);expect(run.frames.at(-1)?.budget?.map(r=>r.obtido)).toEqual([1200,1800,1600,2200]);
 });
 it('protótipo em dobro e desktop na condição errada aparecem como diferença',()=>{
  const twice=runActivity({...good,protoCount:2});expect(twice.passed).toBe(false);expect(twice.feedback).toContain('duas vezes');
  const wrong=runActivity({...good,desktopCond:'prototipo'});expect(wrong.passed).toBe(false);expect(wrong.frames[2].vars.total).toBe('R$ 1200,00');
 });
 it('“uma telinha” e o botão que faz tudo não passam',()=>{
  expect(runActivity({...good,telas:1}).passed).toBe(false);expect(runActivity({...good,vague:true}).feedback).toContain('botão');
 });
});

describe('Convidados: conversa e sprites',()=>{
 it('a conversa acompanha o andamento da missão até o encerramento',()=>{
  const p=freshProgress();
  expect(dialogueNode('luiz-hello',p).text).toContain('duzentos reais');expect(guestStage(p,'luiz')).toBe('start');expect(guestCall(p,'luiz')).toBeTruthy();
  setGuestFlag(p,'luiz','met');expect(guestStage(p,'luiz')).toBe('progress');expect(guestCall(p,'luiz')).toBeNull();
  emit(p,{type:'activity',id:'orders',instructions:6,runs:1,optional:[]});expect(guestStage(p,'luiz')).toBe('ready');expect(dialogueNode('luiz-hello',p).choices[0].action).toEqual({kind:'final',id:'luiz'});
  setGuestFlag(p,'luiz','finished');expect(guestStage(p,'luiz')).toBe('done');expect(dialogueNode('luiz-hello',p).text).toContain('botão era verde');
  expect(dialogueNode('indo-hello',p).text).toContain('telinha');expect(dialogueNode('indo-hello',p).speaker).toBe('Indo Ali');
  expect(parseSave(JSON.stringify(p))).not.toBeNull();
 });
 it('todos os sprites usam a mesma grade e só Luiz usa óculos',()=>{
  for(const look of Object.values(looks)){
   expect(look.rows).toHaveLength(GRID.height);expect(look.rows.every(r=>r.length===GRID.width)).toBe(true);
   expect([...look.rows.join('').replace(/ /g,'')].every(c=>look.palette[c])).toBe(true);
  }
  expect(looks.luiz.palette.g).toBeTruthy();expect(looks.talisson.palette.g).toBeUndefined();expect(looks.talisson.rows.join('')).not.toContain('g');
 });
});
