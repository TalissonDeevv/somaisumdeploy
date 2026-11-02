import type { Mission, Program, MissionId } from './types';
export const blocks = [
  { id: 'config', label: 'Ler configuração', needs: [] },
  { id: 'banco', label: 'Conectar banco local', needs: ['config'] },
  { id: 'inscritos', label: 'Carregar inscrições', needs: ['banco'] },
  { id: 'painel', label: 'Preparar painel', needs: ['config'] },
  { id: 'iniciar', label: 'Iniciar sistema', needs: ['inscritos', 'painel'] },
];
export const missions: Mission[] = [
  { id: 0, title: 'Na minha máquina funciona', subject: 'Sequência e dependências', sender: 'Rafa',
    message: 'Oi! A Feira Conecta é sábado. O sistema de inscrições nem abre… só aparece “painel não encontrado”. Você consegue dar uma olhada?',
    mentor: 'Lia · Antes do café: veja quem depende de quem. O painel e o banco podem ser preparados em ordens diferentes, depois da configuração.',
    objective: 'Faça o sistema iniciar sem usar uma etapa antes de suas dependências.',
    rules: 'Configuração antes de banco e painel. Banco antes de inscrições. Inscrições e painel antes de iniciar. Use cada bloco uma vez.',
    hints: ['Quem fornece os dados precisa executar antes de quem os usa.', 'A configuração vem primeiro. O sistema inicia por último.', 'Uma ordem possível: configuração → banco → inscrições → painel → iniciar.'],
    reward: 'Uma nova planta', success: 'Rafa · Abriu! Já é melhor que o meu plano B: uma prancheta e muita fé.' },
  { id: 1, title: 'Entrou quem não devia', subject: 'Condições booleanas', sender: 'Rafa',
    message: 'A catraca liberou um visitante que não pagou. Regra da feira: visitante precisa de ingresso E pagamento. Quem é da equipe entra direto.',
    mentor: 'Lia · Os parênteses importam. Teste também quem não tem ingresso: passar um caso não prova a regra toda.',
    objective: 'Libere quem tem ingresso e pagou, ou quem pertence à equipe.',
    rules: 'Equipe sempre entra. Visitantes só entram com ingresso E pago. Monte a condição com três blocos e dois operadores. Os parênteses mostram a ordem de avaliação.',
    hints: ['E exige as duas condições. OU aceita pelo menos uma.', 'A equipe é uma exceção à regra dos visitantes.', '(ingresso E pago) OU equipe é uma solução. A ordem de ingresso e pago pode variar.'],
    reward: 'Segundo monitor', success: 'Rafa · Agora só entrou quem devia. Inclusive a pessoa da equipe que esqueceu o próprio crachá no bolso.' },
  { id: 2, title: 'O loop infinito', subject: 'Repetição e limites', sender: 'Lia',
    message: 'O painel chamou a senha 1 tantas vezes que virou nome de banda. Precisamos chamar as senhas de 1 a 5, uma vez cada, em ordem.',
    mentor: 'Lia · A simulação tem um freio de segurança. Pode experimentar sem medo de travar o escritório.',
    objective: 'Produza exatamente a fila [1, 2, 3, 4, 5].',
    rules: 'O contador começa em início. Enquanto contador < limite (ou ≤), emita a senha e some o incremento. No máximo 24 passos por simulação.',
    hints: ['Observe se o contador realmente muda a cada passo.', 'Comece em 1 e some 1. Confira se a última senha está incluída.', 'Use início 1, limite 5, comparação ≤ e incremento 1. Ou limite 6 com <.'],
    reward: 'Luminária âmbar', success: 'Rafa · Cinco senhas, cinco pessoas. O painel finalmente aprendeu a contar melhor que eu antes do café.' },
  { id: 3, title: 'Esse bug tem histórico', subject: 'Investigação e identidade', sender: 'Rafa',
    message: 'Tem gente aparecendo duas vezes na lista. A internet da feira caiu, o tablet reenviou as inscrições e… bom, agora temos gêmeos digitais.',
    mentor: 'Lia · Há pessoas diferentes com o mesmo nome e e-mails corrigidos. O ID da inscrição permanece igual no reenvio. Corrija onde o dado fica guardado.',
    objective: 'Guarde cada inscrição uma única vez sem perder pessoas diferentes.',
    rules: 'Investigue o histórico. Escolha a chave de identidade e o ponto do fluxo. Reenvios do mesmo ID devem atualizar o registro; IDs diferentes precisam ser preservados.',
    hints: ['Esconder uma linha na tela não remove o registro duplicado.', 'Nomes se repetem. E-mails podem mudar. O ID é estável.', 'No banco local, inserir ou atualizar pela chave ID (upsert).'],
    reward: 'Certificado na parede', success: 'Rafa · A lista ficou certa, e as duas Anas continuam inscritas. Ainda bem: uma delas é a palestrante.' },
  { id: 4, title: 'Sexta-feira, 17h59', subject: 'Integração e lançamento', sender: 'Rafa',
    message: 'Última revisão! O pacote de lançamento veio com valores de demonstração. Confira acesso, fila e inscrições antes de publicar. Sem correria: o relógio é só o título.',
    mentor: 'Lia · Você pode lançar direto. Se houver falhas, o piloto local mostra as consequências e permite corrigir. Testar antes costuma poupar uma ligação.',
    objective: 'Integre os três módulos e lance a Feira Conecta.',
    rules: 'Acesso: ingresso E pago, OU equipe. Fila: 1 a 5 em ordem. Inscrições: inserir ou atualizar por ID no banco. O lançamento só termina quando os três módulos estão corretos.',
    hints: ['O pacote de demonstração não herda suas soluções anteriores. Revise cada módulo.', 'Execute os testes: o relatório identifica o módulo que ainda falha.', 'Acesso: (ingresso E pago) OU equipe. Fila: 1 ≤ 5, incremento 1. Banco: atualizar por ID.'],
    reward: 'A feira funcionando', success: 'Rafa · Portas abertas. A equipe entrou, as senhas andaram e ninguém virou gêmeo. A Feira Conecta está no ar!' },
];
export const defaultAccess = () => ({ atoms: ['ingresso', 'pago', 'equipe'] as const, ops: ['OU', 'E'] as const, group: 'left' as const });
export function initialProgram(id: MissionId): Program {
  const access = { atoms: ['ingresso', 'pago', 'equipe'], ops: ['OU', 'E'], group: 'left' };
  const loop = { start: 1, end: 5, step: 0, inclusive: false };
  const debug = { key: 'nome', point: 'tela' };
  return structuredClone(id === 0 ? ['iniciar', 'banco', 'config', 'inscritos', 'painel'] : id === 1 ? access : id === 2 ? loop : id === 3 ? debug : { access, loop, debug }) as Program;
}
