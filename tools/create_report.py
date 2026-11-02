from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image, KeepTogether, Flowable
from reportlab.lib.utils import ImageReader
from PIL import Image as PILImage

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/pdf/So-Mais-Um-Deploy-Implementacao-v2.pdf'
OUT.parent.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('Segoe',r'C:\Windows\Fonts\segoeui.ttf'))
pdfmetrics.registerFont(TTFont('SegoeBold',r'C:\Windows\Fonts\segoeuib.ttf'))
pdfmetrics.registerFontFamily('Segoe',normal='Segoe',bold='SegoeBold',italic='Segoe',boldItalic='SegoeBold')
NAVY=colors.HexColor('#142735');TEAL=colors.HexColor('#447F89');AMBER=colors.HexColor('#D59A48');MUTED=colors.HexColor('#526570');PAPER=colors.HexColor('#F8F7F2');LINE=colors.HexColor('#D5DEDE')
W,H=A4; CW=W-88
styles={
 'title':ParagraphStyle('title',fontName='SegoeBold',fontSize=30,leading=35,textColor=NAVY,spaceAfter=15),
 'h1':ParagraphStyle('h1',fontName='SegoeBold',fontSize=23,leading=28,textColor=NAVY,spaceAfter=13),
 'h2':ParagraphStyle('h2',fontName='SegoeBold',fontSize=13,leading=18,textColor=TEAL,spaceBefore=12,spaceAfter=8),
 'body':ParagraphStyle('body',fontName='Segoe',fontSize=10,leading=15,textColor=NAVY,spaceAfter=9),
 'small':ParagraphStyle('small',fontName='Segoe',fontSize=8.4,leading=12,textColor=MUTED,spaceAfter=7),
 'tag':ParagraphStyle('tag',fontName='SegoeBold',fontSize=8.5,leading=12,textColor=TEAL,spaceAfter=9,tracking=1),
 'cell':ParagraphStyle('cell',fontName='Segoe',fontSize=9,leading=12.5,textColor=NAVY),
 'cellsmall':ParagraphStyle('cellsmall',fontName='Segoe',fontSize=8,leading=11,textColor=NAVY),
 'th':ParagraphStyle('th',fontName='SegoeBold',fontSize=8.8,leading=12,textColor=colors.white),
 'caption':ParagraphStyle('caption',fontName='Segoe',fontSize=8,leading=11,textColor=MUTED,spaceBefore=5,spaceAfter=10),
 'cover':ParagraphStyle('cover',fontName='SegoeBold',fontSize=25,leading=31,textColor=NAVY,spaceAfter=15),
}
story=[]
def p(text,style='body'):return Paragraph(text,styles[style])
def add(text,style='body'):story.append(p(text,style))
def heading(number,title,sub):
 if story:story.append(PageBreak())
 add(f'VERSÃO 2.0.0  /  {number:02d}', 'tag');add(title,'h1');add(sub)
def table(headers,rows,widths=None,small=False):
 data=[[p(escape(str(c)),'th') for c in headers]]+[[p(escape(str(c)),'cellsmall' if small else 'cell') for c in row] for row in rows]
 t=Table(data,colWidths=widths or [CW/len(headers)]*len(headers),repeatRows=1,hAlign='LEFT')
 t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),NAVY),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#EDF2F1'),colors.HexColor('#FAFBF8')]),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),5 if small else 7),('BOTTOMPADDING',(0,0),(-1,-1),5 if small else 7),('LINEBELOW',(0,0),(-1,0),1,TEAL),('LINEBELOW',(0,1),(-1,-1),.3,LINE)]))
 story.append(t);story.append(Spacer(1,10))
def image(name,width=CW):
 path=ROOT/name
 if not path.exists():raise FileNotFoundError(path)
 with PILImage.open(path) as im:iw,ih=im.size
 return Image(str(path),width=width,height=width*ih/iw)
def picture(name,caption,width=CW):story.append(image(name,width));add(caption,'caption')
def note(title,text):
 t=Table([[p(title,'h2')],[p(text,'body')]],colWidths=[CW]);t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#E9F0EF')),('BOX',(0,0),(-1,-1),.6,LINE),('LEFTPADDING',(0,0),(-1,-1),14),('RIGHTPADDING',(0,0),(-1,-1),14),('TOPPADDING',(0,0),(-1,0),1),('BOTTOMPADDING',(0,1),(-1,1),8)]));story.append(t);story.append(Spacer(1,10))
