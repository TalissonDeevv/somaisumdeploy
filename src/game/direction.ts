export type Direction='down'|'up'|'left'|'right';
export function directionFor(dx:number,dy:number,last:Direction):Direction{
 if(!dx&&!dy)return last;
 if(dx&&dy){
  if((last==='left'&&dx<0)||(last==='right'&&dx>0)||(last==='up'&&dy<0)||(last==='down'&&dy>0))return last;
  return Math.abs(dx)>=Math.abs(dy)?dx<0?'left':'right':dy<0?'up':'down';
 }
 return dx?dx<0?'left':'right':dy<0?'up':'down';
}
