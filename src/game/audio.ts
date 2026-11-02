import type { Settings } from '../core/types';
export class GameAudio {
  private context?: AudioContext;
  private ambienceGain?: GainNode;
  constructor(private settings: () => Settings) {}
  unlock() { try { this.context ??= new AudioContext(); void this.context.resume(); this.syncAmbience(); } catch { /* Audio is optional. */ } }
  syncAmbience() {
    if(!this.context)return;
    const ctx=this.context,s=this.settings();
    if(!this.ambienceGain){
      this.ambienceGain=ctx.createGain();this.ambienceGain.gain.value=0;this.ambienceGain.connect(ctx.destination);
      [110,164.81].forEach(f=>{const osc=ctx.createOscillator();osc.frequency.value=f;osc.type='sine';osc.connect(this.ambienceGain!);osc.start();});
    }
    this.ambienceGain.gain.setTargetAtTime(s.ambience&&!s.muted?s.ambienceVolume*.035:0,ctx.currentTime,.2);
  }
  quiet() { if(this.ambienceGain&&this.context)this.ambienceGain.gain.setTargetAtTime(0,this.context.currentTime,.15); }
  cue(name:string){
    const s=this.settings();if(!this.context||s.muted||!s.volume||document.hidden)return;
    const ctx=this.context,osc=ctx.createOscillator(),gain=ctx.createGain(),now=ctx.currentTime;
    const tones:Record<string,number>={step:125,type:720,interact:370,elevator:245,server:90,test:510,dialogue:310,clue:620};
    osc.type=name==='step'?'triangle':'sine';osc.frequency.setValueAtTime(tones[name]??370,now);
    if(name==='elevator')osc.frequency.exponentialRampToValueAtTime(490,now+.2);
    const duration=name==='step'?.055:name==='elevator'?.22:.11;
    gain.gain.setValueAtTime(s.volume*(name==='step'?.035:.07),now);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    osc.connect(gain);gain.connect(ctx.destination);osc.start(now);osc.stop(now+duration+.01);
  }
  play(success = false) {
    const s = this.settings(); if (!this.context || s.muted || s.volume === 0) return;
    const ctx = this.context;
    (success ? [440, 554, 659] : [370]).forEach((frequency, index) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain(), now = ctx.currentTime + index * 0.09;
      osc.type = 'sine'; osc.frequency.value = frequency; gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(s.volume * 0.12, now + 0.01); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(now); osc.stop(now + 0.18);
    });
  }
}
