// Every human character uses one chunky model: a 16 × 29 grid with a big blocky head,
// flat torso, side arms and short legs. Only hair, clothes and accessories change,
// so the gallery, the dialogue and the world all show the very same sprite.
export type CharacterId='talisson'|'luiz'|'indo'|'lia'|'rafa'|'noa';
export interface Pixel {x:number;y:number;color:string}
export const GRID={width:16,height:29,armTop:13};
interface Look {name:string;describe:string;rows:string[];palette:Record<string,string>;sleeve:string}
// Sprites are symmetric unless a row is written at full width, which keeps widths exact.
const m=(left:string)=>left.length===16?left:left+[...left].reverse().join('');
const legs=['   pppp ','   pppp ','   pPpp ','   pPpp ','   pppp ','  fffff ','  ffFff '];
const skin={s:'#b47f5c',l:'#d29c74',A:'#dcae88',i:'#141a24',b:'#2a2230',m:'#7d4a3c'};

export const looks:Record<CharacterId,Look>={
 talisson:{
  name:'Talisson Souza',describe:'sem óculos, cabelo escuro cacheado, fones brancos e camiseta preta',sleeve:'#c08a66',
  palette:{...skin,h:'#191c25',H:'#2e2c33',w:'#e8ecdf',t:'#151b26',T:'#222a38',a:'#c08a66',p:'#2c3d50',P:'#3a4f64',f:'#111925',F:'#1f2d3d'},
  rows:[
   '    hhh hhhh    ','   hhhhHhhhhh   ','  hhHhhhhhhHhh  ','  hhhhhhHhhhhh  ',' hhhhhhhhhhhhhh ',
   ...[' hhlhlllh'.slice(0,8),' hsbblll',' hslllll',' wsliill',' wslllll','  sllllm','  ssllll'].map(m),
   ...[' ttttttt','aatTtttt','aatTtttt','aatttttt','aatttttt','aatttttt','aatttttt','aatttttt','aatttttt','AAtttttt'].map(m),...legs.map(m),
  ],
 },
 luiz:{
  name:'Luiz Dela',describe:'cabelo preto bagunçado, óculos, moletom escuro aberto e camiseta branca',sleeve:'#1d222c',
  palette:{...skin,s:'#b98a68',l:'#d9aa84',A:'#e0b693',h:'#14161e',H:'#2b2a33',g:'#0f121a',L:'#6f8c98',u:'#1d222c',v:'#2c3440',c:'#e6e3d5',C:'#bdbaac',p:'#34485c',P:'#475e73',f:'#d6d5c6',F:'#9aa4a4'},
  rows:[
   '  h    hh  HH   ',' hh  hhhhhhhH h ','hhh hhhHhhhhhhhh',' hhhhhhhhhhHhhhh','hhhHhhhhhhhhhhh ',
   ' hhlhhllhhllhhh ',...[' sgggggl',' sgLiLgg',' sgLLLgl',' sgggggl','  sllllm','  ssllll'].map(m),
   ...[' uvuuuCc','uuvuuuCc','uuvuuuCc','uuuuuuCc','uuuuuuCc','uuuuuuCc','uuuuuuCc','uuuuuuCc','uuuuuuCc','AAuuuuCc'].map(m),...legs.map(m),
  ],
 },
 indo:{
  name:'Indo Ali',describe:'cabelo longo castanho com franja e mechas acobreadas, maquiagem rosa e blusa preta de zíper',sleeve:'#171822',
  palette:{...skin,s:'#dba98c',l:'#f0c5a8',A:'#f4cfb5',i:'#2a1a18',h:'#4a2c22',H:'#6a4030',R:'#9a5a3a',k:'#cf7fae',r:'#ec9f98',m:'#c25f70',t:'#171822',z:'#6f7286',p:'#2d2b3d',P:'#44425a',f:'#14141f',F:'#303044'},
  rows:[
   ...['     hhh','   hhhhh','  hhHhhh',' hhhhhhh',' hhhhHhh',' hRhhhhh',' hRhHhhh',' hRslkkl',' hhsliil',' hRsrlll',' hRhsllm',' hhhssll'].map(m),
   ...[' hRttttz','thRttttz','thRttttz','thRttttz','thhttttz','thRttttz','tthttttz','tttttttz','tttttttz','AAtttttz'].map(m),...legs.map(m),
  ],
 },
 lia:{
  name:'Lia',describe:'coque alto e jaleco claro de mentora',sleeve:'#c9d6d2',
  palette:{...skin,s:'#7d5238',l:'#9c6a4a',A:'#a87655',h:'#2b2332',H:'#453a54',t:'#c9d6d2',T:'#9fb2b1',c:'#3e7a84',p:'#31465a',P:'#476075',f:'#20333f',F:'#34505f'},
  rows:[
   ...['      hh','     hhh','  hhhhhh',' hhhHhhh',' hhhhhhh',' hhlllll',' hslllll',' hslllll',' hsliill',' hslllll','  sllllm','  ssllll'].map(m),
   ...[' tttTtcc','ttTttTcc','ttTttTcc','tttttTcc','tttttTcc','tttttTcc','tttttTcc','tttttTcc','tttttTcc','AAtttTcc'].map(m),...legs.map(m),
  ],
 },
 rafa:{
  name:'Rafa',describe:'barba curta e camisa amarela da organização da feira',sleeve:'#e3b46c',
  palette:{...skin,h:'#3b2a20',H:'#57402f',c:'#4b3628',m:'#a0604f',t:'#e3b46c',T:'#c79650',a:'#c49274',p:'#2f3e52',P:'#46586d',f:'#3a2a22',F:'#5a4636'},
  rows:[
   ...['     hhh','   hhhhh','  hhhHhh','  hhhhhh',' hhhhhhH',' hhlllll',' hslllll',' hslllll',' hsliill',' hslllll','  cllccm','  cccccc'].map(m),
   ...[' ttttttt','aatttttt','aaTTTTTT','aatttttt','aatttttt','aatttttt','aatttttt','aatttttt','aatttttt','AAtttttt'].map(m),...legs.map(m),
  ],
 },
 noa:{
  name:'Noa',describe:'cabelo curto azulado e colete da equipe da feira',sleeve:'#d6a581',
  palette:{...skin,s:'#c49471',l:'#e2b692',A:'#eabf9c',h:'#1f3a4a',H:'#31566b',t:'#4b95a4',T:'#2c5e71',c:'#e0e6d8',a:'#d6a581',p:'#39465a',P:'#51617a',f:'#20262f',F:'#39434f'},
  rows:[
   ...['        ','    hhhh','  hhhHhh','  hhhhhh',' hhhhhhh',' hhhllll',' hslllll',' hslllll',' hsliill',' hslllll','  sllllm','  ssllll'].map(m),
   ...[' tttTtcc','aatttTcc','aatttTcc','aatttTcc','aatttTcc','aatttTcc','aatttTcc','aatttTcc','aatttTcc','AAtttTcc'].map(m),...legs.map(m),
  ],
 },
};
const toPixels=(id:CharacterId,keep:(col:number,row:number)=>boolean)=>{
 const look=looks[id],out:Pixel[]=[];
 look.rows.forEach((row,y)=>[...row].forEach((c,x)=>{if(look.palette[c]&&keep(x,y))out.push({x,y,color:look.palette[c]});}));
 return out;
};
const MOUTH_ROW=10;
const smile=(id:CharacterId):Pixel[]=>[6,9].map(x=>({x,y:MOUTH_ROW,color:looks[id].palette.m}));
export const characterPixels=(id:CharacterId,happy=false):Pixel[]=>[...toPixels(id,()=>true),...(happy?smile(id):[])];
// The right arm is separate so a character can raise it to call Byte.
export const withoutRightArm=(id:CharacterId,happy=false):Pixel[]=>[...toPixels(id,(x,y)=>!(x>=14&&y>=GRID.armTop)),...(happy?smile(id):[])];
export const restingArm=(id:CharacterId):Pixel[]=>toPixels(id,(x,y)=>x>=14&&y>=GRID.armTop);
export function raisedArm(id:CharacterId):Pixel[]{
 const look=looks[id],out:Pixel[]=[];
 for(let y=6;y<14;y++)for(const x of [14,15])out.push({x:x+1,y,color:y<8?look.palette.A:look.sleeve});
 return out;
}
const svg=(id:CharacterId,box:[number,number,number,number],extra:string,happy:boolean)=>{
 const look=looks[id],[x,y,w,h]=box;
 const rects=characterPixels(id,happy).map(p=>'<rect x="'+p.x+'" y="'+p.y+'" width="1" height="1" fill="'+p.color+'"/>').join('');
 return '<svg class="npc-portrait pixel-portrait '+extra+'" viewBox="'+x+' '+y+' '+w+' '+h+'" role="img" aria-label="'+look.name+' em pixel art: '+look.describe+'" shape-rendering="crispEdges"><rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="#294653"/>'+rects+'</svg>';
};
export const characterPortrait=(id:CharacterId,happy=false)=>svg(id,[-1,-1,18,21],'',happy);
export const characterStanding=(id:CharacterId,happy=false)=>svg(id,[-3,-2,22,33],'guest-portrait',happy);