class Detail(Flowable):
 def __init__(self,path,crop,width):
  Flowable.__init__(self);self.path=path;self.crop=crop;self.width=width;self.height=width*crop[3]/crop[2]
 def draw(self):
  c=self.canv;x,y,w,h=self.crop;s=self.width/w
  with PILImage.open(self.path) as im:iw,ih=im.size
  c.saveState();clip=c.beginPath();clip.rect(0,0,self.width,self.height);c.clipPath(clip,stroke=0,fill=0);c.drawImage(str(self.path),-x*s,-(ih-y-h)*s,width=iw*s,height=ih*s);c.restoreState()
def frame(c,doc):
 c.saveState();c.setFillColor(PAPER);c.rect(0,0,W,H,fill=1,stroke=0)
 if doc.page>1:
  c.setFillColor(NAVY);c.rect(0,H-36,W,36,fill=1,stroke=0);c.setFont('SegoeBold',8);c.setFillColor(colors.HexColor('#B7D7D8'));c.drawString(44,H-23,'>_  SÓ MAIS UM DEPLOY');c.setFont('Segoe',8);c.drawRightString(W-44,H-23,'RELATÓRIO DE IMPLEMENTAÇÃO / v2.0.0')
 c.setStrokeColor(LINE);c.line(44,36,W-44,36);c.setFillColor(MUTED);c.setFont('Segoe',7.5);c.drawString(44,23,'Talisson Souza  |  2 de novembro de 2026  |  Documento para análise da equipe');c.drawRightString(W-44,23,f'{doc.page:02d}');c.restoreState()

# 1. Cover
add('RELATÓRIO DE IMPLEMENTAÇÃO  /  02 NOV 2026','tag')
story.append(image('public/assets/logo.png',CW*.6));story.append(Spacer(1,8))
add('Byte tem um projeto.<br/>E uma jornada para aprender.','cover')
add('Inventário funcional da versão 2.0.0, com evidências de execução, decisões técnicas e pontos para evolução da equipe.')
picture('test-results/menu-1280.png','Captura real do menu da versão implementada. Logo e referência do personagem fornecidas por Talisson Souza.',width=CW*.8)
table(['5 MISSÕES','8 LIÇÕES','12 EXPERIMENTOS','4 SALAS / 10 NÍVEIS'],[['Campanha com final','Conceito + pergunta','Validação por comportamento','1.820 XP possíveis']],small=True)
add('<b>Autoria: Talisson Souza.</b> Jogo 2D em português brasileiro, offline, para navegador e Windows. Este relatório descreve o que foi implementado; as propostas da última página ainda não fazem parte do produto.','small')

# 2. Character
heading(2,'Conheça o Byte','O protagonista recebeu nome, corpo e uma animação funcional. A referência visual continua reconhecível no gabinete azul, na moldura clara, nos olhos âmbar e no post-it.')
reference=image('public/assets/personagem.png',140)
detail=Detail(ROOT/'test-results/v2-room-0.png',(882,576,160,174),140)
t=Table([[reference,detail],[p('Referência enviada pelo autor.','caption'),p('Byte jogável, recorte de uma captura real.','caption')]],colWidths=[CW/2,CW/2]);t.setStyle(TableStyle([('ALIGN',(0,0),(-1,-1),'CENTER'),('VALIGN',(0,0),(-1,-1),'MIDDLE')]));story.append(t)
table(['Parte do sistema','Comportamento implementado'],[
 ('Rig por partes','Corpo, gabinete, tela, braços, mãos, quadris, pernas, joelhos e pés são desenhados separadamente com formas de pixel art.'),
 ('Locomoção','Passadas alternadas e balanço dos braços durante o deslocamento. Olhar acompanha os lados; o verso mostra a ventilação do gabinete.'),
 ('Vida e resposta','Piscadas, postura de descanso, aceno ao interagir, reflexão no teste com erro e comemoração em conclusões.'),
 ('Interação direta','E aciona o objeto próximo; B faz Byte acenar. Colisões com móveis e limites evitam atravessar as principais estruturas.'),
 ('Acessibilidade','Movimento reduzido remove balanço e salto; as pernas ainda indicam que Byte está caminhando.'),
],[125,CW-125])
note('Como foi construído','O personagem em movimento é um rig procedural em Phaser, não uma única imagem deslocada. A imagem original permanece no menu, introdução e créditos. Não foi criado um modelo 3D nem um sistema de física de membros.')

