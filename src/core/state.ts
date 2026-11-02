import type { Progress, Settings } from './types';
import { practices, lessons } from './academy';
import { rooms, levelInfo } from './progression';
import { defaultBindings, freshV3, validBindings } from '../v3/events';
import { activityIds, factIds, type V3State } from '../v3/types';
export const MAX_SAVE_BYTES=131072;
export const SAVE_KEY = 'so-mais-um-deploy.v1';
export const SETTINGS_KEY = 'so-mais-um-deploy.settings.v1';
export const defaultSettings = (): Settings => ({ volume: 0.35, muted: false, textSpeed: 'normal', reducedMotion: false, ambience:false,ambienceVolume:0.15,highContrast:false,uiScale:'normal',moveSpeed:'normal',objectLabels:true,showControls:true,celebrations:true,bindings:defaultBindings() });
export const freshProgress = (settings = defaultSettings()): Progress => ({ version: 3, current: 0, completed: [], attempts: [0, 0, 0, 0, 0], hints: [0, 0, 0, 0, 0], settings: structuredClone(settings),practiceCompleted:[],lessonCompleted:[],practiceAttempts:{},room:0,v3:freshV3() });
const countsValid = (a: unknown): a is number[] => Array.isArray(a) && a.length === 5 && a.every(n => Number.isSafeInteger(n) && n >= 0 && n <= 1000000);
function validSettings(s: Settings) {
  return s && Number.isFinite(s.volume) && s.volume >= 0 && s.volume <= 1 && typeof s.muted === 'boolean' && typeof s.reducedMotion === 'boolean' && ['instant', 'normal', 'slow'].includes(s.textSpeed)
    && ['ambience','highContrast','objectLabels','showControls','celebrations'].every(key => typeof s[key as keyof Settings] === 'boolean')
    && Number.isFinite(s.ambienceVolume) && s.ambienceVolume >= 0 && s.ambienceVolume <= 1 && ['compact','normal','large'].includes(s.uiScale) && ['relaxed','normal','fast'].includes(s.moveSpeed)&&validBindings(s.bindings);
}
function validV3(v:V3State){
 const unique=(a:unknown,allowed:readonly string[])=>Array.isArray(a)&&a.length<=allowed.length&&new Set(a).size===a.length&&a.every(x=>allowed.includes(x));
 if(!v||!['story','lab','challenges'].includes(v.mode)||!['new','done','skipped'].includes(v.opening)||!unique(v.facts,factIds)||!unique(v.activityCompleted,activityIds)||!unique(v.concepts,['variables','lists','functions','events'])||!unique(v.optional,['reusable-route','reusable-data','negative-test'])||!unique(v.hypotheses,['cache','network','name']))return false;
 if(!Array.isArray(v.history)||v.history.length>80||!v.history.every(l=>l&&typeof l.speaker==='string'&&l.speaker.length<=40&&typeof l.text==='string'&&l.text.length<=600&&typeof l.node==='string'&&l.node.length<=60))return false;
 if(!v.best||typeof v.best!=='object'||Array.isArray(v.best)||!Object.entries(v.best).every(([id,b])=>activityIds.includes(id as typeof activityIds[number])&&b&&Number.isSafeInteger(b.instructions)&&b.instructions>=0&&b.instructions<=100&&Number.isSafeInteger(b.runs)&&b.runs>=0&&b.runs<=1000000))return false;
 if(!unique(v.invites,['campaign','chapter'])||!v.results||typeof v.results!=='object'||Array.isArray(v.results)||!Object.entries(v.results).every(([id,value])=>activityIds.includes(id as typeof activityIds[number])&&typeof value==='string'&&value.length<=400))return false;
 if(typeof v.dialoguePaused!=='boolean'||!['greeting','intro','intro-demo','intro-panel','intro-invite','rule','network','cache','wrong-explanation','explained','completed','lead-log'].includes(v.dialogueNode))return false;
 const d=v.decor;if(!d||!['left','right','hidden'].includes(d.plant)||!['lamp','certificate','souvenir','gift'].every(k=>typeof d[k as keyof typeof d]==='boolean'))return false;
 const deps:Record<string,string[]>= {observed:['met','rule'],hypothesis:['observed','log','note'],corrected:['hypothesis'],presented:['corrected'],explained:['presented'],finished:['explained']};
 return v.facts.every(f=>(deps[f]??[]).every(required=>v.facts.includes(required as typeof factIds[number])));
}
export function parseSave(raw: string | null): Progress | null {
  if (!raw||new TextEncoder().encode(raw).length>MAX_SAVE_BYTES) return null;
  try {
    const p = JSON.parse(raw) as Omit<Progress,'version'> & { version:number };
    if (!p || ![1,2,3].includes(p.version) || !Number.isInteger(p.current) || p.current < 0 || p.current > 5 || !Array.isArray(p.completed) || p.completed.length !== p.current || !p.completed.every((id, i) => id === i) || !countsValid(p.attempts) || !countsValid(p.hints)) return null;
    if (p.version === 1) {
      p.settings = { ...defaultSettings(),...p.settings };
      p.practiceCompleted=[];p.lessonCompleted=[];p.practiceAttempts={};p.room=0;p.version=2;
    }
    if(p.version===2){p.v3=freshV3(true);p.settings={...p.settings,bindings:defaultBindings()};p.version=3;}
    // Early beta saves predate distance-based conversations.
    if(p.version===3&&p.v3&&p.v3.dialogueNode===undefined&&p.v3.dialoguePaused===undefined){p.v3.dialogueNode='greeting';p.v3.dialoguePaused=false;}
    const s = p.settings;
    if (!validSettings(s)||!validV3(p.v3)) return null;
    const uniqueIds = (ids: unknown, allowed: string[]) => Array.isArray(ids) && new Set(ids).size === ids.length && ids.every(id => allowed.includes(id));
    if (!uniqueIds(p.practiceCompleted,practices.map(t=>t.id)) || !uniqueIds(p.lessonCompleted,lessons.map(l=>l.id)) || !p.practiceAttempts || typeof p.practiceAttempts !== 'object' || Array.isArray(p.practiceAttempts) || !Object.entries(p.practiceAttempts).every(([id,n]) => practices.some(t=>t.id===id) && Number.isSafeInteger(n) && n>=0 && n<=1000000) || !Number.isInteger(p.room) || p.room<0 || p.room>5) return null;
    const restored = structuredClone(p) as Progress;
    if (rooms[restored.room].level > levelInfo(restored).level) restored.room=0;
    return restored;
  } catch { return null; }
}
export function completeMission(p: Progress, id: number): boolean {
  if (id !== p.current || id > 4) return false;
  p.completed.push(id); p.current++; return true;
}
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
export class SaveStore {
  error = '';
  constructor(private storage: StorageLike) {}
  loadSettings(): Settings | null {
    try { const data = JSON.parse(this.storage.getItem(SETTINGS_KEY) ?? 'null'); const settings = { ...defaultSettings(),...data?.settings }; return [1,2,3].includes(data?.version) && validSettings(settings) ? settings : null; } catch { return null; }
  }
  saveSettings(settings: Settings) {
    try { this.storage.setItem(SETTINGS_KEY, JSON.stringify({ version: 3, settings })); return true; }
    catch { this.error = 'Não foi possível salvar as configurações. Elas valem nesta sessão.'; return false; }
  }
  load() {
    try {
      const raw = this.storage.getItem(SAVE_KEY); const parsed = parseSave(raw);
      if (raw && !parsed) this.error = 'Save inválido ou de outra versão. Você pode começar uma nova campanha.';
      return parsed;
    } catch { this.error = 'Armazenamento indisponível. A campanha continua nesta sessão.'; return null; }
  }
  save(p: Progress) {
    try { this.storage.setItem(SAVE_KEY, JSON.stringify(p)); this.error = ''; return true; }
    catch { this.error = 'Não foi possível salvar. Seu progresso permanece nesta sessão.'; return false; }
  }
}
