// The same native one-pixel grid, stepped contours and navy outlines as Byte.
// Reference traits: dark curly hair, warm skin, white earbuds, black shirt.
// Eyewear intentionally absent, per the author's correction.
export const talissonPalette:Record<string,string>={h:'#181c26',H:'#342c2c',k:'#243448',s:'#c79b78',l:'#deb38c',d:'#ac7b5e',w:'#edf0df',e:'#e1d8be',i:'#213043',b:'#453331',m:'#825343'};
const head=[
 '          hhhhhhhhhh',
 '       hhhhHhhhhHhhhhhh',
 '     hhhHhhhhHhhhhhHhhhhh',
 '    hhhhhhhHhhhhHhhhhhhhhh',
 '   hhhHhhhhhhhhhhhhHhhhhhhh',
 '   hhhhhhHhhhhHhhhhhhHhhhhh',
 '  hhhhhhhhhhhhhhhhhhhhhhhh',
 '  hhhhhhHhhhhhHhhhhhhhhhhh',
 '  hhhhhssllllllllssshhhhhh',
 '  hhhhsslllllllllllssshhhh',
 '  hhhhsslllllllllllssshhhh',
 '  hhhsslllllllllllllssshhh',
 '  hhhssbbbslllllssbbbsshhh',
 '   hhsslllsssssssllllsshh',
 '   hssseeiissllsseiies ssh',
 '   hssslillssllssilllsssh',
 '   dssllllssllsssllllsssd',
 '  wwdsllllsslllsllllsssww',
 '  wwdsllllsslllsllllsssww',
 '  wwdsllllsdddsllllssssww',
 '   wdslllllssslllllsssdw',
 '    dssllllllllllssssdd',
 '    ddsslllllllsssssdd',
 '     dsslllllllssssdd',
 '     ddssllmmmssssdd',
 '      dssllssslllssd',
 '       dsslllllsssd',
 '        dssssssssdd',
 '         ddssssdd',
 '          dssssd',
 ];
export interface Pixel {x:number;y:number;color:string}
export function talissonHead(happy=false):Pixel[]{
 const pixels:Pixel[]=[];head.forEach((row,y)=>[...row].forEach((c,x)=>{if(talissonPalette[c])pixels.push({x,y,color:talissonPalette[c]});}));
 if(happy){for(const [x,y,c]of [[11,24,'m'],[12,25,'m'],[13,25,'e'],[14,25,'e'],[15,25,'m'],[16,24,'m']] as const)pixels.push({x,y,color:talissonPalette[c]});}
 return pixels;
}
export function talissonPortrait(happy=false){
 return '<svg class="npc-portrait pixel-portrait" viewBox="-3 -3 37 45" role="img" aria-label="Talisson em pixel art no mesmo estilo de Byte: sem óculos, fones brancos e camiseta preta" shape-rendering="crispEdges"><rect x="-3" y="-3" width="37" height="45" fill="#294653"/><path d="M-1 45V34h7v-4h18v4h7v11" fill="#151e2a"/><path d="M10 27h10v9H10" fill="#ac7b5e"/>'+talissonHead(happy).map(p=>'<rect x="'+p.x+'" y="'+p.y+'" width="1" height="1" fill="'+p.color+'"/>').join('')+'</svg>';
}