# 3. Campaign
heading(3,'A campanha da Feira Conecta','Rafa organiza uma feira de tecnologia. Lia acompanha Byte por mensagens. A entrega tem começo, investigação, integração e encerramento, com cinco missões sequenciais.')
table(['Missão','Problema e ação do jogador','Critério / recompensa'],[
 ('1. Na minha máquina funciona','Reordenar configuração, banco local, inscrições, painel e início do sistema.','Dependências satisfeitas, aceitando ordens alternativas. 100 XP e planta.'),
 ('2. Entrou quem não devia','Montar condições com três blocos, E/OU e agrupamento.','Ingresso E pago, OU equipe; oito combinações testadas. 140 XP e monitor.'),
 ('3. O loop infinito','Ajustar início, comparação, limite e incremento; acompanhar os passos.','Saída 1 a 5, uma vez cada; freio em 24 passos. 160 XP e luminária.'),
 ('4. Esse bug tem histórico','Ler envios e reenvios; escolher identidade e ponto da correção.','Inserir/atualizar por ID no banco. Preservar homônimos e dados recentes. 180 XP e certificado.'),
 ('5. Sexta-feira, 17h59','Revisar acesso, fila e dados em um pacote de lançamento.','Três módulos corretos antes de concluir a feira. 240 XP e celebração no escritório.'),
],[115,202,CW-317])
add('Ciclo implementado','h2')
add('Explorar a sala → ler a mensagem → abrir critérios → montar blocos → executar testes → investigar a saída → entregar → receber XP e mudança no ambiente.')
note('Lançar antes de testar tem consequência','Um pacote com falhas interrompe o piloto local, mostra módulos e casos que falharam e mantém a missão aberta para correção. Um pacote correto pode ser lançado diretamente. A decisão altera o resultado local, sem caminhos narrativos fictícios ou perda de progresso.')
add('O título da quinta missão é humor: não existe contagem regressiva obrigatória. Depois do final, a campanha pode ser revisitada, e academia, salas e experimentos continuam disponíveis.','small')

# 4. Lessons
heading(4,'A Academia da Lia','O ensino foi acrescentado como uma trilha explícita. Cada lição tem três explicações curtas, uma revisão de múltipla escolha, feedback e nova tentativa sem punição.')
table(['Lição','Conceito que o jogador deve levar'],[
 ('Pensar em etapas','Sequência e dependências; ordens diferentes podem ser válidas.'),
 ('Do problema ao algoritmo','Definir uma saída observável e dividir o trabalho em passos.'),
 ('E, OU e parênteses','Valores booleanos, combinação e ordem de avaliação.'),
 ('Teste além do caso feliz','Casos negativos e as oito combinações de três booleanos.'),
 ('O motor da repetição','Estado inicial, condição de saída e atualização do contador.'),
 ('O último elemento','Limite inclusivo/exclusivo e erro de um elemento a mais ou a menos.'),
 ('Quem é esse registro?','Identidade estável, homônimos e alterações de e-mail.'),
 ('Reenviar sem duplicar','Idempotência e proteção na persistência.'),
],[172,CW-172])
picture('test-results/v2-lesson.png','Revisão da primeira lição com a resposta correta e sua explicação.',width=CW*.63)
add('Primeira revisão concluída: 35 XP por lição, total de 280 XP. Revisar novamente é permitido e não duplica XP. Os próprios desafios também oferecem “Entender antes de resolver”, além de três dicas progressivas.','small')

