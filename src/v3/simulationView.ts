import { escapeHTML as e } from './ui';
import type { ActivityProgram, SimFrame, NodeId } from './types';
const positions:Record<NodeId,[number,number]>={ticket:[55,45],paid:[55,120],team:[55,205],and:[220,80],or:[350,155],gate:[475,155]};
export const sensorNames=(variant:number)=>variant===1?['agendado','prioritário','documento']:['ingresso','pago','equipe'];
export function simulationView(program:ActivityProgram,frame:SimFrame,variant=0):string{
 const vars='<div class="sim-vars">'+Object.entries(frame.vars).map(([key,value])=>'<div><small>'+e(key)+'</small><b>'+e(value)+'</b></div>').join('')+'</div>';
 let visual='';
 if(program.kind==='route'){
  const targetY=variant===1?1:2;
  visual='<div class="route-grid" role="img" aria-label="Grade do robô: '+e(frame.label)+'">'+Array.from({length:35},(_,index)=>{
   const x=index%7,y=Math.floor(index/7),robot=frame.point?.x===x&&frame.point.y===y,target=(x===2||x===5)&&y===targetY;
   const delivered=target&&frame.visited?.includes(x===2?'0':'1'),pickup=(x===0||x===3)&&y===4;
   return '<div class="'+((x===1||x===4)&&y===3?'blocked ':target?'destination ':'')+(robot?'robot-cell':'')+'"><small>'+x+','+y+'</small><span>'+ (robot?(frame.point?.carrying?'▣':'▰'):delivered?'✓':target?'◎':pickup?'▣':(x===1||x===4)&&y===3?'▦':'·')+'</span></div>';
  }).join('')+'</div><p class="micro">▣ coleta · ◎ destino · ▦ caixa. '+(frame.point?'Robô em ('+frame.point.x+','+frame.point.y+').':'')+'</p>';
 }else if(program.kind==='circuit'){
  visual='<svg class="circuit-view" viewBox="0 0 540 255" role="img" aria-label="Sensores conectados à catraca">'+program.edges.map(([a,b])=>{const s=positions[a],t=positions[b];return '<path d="M'+(s[0]+35)+' '+s[1]+' C'+(s[0]+90)+' '+s[1]+','+(t[0]-70)+' '+t[1]+','+(t[0]-35)+' '+t[1]+'" stroke="#88bcca" fill="none" stroke-width="3"/>';}).join('')+Object.entries(positions).map(([node,[x,y]])=>{const index=['ticket','paid','team'].indexOf(node);const text=index>=0?sensorNames(variant)[index]:node==='and'?'E':node==='or'?'OU':'CATRACA';const on=node==='gate'?frame.gate:index>=0?frame.inputs?.[index]:false;return '<g><rect x="'+(x-35)+'" y="'+(y-20)+'" width="80" height="40" rx="5" fill="'+(on?'#bad3ab':'#213f52')+'" stroke="#c2d0cb"/><text x="'+(x+5)+'" y="'+(y+4)+'" text-anchor="middle" fill="'+(on?'#132d3e':'#e9e9d8')+'" font-size="12">'+text+'</text></g>';}).join('')+'</svg>';
 }else if(program.kind==='orders'){
  const convert={ai:'Number(preco) || 0',strip:'Number(preco.replace(",", ""))',decimal:'Number(preco.replace(",", "."))'}[program.conversion];
  const lines=['1 · ao clicar: total ← total + '+convert,program.listeners===2?'2 · segundo ouvinte: faz tudo de novo':'2 · (um único ouvinte no botão)','3 · pagar: envia total ao balcão',program.reset?'4 · nova compra: total ← 0; itens ← vazio':'4 · nova compra: (nada muda)'];
  visual='<div class="debug-code">'+lines.map((line,i)=>'<div class="'+(frame.line===i+1?'executing':'')+'">'+e(line)+'</div>').join('')+'</div><div class="counter-view"><strong>BALCÃO</strong>'+(frame.counter?.length?frame.counter.map(o=>'<div><span>Pedido '+o.id+' · '+e(o.itens)+'</span><b>'+e(o.total)+'</b></div>').join(''):'<p class="micro">Nenhum pedido chegou ainda.</p>')+'</div>';
 }else if(program.kind==='budget'){
  const fmt=(n:number)=>'R$ '+n.toFixed(2).replace('.',',');
  const lines=['1 · base ← telas × horas × valor',' 2 · se prototipo: soma 8 h'+(program.protoCount===2?' (e soma de novo)':''),'3 · se '+program.desktopCond+': soma telas × 2 h'];
  visual='<div class="debug-code">'+lines.map((line,i)=>'<div class="'+(frame.line===i+1?'executing':'')+'">'+e(line.trim())+'</div>').join('')+'</div><table class="budget-table"><thead><tr><th>Combinação</th><th>Esperado</th><th>Obtido</th></tr></thead><tbody>'+(frame.budget??[]).map(r=>'<tr class="'+(r.esperado===r.obtido?'ok':'off')+'"><td>'+e(r.cenario)+'</td><td>'+fmt(r.esperado)+'</td><td>'+(r.esperado===r.obtido?'✓ ':'≠ ')+fmt(r.obtido)+'</td></tr>').join('')+'</tbody></table>'+(frame.breakdown?'<div class="counter-view"><strong>PAINEL DO PROJETO</strong>'+frame.breakdown.map(([k,v])=>'<div><span>'+e(k)+'</span><b>'+e(v)+'</b></div>').join('')+'</div>':'');
 }else if(program.kind==='debug'){
  const lines=['1 · vagas ← '+program.capacity,'2 · se vagas '+program.comparison+' 0:','3 · aprovar; vagas ← vagas + ('+program.change+')','4 · senão: bloquear'];
  visual='<div class="debug-code">'+lines.map((line,i)=>'<div class="'+(frame.line===i+1?'executing':'')+'">'+e(line)+'</div>').join('')+'</div><div class="virtual-gate '+(frame.gate?'gate-open':'')+'"><span>'+(frame.gate?'→ ENTRADA LIBERADA':'▥ ENTRADA BLOQUEADA')+'</span></div>';
 }else{
  visual='<div class="event-rail"><span>TABLET</span><b>→</b><span>salvarInscrição()</span><b>→</b><span>BANCO LOCAL</span><b>←</b><span>QUIOSQUE</span></div><div class="records-view">'+(frame.records?.length?frame.records.map((r,i)=>'<div class="'+(frame.records!.filter(x=>x.id===r.id).length>1?'duplicate':'')+'"><b>'+e(r.id)+'</b><span>'+e(r.name)+'</span><small>'+e(r.email)+'</small><i>#'+(i+1)+'</i></div>').join(''):'<p>Lista vazia. Aguarde um evento de inscrição.</p>')+'</div>';
 }
 return '<div class="sim-scene '+(frame.failure?'sim-divergence':'')+'">'+visual+'</div>'+vars+'<p class="sim-caption" role="status">'+e(frame.label)+'</p>'+(frame.output.length?'<p class="micro">'+frame.output.map(e).join(' · ')+'</p>':'');
}
