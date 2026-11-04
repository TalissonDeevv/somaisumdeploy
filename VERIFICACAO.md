# Verificação da versão 2.0.0

Data: 2 de novembro de 2026. Ambiente: Windows x64, Node.js 24.14.1.

## Resultados executados

- `npm test`: **67 testes unitários passaram**, em dois arquivos.
- `npm run test:e2e`: **4 testes de navegador passaram**, no Chromium, em aproximadamente 38 segundos.
- `npm run typecheck`: passou, sem erros de TypeScript.
- `npm run desktop:dist`: build web e instalador Windows NSIS 2.0.0 gerados.
- `npm run test:desktop`: passou no executável empacotado, com perfil temporário separado do jogador.

## O que foi verificado

O teste contínuo de interface começa sem save, movimenta Byte, verifica interação com o computador, pausa e bloqueio de movimento em janela. Executa uma solução incorreta, consulta dica, resolve as cinco missões e tenta lançar um pacote com falhas antes de corrigi-lo. Recarrega a página entre missões para retomar o save, chega ao final e revisita uma tarefa sem duplicar progresso.

Em seguida, no mesmo save, percorre as oito lições, incluindo resposta errada e recuperação, resolve os doze experimentos e verifica bloqueio/desbloqueio das salas. Chega ao nível 10 com 1.820 XP, revisita um experimento sem receber XP duplicado, visita as quatro salas e confirma persistência da sala e do XP após recarregar.

Os outros testes de interface verificam save corrompido, confirmação antes de novo jogo, missão bloqueada, foco e navegação de teclado, além das doze preferências salvas antes mesmo de iniciar uma campanha. As capturas foram geradas em 1280×720 e 1920×1080 e inspecionadas visualmente.

Os testes de domínio cobrem ordens alternativas por dependências, tabela verdade completa, limites inclusivos/exclusivos, interrupção de laços em 24 passos, atualização por ID e preservação de homônimos, exigências da integração final, progresso sequencial, saves inválidos, armazenamento indisponível, migração v1 para v2, regras dos doze experimentos, fronteiras de níveis, requisitos de salas e XP sem duplicação.

O teste desktop abriu `release/win-unpacked/Só Mais Um Deploy.exe`, confirmou carregamento `file://`, `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` e `typeof window.require === 'undefined'`. Concluiu a primeira missão, duas lições e um experimento, atingiu 230 XP, viajou à oficina e confirmou XP, sala e missão após fechar e reabrir. Não observou erros JavaScript nem requisições HTTP. Relatório: `test-results/desktop-report.json`.

## Limites da verificação

- O instalador foi gerado. **Instalação, atualização sobre uma instalação anterior e desinstalação não foram executadas.**
- O pacote não foi assinado digitalmente. O ícone externo ainda é o padrão Electron.
- A migração do save antigo foi testada com dados v1 representativos, não com todas as combinações possíveis de saves existentes.
- Sem testes de usuários iniciantes, estudo de retenção/aprendizado ou medição de “dopamina”. XP e feedback são mecanismos implementados; seu efeito no engajamento precisa ser validado pela equipe.
- Sem teste com leitores de tela no mapa, controles de toque, gamepad, ultrawide, múltiplos monitores ou Windows com escalas variadas de DPI.
- O áudio procedural é opcional. A persistência dos controles foi verificada; não houve análise acústica nem testes em múltiplos dispositivos de saída.
- Tela cheia depende da API do navegador e tem tratamento de falha; não foi validada em todos os navegadores.
- A cena do escritório usa canvas e exige orientação visual. Os menus e desafios são HTML com foco, teclado e textos de feedback.
- Sem multiplayer, servidor remoto, login, economia, execução de código livre, integração ou aprovação Steam.

## Evidências

Capturas de menu, primeira missão, final, lição, perfil, configurações, quatro salas e pacote desktop ficam em `test-results/`. O PDF em `output/pdf/` reúne a versão implementada e sugestões explicitamente separadas para discussão da equipe.

## Personagens e novas missões (04/11/2026)

- `npm run typecheck` passou; `npm test`: 127 testes passaram.
- `npm run test:e2e`: 11 de 11 passaram.
- `SMOKE_DISABLE_GPU=1 npm run test:desktop` passou com renderização por software. Com a GPU, o teste expirou na abertura: outro programa ocupava a GPU em 99%, e o jogo levou de 60 a 80 s para responder (1,4 s sem GPU). A causa não foi confirmada com a GPU livre.