# 5. Experiments
heading(5,'Laboratório de experimentos','Doze cenários adicionais usam os mesmos conceitos com objetivos e entradas diferentes. A primeira conclusão de cada experimento rende 60 XP; o conjunto oferece 720 XP.')
table(['Sala / assunto','Experimentos e objetivos'],[
 ('Estúdio / sequência','Café tem dependência: aquecer água e preparar filtro antes de coar; servir no final.'),
 ('Estúdio / sequência','Um site saindo do forno: ferramentas, estilos, scripts, testes e publicação.'),
 ('Estúdio / sequência','Backup sem susto: ler, copiar, verificar e só então limpar temporários.'),
 ('Oficina / booleanos','Duas chaves, um deploy: revisão E testes; ser admin não dispensa a regra.'),
 ('Oficina / booleanos','O alarme do servidor: CPU alta OU memória alta OU manutenção ativa.'),
 ('Oficina / booleanos','Fila expressa: documento E (agendado OU prioritário).'),
 ('Servidores / laços','Índices começam no zero: produzir [0, 1, 2, 3].'),
 ('Servidores / laços','Uma senha sim, outra não: produzir [2, 4, 6, 8].'),
 ('Servidores / laços','Lote de três em três: produzir [3, 6, 9, 12].'),
 ('Terraço / dados','Nomes iguais, pessoas diferentes: preservar IDs distintos e atualizar o reenvio.'),
 ('Terraço / dados','O e-mail da família: preservar pessoas que compartilham um e-mail.'),
 ('Terraço / dados','Reconexão em dobro: aplicar o último envio de cada ID sem criar cópias.'),
],[128,CW-128])
add('Como as soluções são avaliadas','h2')
add('Sequências usam dependências, condições usam a tabela verdade, laços comparam a saída e o término, e dados comparam quantidade, identidade e última atualização. Não há eval, Function ou execução de JavaScript do jogador.')
add('O relatório apresenta entrada, saída esperada, resultado obtido, símbolo de acerto/erro e rastro da execução. Reiniciar restaura o estado inicial do cenário, sem apagar a campanha.','small')

# 6. Progression
heading(6,'Níveis, XP e conquistas','A progressão é derivada das primeiras conclusões registradas. Não existe moeda, compra, assinatura, energia ou penalidade por usar dicas.')
table(['Nível','XP acumulado mínimo','Título'],[
 (1,0,'Aprendiz de bits'),(2,100,'Curioso do código'),(3,220,'Montador de ideias'),(4,360,'Explorador de lógica'),(5,520,'Caça-bugs'),(6,700,'Dev de soluções'),(7,900,'Arquiteto de fluxos'),(8,'1.120','Mestre dos testes'),(9,'1.380','Guardião do deploy'),(10,'1.680','Lenda do Byte'),
],[55,150,CW-205])
note('Total disponível: 1.820 XP','Campanha: 820 XP. Lições: 280 XP. Experimentos: 720 XP. A jornada completa alcança o nível 10. O perfil mostra o total, o próximo marco, quatro competências e o desempenho das missões.')
add('Seis conquistas funcionais','h2')
table(['Conquista','Condição real'],[
 ('Primeiro conserto','Concluir a primeira missão.'),('Caderno completo','Concluir as oito lições.'),('Mão na massa','Resolver quatro experimentos.'),('Feira no ar','Concluir a campanha.'),('Todos os caminhos','Alcançar o nível 8 e abrir as quatro salas.'),('Laboratório completo','Resolver os doze experimentos.'),
],[155,CW-155],small=True)
add('Notificações anunciam XP, novo nível e sala liberada. Conclusões podem produzir partículas e a reação do Byte; ambas respeitam as configurações. O efeito dessas escolhas sobre motivação e aprendizagem ainda precisa de validação com jogadores.','small')

# 7. Rooms
heading(7,'Quatro espaços para explorar','Mapa, elevador e requisitos de nível são funcionais. As salas mudam o ambiente e agrupam atividades por assunto; as estações mantêm posições familiares para facilitar a orientação.')
cells=[]
roomdata=[('Estúdio do Byte','Nível 1 / campanha e sequência'),('Oficina de protótipos','Nível 3 / regras booleanas'),('Sala dos servidores','Nível 5 / laços e limites'),('Terraço de projetos','Nível 8 / identidade e dados')]
for i,(name,caption) in enumerate(roomdata):
 cells.append([image(f'test-results/v2-room-{i}.png',(CW-14)/2),p(f'<b>{name}</b><br/>{caption}','caption')])
for row in range(2):
 a,b=cells[row*2:row*2+2];t=Table([[a[0],b[0]],[a[1],b[1]]],colWidths=[CW/2,CW/2]);t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),7)]));story.append(t);story.append(Spacer(1,12))
