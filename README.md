# Só Mais Um Deploy

Uma aventura de programação, em português brasileiro. **Autoria: Talisson Souza.** Controle **Byte**, um robô de monitor retrô articulado, aprenda com Lia e entregue o sistema da Feira Conecta. Versão **2.0.0**: cinco missões, oito lições com revisão, doze experimentos, dez níveis, quatro salas e seis conquistas.

Logo e personagem fornecidos por Talisson Souza. O ambiente é desenhado proceduralmente, sem imagens remotas. Não há login, backend, telemetria, IA em execução nem serviços externos.

## Jogar agora no Windows

- Abra `release/win-unpacked/Só Mais Um Deploy.exe`. Mantenha todos os arquivos dessa pasta juntos.
- Ou use `release/Só Mais Um Deploy Setup 2.0.0.exe` para instalar.
- O executável foi aberto e testado automaticamente neste Windows. O instalador NSIS foi gerado, **mas o fluxo de instalação/desinstalação não foi executado**.
- O pacote não possui assinatura digital. O ícone do executável ainda é o padrão do Electron; a logo e o personagem enviados estão integrados ao jogo.
- Isso é uma base desktop funcional, sem integração Steam ou alegação de aprovação/publicação comercial.

Diretório de trabalho atual: `C:\Users\Pichau\Desktop\Só mais um deploy - Projeto Game\Código`.
O projeto completo foi movido para esta pasta a pedido de Talisson Souza. Código, dependências, artes, builds, testes e documentos acompanham o projeto.

## Desenvolvimento e versão web

Requer Node.js 22.12+ e npm. As dependências já estão instaladas neste computador. Para reproduzir a instalação, utilize o lockfile:

```powershell
cd "C:\Users\Pichau\Desktop\Só mais um deploy - Projeto Game\Código"
npm ci
npm run dev
```

Acesse `http://127.0.0.1:5173`. Também há `INICIAR_WEB.cmd` para iniciar o servidor local.

| Comando | Resultado |
| --- | --- |
| `npm run dev` | Vite local em 127.0.0.1:5173 |
| `npm run typecheck` | Verificação estrita de TypeScript |
| `npm test` | Testes unitários de lógica, progressão e save |
| `npx playwright install chromium` | Instala o navegador de teste, uma vez |
| `npm run test:e2e` | Percorre a campanha e verifica interfaces |
| `npm run build` | Verifica tipos e gera a versão web em `dist/` |
| `npm run preview` | Serve o build web em 127.0.0.1:4173 |
| `npm run desktop` | Faz build e abre o Electron local |
| `npm run desktop:pack` | Gera `release/win-unpacked/` para Windows x64 |
| `npm run test:desktop` | Testa o executável empacotado com um perfil temporário |
| `npm run desktop:dist` | Gera instalador NSIS para Windows x64 |

A primeira instalação e o empacotamento podem baixar ferramentas. **Depois de instalado, o jogo desktop funciona offline.** A versão web não contém dependências remotas; sirva `dist/` por HTTP local ou hospedagem estática. Não abra `dist/index.html` diretamente com `file://`, pois módulos ES dos navegadores exigem HTTP. O Electron oferece o carregamento local apropriado. A versão web não instala service worker nem promete cache para visitas futuras sem servidor.

## Como jogar

- WASD ou setas: movimentação. Aproxime-se de um objeto e pressione **E**.
- Computador: mensagens, tarefa atual e desafios.
- Quadro: lista de tarefas e revisitas às missões concluídas.
- Estante: caderno de conceitos da Lia. Planta e janela: pequenas pausas na história.
- **M**: mapa e viagem entre salas; **P**: perfil, XP, competências e conquistas; **L**: laboratório; **B**: Byte acena.
- **Esc** fecha janelas ou pausa; **Tab**, **Shift+Tab**, **Enter**, **Espaço** e setas dos seletores navegam pela interface.
- As setas ↑/↓ dos blocos reorganizam a inicialização. Não é necessário arrastar.
- O movimento fica bloqueado nas janelas. Perder o foco pausa o escritório.
- Configurações incluem volume, silêncio, velocidade das mensagens, texto imediato e movimento reduzido. O áudio procedural só inicia após interação.

