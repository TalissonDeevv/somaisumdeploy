import { runSequence, runAccess, runLoop, runDebug, records } from './interpreter';
import type { Program, MissionId, Evaluation, TestCase, AccessProgram, LoopProgram, DebugProgram, ReleaseProgram } from './types';
const test = (input: string, expected: string, actual: string): TestCase => ({ input, expected, actual, passed: expected === actual });
function result(cases: TestCase[], trace: string[], good: string, bad: string): Evaluation {
  const passed = cases.every(c => c.passed);
  return { passed, cases, trace, feedback: passed ? good : bad };
}
export function evaluate(id: MissionId, program: Program): Evaluation {
  if (id === 0) {
    const run = runSequence(program as string[]);
    return result([test('Inicialização a frio', 'sistema pronto', run.ok ? 'sistema pronto' : 'dependência ausente')], run.trace, 'Todas as dependências estão prontas. Sistema iniciado!', run.trace.at(-1)!);
  }
  if (id === 1) {
    const cases: TestCase[] = [];
    for (let mask = 0; mask < 8; mask++) {
      const ingresso = !!(mask & 4), pago = !!(mask & 2), equipe = !!(mask & 1);
      const value = (v: boolean) => v ? 'liberado' : 'bloqueado';
      cases.push(test(`ingresso ${+ingresso} · pago ${+pago} · equipe ${+equipe}`, value((ingresso && pago) || equipe), value(runAccess(program as AccessProgram, { ingresso, pago, equipe }))));
    }
    const fail = cases.find(c => !c.passed);
    return result(cases, ['0 = não · 1 = sim', ...cases.map(c => `${c.passed ? 'OK' : 'FALHA'} · ${c.input} → ${c.actual}`)], 'A catraca respeita a regra em todas as 8 combinações.', fail ? `Confira ${fail.input}: deveria ser ${fail.expected}, mas foi ${fail.actual}. Revise os operadores e os parênteses.` : '');
  }
  if (id === 2) {
    const run = runLoop(program as LoopProgram);
    return result([test('Fila com cinco senhas', '1, 2, 3, 4, 5', run.values.join(', ')), test('Execução termina', 'sim', run.bounded ? 'sim' : 'não')], run.trace, 'Fila processada: cada senha foi chamada uma única vez.', !run.bounded ? `Simulação interrompida com segurança após ${run.values.length} passos. Revise o incremento e a condição de saída.` : `A fila gerou [${run.values.join(', ')}]. Esperado: [1, 2, 3, 4, 5]. Confira início, limite e inclusão da última senha.`);
  }
  if (id === 3) {
    const run = runDebug(program as DebugProgram);
    const ids = run.stored.map(r => r.id).sort().join(', ');
    const updated = run.stored.find(r => r.id === 'A17')?.email ?? 'ausente';
    const cases = [test('5 envios → banco local', 'A17, B28, C39', ids), test('A17 reenviado com e-mail corrigido', 'ana.novo@exemplo.local', updated), test('Duas pessoas chamadas Ana', '2', String(run.stored.filter(r => r.nome === 'Ana').length))];
    return result(cases, [`Banco: ${run.stored.length} registros. Tela: ${run.visible.length} linhas.`, ...run.stored.map(r => `${r.id} · ${r.nome} · ${r.email}`)], 'Reenvios atualizam por ID. As duas Anas foram preservadas.', `Banco com ${run.stored.length} registros, tela com ${run.visible.length}. Use uma identidade estável no banco local; esconder linhas não corrige os dados salvos.`);
  }
  const release = program as ReleaseProgram;
  const modules = [evaluate(1, release.access), evaluate(2, release.loop), evaluate(3, release.debug)];
  const names = ['Acesso', 'Fila', 'Inscrições'];
  return result(modules.flatMap((r, i) => r.cases.map(c => ({ ...c, input: `${names[i]} · ${c.input}` }))), modules.flatMap((r, i) => [`${names[i]} · ${r.passed ? 'OK' : r.feedback}`, ...r.trace]), 'Os três módulos passaram. O pacote está pronto para o lançamento.', `Módulos com falhas: ${modules.map((r, i) => !r.passed ? names[i] : '').filter(Boolean).join(', ')}. Revise os casos que falharam.`);
}
export const logLines = records.flatMap((r, i) => [...(i === 2 ? ['14:03:09 REDE RESTABELECIDA · buffer reenviado'] : []), `${['14:02:01 POST', '14:02:03 POST', '14:03:10 RETRY', '14:03:12 POST', '14:03:14 RETRY'][i]} · ${r.id} · ${r.nome} · ${r.email}`]);
