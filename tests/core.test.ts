import { describe, expect, it } from 'vitest';
import { evaluate } from '../src/core/validation';
import { runSequence, runLoop, STEP_LIMIT, runAccess, runDebug } from '../src/core/interpreter';
import { initialProgram } from '../src/core/missions';
import { freshProgress, completeMission, parseSave, SaveStore } from '../src/core/state';
import type { AccessProgram, DebugProgram, LoopProgram, MissionId } from '../src/core/types';
const access: AccessProgram = { atoms: ['ingresso', 'pago', 'equipe'], ops: ['E', 'OU'], group: 'left' };
const loop: LoopProgram = { start: 1, end: 5, step: 1, inclusive: true };
const debug: DebugProgram = { key: 'id', point: 'banco' };
describe('Campanha e interpretadores', () => {
  it.each([0, 1, 2, 3, 4])('missão %i começa com uma falha real', id => expect(evaluate(id as MissionId, initialProgram(id as MissionId)).passed).toBe(false));
  it('aceita ordens diferentes respeitando dependências', () => {
    expect(runSequence(['config', 'painel', 'banco', 'inscritos', 'iniciar']).ok).toBe(true);
    expect(runSequence(['config', 'banco', 'inscritos', 'painel', 'iniciar']).ok).toBe(true);
  });
  it('mostra a dependência ausente', () => expect(runSequence(['config', 'inscritos', 'banco', 'painel', 'iniciar']).trace.at(-1)).toContain('Conectar banco local'));
  it('rejeita etapas repetidas ou desconhecidas', () => {
    expect(runSequence(['config', 'painel', 'banco', 'banco', 'iniciar']).ok).toBe(false);
    expect(runSequence(['config', 'painel', 'banco', 'inscritos', 'hack']).ok).toBe(false);
  });
  it('valida a tabela verdade inteira', () => { const r = evaluate(1, access); expect(r.passed).toBe(true); expect(r.cases).toHaveLength(8); });
  it('aceita exceção da equipe à esquerda com agrupamento à direita', () => {
    expect(evaluate(1, { atoms: ['equipe', 'pago', 'ingresso'], ops: ['OU', 'E'], group: 'right' }).passed).toBe(true);
  });
  it('um ingresso sem pagamento não basta', () => expect(runAccess(access, { ingresso: true, pago: false, equipe: false })).toBe(false));
  it('equipe sem ingresso entra', () => expect(runAccess(access, { ingresso: false, pago: false, equipe: true })).toBe(true));
  it.each([loop, { ...loop, end: 6, inclusive: false }])('aceita limites inclusivo e exclusivo válidos', p => expect(evaluate(2, p).passed).toBe(true));
  it('identifica erro de limite', () => expect(evaluate(2, { ...loop, inclusive: false }).feedback).toContain('[1, 2, 3, 4]'));
  it.each([0, -1])('interrompe incremento %i sem travar', step => {
    const r = runLoop({ ...loop, step }); expect(r.bounded).toBe(false); expect(r.values).toHaveLength(STEP_LIMIT);
  });
  it.each([NaN, Infinity, 0.5, 1000])('rejeita parâmetro de laço %s', start => expect(runLoop({ ...loop, start }).bounded).toBe(false));
  it('atualiza o mesmo ID e preserva homônimas', () => {
    expect(evaluate(3, debug).passed).toBe(true);
    const stored = runDebug(debug).stored; expect(stored).toHaveLength(3); expect(stored.filter(r => r.nome === 'Ana')).toHaveLength(2);
    expect(stored.find(r => r.id === 'A17')?.email).toBe('ana.novo@exemplo.local');
  });
  it.each(['nome', 'email'] as const)('rejeita deduplicação por %s', key => expect(evaluate(3, { ...debug, key }).passed).toBe(false));
  it.each(['entrada', 'tela'] as const)('corrigir apenas na %s não protege o banco', point => expect(evaluate(3, { ...debug, point }).passed).toBe(false));
  it('final exige os três módulos', () => {
    expect(evaluate(4, { access, loop, debug }).passed).toBe(true);
    expect(evaluate(4, { access, loop: { ...loop, step: 0 }, debug }).passed).toBe(false);
  });
});
describe('Progressão e save', () => {
  it('desbloqueia somente em sequência, sem duplicar recompensas', () => {
    const p = freshProgress(); expect(completeMission(p, 2)).toBe(false); expect(p.current).toBe(0);
    for (let id = 0; id < 5; id++) { expect(completeMission(p, id)).toBe(true); expect(completeMission(p, id)).toBe(false); }
    expect(p.current).toBe(5); expect(p.completed).toEqual([0, 1, 2, 3, 4]); expect(completeMission(p, 5)).toBe(false);
  });
  it('faz round trip sem perder contagens e configurações', () => {
    const p = freshProgress(); completeMission(p, 0); p.attempts[0] = 3; p.hints[0] = 1; p.settings.muted = true;
    expect(parseSave(JSON.stringify(p))).toEqual(p);
  });
  it.each([null, '', '{broken', '{}', 'null', JSON.stringify({ ...freshProgress(), version: 99 }), JSON.stringify({ ...freshProgress(), current: 3 }), JSON.stringify({ ...freshProgress(), attempts: [-1, 0, 0, 0, 0] }), JSON.stringify({ ...freshProgress(), completed: [3], current: 1 })])('tolera save inválido %s', raw => expect(parseSave(raw)).toBeNull());
  it('lida com quota ou armazenamento bloqueado', () => {
    const store = new SaveStore({ getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('quota'); } });
    expect(store.load()).toBeNull(); expect(store.save(freshProgress())).toBe(false); expect(store.error).toContain('sessão');
  });
  it('recupera save válido após erro anterior', () => {
    let raw: string | null = 'corrompido'; const store = new SaveStore({ getItem: () => raw, setItem: (_, v) => { raw = v; } });
    expect(store.load()).toBeNull(); expect(store.error).toContain('inválido'); expect(store.save(freshProgress())).toBe(true); expect(store.load()).toEqual(freshProgress());
  });
});
