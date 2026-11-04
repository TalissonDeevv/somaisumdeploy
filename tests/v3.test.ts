import {describe,it,expect} from 'vitest';
import {runActivity,demoFrames,DEMO_EVENTS,validActivityProgram} from '../src/v3/interpreters';
import {initialActivity,activities,conceptLessons,COMMUNITY_URL} from '../src/v3/content';
import {emit,defaultBindings,validBindings,chapterObjective,activityRequirement} from '../src/v3/events';
import {dialogueNode,remember} from '../src/v3/dialogue';
import {freshProgress,parseSave,MAX_SAVE_BYTES,defaultSettings,completeMission} from '../src/core/state';
import {xpFor,levelInfo,finishLesson,finishPractice} from '../src/core/progression';
import {lessons,practices} from '../src/core/academy';
import {directionFor} from '../src/game/direction';
import type {ActivityProgram,RouteProgram,WorldEvent} from '../src/v3/types';
const route:RouteProgram={kind:'route',name:'entregarKit',commands:['pick','call','S','S','E','pick','call'],routine:['N','N','E','E','drop']};
const circuit:ActivityProgram={kind:'circuit',edges:[['ticket','and'],['paid','and'],['and','or'],['team','or'],['or','gate']]};
describe('Interpretadores da V3',()=>{
 it.each(activities)('$id tem falha inicial observável',a=>expect(runActivity(initialActivity(a.id)).passed).toBe(false));
 it('robô entrega por função e aceita solução expandida',()=>{
  const a=runActivity(route);expect(a.passed).toBe(true);expect(a.optional).toContain('reusable-route');expect(a.frames.at(-1)?.point).toEqual({x:5,y:2,carrying:false});
  expect(runActivity({...route,commands:['pick','2N','2E','drop','2S','E','pick','2N','2E','drop'],routine:[]}).passed).toBe(true);
 });
 it('variação de percurso exige outra rotina, mas continua solucionável',()=>{
  expect(runActivity(route,1).passed).toBe(false);
  expect(runActivity({...route,commands:['pick','call','2S','S','E','pick','call'],routine:['2N','N','2E','drop']},1).passed).toBe(true);
 });
 it('limita passos e recusa chamadas recursivas',()=>{
  const loop=runActivity({...route,commands:Array(40).fill('call'),routine:['N','S']});expect(loop.passed).toBe(false);expect(loop.frames.length).toBeLessThanOrEqual(66);
  expect(validActivityProgram({...route,routine:['call']})).toBe(false);expect(runActivity({...route,routine:['call']}).passed).toBe(false);
 });
 it('circuito controla oito casos e rejeita ciclos',()=>{
  const r=runActivity(circuit);expect(r.passed).toBe(true);expect(r.frames).toHaveLength(8);expect(r.frames[4].gate).toBe(false);expect(r.frames[1].gate).toBe(true);
  expect(runActivity({kind:'circuit',edges:[['or','and'],['ticket','and'],['and','or'],['team','or'],['or','gate']]}).feedback).toContain('Ciclo');
 });
 it('variação da catraca exige documento E uma prioridade',()=>{
  expect(runActivity(circuit,1).passed).toBe(false);
  expect(runActivity({kind:'circuit',edges:[['ticket','or'],['paid','or'],['or','and'],['team','and'],['and','gate']]},1).passed).toBe(true);
 });
 it('depurador mostra a primeira aprovação indevida e corrige a linha responsável',()=>{
  const bad=runActivity(initialActivity('debug'));expect(bad.frames.find(f=>f.failure)?.vars).toMatchObject({pessoa:4,vagas:0});expect(bad.frames.find(f=>f.failure)?.line).toBe(2);
  expect(runActivity({kind:'debug',capacity:3,comparison:'>',change:-1,line:2}).passed).toBe(true);
  expect(runActivity({kind:'debug',capacity:3,comparison:'>',change:-1,line:3}).passed).toBe(false);
 });
 it('cache e banco se alteram sequencialmente de modo reproduzível',()=>{
  const buggy={kind:'data',identity:'id',strategy:'ignore',persistent:false} as const;
  const simple=demoFrames(['A17','retryA'],buggy),full=demoFrames(DEMO_EVENTS,buggy);
  expect(simple.at(-1)?.records).toHaveLength(1);expect(full[3].records).toHaveLength(2);expect(full[3].vars.cache).toBe('vazio');expect(full[4].records).toHaveLength(3);
  expect(demoFrames(DEMO_EVENTS,buggy)).toEqual(full);
 });
 it.each([{events:['A17','reconnect','retryA']},{events:['B28','reconnect','retryB']},{events:['A17','reconnect','A17']}])('construção aceita contraexemplos diferentes $events',({events})=>{
  const r=runActivity({kind:'tests',events:events as typeof DEMO_EVENTS,negative:{ticket:true,paid:false,team:false}});expect(r.passed).toBe(true);expect(r.optional).toContain('negative-test');
 });
 it('caso feliz sozinho não é prova de descoberta',()=>expect(runActivity(initialActivity('tests')).passed).toBe(false));
 it('listas preservam homônimos e aplicam atualização, sem cópias',()=>{
  const r=runActivity({kind:'data',identity:'id',strategy:'upsert',persistent:true});expect(r.passed).toBe(true);expect(r.frames.at(-1)?.records?.map(p=>p.id)).toEqual(['A17','B28']);expect(r.frames.at(-1)?.records?.[0].email).toBe('ana.novo@local');
  for(const identity of ['name','email'] as const)expect(runActivity({kind:'data',identity,strategy:'upsert',persistent:true}).passed).toBe(false);
 });
 it('investigação exige evidências e aceita os dois IDs',()=>{
  expect(runActivity({kind:'investigation',evidence:[1,4],hypothesis:'cache'}).passed).toBe(true);
  expect(runActivity({kind:'investigation',evidence:[2,5],hypothesis:'cache'}).passed).toBe(true);
  expect(runActivity({kind:'investigation',evidence:[1],hypothesis:'cache'}).passed).toBe(false);
  expect(runActivity({kind:'investigation',evidence:[1,4],hypothesis:'network'}).passed).toBe(false);
 });
 it.each([null,{}, {kind:'route',commands:['fetch'],routine:[],name:'f'}, {kind:'tests',events:['arbitrario'],negative:{ticket:true,paid:false,team:false}}, {kind:'data',identity:'id',strategy:'upsert',persistent:'yes'}, {kind:'debug',capacity:Infinity,comparison:'>',change:-1,line:2}, {kind:'investigation',evidence:[999],hypothesis:'cache'}])('entrada inválida %j é recusada com segurança',p=>{
  expect(runActivity(p as ActivityProgram).passed).toBe(false);
 });
});
describe('Diálogos, progressão e compatibilidade',()=>{
 it('Talisson participa da abertura e lembra do estado real',()=>{
  const p=freshProgress();expect(dialogueNode('intro',p).speaker).toBe('Talisson Souza');expect(dialogueNode('intro',p).text).toContain('Feira Conecta');
  emit(p,{type:'fact',fact:'met'});emit(p,{type:'fact',fact:'rule'});expect(dialogueNode('greeting',p).choices.some(c=>c.action.kind==='demo')).toBe(true);
  remember(p,dialogueNode('rule',p));remember(p,dialogueNode('rule',p));expect(p.v3.history).toHaveLength(1);
 });
 it('fatos só avançam em ordem e recompensas não se repetem',()=>{
  const p=freshProgress();expect(emit(p,{type:'fact',fact:'finished'})).toBe(false);
  for(const fact of ['met','rule','observed','log','note','hypothesis','corrected','presented','explained','finished'] as const){expect(emit(p,{type:'fact',fact})).toBe(true);expect(emit(p,{type:'fact',fact})).toBe(false);}
  expect(xpFor(p)).toBe(220);expect(chapterObjective(p)).toContain('concluído');
  const event:WorldEvent={type:'activity',id:'route',instructions:12,runs:2,optional:['reusable-route']};expect(emit(p,event)).toBe(true);expect(emit(p,event)).toBe(false);expect(xpFor(p)).toBe(310);
 });
 it('novos pré-requisitos usam conhecimento, não XP',()=>{
  const p=freshProgress();expect(activityRequirement(p,'route')).toBe('');expect(activityRequirement(p,'debug')).toContain('variables');emit(p,{type:'concept',concept:'variables'});expect(activityRequirement(p,'debug')).toBe('');
  expect(activityRequirement(p,'circuit')).toContain('condições');p.lessonCompleted.push('l3');expect(activityRequirement(p,'circuit')).toBe('');
 });
 it('total máximo e níveis não dependem de áreas bloqueadas',()=>{
  const p=freshProgress();for(let i=0;i<5;i++)completeMission(p,i);for(const l of lessons)finishLesson(p,l.id);for(const t of practices)finishPractice(p,t.id);
  expect(xpFor(p)).toBe(1820);
  for(const c of conceptLessons)emit(p,{type:'concept',concept:c.id});for(const a of activities)emit(p,{type:'activity',id:a.id,instructions:10,runs:1,optional:[]});
  for(const fact of ['met','rule','observed','log','note','hypothesis','corrected','presented','explained','finished'] as const)emit(p,{type:'fact',fact});
  emit(p,{type:'opening'});expect(xpFor(p)).toBe(3155);expect(levelInfo(p).level).toBe(12);
 });
 it('V2 mantém XP, preferências, conquistas e pode ignorar a abertura',()=>{
  const current=freshProgress();completeMission(current,0);finishLesson(current,'l1');
  const old=JSON.parse(JSON.stringify(current));old.version=2;delete old.v3;delete old.settings.bindings;
  const restored=parseSave(JSON.stringify(old))!;expect(restored.version).toBe(3);expect(xpFor(restored)).toBe(135);expect(restored.v3.opening).toBe('skipped');expect(restored.settings.bindings).toEqual(defaultBindings());
 });
 it('save V3 faz round trip com caderno, resultados e personalização',()=>{
  const p=freshProgress();emit(p,{type:'fact',fact:'met'});p.v3.results.tests='Contraexemplo observado';p.v3.decor.plant='right';remember(p,dialogueNode('intro',p));expect(parseSave(JSON.stringify(p))).toEqual(p);
 });
 it.each([{v3:{...freshProgress().v3,facts:['finished']}},{v3:{...freshProgress().v3,activityCompleted:['route','route']}},{v3:{...freshProgress().v3,results:{tests:'x'.repeat(401)}}},{settings:{...defaultSettings(),bindings:{...defaultBindings(),interact:'w'}}}])('importação rejeita estrutura inconsistente',bad=>expect(parseSave(JSON.stringify({...freshProgress(),...bad}))).toBeNull());
 it('limita tamanho e recusa versões futuras',()=>{expect(parseSave(' '.repeat(MAX_SAVE_BYTES+1))).toBeNull();expect(parseSave(JSON.stringify({...freshProgress(),version:99}))).toBeNull();});
 it('remapeamento detecta conflitos',()=>{expect(validBindings(defaultBindings())).toBe(true);expect(validBindings({...defaultBindings(),interact:'w'})).toBe(false);expect(validBindings({...defaultBindings(),interact:'f'})).toBe(true);});
 it('endereço da comunidade é exatamente o autorizado',()=>expect(COMMUNITY_URL).toBe('https://discord.talissonsouza.com.br'));
});
describe('Direção do Byte',()=>{
 it('quatro direções e repouso preservam orientação',()=>{expect(directionFor(-1,0,'down')).toBe('left');expect(directionFor(1,0,'left')).toBe('right');expect(directionFor(0,-1,'right')).toBe('up');expect(directionFor(0,1,'up')).toBe('down');expect(directionFor(0,0,'left')).toBe('left');});
 it('diagonal mantém o eixo compatível e não oscila',()=>{let d=directionFor(1,-1,'up');for(let i=0;i<30;i++)d=directionFor(1,-1,d);expect(d).toBe('up');expect(directionFor(1,-1,'left')).toBe('right');});
});