table(['Ambiente','Elementos e função'],[
 ('Estúdio','Mesa, monitor, cadeira, sofá, estante, quadro, plantas, janela e melhorias da campanha.'),
 ('Oficina','Bancadas, caixas de peças e blueprint do fluxo de programação.'),
 ('Servidores','Racks, indicadores, caminhos no piso e monitores de execução.'),
 ('Terraço','Vista da cidade, guarda-corpo, plantas, sofá e luzes de ambiente.'),
],[112,CW-112])
add('A sala atual é salva. Computadores das salas extras abrem o laboratório; no estúdio, o computador continua sendo o ponto de acesso à campanha. O deslocamento entre salas ocorre pelo mapa, não por um corredor contínuo.','small')

# 8. Controls
heading(8,'Controles e interações','O ambiente é explorável. As janelas pausam o movimento e os controles dos desafios não deslocam Byte. Os principais menus podem ser usados pelo teclado.')
table(['Controle','Ação'],[
 ('WASD ou setas','Caminhar pelo ambiente; colisões e limites ativos.'),('E','Interagir com o objeto mais próximo dentro do alcance.'),('Esc','Fechar uma janela ou abrir a pausa.'),('M','Abrir mapa e viajar entre salas disponíveis.'),('P','Abrir perfil, níveis, competências e conquistas.'),('L','Abrir o laboratório de experimentos.'),('B','Fazer Byte acenar.'),('Tab / Shift+Tab','Mover o foco entre controles da janela.'),('Enter / Espaço','Ativar botões; seletores aceitam navegação por teclado.'),('Mouse','Operar menus, testes e botões de mover blocos; clicar em objeto próximo também interage.'),
],[115,CW-115])
add('Pontos de interação','h2')
table(['Objeto','O que abre'],[
 ('Computador do estúdio','Mensagem da missão atual; depois do final, resumo da entrega.'),('Quadro do estúdio','Missões, bloqueio sequencial e revisitas.'),('Estante','Academia da Lia: lições e revisões.'),('Bancada lateral','Laboratório de desafios da sala.'),('Elevador','Mapa de salas e requisitos de nível.'),('Planta / janela','Pausa narrativa; nas salas extras, observação contextual do espaço.'),
],[145,CW-145],small=True)
add('Perder o foco da janela pausa o escritório. Marcadores indicam alcance e podem ser desativados. Texto, símbolos e foco visível complementam as cores. O mapa desenhado em canvas ainda exige orientação visual.','small')

# 9. Settings
heading(9,'Configurações e acessibilidade','Doze preferências são persistidas, inclusive antes de criar uma campanha. A interface organiza as opções em Áudio, Acessibilidade e Jogo.')
table(['Grupo','Preferência','Efeito implementado'],[
 ('Áudio','Volume dos efeitos','Ajusta interações e conclusão.'),('Áudio','Silenciar','Desativa efeitos e ambiência.'),('Áudio','Ambiência procedural','Som ambiente opcional, desligado por padrão.'),('Áudio','Volume da ambiência','Ajusta o ambiente independentemente dos efeitos.'),
 ('Acessibilidade','Velocidade do texto','Normal, devagar ou texto imediato.'),('Acessibilidade','Movimento reduzido','Remove balanço, saltos e partículas; texto imediato.'),('Acessibilidade','Alto contraste','Reforça texto, bordas e contraste dos painéis.'),('Acessibilidade','Tamanho dos textos','Compacto, normal ou ampliado.'),
 ('Jogo','Velocidade do Byte','Tranquila (75%), normal ou ágil (135%).'),('Jogo','Marcadores','Mostra ou oculta indicadores de interação.'),('Jogo','Legenda de controles','Mostra ou oculta as teclas do rodapé.'),('Jogo','Celebrações','Ativa/desativa partículas de conclusão.'),
],[83,137,CW-220],small=True)
picture('test-results/v2-settings-accessibility.png','Aba de acessibilidade com alto contraste e texto ampliado.',width=CW*.64)
add('Ação adicional: alternar tela cheia, com mensagem caso o navegador não permita. Áudio só começa após interação do usuário e a ambiência é silenciada ao perder foco. Não há música licenciada, efeitos piscantes ou áudio obrigatório para avançar.','small')