As mensagens podem ser exibidas por inteiro. Não existe cronômetro obrigatório. Acerto e erro usam texto e símbolos além de cor. Janelas longas têm rolagem e mantêm as ações acessíveis.

## Expansão: Byte, níveis e salas

O personagem jogável é um rig procedural inspirado na imagem enviada: gabinete azul, moldura clara, olhos âmbar e post-it. Corpo, braços, mãos, pernas, joelhos e pés são desenhados separadamente. Há passada alternada, balanço dos braços, piscadas, orientação frente/costas/lados, aceno, pose de reflexão e comemoração. A imagem original continua no menu e nos créditos; o protagonista em movimento não é um PNG deslizando.

| Sala | Nível | Atividades |
| --- | --- | --- |
| Estúdio do Byte | 1 | Campanha, academia e três experimentos de sequência |
| Oficina de protótipos | 3 | Bancadas, blueprint e três experimentos booleanos |
| Sala dos servidores | 5 | Racks, monitor e três experimentos de laços |
| Terraço de projetos | 8 | Cidade, iluminação e três investigações de dados |

O mapa e o elevador verificam o nível antes de viajar. As salas preservam posições familiares das estações para facilitar a orientação. Computadores nas salas extras abrem o laboratório, estantes abrem a academia, quadro abre o perfil e uma bancada abre os exercícios. No estúdio, o computador mantém a campanha. A sala atual é salva.

Missões rendem **100, 140, 160, 180 e 240 XP**; cada lição, **35 XP**; cada experimento, **60 XP**, sempre na primeira conclusão. Total possível: **1.820 XP**. Os dez níveis começam em 0, 100, 220, 360, 520, 700, 900, 1.120, 1.380 e 1.680 XP. Repetir atividades não duplica XP. Dicas e erros não retiram experiência. Conquistas e competência por assunto são derivadas do progresso real.

As oito lições cobrem sequência, algoritmos, E/OU, casos negativos, laços, limites, ID e idempotência. Cada uma tem três explicações e uma pergunta com feedback e nova tentativa. Os desafios incluem uma seção “Entender antes de resolver”.

Os doze experimentos trazem café por dependências, build de um site, backup seguro, revisão e testes, alarme, fila expressa, índices do zero, incrementos de dois e três, homônimos, e-mail compartilhado e reenvios. As regras são avaliadas pelo comportamento; soluções alternativas válidas passam.

## Configurações ampliadas

Três abas: áudio, acessibilidade e jogo. Doze preferências persistentes: volume dos efeitos, silêncio, ambiência procedural, volume da ambiência, velocidade do texto, movimento reduzido, alto contraste, tamanho do texto, velocidade do Byte, marcadores de interação, legenda dos controles e celebrações. Tela cheia é uma ação separada, dependente do suporte do navegador. A ambiência é opcional e desligada por padrão.

## Campanha

1. **Na minha máquina funciona:** ordenação por dependências. Banco e painel admitem ordens alternativas.
2. **Entrou quem não devia:** condição booleana em três blocos, com agrupamento. Todas as oito combinações de entrada são testadas.
3. **O loop infinito:** início, comparação, limite e incremento; rastro passo a passo e interrupção em 24 passos. Aceita tanto `1 ≤ 5` quanto `1 < 6`, com incremento 1.
4. **Esse bug tem histórico:** registros de reenvio, homônimas e alteração de e-mail. A correção grava/atualiza por ID único no banco local simulado.
5. **Sexta-feira, 17h59:** integra os três módulos anteriores. Lançar um pacote incorreto interrompe o piloto, mostra o relatório e permite nova tentativa. Lançar um pacote correto conclui a feira, mesmo sem testar antes.

