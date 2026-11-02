import type { AccessProgram, Atom, DebugProgram, Evaluation, LoopProgram, MissionId, Program } from './types';
import { runAccess, runDebug, runLoop, type RecordEntry } from './interpreter';
export interface SequenceBlock { id: string; label: string; needs: string[] }
export interface Practice {
  id: string; kind: MissionId; title: string; objective: string; rules: string; hints: string[]; room: number; xp: number;
  initial: Program; explanation: string; blocks?: SequenceBlock[]; target?: number[];
  atoms?: [string, string, string]; truth?: (a: boolean, b: boolean, c: boolean) => boolean; records?: RecordEntry[];
}
const seq = (id: string, title: string, room: number, blocks: SequenceBlock[], explanation: string): Practice => ({
  id, kind: 0, title, room, xp: 60, objective: 'Organize o fluxo respeitando todas as dependências.',
  rules: blocks.map(b => `${b.label}: ${b.needs.length ? 'depois de ' + b.needs.map(n => blocks.find(x => x.id === n)!.label).join(' e ') : 'sem dependências'}.`).join(' '),
  hints: ['Leia as dependências como setas: primeiro a origem, depois o destino.', 'Etapas independentes podem trocar de lugar.', blocks.map(b => b.label).join(' → ')],
  initial: blocks.map(b => b.id).reverse(), blocks, explanation,
});
const logic = (id: string, title: string, atoms: [string, string, string], rule: string, truth: Practice['truth'], hint: string): Practice => ({
  id, title, kind: 1, room: 1, xp: 60, objective: 'Monte uma condição que respeite todos os cenários.', rules: rule,
  atoms, truth, initial: { atoms: ['falso', 'falso', 'falso'], ops: ['E', 'E'], group: 'left' },
  hints: ['Troque os blocos e observe os parênteses. Todas as oito combinações serão testadas.', 'E exige os dois valores verdadeiros; OU precisa de apenas um.', hint], explanation: 'A tabela verdade cobre as oito combinações possíveis de três entradas. Testar a regra inteira evita validar só o caso feliz.',
});
const loop = (id: string, title: string, target: number[], hint: string): Practice => ({
  id, title, kind: 2, room: 2, xp: 60, objective: `Emita exatamente [${target.join(', ')}].`, target,
  rules: 'A condição compara o contador com o limite antes de emitir. Depois, soma o incremento. A execução para em até 24 passos.',
  initial: { start: 0, end: 5, step: 0, inclusive: false }, hints: ['O primeiro número emitido é o início.', 'Veja a distância entre dois números seguidos: ela é o incremento.', hint],
  explanation: `A saída esperada é [${target.join(', ')}]. O teste compara os valores e a ordem, além de exigir que a repetição termine.`,
});
const debug = (id: string, title: string, entries: RecordEntry[]): Practice => ({
  id, title, kind: 3, room: 3, xp: 60, objective: 'Preserve cada ID uma vez, com os dados mais recentes.',
  rules: 'O buffer pode reenviar dados diretamente ao banco. Pessoas diferentes podem compartilhar nome ou e-mail. O último envio de um ID deve atualizar seu registro.',
  records: entries, initial: { key: 'nome', point: 'tela' }, hints: ['Compare o ID antes de olhar o nome.', 'Corrija na persistência: o reenvio do buffer contorna a entrada.', 'Escolha ID único e banco local.'],
  explanation: 'Inserir ou atualizar por ID torna o reenvio idempotente: repetir a mesma operação não cria novas cópias. Esse padrão é conhecido como upsert.',
});
export const practices: Practice[] = [
  seq('p1', 'Café tem dependência', 0, [
    { id: 'agua', label: 'Aquecer água', needs: [] }, { id: 'po', label: 'Colocar pó no filtro', needs: [] },
    { id: 'coar', label: 'Coar o café', needs: ['agua', 'po'] }, { id: 'servir', label: 'Servir na caneca', needs: ['coar'] },
  ], 'Água e filtro podem ser preparados em qualquer ordem. Coar exige os dois prontos: dependências formam um grafo, não apenas uma lista decorada.'),
  seq('p2', 'Um site saindo do forno', 0, [
    { id: 'instalar', label: 'Instalar ferramentas', needs: [] }, { id: 'estilo', label: 'Compilar estilos', needs: ['instalar'] },
    { id: 'script', label: 'Compilar scripts', needs: ['instalar'] }, { id: 'teste', label: 'Testar o pacote', needs: ['estilo', 'script'] }, { id: 'publicar', label: 'Publicar arquivos', needs: ['teste'] },
  ], 'Os dois compiladores dependem das ferramentas, mas não um do outro. Testes precisam do pacote completo antes de publicar.'),
  seq('p3', 'Backup sem susto', 0, [
    { id: 'ler', label: 'Ler os dados', needs: [] }, { id: 'copiar', label: 'Criar cópia', needs: ['ler'] },
    { id: 'conferir', label: 'Verificar a cópia', needs: ['copiar'] }, { id: 'limpar', label: 'Limpar temporários', needs: ['conferir'] },
  ], 'Limpar antes de verificar cria um risco real de perda. Uma sequência segura tem uma condição de sucesso antes da ação irreversível.'),
  logic('p4', 'Duas chaves, um deploy', ['revisado', 'testado', 'admin'], 'Só liberar com revisão E testes. Ser admin não dispensa as duas verificações.', (a,b) => a && b, '(revisado E testado) E verdadeiro. Você também pode repetir um dos dois blocos.'),
  logic('p5', 'O alarme do servidor', ['cpuAlta', 'memoriaAlta', 'manutencao'], 'Dispare se CPU alta OU memória alta OU manutenção ativa. Qualquer uma das três basta.', (a,b,c) => a || b || c, '(cpuAlta OU memoriaAlta) OU manutencao.'),
  logic('p6', 'Fila expressa', ['agendado', 'prioritario', 'documento'], 'Precisa de documento E pelo menos uma condição: agendado OU prioritário.', (a,b,c) => (a || b) && c, '(agendado OU prioritario) E documento.'),
  loop('p7', 'Índices começam no zero', [0,1,2,3], 'Início 0, incremento 1, limite 4 com < (ou limite 3 com ≤).'),
  loop('p8', 'Uma senha sim, outra não', [2,4,6,8], 'Início 2, incremento 2 e limite 8 com ≤.'),
  loop('p9', 'Lote de três em três', [3,6,9,12], 'Início 3, incremento 3 e limite 12 com ≤.'),
  debug('p10', 'Nomes iguais, pessoas diferentes', [
    { id:'R1',nome:'Lu',email:'lu@local' },{ id:'R2',nome:'Lu',email:'outra@local' },{ id:'R1',nome:'Lu',email:'novo@local' },
  ]),
  debug('p11', 'O e-mail da família', [
    { id:'F1',nome:'Ivo',email:'familia@local' },{ id:'F2',nome:'Bia',email:'familia@local' },{ id:'F1',nome:'Ivo atualizado',email:'familia@local' },
  ]),
  debug('p12', 'Reconexão em dobro', [
    { id:'X1',nome:'Sol',email:'s@local' },{ id:'X2',nome:'Sol',email:'s@local' },{ id:'X1',nome:'Sol',email:'corrigido@local' },{ id:'X2',nome:'Sol novo',email:'s@local' },{ id:'X1',nome:'Sol',email:'final@local' },
  ]),
];
const makeCase = (input: string, expected: string, actual: string) => ({ input, expected, actual, passed: expected === actual });
export function evaluatePractice(task: Practice, program: Program): Evaluation {
  const cases = []; const trace: string[] = [];
  if (task.kind === 0) {
    const done = new Set<string>(); let error = '';
    const order = program as string[];
    if (order.length !== task.blocks!.length || new Set(order).size !== order.length) error = 'Use cada etapa exatamente uma vez.';
    else for (const id of order) {
      const block = task.blocks!.find(b => b.id === id);
      if (!block) { error = 'Bloco desconhecido.'; break; }
      const missing = block.needs.filter(n => !done.has(n));
      if (missing.length) { error = `${block.label} precisa de ${missing.map(n => task.blocks!.find(b => b.id === n)!.label).join(' e ')}.`; trace.push(`PAROU: ${error}`); break; }
      done.add(id); trace.push(`OK · ${block.label}`);
    }
    cases.push(makeCase('Fluxo completo', 'concluído', error || 'concluído'));
  } else if (task.kind === 1) {
    const keys: Atom[] = ['ingresso','pago','equipe'];
    for (let mask = 0; mask < 8; mask++) {
      const v = keys.map((_,i) => !!(mask & (4 >> i))); const input = { ingresso:v[0], pago:v[1], equipe:v[2] };
      const expected = task.truth!(v[0],v[1],v[2]); const actual = runAccess(program as AccessProgram, input);
      cases.push(makeCase(task.atoms!.map((a,i) => `${a} ${+v[i]}`).join(' · '), expected ? 'sim' : 'não', actual ? 'sim' : 'não'));
    }
    trace.push('0 = não · 1 = sim. Parênteses definem o primeiro cálculo.');
  } else if (task.kind === 2) {
    const run = runLoop(program as LoopProgram); trace.push(...run.trace);
    cases.push(makeCase('Saída ordenada', task.target!.join(', '), run.values.join(', ')),makeCase('Execução termina', 'sim', run.bounded ? 'sim' : 'não'));
  } else {
    const run = runDebug(program as DebugProgram, task.records);
    const expected = [...new Map(task.records!.map(r => [r.id,r])).values()].sort((a,b) => a.id.localeCompare(b.id));
    const actual = [...run.stored].sort((a,b) => a.id.localeCompare(b.id));
    cases.push(makeCase('Registros no banco', String(expected.length), String(actual.length)));
    for (const record of expected) cases.push(makeCase(`ID ${record.id} · último envio`, `${record.nome} / ${record.email}`, actual.filter(r => r.id === record.id).map(r => `${r.nome} / ${r.email}`).join(' + ')));
    trace.push(`Banco: ${actual.length} · tela: ${run.visible.length}`, ...actual.map(r => `${r.id} · ${r.nome} · ${r.email}`));
  }
  const passed = cases.every(c => c.passed), first = cases.find(c => !c.passed);
  return { passed, cases, trace, feedback: passed ? task.explanation : `Investigue: ${first!.input}. Esperado: ${first!.expected}. Obtido: ${first!.actual}.` };
}
export interface Lesson { id: string; title: string; concept: string; pages: [string, string, string]; question: string; answers: string[]; correct: number; feedback: string }
export const lessons: Lesson[] = [
  {id:'l1',title:'Pensar em etapas',concept:'Sequência',pages:['Um programa transforma uma entrada em uma saída por meio de etapas. A ordem importa quando uma etapa usa o resultado de outra.','Para servir café, precisamos coar antes. Para coar, precisamos de água quente e filtro preparado. Essas são dependências.','Duas etapas independentes podem trocar de lugar. O importante é respeitar as dependências, não decorar uma ordem única.'],question:'Água quente e filtro preparado não dependem um do outro. Qual ordem funciona?',answers:['Só aquecer antes do filtro','Qualquer ordem entre os dois, antes de coar','Coar primeiro e preparar depois'],correct:1,feedback:'As duas preparações podem acontecer em qualquer ordem. Coar precisa esperar ambas.'},
  {id:'l2',title:'Do problema ao algoritmo',concept:'Sequência',pages:['Um algoritmo é uma sequência finita de instruções para resolver um problema. Você já usa algoritmos em receitas e rotas.','Descreva o objetivo com uma saída observável. “Organizar inscrições” é vago; “guardar um registro por ID” pode ser testado.','Divida o problema em passos pequenos e verifique as pré-condições. Publicar exige um pacote testado; testar exige um pacote pronto.'],question:'Qual critério é mais fácil de testar?',answers:['O sistema precisa ficar incrível','A lista deve ser muito moderna','A saída deve conter uma linha por ID'],correct:2,feedback:'Um resultado concreto permite comparar esperado e obtido sem depender de opinião.'},
  {id:'l3',title:'E, OU e parênteses',concept:'Lógica',pages:['Uma condição booleana tem dois valores: verdadeiro ou falso. “Pagamento confirmado?” é uma pergunta booleana.','A E B só é verdadeiro quando A e B são verdadeiros. A OU B é verdadeiro quando pelo menos um deles é verdadeiro.','Parênteses agrupam a primeira operação. (agendado OU prioritário) E documento exige documento de todos.'],question:'Se A é verdadeiro e B é falso, quanto vale A E B?',answers:['Verdadeiro','Falso','Depende do nome das variáveis'],correct:1,feedback:'E exige as duas condições. OU, nesse mesmo caso, seria verdadeiro.'},
  {id:'l4',title:'Teste além do caso feliz',concept:'Testes',pages:['Um teste compara um resultado obtido com um resultado esperado. O esperado vem da regra do problema, não do código atual.','Testar somente um visitante com ingresso pago não revela se a catraca libera alguém sem pagamento. Inclua casos inválidos.','Com três entradas booleanas existem 2 × 2 × 2 = 8 combinações. A tabela verdade testa a regra completa nesse universo pequeno.'],question:'Qual teste revela uma catraca permissiva demais?',answers:['Visitante com ingresso e pagamento','Visitante sem pagamento que deveria ser bloqueado','Apenas uma pessoa da equipe'],correct:1,feedback:'Casos negativos revelam liberações indevidas que o caso feliz não mostra.'},
  {id:'l5',title:'O motor da repetição',concept:'Laços',pages:['Um laço repete uma ação enquanto uma condição for verdadeira. Ele precisa de um estado inicial, uma condição de saída e uma atualização.','contador ← 1; enquanto contador ≤ 3: emitir; somar 1. A saída é 1, 2, 3. Depois, 4 não satisfaz a condição e o laço termina.','Se o incremento for zero, o contador nunca muda. O jogo interrompe em 24 passos, mas um programa real precisa garantir sua própria saída.'],question:'O que faz o laço avançar de 1 para 2?',answers:['A atualização do contador','O nome da variável','A quantidade de testes'],correct:0,feedback:'A atualização altera o estado. Sem ela, uma condição verdadeira pode continuar verdadeira para sempre.'},
  {id:'l6',title:'O último elemento',concept:'Limites',pages:['Os operadores < e ≤ tratam o limite de formas diferentes. < não inclui o valor do limite; ≤ inclui.','Para emitir 0, 1, 2, 3: use início 0, incremento 1 e limite 4 com <. Também funciona limite 3 com ≤.','Esse erro de incluir ou excluir um elemento a mais é conhecido como off-by-one. Teste listas pequenas e confira primeiro e último valores.'],question:'Qual saída produz início 2, condição ≤ 6 e incremento 2?',answers:['2, 3, 4, 5, 6','2, 4, 6','2, 4'],correct:1,feedback:'O incremento pula de dois em dois; ≤ inclui o 6 antes de terminar no 8.'},
  {id:'l7',title:'Quem é esse registro?',concept:'Identidade',pages:['Dois registros com o mesmo nome podem representar pessoas diferentes. Um ID único identifica a entidade, não sua aparência.','O e-mail também pode mudar ou ser compartilhado. Use um identificador estável para encontrar o mesmo registro em envios futuros.','Inserir ou atualizar por ID preserva pessoas distintas e aplica a versão mais recente dos dados de quem já existe.'],question:'Duas Anas têm IDs diferentes. O sistema deve…',answers:['Guardar só a primeira','Trocar o nome de uma delas','Preservar as duas inscrições'],correct:2,feedback:'Nome igual não significa identidade igual. IDs diferentes continuam representando pessoas diferentes.'},
  {id:'l8',title:'Reenviar sem duplicar',concept:'Idempotência',pages:['Redes falham. Um cliente pode não receber a confirmação e reenviar uma operação que já foi processada.','Uma operação idempotente produz o mesmo efeito final quando repetida com a mesma identidade. Reenviar uma inscrição não deve criar outra pessoa.','Corrija onde o registro é persistido. Ocultar linhas na tela disfarça o erro, e validar só na entrada não cobre um buffer que reenvia direto ao banco.'],question:'Onde impedir que um reenvio vire uma nova cópia?',answers:['Só na tela','No banco, gravando pela identidade estável','Só na primeira entrada, ignorando o buffer'],correct:1,feedback:'A barreira na persistência protege todos os caminhos que chegam ao banco.'},
];
