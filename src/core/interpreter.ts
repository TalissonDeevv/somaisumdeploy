import { blocks } from './missions';
import type { AccessProgram, LoopProgram, DebugProgram, Atom } from './types';
export const STEP_LIMIT = 24;
export function runSequence(order: string[]) {
  const done = new Set<string>(); const trace: string[] = [];
  if (order.length !== blocks.length || new Set(order).size !== blocks.length) return { ok: false, trace: ['Cada etapa deve aparecer exatamente uma vez.'] };
  for (const id of order) {
    const block = blocks.find(b => b.id === id);
    if (!block) return { ok: false, trace: [...trace, 'Bloco desconhecido.'] };
    const missing = block.needs.filter(dep => !done.has(dep));
    if (missing.length) return { ok: false, trace: [...trace, `PAROU: ${block.label} precisa de: ${missing.map(dep => blocks.find(b => b.id === dep)!.label).join(', ')}.`] };
    done.add(id); trace.push(`OK · ${block.label}`);
  }
  return { ok: true, trace };
}
export function runAccess(program: AccessProgram, input: { ingresso: boolean; pago: boolean; equipe: boolean }): boolean {
  const atom = (key: Atom) => key === 'verdadeiro' ? true : key === 'falso' ? false : input[key];
  const op = (a: boolean, b: boolean, type: string) => type === 'E' ? a && b : a || b;
  const [a, b, c] = program.atoms.map(atom);
  return program.group === 'left' ? op(op(a, b, program.ops[0]), c, program.ops[1]) : op(a, op(b, c, program.ops[1]), program.ops[0]);
}
export function runLoop(program: LoopProgram) {
  const { start, end, step, inclusive } = program;
  if (![start, end, step].every(n => Number.isSafeInteger(n) && Math.abs(n) <= 100)) return { values: [] as number[], trace: ['Parâmetros inválidos: use inteiros entre −100 e 100.'], bounded: false };
  let counter = start; const values: number[] = []; const trace: string[] = [];
  while (inclusive ? counter <= end : counter < end) {
    if (values.length >= STEP_LIMIT) return { values, trace: [...trace, `INTERROMPIDO · Limite de ${STEP_LIMIT} passos. O contador não alcança a saída.`], bounded: false };
    values.push(counter); trace.push(`Passo ${values.length}: emitir ${counter} → contador = ${counter + step}`); counter += step;
  }
  trace.push(`FIM · ${counter} não satisfaz ${inclusive ? '≤' : '<'} ${end}.`);
  return { values, trace, bounded: true };
}
export interface RecordEntry { id: string; nome: string; email: string }
export const records: RecordEntry[] = [
  { id: 'A17', nome: 'Ana', email: 'ana@exemplo.local' },
  { id: 'B28', nome: 'Ana', email: 'palestra@exemplo.local' },
  { id: 'A17', nome: 'Ana', email: 'ana.novo@exemplo.local' },
  { id: 'C39', nome: 'Caio', email: 'caio@exemplo.local' },
  { id: 'B28', nome: 'Ana', email: 'palestra@exemplo.local' },
];
export function runDebug(program: DebugProgram, entries: RecordEntry[] = records) {
  const unique = (list: RecordEntry[]) => [...new Map(list.map(r => [r[program.key], r])).values()];
  // A barreira na entrada não protege o reenvio do buffer local após uma queda.
  const stored = program.point === 'banco' ? unique(entries) : program.point === 'entrada' ? [...unique(entries.slice(0, 2)), ...entries.slice(2)] : [...entries];
  const visible = program.point === 'tela' ? unique(stored) : stored;
  return { stored, visible };
}