# 10. Architecture
heading(10,'Arquitetura e persistência','TypeScript estrito, Phaser 3.90.0 para a cena 2D, Vite para o build e Electron para Windows. Os desafios usam interpretadores pequenos, separados das integrações desktop.')
table(['Módulo','Responsabilidade'],[
 ('core/types.ts + missions.ts','Contratos tipados, cinco missões, diálogos, dicas e estados iniciais.'),('core/interpreter.ts','Sequência, booleanos, laços limitados e fluxo de registros.'),('core/validation.ts','Casos de teste e feedback da campanha.'),('core/academy.ts','Oito lições e doze cenários com objetivos próprios.'),('core/progression.ts + state.ts','XP, níveis, salas, conquistas, validação e migração do save.'),('game/OfficeScene.ts + ByteActor.ts','Ambientes, colisões, rig articulado e reações do protagonista.'),('game/audio.ts + main.ts + style.css','Áudio procedural, coordenação, janelas HTML e apresentação.'),('electron/main.cjs','Janela desktop, carregamento local e isolamento do renderer.'),
],[174,CW-174],small=True)
add('Save local, simples e versionado','h2')
add('O schema v2 armazena missão, conclusões, contagens, lições, experimentos, tentativas extras, sala e configurações. XP e conquistas são calculados a partir das conclusões, evitando contadores divergentes. A chave antiga foi mantida para migrar saves v1 sem perder campanha ou preferências.')
add('Save ausente ou corrompido não impede abrir o menu. Falhas de armazenamento são avisadas e a sessão continua. Novo jogo pede confirmação quando há progresso. Rascunhos de solução e posição exata na sala duram apenas a sessão; missões, XP e sala persistem.','small')
note('Integração desktop','contextIsolation: true, nodeIntegration: false e sandbox: true. Sem preload ou IPC. Conteúdo local, novas janelas negadas, navegação externa bloqueada e permissões recusadas. Não há backend, login, banco remoto, telemetria ou execução livre de código.')
add('Saves do navegador e do desktop são separados. A versão web exige servir dist/ por HTTP; o Electron carrega os arquivos locais. A versão web não instala service worker nem promete acesso futuro sem um servidor.','small')

# 11. Validation
heading(11,'Verificações realizadas','Resultados obtidos no Windows x64 deste computador, em 2 de novembro de 2026. As verificações foram executadas na implementação, não apenas descritas como um plano.')
table(['Verificação','Resultado e alcance'],[
 ('npm test','67 testes unitários passaram: domínio original, expansão, save e migração.'),('npm run test:e2e','4 testes de navegador passaram; execução final em aproximadamente 38 segundos.'),('npm run typecheck','TypeScript sem erros.'),('npm run desktop:dist','Build web e instalador Windows NSIS 2.0.0 gerados.'),('npm run test:desktop','Executável empacotado abriu, entregou a primeira missão, concluiu duas lições e um exercício, liberou a oficina e retomou o save.'),
],[155,CW-155])
add('Evidência do percurso completo','h2')
add('Um único teste de interface começou sem save, movimentou Byte, pausou o jogo, usou dica, passou por erros e correções e concluiu as cinco missões. No mesmo save, completou oito lições e doze exercícios, chegou a 1.820 XP e nível 10, visitou as quatro salas e recarregou a página para confirmar retomada. Uma revisita confirmou que XP não é duplicado.')
add('Foram verificadas as oito combinações booleanas, alternativas de sequência, limites de laço, interrupção em 24 passos, identidade por ID, homônimos, reenvios, falhas de armazenamento, fronteiras de nível e requisitos de sala. O teste das preferências confirmou todas as doze opções após recarregar, antes de iniciar a campanha.','small')
add('Pacote desktop','h2')
add('O teste inspecionou isolamento, sandbox, ausência de require no renderer e carregamento file://. Após atingir 230 XP e viajar para a oficina, fechou e reabriu o executável. Missão, XP e sala foram preservados. Não observou erros JavaScript ou requisições HTTP.')
note('Limite importante','O instalador foi gerado; instalação, atualização sobre uma instalação anterior e desinstalação não foram executadas. Não há assinatura digital ou aprovação comercial/Steam. Capturas em 1280×720 e 1920×1080 foram conferidas visualmente; isso não substitui testes em outros dispositivos e escalas de DPI.')

