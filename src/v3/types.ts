export const activityIds = ['route','circuit','debug','tests','data','investigation','orders','budget'] as const;
export type ActivityId = typeof activityIds[number];
export type GameMode = 'story' | 'lab' | 'challenges';
export const factIds = ['met','rule','observed','log','note','hypothesis','corrected','presented','explained','finished'] as const;
export type Fact = typeof factIds[number];
export type Concept = 'variables' | 'lists' | 'functions' | 'events' | 'types';
export const talkNodeIds = ['greeting','intro','intro-demo','intro-panel','intro-invite','rule','network','cache','wrong-explanation','explained','completed','lead-log','lead-trace','lead-fix'] as const;
export type Control = 'up'|'down'|'left'|'right'|'interact'|'map'|'profile'|'lab'|'notebook'|'wave'|'pause';
export type Bindings = Record<Control,string>;
export interface ConversationLine { speaker:string; text:string; node:string }
export interface V3State {
  mode:GameMode; opening:'new'|'done'|'skipped'; facts:Fact[]; hypotheses:string[];
  history:ConversationLine[]; activityCompleted:ActivityId[]; concepts:Concept[]; optional:string[];
  best:Partial<Record<ActivityId,{instructions:number; runs:number}>>;
  results:Partial<Record<ActivityId,string>>;invites:string[];
  dialogueNode:string;dialoguePaused:boolean;
  decor:{plant:'left'|'right'|'hidden';lamp:boolean;certificate:boolean;souvenir:boolean;gift:boolean};
}
export type ServiceCommand = 'N'|'S'|'E'|'W'|'pick'|'drop'|'call'|'2N'|'2E'|'2S'|'2W';
export interface RouteProgram { kind:'route'; commands:ServiceCommand[]; routine:ServiceCommand[]; name:string }
export type NodeId = 'ticket'|'paid'|'team'|'and'|'or'|'gate';
export interface CircuitProgram {kind:'circuit';edges:[NodeId,NodeId][]}
export interface DebuggerProgram {kind:'debug';capacity:number;comparison:'>'|'>=';change:number;line:number}
export const eventIds = ['A17','B28','reconnect','retryA','retryB'] as const;
export type DemoEvent = typeof eventIds[number];
export interface TestProgram {kind:'tests';events:DemoEvent[];negative:{ticket:boolean;paid:boolean;team:boolean}}
export interface DataProgram {kind:'data';identity:'id'|'name'|'email';strategy:'append'|'upsert'|'ignore';persistent:boolean}
export interface InvestigationProgram {kind:'investigation';evidence:number[];hypothesis:'cache'|'network'|'name'}
export const orderEventIds = ['cafe','pao','pay','new'] as const;
export type OrderEvent = typeof orderEventIds[number];
export type PriceConversion = 'ai'|'strip'|'decimal';
export interface OrdersProgram {kind:'orders';script:OrderEvent[];conversion:PriceConversion;listeners:1|2;reset:boolean}
export interface BudgetProgram {kind:'budget';telas:number;horas:number;valor:number;vague:boolean;protoCount:1|2;desktopCond:'desktop'|'prototipo'}
export type ActivityProgram = RouteProgram|CircuitProgram|DebuggerProgram|TestProgram|DataProgram|InvestigationProgram|OrdersProgram|BudgetProgram;
export interface BudgetRow {cenario:string;esperado:number;obtido:number}
export interface Person {id:string;name:string;email:string}
export interface SimFrame {
  label:string;vars:Record<string,string|number>;output:string[];line?:number;
  point?:{x:number;y:number;carrying:boolean};records?:Person[];gate?:boolean;
  inputs?:boolean[];visited?:string[];failure?:boolean;
  counter?:{id:number;itens:string;total:string}[];budget?:BudgetRow[];breakdown?:[string,string][];
}
export interface ActivityRun {frames:SimFrame[];passed:boolean;feedback:string;optional:string[];instructions:number;comment?:string}
export interface ActivityDefinition {id:ActivityId;title:string;format:string;objective:string;rules:string;room:number;xp:number;difficulty:string;concepts:Concept[];hints:[string,string,string]}
export type WorldEvent = {type:'fact';fact:Fact}|{type:'hypothesis';value:string}|{type:'concept';concept:Concept}|{type:'activity';id:ActivityId;instructions:number;runs:number;optional:string[]}|{type:'opening'};
