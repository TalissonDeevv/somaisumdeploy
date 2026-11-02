export const escapeHTML=(v:unknown)=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!);
export const button=(label:string,action:string,cls='',disabled=false)=>'<button class="'+cls+'" data-action="v3-'+action+'" '+(disabled?'disabled':'')+'>'+label+'</button>';
export const eyebrow=(text:string)=>'<span class="eyebrow">'+escapeHTML(text)+'</span>';
export function pick(label:string,field:string,value:string|number,options:[string|number,string][]){
 return '<label>'+label+'<select data-v3field="'+field+'">'+options.map(([key,text])=>'<option value="'+key+'" '+(String(key)===String(value)?'selected':'')+'>'+escapeHTML(text)+'</option>').join('')+'</select></label>';
}