# 12. Handoff
heading(12,'Entrega e reprodução',f'Projeto final em {escape(str(ROOT))}. Código, dependências, artes, builds, testes e documentação estão neste diretório de trabalho.')
table(['Artefato','Uso'],[
 ('release/win-unpacked/Só Mais Um Deploy.exe','Jogar diretamente. Manter os arquivos dessa pasta juntos.'),('release/Só Mais Um Deploy Setup 2.0.0.exe','Instalador Windows x64 gerado. Fluxo de instalação não testado.'),('dist/','Build web autocontido, sem recursos remotos. Servir por HTTP.'),('README.md + VERIFICACAO.md','Operação, estrutura, save, comandos e escopo dos testes.'),('output/pdf/','Este relatório para revisão da equipe.'),('test-results/desktop-report.json','Resultado estruturado do teste do executável.'),
],[227,CW-227],small=True)
add('Comandos principais','h2')
table(['Comando','Finalidade'],[
 ('npm ci','Instalar as versões do lockfile (Node.js 22.12+).'),('npm run dev','Servidor local em http://127.0.0.1:5173.'),('npm test / npm run test:e2e','Testes de domínio e navegador. Playwright requer Chromium instalado.'),('npm run build / npm run preview','Gerar dist/ e servir o build em localhost:4173.'),('npm run desktop:pack','Gerar a pasta executável Windows.'),('npm run desktop:dist','Gerar instalador NSIS Windows.'),('npm run test:desktop','Validar o executável com perfil temporário.'),
],[207,CW-207],small=True)
add('Limitações atuais para a equipe considerar','h2')
add('O ícone externo ainda é o padrão Electron. O mapa exige visão e teclado; não há gamepad ou controles de toque. As salas usam uma disposição familiar de estações, sem corredores contínuos, NPCs com IA ou minijogos físicos. Não existe importação/exportação de save na interface. Não foi atribuída uma licença própria ao código ou às imagens fornecidas.','small')

# 13. Future proposals
heading(13,'Próximas decisões da equipe','As sugestões abaixo são propostas para análise. Não estão implementadas e não devem ser comunicadas como recursos já disponíveis.')
table(['Prioridade sugerida','Proposta','O que validar antes'],[
 ('1 / Aprendizagem','Sessões com iniciantes, observação de erros e revisão da linguagem das lições.','Se o jogador explica o conceito após resolver, em vez de copiar a dica.'),
 ('2 / Diversão','Mais ações físicas para Byte, pequenos objetivos de exploração e identidade própria por sala.','Se as ações ampliam a diversão sem atrapalhar a leitura e o aprendizado.'),
 ('3 / Conteúdo','Novos capítulos sobre funções, listas, variáveis e decomposição de problemas.','Progressão didática e um interpretador limitado para cada conceito novo.'),
 ('4 / Acessibilidade','Navegação não visual do mapa, remapeamento de teclas, gamepad e toque.','Testes reais com diferentes necessidades, aparelhos e resoluções.'),
 ('5 / Distribuição','Ícone próprio, assinatura digital, instalação/atualização/desinstalação e avaliação de licenças.','Matriz de Windows, DPI, comportamento do save e requisitos de distribuição.'),
 ('6 / Continuidade','Exportar/importar save, perfis locais e novas atividades geradas por regras determinísticas.','Compatibilidade de versões e critérios de validação que evitem repetição sem aprendizado.'),
],[86,206,CW-292],small=True)
add('Perguntas para a análise da versão entregue','h2')
add('1. Byte transmite a personalidade desejada e responde de forma clara?<br/>2. XP e salas dão um objetivo compreensível entre as atividades?<br/>3. As lições preparam o jogador para o exercício seguinte?<br/>4. O feedback explica a causa do erro sem exigir conhecimento prévio?<br/>5. Quais novas ações merecem prioridade: exploração, conteúdo ou distribuição?')
note('Como avaliar engajamento com honestidade','Esta versão acrescenta recompensas, progresso visível e atividades variadas. Não houve medição de dopamina, retenção ou eficácia pedagógica. A próxima evidência deve vir de pessoas jogando, observação e feedback da equipe.')
add('Autoria registrada como Talisson Souza. Relatório gerado a partir do código e dos testes da versão 2.0.0, com capturas da execução local.','small')

doc=SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=44,leftMargin=44,topMargin=57,bottomMargin=49,title='Só Mais Um Deploy - Implementação v2.0.0',author='Talisson Souza',subject='Inventário funcional, evidências de teste e propostas para a equipe')
doc.build(story,onFirstPage=frame,onLaterPages=frame)
print(OUT)
