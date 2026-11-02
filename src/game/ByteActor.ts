import Phaser from 'phaser';
import { directionFor, type Direction } from './direction';
export type ByteMood='wave'|'think'|'success'|'error'|'type'|'examine'|'talk'|'sit';
export class ByteActor extends Phaser.GameObjects.Container {
 private art:Phaser.GameObjects.Graphics;private bubble:Phaser.GameObjects.Text;
 private mood:ByteMood|null=null;private until=0;private direction:Direction='down';private stride=0;
 constructor(scene:Phaser.Scene,x:number,y:number){
  super(scene,x,y);scene.add.existing(this);this.art=scene.add.graphics();this.add(this.art);
  this.bubble=scene.add.text(0,-80,'',{fontFamily:'monospace',fontSize:'10px',color:'#182936',backgroundColor:'#f0c684',padding:{x:6,y:4}}).setOrigin(.5);this.add(this.bubble);
 }
 react(mood:ByteMood){this.mood=mood;this.until=this.scene.time.now+(mood==='sit'?4000:1400);}
 face(dx:number,dy:number){this.direction=directionFor(dx,dy,this.direction);}
 animate(time:number,dx:number,dy:number,reduced:boolean,celebrate:boolean,distance=0){
  this.direction=directionFor(dx,dy,this.direction);this.stride+=distance/6;
  if(time>this.until)this.mood=null;
  const g=this.art;g.clear();const walking=distance>0,swing=walking?Math.round(Math.sin(this.stride)*5):0;
  const lift=this.mood==='success'&&celebrate&&!reduced?-Math.abs(Math.sin(time/130))*4:0;
  const bob=reduced?0:walking?Math.abs(Math.sin(this.stride))*1.5:Math.sin(time/950)*.5;
  const seated=this.mood==='sit'?7:0,eyeOffset=this.direction==='left'?-3:this.direction==='right'?3:0;
  const r=(x:number,y:number,w:number,h:number,c:number)=>g.fillStyle(c).fillRect(Math.round(x),Math.round(y+bob+lift+seated),w,h);
  g.fillStyle(0x071723,.4).fillEllipse(0,5,41,11);
  const leg=(x:number,step:number)=>{r(x,-16,7,12,0x1c3b6b);r(x,-8+step/2,8,4,0xb6bdad);r(x+1,-4+step/2,6,9-seated/2,0x477cc0);r(x-2,4+step-seated,13,5,0x101f3b);r(x-1,4+step-seated,10,3,0x739ac7);};
  const arm=(x:number,front:boolean)=>{
   const active=['type','examine'].includes(this.mood??''),raise=(this.mood==='wave'||this.mood==='success')&&front;
   const y=raise?-52:active?-35:-30+(front?swing:-swing)/2;
   r(x,y,7,raise?13:active?8:16,0x2b5794);r(x+(active?5:1),y+(raise?-4:active?5:12),8,7,0x9cb7c7);r(x+(active?9:2),y+(raise?-8:active?7:16),8,7,0xe0cda3);
   if(this.mood==='examine'&&front){g.lineStyle(2,0xefcb8e).strokeCircle(x+15,y+4+seated,6);}
  };
  {
   leg(-13,swing);leg(6,-swing);arm(-25,false);
   r(-22,-55,42,37,0x071a36);r(-18,-59,34,5,0x285eaa);r(18,-52,6,31,0x1c417b);r(-19,-53,37,33,0x3b72b7);
   if(this.direction==='up'){
    r(-16,-51,31,28,0x234e88);for(let i=0;i<4;i++)r(-11,-46+i*5,21,2,0x102a50);r(-5,-28,11,4,0x7598b9);r(11,-53,4,14,0x537bb1);
   }else{
    r(-17,-51,33,29,0xf5e4b6);r(-14,-48,27,23,0x112747);r(-12,-46,23,2,0x2b507a);r(-10,-43,4,3,0x97b3c7);
    const blink=time%6100>5860,thinking=this.mood==='think'||this.mood==='examine',happy=this.mood==='success';
    r(-10+eyeOffset,-35,8,blink?1:3,0xffc448);r(4+eyeOffset,-35+(thinking?2:0),8,blink?1:3,0xffc448);
    if(!blink){r(-7+eyeOffset,-32,4,2,0xd89928);r(6+eyeOffset,-32+(thinking?2:0),4,2,0xd89928);}
    r(-2,-27,happy?8:5,2,0xffc448);if(happy)r(-3,-29,2,3,0xffc448);
    r(10,-56,11,14,0x102342);r(9,-57,11,13,0xf3bd48);for(let i=0;i<3;i++)r(11,-53+i*3,6-i,1,0x6c591e);
   }
   r(-22,-22,45,10,0x17366b);r(-17,-21,32,5,0x6592c5);r(-14,-19,11,2,0x1b3868);r(15,-20,3,4,0xffc34b);arm(18,true);
  }
  const phrases:Record<ByteMood,string>={wave:'Oi! >_',think:'vamos conferir…',success:'funcionou!',error:'onde divergiu?',type:'tec tec',examine:'uma pista…',talk:'estou ouvindo',sit:'uma pausa'};
  this.bubble.setText(this.mood?phrases[this.mood]:'').setVisible(!!this.mood);
  this.setData('direction',this.direction);this.setData('walking',walking);
 }
}