Cada conclusão adiciona um detalhe ao escritório: planta, segundo monitor, luminária, certificado e decoração de celebração. Não há economia, punição por dicas ou contagem de tempo.

## Organização

```text
src/
  core/
    types.ts          contratos e conteúdo tipado
    missions.ts       cinco missões, diálogos, dicas e estados iniciais
    interpreter.ts    interpretadores limitados, sem eval/Function
    validation.ts     casos de teste e feedback por comportamento
    state.ts          progressão sequencial, validação e persistência
    academy.ts        oito lições e doze cenários de prática tipados
    progression.ts    XP, dez níveis, quatro salas e conquistas
  game/
    OfficeScene.ts    cena Phaser, pixel art, colisões e movimento
    ByteActor.ts      rig de partes articuladas, direção e expressões
    audio.ts          efeitos procedurais opcionais
  main.ts             interface HTML acessível e coordenação do jogo
  style.css           interface responsiva e movimento reduzido
electron/main.cjs     integração desktop isolada da lógica do jogo
public/assets/        logo e personagem incluídos localmente
tests/core.test.ts    testes de domínio
tests/e2e/            testes da campanha no Chromium
tests/desktop-smoke.cjs  teste do pacote Electron
```

O renderer usa `contextIsolation: true`, `nodeIntegration: false` e `sandbox: true`. Não existe preload nem ponte de IPC. O conteúdo vem de `dist/` local, novas janelas são negadas, navegação externa é bloqueada e permissões são recusadas. A CSP limita recursos à origem local; o WebSocket de localhost é permitido para o desenvolvimento com Vite.

## Salvamento

- `so-mais-um-deploy.v1`: chave mantida para compatibilidade; o conteúdo agora usa schema **version: 2** com missão, conclusões, contagens, lições, práticas, sala e configurações. Saves v1 são migrados preservando o avanço anterior.
- `so-mais-um-deploy.settings.v1`: chave de preferências com conteúdo versionado em v2, inclusive antes de iniciar uma campanha. Preferências antigas recebem os novos valores padrão.
- O save é validado antes de usar; dados ausentes/corrompidos não bloqueiam o menu. Falhas de armazenamento mostram aviso e mantêm a sessão jogável.
- Novo jogo solicita confirmação quando há progresso salvo.
- Tentativas, dicas e entregas são salvas automaticamente. O rascunho de blocos e a posição no escritório duram somente a sessão; após reabrir, a missão atual recomeça com seu estado inicial. A progressão permanece.
- Navegadores/origens diferentes e a versão desktop têm saves separados. Não há sincronização ou banco remoto.

## Verificação e limites

Veja `VERIFICACAO.md` para os comandos executados e o escopo exato. As capturas ficam em `test-results/`. A apresentação foi conferida em 1280×720 e 1920×1080; interfaces estreitas se reorganizam, mas explorar o escritório requer um teclado. Leitores de tela conseguem usar as janelas HTML; não foi implementada navegação não visual para o mapa desenhado no canvas.

Não foi atribuída uma licença própria ao código ou às imagens do jogo. As dependências mantêm suas licenças; não se deve confundir as licenças das bibliotecas com uma autorização de redistribuição dos materiais fornecidos.

## Relatório para a equipe

O PDF final está em `output/pdf/So-Mais-Um-Deploy-Implementacao-v2.pdf`: 13 páginas com inventário, Byte, campanha, lições, experimentos, XP, salas, configurações, arquitetura, testes e sugestões separadas do que já funciona. O script de geração fica em `tools/create_report.py` e depende de ReportLab, pypdf/Pillow e fontes Segoe UI do Windows. Para reproduzir, instale `tools/requirements-report.txt`, gere as capturas com os testes e execute o script Python. A revisão visual original usou o Poppler para renderizar todas as páginas.
