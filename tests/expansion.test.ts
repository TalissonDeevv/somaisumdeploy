import { describe,it,expect } from 'vitest';
import { practices,lessons,evaluatePractice } from '../src/core/academy';
import { freshProgress,completeMission,parseSave,defaultSettings,SaveStore } from '../src/core/state';
import { levelInfo,levelFor,xpFor,finishLesson,finishPractice,rooms,badges } from '../src/core/progression';
import type { AccessProgram, Program } from '../src/core/types';
function solution(id:string):Program {
  const task=practices.find(t=>t.id===id)!;
  if(task.kind===0)return task.blocks!.map(b=>b.id);
  if(task.kind===1)return {atoms:['ingresso','pago',id==='p4'?'verdadeiro':'equipe'],ops:[id==='p4'?'E':'OU',id==='p5'?'OU':'E'],group:'left'} as AccessProgram;
  if(task.kind===2)return {start:task.target![0],end:task.target!.at(-1)!,step:task.target![1]-task.target![0],inclusive:true};
  return {key:'id',point:'banco'};
}
describe('Expansão educativa',()=>{
  it.each(practices)('$id começa com erro e tem solução válida',task=>{
    expect(evaluatePractice(task,task.initial).passed).toBe(false);
    expect(evaluatePractice(task,solution(task.id)).passed).toBe(true);
  });
  it('café aceita filtro antes da água e rejeita coar antes das preparações',()=>{
    const task=practices[0];expect(evaluatePractice(task,['po','agua','coar','servir']).passed).toBe(true);
    expect(evaluatePractice(task,['agua','coar','po','servir']).feedback).toContain('Colocar pó');
  });
  it('regra do documento inclui casos negativos',()=>{
    const result=evaluatePractice(practices[5],{atoms:['ingresso','pago','equipe'],ops:['OU','OU'],group:'left'});
    expect(result.passed).toBe(false);expect(result.cases).toHaveLength(8);
    expect(result.cases.find(c=>c.input==='agendado 1 · prioritario 0 · documento 0')?.passed).toBe(false);
  });
  it('treino também interrompe loops sem término',()=>{
    const result=evaluatePractice(practices[6],{start:0,end:3,step:0,inclusive:true});expect(result.passed).toBe(false);expect(result.trace.at(-1)).toContain('24 passos');
  });
  it('cada lição tem conceito, revisão e resposta com explicação',()=>{
    expect(lessons).toHaveLength(8);for(const l of lessons){expect(l.pages).toHaveLength(3);expect(l.answers[l.correct]).toBeTruthy();expect(l.feedback.length).toBeGreaterThan(50);}
  });
});
describe('XP, desbloqueios e migração',()=>{
  it('a jornada inteira alcança dez níveis sem recompensas duplicadas',()=>{
    const p=freshProgress();expect(levelInfo(p).level).toBe(1);expect(finishPractice(p,'p12')).toBe(false);
    for(const l of lessons){expect(finishLesson(p,l.id)).toBe(true);expect(finishLesson(p,l.id)).toBe(false);}
    expect(xpFor(p)).toBe(280);expect(levelInfo(p).level).toBe(3);
    for(const task of practices.slice(0,9)){expect(finishPractice(p,task.id)).toBe(true);expect(finishPractice(p,task.id)).toBe(false);}
    expect(xpFor(p)).toBe(820);expect(finishPractice(p,'p10')).toBe(false);
    for(let i=0;i<3;i++)completeMission(p,i);
    expect(levelInfo(p).level).toBe(8);
    for(const task of practices.slice(9))expect(finishPractice(p,task.id)).toBe(true);
    completeMission(p,3);completeMission(p,4);
    expect(xpFor(p)).toBe(1820);expect(levelInfo(p).level).toBe(10);expect(levelInfo(p).ratio).toBeGreaterThan(0);expect(badges(p).every(b=>b.done)).toBe(true);
  });
  it('níveis de fronteira e requisitos das salas são coerentes',()=>{
    expect([99,100,219,220,519,520,1119,1120,1679,1680].map(levelFor)).toEqual([1,2,2,3,4,5,7,8,9,10]);
    expect(rooms.map(r=>r.level)).toEqual([1,3,5,8,1,1]);
  });
  it('migra save v1 preservando missões, contagens e preferências',()=>{
    const legacy={version:1,current:2,completed:[0,1],attempts:[2,1,0,0,0],hints:[1,0,0,0,0],settings:{volume:.6,muted:true,textSpeed:'instant',reducedMotion:true}};
    const p=parseSave(JSON.stringify(legacy))!;expect(p.version).toBe(3);expect(p.current).toBe(2);expect(p.attempts).toEqual(legacy.attempts);expect(p.settings).toEqual({...defaultSettings(),...legacy.settings});expect(levelInfo(p).xp).toBe(240);
  });
  it.each([
    {practiceCompleted:['p1','p1']},{lessonCompleted:['inexistente']},{practiceAttempts:{p99:1}},{practiceAttempts:{p1:-1}},{room:-1},{settings:{...defaultSettings(),moveSpeed:'teleporte'}},
  ])('rejeita novos dados inconsistentes %j',bad=>expect(parseSave(JSON.stringify({...freshProgress(),...bad}))).toBeNull());
  it('recupera para o estúdio se o save aponta para sala ainda bloqueada',()=>expect(parseSave(JSON.stringify({...freshProgress(),room:3}))?.room).toBe(0));
  it('preferências podem ser salvas antes de começar uma campanha',()=>{
    const data=new Map<string,string>();const store=new SaveStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);}});const settings={...defaultSettings(),highContrast:true,moveSpeed:'fast' as const};
    expect(store.saveSettings(settings)).toBe(true);expect(store.loadSettings()).toEqual(settings);expect(store.load()).toBeNull();
  });
});
