import Phaser from 'phaser';
import { ByteActor, type ByteMood } from './ByteActor';
import { drawVenue, TalissonActor, WorldSimulation } from './ExpansionWorld';
import type { Progress } from '../core/types';
import type { ActivityId, SimFrame, Bindings } from '../v3/types';
export type ObjectId = string;
interface OfficeObject { id: ObjectId; name: string; x: number; y: number }
export interface OfficeBridge {
  blocked: () => boolean; reducedMotion: () => boolean; completed: () => number;
  interact: (id: ObjectId) => void; nearby: (label: string) => void;
  speed: () => number; labels: () => boolean; celebrations: () => boolean;
  progress:()=>Progress;bindings:()=>Bindings;menu:()=>boolean;cue:(name:string)=>void;
  npcAway:()=>void;
}
export class OfficeScene extends Phaser.Scene {
  private keys = new Set<string>();
  private player!: ByteActor;
  private marker!: Phaser.GameObjects.Text;
  private decor!: Phaser.GameObjects.Container;
  private upgrades = -1;
  private lastLabel = '';
  private roomLayer!: Phaser.GameObjects.Container;
  private room = 0;
  private talisson?:TalissonActor;private simulation?:WorldSimulation;private live?:Phaser.GameObjects.Graphics;
  private occluders:Phaser.GameObjects.Graphics[]=[];private homeMode=false;private stepDistance=0;private lastIdle=-1;
  private conversationLatch=false;
  private objects: OfficeObject[] = [
    { id: 'computer', name: 'Computador · mensagens e projeto', x: 477, y: 298 },
    { id: 'board', name: 'Quadro · tarefas e revisitas', x: 737, y: 244 },
    { id: 'shelf', name: 'Estante · caderno da Lia', x: 198, y: 249 },
    { id: 'plant', name: 'Planta · uma pausa', x: 786, y: 413 },
    { id: 'window', name: 'Janela · lá fora', x: 342, y: 232 },
    { id: 'door', name: 'Elevador · mapa de salas', x: 796, y: 286 },
    { id: 'lab', name: 'Bancada · laboratório de desafios', x: 679, y: 418 },
  ];
  private obstacles = [new Phaser.Geom.Rectangle(379, 222, 214, 70), new Phaser.Geom.Rectangle(148, 188, 105, 52), new Phaser.Geom.Rectangle(148, 352, 150, 76), new Phaser.Geom.Rectangle(767, 365, 45, 40), new Phaser.Geom.Rectangle(646, 361, 62, 29)];
  private baseObjects=this.objects.map(o=>({...o}));
  private baseObstacles=this.obstacles.map(r=>Phaser.Geom.Rectangle.Clone(r));
  constructor(private bridge: OfficeBridge) { super('Office'); }
  resetPosition() { if (this.player) this.player.setPosition(480, 355); this.keys.clear(); this.lastLabel = ''; }
  react(mood: ByteMood) { this.player?.react(mood); }
  showSimulation(id:ActivityId|null,frame:SimFrame|null){this.simulation?.show(id,frame);}
  invalidate(){if(!this.player){return;}const {x,y}=this.player,latch=this.conversationLatch;this.switchRoom(this.room);this.player.setPosition(x,y);this.conversationLatch=latch;}
  home(active:boolean){this.homeMode=active;if(!this.player)return;this.cameras.main.setScroll(active?-120:0,0);if(active){this.switchRoom(0);this.player.setPosition(520,338);this.player.face(0,-1);}else this.resetPosition();}
  private interactWith(near:OfficeObject){
    this.player.face(near.x-this.player.x,near.y-this.player.y);
    this.react(near.id==='talisson'?'talk':near.id==='computer'?'type':near.id==='seat'?'sit':'examine');this.bridge.cue(near.id==='door'?'elevator':'interact');this.bridge.interact(near.id);
  }
  celebrate() {
    if(!this.player||this.bridge.reducedMotion()||!this.bridge.celebrations())return;
    for(let i=0;i<14;i++){
      const dot=this.add.rectangle(this.player.x,this.player.y-30,3+i%2,3+i%2,i%2?0xefbd77:0x86c8d2).setDepth(600);
      this.tweens.add({targets:dot,x:this.player.x+Math.cos(i*2.4)*(35+i*3),y:this.player.y-25+Math.sin(i*2.4)*(30+i*2),alpha:0,duration:800+i*25,ease:'Cubic.Out',onComplete:()=>dot.destroy()});
    }
  }
  switchRoom(id: number) {
    this.room=id; if(!this.roomLayer)return;
    this.talisson?.destroy();this.talisson=undefined;this.occluders.forEach(r=>r.destroy());this.occluders=[];
    this.conversationLatch=false;
    this.objects=this.baseObjects.map(o=>({...o}));this.obstacles=this.baseObstacles.map(r=>Phaser.Geom.Rectangle.Clone(r));
    if(id<4){this.objects.push({id:'seat',name:'Sofá · sentar e respirar',x:320,y:405},{id:'notice',name:'Bilhete de Rafa · examinar',x:182,y:297});}
    if(id===0)this.objects.push({id:'talisson',name:'Talisson · conversar sobre a feira',x:650,y:330});
    this.roomLayer.removeAll(true);this.drawRoom();this.resetPosition();this.upgrades=-1;
    const shelf=this.objects.find(o=>o.id==='shelf');if(shelf)shelf.name='Estante · lições da Lia';
    if(id===0)this.objects.find(o=>o.id==='window')!.name='Janela · lá fora';
    if(id===0||id===5)this.talisson=new TalissonActor(this,id===0?650:655,id===0?330:355);
    // Native front edges share world coordinates. Capturing the whole room into
    // render textures here duplicated furniture when the menu camera moved.
    const fronts=id===0?[[378,269,210,7,280,0x795d49],[150,228,93,8,238,0x765d4f],[153,410,132,7,418,0x496776]]:
      id<4?[[378,270,210,7,281,0x385565]]:
      id===5?[[150,240,145,6,250,0x9d825e],[395,240,170,6,250,0x9d825e]]:
      [[150,240,140,6,250,0x9d825e],[590,240,150,6,250,0x9d825e]];
    for(const [x,y,w,h,depth,color]of fronts){const front=this.add.graphics().setDepth(depth);front.fillStyle(color).fillRect(x,y,w,h);this.occluders.push(front);}
    if(!this.bridge.reducedMotion())this.cameras.main.fadeIn(140,16,25,35);
  }
  preload() { this.load.image('hero', './assets/personagem.png'); }
  create() {
    this.roomLayer=this.add.container();this.drawRoom(); this.decor = this.add.container();
    this.player = new ByteActor(this,480,355);
    this.live=this.add.graphics().setDepth(281);this.simulation=new WorldSimulation(this);
    this.marker = this.add.text(477, 205, 'E', { fontFamily: 'monospace', fontSize: '15px', color: '#152332', backgroundColor: '#efba70', padding: { x: 7, y: 5 } }).setOrigin(0.5).setDepth(100);
    const down = (e: KeyboardEvent) => {
      if (this.bridge.blocked()) { this.keys.clear(); return; }
      const key = e.key.toLowerCase();
      const bindings=this.bridge.bindings(),normalized=key===' '?'space':key;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ...Object.values(bindings)].includes(normalized)) { e.preventDefault(); this.keys.add(normalized); }
      if (normalized === bindings.interact && !e.repeat) { const near = this.nearest(); if (near)this.interactWith(near); }
    };
    const up = (e: KeyboardEvent) => this.keys.delete(e.key===' '?'space':e.key.toLowerCase());
    const clear = () => this.keys.clear();
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', clear);
    this.events.once('shutdown', () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear); });
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.bridge.blocked()) return;
      const near = this.nearest(); if (near && Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, near.x, near.y) < 80)this.interactWith(near);
    });
    this.switchRoom(this.room);if(this.bridge.menu())this.home(true);
  }
  private rect(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, c: number, a = 1) { g.fillStyle(c, a).fillRect(x, y, w, h); }
  private drawRoom() {
    if(this.room>=4){const venue=drawVenue(this,this.roomLayer,this.room,this.bridge.progress());this.objects=venue.objects;this.obstacles=venue.obstacles;return;}
    if(this.room!==0){this.drawSpecialRoom();return;}
    const g = this.add.graphics(); const r = (x: number, y: number, w: number, h: number, c: number, a = 1) => this.rect(g, x, y, w, h, c, a);
    this.roomLayer.add(g);
    // Everything in the room is original procedural artwork, aligned to a small pixel grid.
    r(0, 0, 960, 540, 0x101923);
    for (let x = 0; x < 960; x += 24) for (let y = 0; y < 540; y += 24) r(x, y, 1, 1, 0x253543, 0.4);
    r(112, 110, 744, 396, 0x080e17); r(100, 94, 744, 396, 0x314557);
    r(108, 102, 728, 374, 0x1b2e3e); r(108, 202, 728, 274, 0x344753);
    for (let y = 202; y < 476; y += 30) {
      r(108, y, 728, 1, 0x263845);
      for (let x = 108 + (Math.floor(y / 30) % 2) * 45; x < 832; x += 90) { r(x, y, 1, Math.min(30, 476 - y), 0x293c49); if (y + 24 < 476 && x + 7 < 832) r(x + 7, y + 24, Math.min(48, 832 - x - 7), 1, 0x3f5360, 0.6); }
    }
    r(108, 192, 728, 10, 0x142431); r(108, 190, 728, 2, 0x53646c);
    r(100, 94, 744, 6, 0x51616b); r(100, 100, 8, 386, 0x263947); r(836, 100, 8, 386, 0x263947); r(100, 476, 744, 14, 0x182a37); r(108, 476, 728, 3, 0x56656b);
    // Evening window and city, with warm light on the floor.
    r(285, 118, 124, 66, 0x0b192b); r(290, 123, 114, 56, 0x25466a);
    for (let i = 0; i < 7; i++) { r(293 + i * 16, 150 - i % 3 * 7, 13, 28 + i % 3 * 7, 0x14283f); r(297 + i * 16, 155, 3, 4, 0xe2ac68); }
    r(345, 122, 4, 58, 0x66808e); r(289, 145, 115, 3, 0x66808e); r(282, 179, 130, 7, 0x839399);
    g.fillStyle(0x7fc4df, 0.06).fillPoints([{ x: 290, y: 204 }, { x: 400, y: 204 }, { x: 490, y: 464 }, { x: 310, y: 464 }], true);
    // Task board.
    r(665, 122, 136, 76, 0x101f2a); r(661, 118, 136, 76, 0x8d735b); r(667, 124, 124, 64, 0x42515a);
    for (let i = 0; i < 5; i++) { const x = 676 + i % 3 * 37, y = 135 + Math.floor(i / 3) * 27; r(x, y, 25, 19, i < 2 ? 0xc9a269 : 0x81b3b8); r(x + 4, y + 6, 15, 2, 0x4d6267); r(x + 4, y + 11, 10, 2, 0x4d6267); }
    // Bookshelf.
    r(148, 137, 105, 109, 0x152330); r(144, 131, 105, 106, 0x765d4f); r(150, 137, 93, 91, 0x293440);
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 8; i++) { const c = [0x6a9da3, 0xc99460, 0x657b9e, 0x9d6d71][i % 4]; r(157 + i * 10, 143 + row * 42 + i % 3 * 3, 7, 27 - i % 3 * 3, c); r(159 + i * 10, 148 + row * 42 + i % 3 * 3, 3, 2, 0xe3d5b8); }
      r(150, 174 + row * 43, 93, 6, 0x9b7a60);
    }
    // Carpet, desk, computer and chair.
    r(351, 307, 280, 119, 0x172c37); r(356, 312, 270, 109, 0x3a5963); r(362, 318, 258, 97, 0x304b58);
    for (let x = 370; x < 615; x += 15) { r(x, 318, 4, 3, 0x6c8385); r(x, 412, 4, 3, 0x6c8385); }
    r(390, 266, 12, 35, 0x182431); r(571, 266, 12, 35, 0x182431);
    r(378, 230, 218, 58, 0x101e28); r(374, 220, 218, 59, 0x9e7756); r(378, 224, 210, 45, 0xb68a62); r(378, 269, 210, 7, 0x795d49);
    for (let y = 232; y < 264; y += 13) r(380, y, 206, 1, 0xa17a55);
    r(446, 245, 39, 6, 0x213442); r(462, 231, 8, 15, 0x253a49); r(431, 191, 72, 47, 0x101e29); r(435, 195, 64, 35, 0x30778d);
    r(439, 199, 56, 4, 0x255064); for (let i = 0; i < 4; i++) r(441 + i % 2 * 5, 209 + i * 4, 20 + i * 4, 2, i % 2 ? 0xe6be7c : 0x89c6ce);
    r(445, 253, 48, 13, 0x33414b); for (let i = 0; i < 10; i++) r(448 + i * 4, 256, 2, 2, 0x9da9a6);
    r(504, 252, 8, 11, 0x253c48); r(536, 239, 15, 16, 0xe9c88f); r(540, 237, 8, 3, 0x674a3e); r(551, 243, 5, 8, 0xe9c88f);
    r(407, 239, 18, 24, 0xd7c9a8); r(411, 246, 10, 2, 0x847b6d); r(411, 252, 7, 2, 0x847b6d);
    r(455, 296, 35, 26, 0x182b38); r(449, 292, 47, 22, 0x486d7b); r(453, 289, 39, 18, 0x5c8190); r(471, 316, 5, 13, 0x1b2c37); r(456, 327, 34, 4, 0x1b2c37);
    // Sofa, small table and a forgotten sock-sized cable.
    r(150, 365, 149, 66, 0x172732); r(145, 352, 149, 66, 0x496776); r(153, 357, 132, 24, 0x60808d); r(153, 385, 62, 25, 0x537583); r(219, 385, 66, 25, 0x537583); r(143, 365, 13, 49, 0x3b5969); r(283, 365, 13, 49, 0x3b5969);
    r(240, 365, 24, 15, 0xca9d65); r(243, 368, 18, 2, 0xe6c78d);
    r(650, 368, 62, 34, 0x182a35); r(646, 361, 62, 29, 0x927356); r(655, 357, 21, 12, 0xb5c4ba); r(659, 360, 13, 2, 0x566d70);
    // Plant, door, wall clock, cable and poster.
    this.plant(g, 787, 380); r(808, 228, 24, 100, 0x20313d); r(810, 233, 20, 91, 0x826b54); r(813, 240, 14, 34, 0x6a5c4c); r(813, 280, 14, 35, 0x6a5c4c); r(812, 278, 4, 4, 0xe7bc79);
    r(531, 126, 28, 28, 0x819398); r(535, 130, 20, 20, 0xd1c6a9); r(544, 133, 2, 10, 0x354b59); r(545, 141, 7, 2, 0x354b59);
    r(121, 279, 4, 30, 0x142733); r(125, 305, 22, 4, 0x142733);
    this.roomLayer.add(this.add.text(685, 202, 'FAZER  /  FEITO', { fontFamily: 'monospace', fontSize: '8px', color: '#a6b8b9' }));
    this.roomLayer.add(this.add.text(155, 112, 'APRENDA. QUEBRE. CORRIJA.', { fontFamily: 'monospace', fontSize: '6px', color: '#9aacb2' }));
  }
  private plant(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    const r = (dx: number, dy: number, w: number, h: number, c: number) => this.rect(g, x + dx, y + dy, w, h, c);
    r(-17, 5, 35, 8, 0xd2a473); r(-14, 13, 28, 22, 0x9e7054); r(-9, 18, 5, 13, 0xb5835d);
    r(-2, -35, 4, 42, 0x6c9272); r(-18, -24, 17, 10, 0x6d9b85); r(2, -34, 16, 10, 0x82b293); r(-15, -43, 14, 12, 0x82b293); r(1, -15, 22, 10, 0x557d72); r(-22, -7, 20, 10, 0x75a08b);
  }
  private drawSpecialRoom() {
    const g=this.add.graphics();this.roomLayer.add(g);
    const r=(x:number,y:number,w:number,h:number,c:number,a=1)=>this.rect(g,x,y,w,h,c,a);
    const label=(x:number,y:number,text:string,color='#a7c6cf',size=8)=>this.roomLayer.add(this.add.text(x,y,text,{fontFamily:'monospace',fontSize:`${size}px`,color}));
    const workshop=this.room===1, server=this.room===2;
    const accent=workshop?0x78bfb8:server?0x84a7de:0xbea1d6;
    r(0,0,960,540,0x0d1924);r(112,110,744,396,0x070f1b);r(100,94,744,396,server?0x293d55:workshop?0x3a565c:0x5e5269);
    r(108,102,728,100,server?0x172b45:workshop?0x223e46:0x253450);r(108,202,728,274,server?0x263f56:workshop?0x344e56:0x5a525d);
    for(let y=204;y<476;y+=24){r(108,y,728,1,server?0x38556d:0x716674,.55);for(let x=110;x<834;x+=48)r(x,y,1,Math.min(24,476-y),0x263544,.6);}
    r(100,94,744,7,accent,.5);r(100,100,8,383,0x253b4a);r(836,100,8,383,0x253b4a);r(100,476,744,14,0x172b3a);r(108,476,728,3,accent,.45);
    // Physical stations share reachable interaction points; the equipment changes by floor.
    if(workshop){
      r(278,119,330,67,0x163749);r(282,123,322,59,0x1d4d5e);
      for(let x=292;x<598;x+=18)r(x,124,1,57,0x376878);for(let y=130;y<180;y+=12)r(283,y,320,1,0x376878);
      for(let i=0;i<4;i++){r(303+i*70,138,45,25,accent,.8);r(308+i*70,143,35,15,0x224456);if(i<3)r(349+i*70,149,24,3,0xe1c78e);}
      label(301,168,'ENTRADA  >  CONDICAO  >  TESTE  >  SAIDA','#d3e1d3',7);
      r(145,143,109,96,0x806d55);r(150,149,98,85,0x273e46);
      for(let i=0;i<6;i++){r(158+i%3*29,156+Math.floor(i/3)*37,21,26,[0x839996,0xc49c6f,0x5b8a9b][i%3]);r(163+i%3*29,163+Math.floor(i/3)*37,11,4,0x253b49);}
      r(148,352,150,76,0x20333e);r(145,347,150,25,0xb28c60);r(157,372,7,55,0x6d7e7c);r(276,372,7,55,0x6d7e7c);
      r(171,331,25,16,0x537c91);r(199,335,37,12,0xdda755);r(249,330,17,17,accent);
    }else if(server){
      const rack=(x:number,y:number,w=100,h=100)=>{r(x+5,y+6,w,h,0x0c1828);r(x,y,w,h,0x475e76);r(x+5,y+5,w-10,h-10,0x152c44);for(let yy=y+11;yy<y+h-10;yy+=19){r(x+10,yy,w-20,14,0x29445f);r(x+15,yy+5,26,3,0x172d45);r(x+w-23,yy+5,4,4,0x8ec9bb);r(x+w-15,yy+5,3,4,0xe6ba78);}};
      rack(148,135,105,104);rack(148,352,150,76);rack(280,121,128,71);rack(432,121,128,71);
      r(314,212,4,230,0x52739b,.4);r(319,438,438,4,0x52739b,.4);r(749,217,4,223,0x52739b,.4);
      label(285,105,'NODE 01 / FILA','#a7c7ef');label(438,105,'NODE 02 / DADOS','#a7c7ef');
      for(let i=0;i<4;i++){r(583+i*13,144,8,30,0x233e59);r(583+i*13,161-i*6,8,13+i*6,accent);}
    }else{
      // Rooftop skyline, rail, string lights and planting beds.
      r(109,103,725,77,0x364661);r(109,103,725,24,0x59617b);
      for(let i=0;i<20;i++){const h=18+(i*17)%43;r(112+i*36,180-h,31,h,0x22344d);for(let j=0;j<3;j++)r(118+i*36,169-j*9,4,4,0xe1ba7b,.7);}
      r(109,176,725,5,0x889496);for(let x=120;x<830;x+=35)r(x,180,4,23,0x839094);r(109,198,725,5,0x839094);
      for(let x=140;x<815;x+=46){r(x,112,3,24,0x1f3041);r(x-2,134,7,8,0xe8c58d);g.fillStyle(0xf7cb82,.045).fillCircle(x+1,138,18);}
      r(148,190,105,49,0x927563);this.plant(g,172,204);this.plant(g,227,204);
      r(148,352,150,76,0x483e57);r(145,347,150,27,0x8b7c9c);r(152,377,67,40,0x75678c);r(223,377,67,40,0x75678c);r(160,361,24,18,0xceaa77);
      label(306,163,'TERRACO / PROJETOS & IDEIAS','#d6c5de',9);
    }
    // Shared central station, board, lift and side terminal.
    r(389,263,12,35,0x172c3b);r(571,263,12,35,0x172c3b);r(374,220,218,61,server?0x52718c:workshop?0xa18460:0x9d8396);r(378,224,210,47,server?0x6a8a9f:workshop?0xc09c70:0xb69eab);
    r(439,194,72,45,0x112139);r(443,198,64,32,0x28546b);r(449,204,45,3,accent);r(449,213,32,2,0xe6c084);r(449,219,40,2,0x94b6bf);r(470,239,8,12,0x283e4c);r(454,251,39,5,0x283e4c);
    r(445,258,50,11,0x263e50);r(449,260,40,3,0x8fa6ab);r(535,242,13,18,0xf1d3a0);r(449,295,48,26,0x446577);r(455,293,36,19,0x6c8a9b);
    r(665,121,134,75,0x172b3a);r(669,125,126,67,accent,.7);r(674,130,116,57,0x213e50);
    label(682,141,workshop?'A E B / A OU B':server?'ENQUANTO < LIMITE':'ID UNICO = IDENTIDADE','#e7d3a5',8);label(682,163,workshop?'8 CENARIOS':server?'PASSO 01 -> 02':'RETRY SEM DUPLICAR','#a8c9d7',7);
    r(808,228,24,100,0x263b50);r(811,233,18,88,server?0x758ba1:0x80969e);r(813,243,14,24,0x263f53);r(818,276,5,5,0xe8bb78);
    r(646,361,62,29,0x172d3c);r(650,365,54,18,0x3e6979);r(657,370,20,3,accent);r(657,377,37,2,0xb6c6bb);
    this.plant(g,787,380);label(650,396,'LAB / E','#b1cdd0',8);label(779,340,'MAPA / M','#b1cdd0',7);
    // Action labels retain their meaning even when furniture is different.
    this.objects.find(o=>o.id==='window')!.name=workshop?'Blueprint · observar o processo':server?'Monitor · estado dos servidores':'Vista · cidade conectada';
  }
  private drawUpgrades() {
    this.decor.removeAll(true); const g = this.add.graphics(); this.decor.add(g);
    if(this.room!==0)return;
    const r = (x: number, y: number, w: number, h: number, c: number, a = 1) => this.rect(g, x, y, w, h, c, a);
    const custom=this.bridge.progress().v3.decor;
    if (this.upgrades >= 1&&custom.plant!=='hidden') this.plant(g, custom.plant==='left'?237:725,custom.plant==='left'?297:343);
    if (this.upgrades >= 2) { r(507, 197, 62, 39, 0x132432); r(511, 201, 54, 29, 0x3a6f79); r(535, 236, 5, 9, 0x213442); r(523, 245, 28, 4, 0x213442); r(516, 207, 24, 3, 0xb5c98d); r(516, 214, 40, 2, 0x90bbc0); }
    if (this.upgrades >= 3&&custom.lamp) { g.fillStyle(0xffce7e, 0.06).fillCircle(581, 247, 80); r(571, 250, 25, 5, 0x283b45); r(581, 216, 5, 35, 0xd0ac70); r(571, 207, 26, 13, 0xe9c17b); }
    if (this.upgrades >= 4&&custom.certificate) { r(592, 124, 43, 37, 0xb18a59); r(596, 128, 35, 29, 0xd6ccae); r(603, 135, 20, 2, 0x617572); r(606, 140, 14, 2, 0x617572); r(610, 147, 8, 6, 0xb18a59); }
    if(custom.gift&&this.bridge.progress().v3.facts.includes('finished')){r(605,245,23,31,0x528c98);r(609,249,15,17,0xe3c38b);}
    if (this.upgrades >= 5&&custom.souvenir) {
      const colors = [0x8ebdc1, 0xedbd79];
      for (let i = 0; i < 11; i++) { r(286 + i * 12, 110 + Math.abs(5 - i) * 2, 7, 7, colors[i % 2]); }
      r(455, 204, 23, 15, 0x79aa91);
      const label = this.add.text(465, 207, 'OK', { fontFamily: 'monospace', fontSize: '8px', color: '#162f32' }); this.decor.add(label);
    }
  }
  private nearest() { return this.objects.filter(o => Phaser.Math.Distance.Between(this.player.x, this.player.y, o.x, o.y) < 82).sort((a, b) => Phaser.Math.Distance.Between(this.player.x, this.player.y, a.x, a.y) - Phaser.Math.Distance.Between(this.player.x, this.player.y, b.x, b.y))[0]; }
  private canMove(x: number, y: number) {
    const custom=this.bridge.progress().v3.decor;
    const plant = this.room===0 && this.upgrades >= 1 && custom.plant==='left' && x > 208 && x < 266 && y > 300 && y < 333;
    return !plant && x > 122 && x < 820 && y > 220 && y < 461 && !this.obstacles.some(r => r.contains(x, y) || r.contains(x - 12, y) || r.contains(x + 12, y));
  }
  update(time: number, delta: number) {
    const npcDistance=this.talisson&&this.player?Phaser.Math.Distance.Between(this.player.x,this.player.y,this.talisson.x,this.talisson.y):9999;
    this.talisson?.updatePose(time,this.bridge.reducedMotion(),this.bridge.progress().v3.facts.includes('finished'),this.bridge.progress().v3.dialoguePaused&&npcDistance>80);
    this.live?.clear();
    if(this.room===0&&this.live){const on=this.bridge.progress().v3.opening!=='new';this.live.fillStyle(on?0x74b2bf:0x0d2032).fillRect(435,195,64,35);if(on){this.live.fillStyle(0xe3c081).fillRect(441,210,25,2);this.live.fillStyle(0x8ebfca).fillRect(441,218,this.bridge.reducedMotion()?40:32+Math.floor(time/2000)%3*5,2);}}
    const completed = this.bridge.completed(); if (this.upgrades !== completed) { this.upgrades = completed; this.drawUpgrades(); }
    if (this.bridge.blocked()) { this.keys.clear(); this.marker.setVisible(false);if(this.homeMode&&!this.bridge.reducedMotion()){const idle=Math.floor(time/6500);if(idle!==this.lastIdle){this.lastIdle=idle;this.player.react(idle%2?'examine':'type');}}this.player.animate(time,0,0,this.bridge.reducedMotion(),this.bridge.celebrations());return; }
    const bindings=this.bridge.bindings();
    const x = +(this.keys.has(bindings.right) || this.keys.has('arrowright')) - +(this.keys.has(bindings.left) || this.keys.has('arrowleft'));
    const y = +(this.keys.has(bindings.down) || this.keys.has('arrowdown')) - +(this.keys.has(bindings.up) || this.keys.has('arrowup'));
    const length = Math.hypot(x, y) || 1, speed = Math.min(delta, 40) * 0.15*this.bridge.speed();
    const nx = this.player.x + x / length * speed, ny = this.player.y + y / length * speed;
    const beforeX=this.player.x,beforeY=this.player.y;
    if (this.canMove(nx, this.player.y)) this.player.x = nx;
    if (this.canMove(this.player.x, ny)) this.player.y = ny;
    const dx=this.player.x-beforeX,dy=this.player.y-beforeY,distance=Math.hypot(dx,dy);this.stepDistance+=distance;
    if(this.stepDistance>22){this.stepDistance=0;this.bridge.cue('step');}
    this.player.setDepth(this.player.y); this.player.animate(time,dx,dy,this.bridge.reducedMotion(),this.bridge.celebrations(),distance);
    this.game.canvas.dataset.byteDirection=this.player.getData('direction');this.game.canvas.dataset.byteWalking=String(distance>0);
    const near = this.nearest(), label = near?.name ?? '';
    const npc=this.objects.find(o=>o.id==='talisson');
    if(npc){
      const distance=Phaser.Math.Distance.Between(this.player.x,this.player.y,npc.x,npc.y);
      if(distance>108&&this.conversationLatch){this.conversationLatch=false;this.bridge.npcAway();}
      if(distance<72&&!this.conversationLatch&&!this.homeMode){this.conversationLatch=true;this.interactWith(npc);return;}
    }
    this.marker.setVisible(this.bridge.labels()).setPosition(near?.x ?? 477, (near?.y ?? 265) - 54 + (this.bridge.reducedMotion() ? 0 : Math.sin(time / 700) * 2)).setAlpha(near ? 1 : 0.6);
    if (label !== this.lastLabel) { this.lastLabel = label; this.bridge.nearby(label); }
  }
}
