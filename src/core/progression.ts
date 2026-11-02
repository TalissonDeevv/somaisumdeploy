import type { Progress } from './types';
import { practices, lessons } from './academy';
import { expansionXP } from '../v3/events';
export const campaignXP = [100,140,160,180,240];
export const thresholds = [0,100,220,360,520,700,900,1120,1380,1680,2150,2600];
export const ranks = ['Aprendiz de bits','Curioso do código','Montador de ideias','Explorador de lógica','Caça-bugs','Dev de soluções','Arquiteto de fluxos','Mestre dos testes','Guardião do deploy','Lenda do Byte','Investigador de sistemas','Construtor de possibilidades'];
export const rooms = [
  { id:0,level:1,name:'Estúdio do Byte',label:'01 / O começo',description:'Seu primeiro projeto, café e desafios de sequência.',accent:'#eabd77' },
  { id:1,level:3,name:'Oficina de protótipos',label:'02 / Ideias em blocos',description:'Bancadas, peças e experimentos de lógica booleana.',accent:'#87ccc7' },
  { id:2,level:5,name:'Sala dos servidores',label:'03 / Entre os racks',description:'Monitore execuções e domine laços e limites.',accent:'#96b7ef' },
  { id:3,level:8,name:'Terraço de projetos',label:'04 / Novos horizontes',description:'Um espaço aberto para investigar dados e celebrar entregas.',accent:'#c4b5e5' },
  { id:4,level:1,name:'Feira Conecta',label:'05 / A cidade participa',description:'Robô de entregas, catraca e participantes: seu código em funcionamento.',accent:'#e3bc78' },
  { id:5,level:1,name:'Demonstração de Talisson',label:'06 / O bug da apresentação',description:'Converse, investigue o buffer e corrija a causa dos reenvios.',accent:'#8bc8cf' },
];
export function xpFor(p: Progress) { return p.completed.reduce((sum,id) => sum + campaignXP[id],0) + p.practiceCompleted.reduce((sum,id) => sum + (practices.find(t => t.id === id)?.xp ?? 0),0) + p.lessonCompleted.length * 35+expansionXP(p); }
export function levelFor(xp: number) { let level = 1; thresholds.forEach((v,i) => { if (xp >= v) level = i+1; }); return level; }
export function levelInfo(p: Progress) { const xp = xpFor(p), level = levelFor(xp), base = thresholds[level-1], next = thresholds[level]; return { xp,level,base,next,rank:ranks[level-1],ratio:next ? (xp-base)/(next-base) : 1 }; }
export function finishPractice(p: Progress, id: string) { const task = practices.find(t => t.id === id); if (!task || rooms[task.room].level > levelInfo(p).level || p.practiceCompleted.includes(id)) return false; p.practiceCompleted.push(id); return true; }
export function finishLesson(p: Progress, id: string) { if (!lessons.some(l => l.id === id) || p.lessonCompleted.includes(id)) return false; p.lessonCompleted.push(id); return true; }
export function badges(p: Progress) { return [
  {name:'Primeiro conserto',description:'Concluir a primeira missão',done:p.current>=1},
  {name:'Caderno completo',description:'Concluir as oito lições',done:p.lessonCompleted.length===8},
  {name:'Mão na massa',description:'Resolver quatro exercícios extras',done:p.practiceCompleted.length>=4},
  {name:'Feira no ar',description:'Entregar a campanha',done:p.current===5},
  {name:'Todos os caminhos',description:'Desbloquear as quatro salas',done:levelInfo(p).level>=8},
  {name:'Laboratório completo',description:'Resolver os doze exercícios',done:p.practiceCompleted.length===12},
]; }
