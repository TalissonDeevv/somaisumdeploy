export type MissionId = 0 | 1 | 2 | 3 | 4;
export type Atom = 'ingresso' | 'pago' | 'equipe' | 'verdadeiro' | 'falso';
export type Operator = 'E' | 'OU';
export interface AccessProgram { atoms: [Atom, Atom, Atom]; ops: [Operator, Operator]; group: 'left' | 'right' }
export interface LoopProgram { start: number; end: number; step: number; inclusive: boolean }
export interface DebugProgram { key: 'id' | 'nome' | 'email'; point: 'entrada' | 'banco' | 'tela' }
export interface ReleaseProgram { access: AccessProgram; loop: LoopProgram; debug: DebugProgram }
export type Program = string[] | AccessProgram | LoopProgram | DebugProgram | ReleaseProgram;
export interface TestCase { input: string; expected: string; actual: string; passed: boolean }
export interface Evaluation { passed: boolean; feedback: string; trace: string[]; cases: TestCase[] }
export interface Mission {
  id: MissionId; title: string; subject: string; objective: string; rules: string; sender: 'Rafa' | 'Lia';
  message: string; mentor: string; hints: string[]; reward: string; success: string;
}
import type { Bindings, V3State } from '../v3/types';
export interface Settings {
  volume: number; muted: boolean; textSpeed: 'instant' | 'normal' | 'slow'; reducedMotion: boolean;
  ambience: boolean; ambienceVolume: number; highContrast: boolean; uiScale: 'compact' | 'normal' | 'large';
  moveSpeed: 'relaxed' | 'normal' | 'fast'; objectLabels: boolean; showControls: boolean; celebrations: boolean;
  bindings:Bindings;
}
export interface Progress {
  version: 3; current: number; completed: number[]; attempts: number[]; hints: number[]; settings: Settings;
  practiceCompleted: string[]; lessonCompleted: string[]; practiceAttempts: Record<string, number>; room: number;
  v3:V3State;
}
