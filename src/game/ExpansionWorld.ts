import Phaser from 'phaser';
import { raisedArm, restingArm, withoutRightArm, type CharacterId, type Pixel } from './CharacterPixels';
import type { Progress } from '../core/types';
import type { ActivityId, SimFrame } from '../v3/types';
export interface VenuePoint{id:string;name:string;x:number;y:number}
export function drawVenue(scene:Phaser.Scene,layer:Phaser.GameObjects.Container,room:number,p:Progress){
 const g=scene.add.graphics();layer.add(g);const r=(x:number,y:number,w:number,h:number,color:number,a=1)=>g.fillStyle(color,a).fillRect(x,y,w,h);
 const text=(x:number,y:number,s:string,color='#c7d5d2',size=9)=>layer.add(scene.add.text(x,y,s,{fontFamily:'monospace',fontSize:size+'px',color}));
 const demo=room===5,ready=p.v3.facts.includes('finished'),fixedOrders=p.v3.activityCompleted.includes('orders'),fixedBudget=p.v3.activityCompleted.includes('budget');
 r(0,0,960,540,0x101c2a);r(102,94,742,396,0x07111e);r(108,99,730,100,demo?0x203c50:0x2a3f57);r(108,199,730,279,0x3d4f5c);
 for(let x=110;x<836;x+=30)r(x,199,1,279,0x50616b,.45);for(let y=199;y<476;y+=30)r(108,y,730,1,0x50616b,.45);
 r(108,476,730,9,0x182c3b);r(108,94,730,5,0x8bafb4);r(108,192,730,7,0x152a3a);
 r(755,429,83,46,0x7f9fa2);r(758,432,77,40,0x4e727e);for(let i=0;i<4;i++)r(765+i*16,454-i*3,10,3,0xc3cdb7);
 text(740,404,'SAIDA / MAPA','#e4c080',9);
 r(298,116,390,47,0x112838);text(320,129,demo?'DEMONSTRACAO / EVENTOS EM SEQUENCIA':'FEIRA CONECTA / IDEIAS EM MOVIMENTO','#eec98d',12);
 text(348,150,demo?(ready?'APRESENTACAO CONCLUIDA':'PREPARACAO / INVESTIGACAO'):(p.current===5?'PORTAS ABERTAS':'PREPARANDO OS ESTANDES'),'#9ec5d0',8);
 const desk=(x:number,y:number,w:number)=>{r(x+4,y+6,w,38,0x132939);r(x,y,w,31,0x9d825e);r(x+5,y+4,w-10,20,0xc19b6b);};
 if(demo){
  desk(150,215,145);r(183,178,70,43,0x102840);r(187,182,62,31,0x34667a);text(192,188,'REGISTROS','#d6dfcd',8);
  desk(395,215,170);r(443,178,74,43,0x112b40);r(447,182,66,31,ready?0x558d85:0x775c60);text(451,188,ready?'IDs OK':'DEMO','#f5d39b',9);
  r(144,370,124,55,0x1d3447);r(150,376,112,43,0x876f59);r(168,383,75,26,0xe8d5ab);text(174,389,'BUFFER','#3e5356',9);
  r(350,416,290,9,0x769ca3);text(362,432,'CIRCULACAO LIVRE / SEM DEGRAUS','#b3c8cd',8);
 }else{
  desk(150,214,140);text(166,228,'ROBO DE SERVICO','#1d3546',9);
  desk(590,215,150);text(605,229,'PAINEL DE VAGAS','#1d3546',9);
  r(340,231,85,18,0x203e51);r(343,249,12,55,0x789ca9);r(409,249,12,55,0x789ca9);
  const open=p.current>=2||p.v3.activityCompleted.includes('circuit');r(355,260,53,7,open?0x84b6a2:0xd59a67);text(337,312,open?'ACESSO VALIDADO':'CATRACA EM TESTE',open?'#b5dbc5':'#f3c58f',8);
  // Food court kiosk (Luiz) and project board (Indo Ali).
  r(146,340,128,46,0x132939);r(150,336,120,42,0x7a6248);r(154,340,112,14,0xe3b46c);text(158,342,'PRACA DE ALIMENTACAO','#3a2a1e',7);
  r(186,358,48,18,0x102840);r(189,361,42,12,fixedOrders?0x558d85:0x775c60);text(192,362,fixedOrders?'R$ OK':'R$ ???','#f5d39b',8);
  r(612,322,112,50,0x132939);r(616,318,104,46,0x8b7c9c);r(620,322,96,38,0x243b4d);text(626,326,'PAINEL DO PROJETO','#e7d3a5',7);
  for(let i=0;i<4;i++){r(626+i*22,338,18,16,fixedBudget?0x6fa58c:i===1?0xc68c61:0x5b7f90);}
  const queue=p.current>=3||p.v3.activityCompleted.includes('debug');text(597,180,queue?'SENHAS: 1 2 3 4 5':'SENHAS: 1 1 1 ...','#cfdfd3',9);
  text(380,462,'Noa e a equipe ficticia preparam os estandes.','#a2bdc7',8);
 }
 return {
  objects:demo?[
   {id:'talisson',name:'Talisson Souza · conversar',x:655,y:355},
   {id:'registrations',name:'Terminal · consultar registros',x:222,y:274},
   {id:'buffer-note',name:'Bilhete do buffer · examinar',x:270,y:395},
   {id:'data-bench',name:'Bancada · salvarInscrição',x:480,y:274},
   {id:'door',name:'Saída acessível · mapa',x:782,y:441},
  ]:[
   {id:'service',name:'Robô de serviço · programar percurso',x:220,y:281},
   {id:'gate',name:'Catraca · ligar componentes',x:380,y:330},
   {id:'vacancies',name:'Painel · depurar vagas',x:660,y:280},
   {id:'demo-door',name:'Demonstração de Talisson →',x:785,y:255},
   {id:'npc-noa',name:'Noa · equipe da feira',x:450,y:440},
   {id:'npc-luiz',name:'Luiz Dela · Mas a IA disse que estava pronto',x:310,y:400},
   {id:'orders-terminal',name:'Terminal de pedidos · testar',x:210,y:398},
   {id:'npc-indo',name:'Indo Ali · É só uma telinha',x:590,y:395},
   {id:'budget-board',name:'Painel do projeto · orçamento',x:668,y:392},
   {id:'door',name:'Saída acessível · mapa',x:782,y:441},
  ],
  obstacles:demo?[new Phaser.Geom.Rectangle(150,215,145,34),new Phaser.Geom.Rectangle(395,215,170,34),new Phaser.Geom.Rectangle(144,370,105,55)]:[new Phaser.Geom.Rectangle(150,214,140,35),new Phaser.Geom.Rectangle(590,215,150,35),new Phaser.Geom.Rectangle(340,231,85,55),new Phaser.Geom.Rectangle(150,336,120,44),new Phaser.Geom.Rectangle(616,318,104,50)]
 };
}
const U=3,toX=(col:number)=>(col-8)*U,toY=(row:number)=>row*U-79;
const hex=(color:string)=>Phaser.Display.Color.HexStringToColor(color).color;
export class NpcActor extends Phaser.GameObjects.Container{
 private art:Phaser.GameObjects.Graphics;private arm:Phaser.GameObjects.Graphics;
 private bubble:Phaser.GameObjects.Container;private bubbleBack:Phaser.GameObjects.Graphics;private bubbleText:Phaser.GameObjects.Text;
 private happy:boolean|null=null;private armPose='';private shown='';private attentionUntil=0;
 constructor(scene:Phaser.Scene,readonly id:CharacterId,x:number,y:number){
  super(scene,x,y);scene.add.existing(this);this.art=scene.add.graphics();this.arm=scene.add.graphics();
  this.bubbleBack=scene.add.graphics();this.bubbleText=scene.add.text(0,0,'',{fontFamily:'monospace',fontSize:'10px',fontStyle:'bold',color:'#1a3040',align:'center'}).setOrigin(.5,1);
  this.bubble=scene.add.container(0,-86,[this.bubbleBack,this.bubbleText]).setVisible(false);
  const shadow=scene.add.graphics();shadow.fillStyle(0x071723,.4).fillEllipse(0,8,44,10);
  this.add([shadow,this.art,this.arm,this.bubble]);this.setDepth(y);
 }
 private paint(g:Phaser.GameObjects.Graphics,pixels:Pixel[]){g.clear();for(const p of pixels)g.fillStyle(hex(p.color)).fillRect(toX(p.x),toY(p.y),U,U);}
 attention(time:number){this.attentionUntil=time+1200;}
 private showBubble(text:string){
  if(text===this.shown)return;this.shown=text;this.bubbleText.setText(text);
  const w=Math.ceil(this.bubbleText.width)+16,h=Math.ceil(this.bubbleText.height)+10,g=this.bubbleBack;
  g.clear().fillStyle(0x1a3040).fillRect(-w/2-2,-h-2,w+4,h+4).fillStyle(0xedce96).fillRect(-w/2,-h,w,h);
  g.fillStyle(0x1a3040).fillRect(-5,2,10,3).fillRect(-3,5,6,3).fillRect(-1,8,2,2).fillStyle(0xedce96).fillRect(-3,0,6,3).fillRect(-1,3,2,3);
  this.bubbleText.setY(-5);
 }
 updatePose(time:number,reduced:boolean,happy:boolean,call:string|null){
  if(happy!==this.happy){this.happy=happy;this.paint(this.art,withoutRightArm(this.id,happy));this.armPose='';}
  const excited=time<this.attentionUntil,text=call??(excited?'BYTE! Aqui!':null),waving=!!text;
  const frame=waving?(reduced?'up':Math.floor(time/260)%2?'up':'low'):'rest';
  if(frame!==this.armPose){this.armPose=frame;this.paint(this.arm,frame==='rest'?restingArm(this.id):raisedArm(this.id));this.arm.setData('low',frame==='low');}
  const hop=excited&&!reduced?-Math.round(Math.abs(Math.sin(time/110))*7):0,idle=reduced?0:Math.round(Math.sin(time/1200)*.6);
  this.art.y=idle+hop;this.arm.y=idle+hop+(frame==='low'?U:0);
  this.bubble.setVisible(!!text);
  if(text){this.showBubble('! '+text);this.bubble.y=-86+hop+(reduced?0:Math.round(Math.sin(time/240)*2));}
 }
}
export class WorldSimulation extends Phaser.GameObjects.Container{
 private art:Phaser.GameObjects.Graphics;private labels:Phaser.GameObjects.Container;
 constructor(scene:Phaser.Scene){super(scene,0,0);scene.add.existing(this);this.art=scene.add.graphics();this.labels=scene.add.container();this.add([this.art,this.labels]);this.setDepth(800).setVisible(false);}
 show(id:ActivityId|null,frame:SimFrame|null){
  this.setVisible(!!frame);this.art.clear();this.labels.removeAll(true);if(!frame)return;
  const g=this.art,r=(x:number,y:number,w:number,h:number,c:number)=>g.fillStyle(c).fillRect(x,y,w,h),text=(x:number,y:number,s:string,color='#dde6dc',size=10)=>this.labels.add(this.scene.add.text(x,y,s,{fontFamily:'monospace',fontSize:size+'px',color}));
  r(293,144,376,266,0x0c2232);g.lineStyle(2,0x83b9c3).strokeRect(293,144,376,266);text(308,158,'EXECUCAO REAL / '+id?.toUpperCase(),'#e9c183',11);
  if(id==='route'){
   for(let y=0;y<5;y++)for(let x=0;x<7;x++){const px=313+x*46,py=187+y*35;r(px,py,43,32,(x===1||x===4)&&y===3?0x85654f:0x2b4859);if((x===0||x===3)&&y===4)text(px+15,py+7,'KIT','#e9c183',8);if((x===2||x===5)&&y===2)text(px+17,py+7,'◎','#b5d7b3',10);}
   if(frame.point){r(322+frame.point.x*46,194+frame.point.y*35,23,20,0x80b7cd);r(327+frame.point.x*46,198+frame.point.y*35,13,8,0x172e4c);if(frame.point.carrying)r(336+frame.point.x*46,209+frame.point.y*35,9,7,0xf1c578);}
  }else if(frame.counter||frame.budget){
   text(313,186,id==='orders'?'BALCAO':'COMBINACOES DO ORCAMENTO','#a3c7ce');
   const lines=frame.counter?frame.counter.map(o=>'Pedido '+o.id+' · '+o.itens+' · '+o.total):(frame.budget??[]).map(b=>b.cenario+' · '+(b.esperado===b.obtido?'ok':'diferente')+' · R$ '+b.obtido);
   lines.slice(0,6).forEach((line,i)=>{r(313,206+i*24,335,21,0x2b4c59);text(320,211+i*24,line,'#e2e3cd',9);});
   text(313,366,'Total: '+String(frame.vars.total??'n/a'),'#e7c18c',10);
  }else if(frame.records){
   text(313,188,'BANCO LOCAL / '+frame.records.length+' REGISTROS','#a3c7ce');
   frame.records.slice(0,6).forEach((p,i)=>{r(313,210+i*25,335,22,frame.records!.filter(r=>r.id===p.id).length>1?0x66483f:0x2b4c59);text(320,215+i*25,p.id+' · '+p.name+' · '+p.email,'#e2e3cd',9);});
   text(313,376,'Cache: '+String(frame.vars.cache??'n/a'),'#e7c18c',9);
  }else{
   r(377,217,20,120,0x7a9bab);r(568,217,20,120,0x7a9bab);r(397,235,171,12,frame.gate?0x7db394:0xc68c61);
   text(418,273,frame.gate?'LIBERADO →':'BLOQUEADO','#eed6ab',13);
   Object.entries(frame.vars).slice(0,4).forEach(([k,v],i)=>text(315,321+i*17,k+': '+v,'#c7d9d7',10));
  }
  text(308,390,frame.failure?'! DIVERGENCIA OBSERVADA':'Estado calculado pelo interpretador',frame.failure?'#efba9b':'#a9cbbf',8);
 }
}
