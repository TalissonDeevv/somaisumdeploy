import type { Progress } from '../core/types';
import { activities } from './content';
import type { V3State, WorldEvent, Bindings, ActivityId } from './types';
export const defaultBindings=():Bindings=>({up:'w',down:'s',left:'a',right:'d',interact:'e',map:'m',profile:'p',lab:'l',notebook:'j',wave:'b',pause:'escape'});
export const freshV3=(legacy=false):V3State=>({mode:'story',opening:legacy?'skipped':'new',facts:[],hypotheses:[],history:[],activityCompleted:[],concepts:[],optional:[],best:{},results:{},invites:[],dialogueNode:'greeting',dialoguePaused:false,decor:{plant:'left',lamp:true,certificate:true,souvenir:true,gift:true}});
export function validBindings(value:unknown):value is Bindings{
 if(!value||typeof value!=='object')return false;
 const keys=Object.keys(defaultBindings()),map=value as Record<string,unknown>;
 return Object.keys(map).length===keys.length&&keys.every(k=>typeof map[k]==='string'&&/^(?:[a-z0-9]|escape|space)$/.test(map[k] as string))&&new Set(Object.values(map)).size===keys.length;
}
export function emit(p:Progress,event:WorldEvent):boolean{
 const s=p.v3;
 if(event.type==='fact'){if(s.facts.includes(event.fact))return false;
  const required:Partial<Record<typeof event.fact,string[]>>={observed:['met','rule'],hypothesis:['observed','log','note'],corrected:['hypothesis'],presented:['corrected'],explained:['presented'],finished:['explained']};
  if(!(required[event.fact]??[]).every(f=>s.facts.includes(f as typeof event.fact)))return false;s.facts.push(event.fact);return true;
 }
 if(event.type==='hypothesis'){if(!s.hypotheses.includes(event.value))s.hypotheses.push(event.value);return true;}
 if(event.type==='concept'){if(s.concepts.includes(event.concept))return false;s.concepts.push(event.concept);return true;}
 if(event.type==='opening'){if(s.opening!=='new')return false;s.opening='done';return true;}
 const first=!s.activityCompleted.includes(event.id);if(first)s.activityCompleted.push(event.id);
 const old=s.best[event.id];if(!old||event.instructions<old.instructions)s.best[event.id]={instructions:event.instructions,runs:event.runs};
 for(const item of event.optional)if(!s.optional.includes(item))s.optional.push(item);
 return first;
}
export function expansionXP(p:Progress){
 return p.v3.activityCompleted.reduce((sum,id)=>sum+(activities.find(a=>a.id===id)?.xp??0),0)+p.v3.concepts.length*35+(p.v3.opening==='done'?40:0)+(p.v3.facts.includes('finished')?220:0);
}
export function activityRequirement(p:Progress,id:ActivityId){
 const task=activities.find(a=>a.id===id)!;
 const missing=task.concepts.filter(c=>!p.v3.concepts.includes(c));
 if(missing.length)return 'Revise: '+missing.join(', ');
 if(id==='circuit'&&p.current<2&&!p.lessonCompleted.includes('l3'))return 'Demonstre condições na missão 2 ou na lição “E, OU e parênteses”.';
 return '';
}
export function chapterObjective(p:Progress){
 const f=p.v3.facts;
 if(!f.includes('met'))return 'Visite a demonstração da feira e converse com Talisson.';
 if(!f.includes('rule'))return 'Pergunte a Talisson qual é o resultado esperado.';
 if(!f.includes('observed'))return 'Observe a demonstração até o último evento.';
 if(!f.includes('log')||!f.includes('note'))return 'Examine o terminal de registros e o bilhete do buffer na demonstração.';
 if(!f.includes('hypothesis'))return 'Investigue o rastro e construa um teste que revele a falha.';
 if(!f.includes('corrected'))return 'Corrija a função salvarInscrição na bancada de dados.';
 if(!f.includes('presented'))return 'Peça a Talisson para apresentar a demonstração corrigida.';
 if(!f.includes('explained'))return 'Explique a Talisson por que a correção protege reenvios.';
 return f.includes('finished')?'Capítulo concluído. A demonstração preserva os registros.':'Converse com Talisson para encerrar a apresentação.';
}
