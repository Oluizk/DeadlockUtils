# Deadlock Utils

**English:** [README.en.md](README.en.md)

Mod de HUD para o **Deadlock** (Valve), feito em Panorama (a UI do próprio jogo):

| Função | Como usar |
|---|---|
| **Aba "Deadlock Utils" na loja** | Abra a loja (B): nova aba na barra lateral com os **counters** contra o time inimigo, nos cartões da própria loja (tooltip do jogo e clique para comprar). Passe o mouse para ver o porquê. A **Build Recomendada** do seu herói para a fase atual (dados de popularidade do próprio jogo) é opcional: ligue em Configurações > Geral. A aba se lembra: feche a loja nela e ela continua lá quando a loja abrir de novo. |
| **Editor de counters** | Na aba, botão **Editar counters**: escolha o herói inimigo, adicione/remova itens, peso 1 a 4 e motivo. **Copiar código** gera um código curto `DU1:...` (de um herói ou de tudo que você editou) para colar no grupo; quem recebe cola no campo e clica **Importar**. |
| **Itens no Tab** | Segurando Tab, acima dos três círculos de investimento, duas fileiras de cartas no formato da loja (papel do tier, ícone, nome, preço, marca "Ativo"): **Counters** (com o retrato de contra quem) e **Seu guia**, os próximos itens da build que você escolheu na aba **Builds** da loja (ou a Build Recomendada, se estiver ligada). O estado de cada carta (dá para comprar, sem almas, longe da loja) é relido da loja a cada 0,1 s; item comprado sai da fileira na hora. Hover mostra o porquê; clique compra (perto da loja). |
| **Central de configurações** | Tecla **Shift direito**, botão **Deadlock Utils** no menu ESC ou **Configurações** na aba da loja. Janela própria com seções (Geral, Mira, Vida, Placar, Mapa, Pontos no mapa, Atalhos, Tracker, Backup), **pesquisa** em todas as opções, **prévia ao vivo** da mira e da barra de vida, valor padrão em cada opção e **código de backup** `DUC1:...` para passar a configuração inteira a um amigo ou outro PC. |
| **Mira personalizada** | Central > Mira. 8 estilos (cruz, cruz + ponto, ponto, círculo, círculo + ponto, T, X, seta), cor (paleta ou `#RRGGBB`), comprimento, espessura, espaço no centro, tamanho do ponto, raio, opacidade e contorno. 5 predefinições prontas. Esconde só o retículo do jogo: hitmarker, munição e recarga continuam do jogo, e a mira some junto com a do jogo (morto, outra câmera). |
| **Barra de vida** | Central > Vida. Cores por **faixas** (75%, 50%, 25%), **gradiente** ou **cor fixa**, pulso com vida crítica, número da vida colorido, **vida instantânea** (a barra muda na hora, sem a animação do jogo que enche/esvazia aos poucos) e uma **barrinha de vida perto da mira** (embaixo/esquerda/direita, número ou %, só abaixo de X%). |
| **Timers no placar** | Dentro do placar do topo, do lado do timer do Rejuvenator e com o mesmo visual dele: **urna** (acende quando está disponível, borda verde ou vermelha quando o seu time ou o inimigo está levando, senão o tempo até a próxima) e **buffs da ponte** (detectados no minimapa, com o ícone do tipo de buff; senão o tempo até os próximos). A **vantagem de almas** aparece ao lado do número de almas do time que está na frente (+12%, verde se for o seu). Segurando Tab ou no mapa M, o tempo dos buffs aparece em cima de cada ponte no minimapa. O tempo acende quando falta pouco (com som, se quiser). Fora da partida (hideout, contagem inicial, fim) nada disso aparece. |
| **Placar do topo** | No próprio placar do jogo: nível de cada herói sempre visível, com cor comparada ao seu (azul abaixo, vermelho acima), e retrato apagado dos inimigos que o seu time não está vendo. |
| **Mapa em tela cheia** | Tecla **M**: o minimapa do jogo fica grande no centro, com o placar aberto: clique para sinalizar, cursor livre, o herói continua andando. Mostra todos os timers (relógio, ponte, Rejuvenator, urna, fenda, almas; clique num deles para avisar o time no chat), e **pontos de interesse com filtros**: lanches de cura, estátuas douradas, caixas (normais e resistentes), buffs da ponte, véus cósmicos, sinos, fendas, plataformas de salto, dutos de vapor, cordas, teleportes, lojas, urna, sentinelas, acampamentos (T1/T2/T3/cofres) e os **túneis do Rem** (caminho pontilhado + entradas, tirados do próprio mapa do jogo). Passe o mouse num ícone para ver o que é; **clique para marcar** o local: a marca continua no minimapa pequeno por 60 s depois de fechar (só para você: o jogo não permite que mods mandem ping ao time). Dados: `data/mapa.json` (`tools\atualizar-mapa.ps1`). Abrir a loja ou ESC fecha o mapa. |
| **Tracker** | Tecla **F6** ou botão **Tracker** no menu ESC. Para cada jogador: rank com a insígnia do próprio jogo, barra de vitórias, heróis mais jogados, desempenho com o herói atual e o seu histórico **com e contra** ele. Dados do [deadlock-api.com](https://deadlock-api.com). |
| **Aviso de item perigoso** | Quando um inimigo compra Knockdown, Cursed Relic, Refresher etc., aparece um aviso no topo da tela com o retrato do inimigo e o ícone do item. |

## Usa o QOL Lock? Deadlock Utils - QOL Addon

O [QOL Lock](https://gamebanana.com/mods/650634) (de civo) substitui os mesmos arquivos do HUD que o Deadlock Utils, então a versão normal não roda junto com ele. O **Deadlock Utils - QOL Addon** (`DeadlockUtils-QOL-Addon-vX.Y.Z.zip`, arquivo `pak43_dir.vpk`) roda junto com o QOL Lock sem substituir nenhum arquivo dele: carrega pelo `hud_playerintents.xml`, que o QOL Lock não traz.

- O QOL Lock continua com o HUD, o menu, a barra de vida, o placar e o minimapa dele.
- O addon acrescenta a aba da loja com os counters e o editor de counters, a fileira do Tab, a mira personalizada, os pontos de cura e de salto no minimapa (os outros pontos são opcionais), o tracker e o aviso de item perigoso.
- Todas as configurações dele ficam numa aba **Deadlock Utils** dentro da janela do QOL Lock (ESC > QOL LOCK, grupo "Addons"), com o visual do QOL; não existe a central separada. Ele segue o idioma do QOL Lock quando é um dos quatro do mod.
- Deixe o QOL Lock em primeiro na ordem dos mods. Não instale a versão normal junto: se as duas estiverem rodando, o addon se desliga sozinho e a versão normal avisa.
- Por dentro: o mesmo código, compilado com `tools\build-mod.ps1 -Alvo qol` (`build\qol\pak43_dir.vpk`), sem os módulos de mapa grande, vida, timers e placar (`mod/src/02-compat.js` explica a detecção do QOL, `78-qolaba.js` a aba dentro da janela dele).

## Instalar / remover

**Para jogar** (não precisa compilar nada):

O mod é um único arquivo, `pak42_dir.vpk`.

- **Com um gerenciador de mods** (mais fácil): botão de instalação em 1 clique no GameBanana (Deadlock Mod Manager, Grimoire, HELLCAT). Abra o jogo pelo gerenciador ("Launch Modded").
- **Na mão:** baixe o `DeadlockUtils-vX.Y.Z.zip` na página de [Releases](https://github.com/Oluizk/DeadlockUtils/releases), copie o `pak42_dir.vpk` para `game\citadel\addons\` e habilite a pasta de addons no `gameinfo.gi` (passo a passo no `README.txt` do zip). Para remover, apague o arquivo.

**Idioma:** inglês por padrão. Troque na central de configurações (**Shift direito**) > **Geral > Idioma** (English, Português, Español, Русский); muda na hora e fica salvo.

**Tracker:** informe seu código de amigo da Steam em **Shift direito > Tracker**.

**A partir do código** (para quem mexe no mod): o **`install.bat`** da raiz compila e instala (habilita os addons no `gameinfo.gi` com backup e pergunta o idioma padrão); o **`uninstall.bat`** remove. Para gerar os pacotes de publicação: `powershell -ExecutionPolicy Bypass -File tools\empacotar.ps1` (cria `dist\DeadlockUtils-vX.Y.Z.zip` e `dist\DeadlockUtils-QOL-Addon-vX.Y.Z.zip`, cada um com o seu `.vpk` e `README.txt`, sem a sua conta Steam gravada).

> **Depois de cada atualização do Deadlock** a Steam pode restaurar o `gameinfo.gi`: o gerenciador de mods refaz sozinho; na mão, refaça a edição. Se o patch mexer no HUD, recompile com `powershell -ExecutionPolicy Bypass -File tools\build-mod.ps1 -AtualizarHud`.

### Teclas

| Tecla | O quê |
|---|---|
| **M** | Mapa grande (de novo para fechar) |
| **F6** | Tracker (também no menu ESC) |
| **Shift direito** | Central de configurações (também no menu ESC > Deadlock Utils) |
| **F8** | Liga/desliga o mod inteiro (esconde tudo, devolve a mira, a barra de vida e o placar originais) |
| **ESC** | Sempre fecha o mapa, o tracker e a central |

As teclas do mod podem ser trocadas no jogo: **Shift direito > Atalhos**.

### Configurações no jogo

Central de configurações (**Shift direito**):

- **Geral**: idioma; liga/desliga a aba da loja, os itens no Tab, a **Build Recomendada** (loja e Tab) e o aviso de item perigoso (duração e som).
- **Mira**: liga a mira personalizada, predefinições, estilo, cor, comprimento, espessura, espaço no centro, raio, ponto, opacidade, contorno (espessura e cor) e se esconde o retículo do jogo. Prévia em fundo escuro e claro.
- **Vida**: cores da barra (do jogo, faixas, gradiente, fixa) e as 4 cores das faixas, pulso, número colorido, **vida instantânea**, vida perto da mira (posição, largura, texto, quando mostrar).
- **Placar**: urna, buffs da ponte e vantagem de almas no placar, timer da ponte no minimapa, nível dos heróis (com cor) e inimigos fora de visão apagados, alerta antes (15 s, 30 s, 1 min) com som e clique para avisar no chat (mapa M). Em **Tempos (avançado)**: primeiro buff da ponte, intervalo, primeira urna e intervalo (se um patch mudar).
- **Mapa**: mapa grande (tamanho, ícones dos heróis e o seu, painel lateral, recorte do placar, tempo da marca, **transparência**) e minimapa (tamanho +15/+30/+50%, seu ícone, tamanho dos pontos, **transparência**). Na transparência (85% a 40%) os ícones dos heróis e dos objetivos ficam transparentes junto com o mapa.
- **Pontos no mapa**: liga e desliga cada tipo de ponto, separado para o mapa grande (Mapa) e para o minimapa (Mini).
- **Atalhos**: teclas do mapa, do tracker, da central e de ligar/desligar o mod.
- **Tracker**: seu código de amigo da Steam.
- **Backup**: copiar/importar um código `DUC1:...` com todas as configurações (o idioma e a conta Steam de quem importa não mudam) e restaurar o padrão.

Tudo vale na hora. Para guardar entre partidas, a ponte precisa estar ativa (próxima seção).

**Para quem mexe no mod:** o que o mod põe dentro dos layouts do jogo fica em `mod/jogo/<layout>.xml` (blocos com o ponto de inserção, ver o cabeçalho do arquivo) e `mod/jogo/*.css`; os originais ficam em `mod/vendor` (`-AtualizarHud` baixa todos). Se um patch do jogo mudar um ponto de inserção, o build para com erro em vez de gerar um HUD quebrado. Imagens próprias: `mod/imagens/*.png` viram textura no build (`s2r://panorama/images/deadlock_utils/<nome>_png.vtex`); `tools\gerar-imagens.ps1` gera a logo e a roda a partir da arte em alta resolução. Cada opção da central é uma linha em `SECOES_CFG` (`mod/src/75-ajustes.js`) com o valor padrão em `AJUSTES_PADRAO` e os textos `cfg.<id>` / `cfg.<id>.desc` em `data/textos.json`. A central desenha sozinha (interruptor, botões, número, cor, tecla, chips).

### Ativar o tracker e o salvamento (precisa fazer uma vez)

O Panorama do Deadlock não tem armazenamento próprio, e o navegador embutido do jogo só abre páginas **HTTPS** publicadas na internet. O tracker, o salvamento das configurações, dos filtros do mapa e dos counters editados usam uma página pequena, `mod/pagina/ponte.html`, publicada pelo GitHub Pages deste repositório:

1. No repositório do GitHub, abra **Settings > Pages**.
2. Em **Build and deployment**, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)` e salve.
3. Depois de ~1 minuto, abra `https://oluizk.github.io/DeadlockUtils/mod/pagina/ponte.html` no navegador para conferir (página em branco com o título `DU_BOOT`).

O `data/config.json` já aponta para esse endereço (`"urlPonte"`). Num fork, troque pelo endereço do seu GitHub Pages e rode o `install.bat` de novo.

### Configuração: `data/config.json`

- `teclas.mapa` / `teclas.tracker` / `teclas.central` / `teclas.desligar`: teclas padrão do mod (`""` para não criar; o jogador troca em Shift direito > Atalhos). **Alt+T não é usado** porque T é o Push-to-Talk do jogo: Alt+T abriria o microfone junto.
- `urlPonte`: endereço **HTTPS** onde `mod/pagina/ponte.html` está publicado (ex.: GitHub Pages do repositório). O navegador embutido do jogo só abre páginas HTTPS (build de out/2026); sem isso o tracker e o salvamento dos counters editados ficam desligados (o resto funciona).
- `accountId`: seu id Steam (SteamID3). Se ficar `null`, o build detecta pela pasta `Steam\userdata`. O tracker usa isso para achar sua partida ao vivo e o histórico com cada jogador.
- `idioma`: idioma padrão do build local (`"en"`, `"pt"`, `"es"` ou `"ru"`; vazio = inglês). O jogador troca em Configurações > Idioma; o `install.bat` da raiz também grava um idioma padrão no `.vpk` instalado.
- `segundosMarcaMapa` (quanto tempo a marca do mapa fica no minimapa), `buffPonteInicio`/`buffPonteIntervalo` e `urnaInicio`/`urnaIntervalo` (segundos; padrões das opções em Shift direito > Placar > Tempos), `segundosAviso`.

### Avisos

- A versão normal substitui estes layouts do HUD do jogo: `hud.xml`, `citadel_hud_top_bar.xml`, `citadel_hud_top_bar_player.xml` e `hud_health.xml`. O QOL Addon substitui só o `hud_playerintents.xml`. Cada um é o original da mesma versão do jogo com os acréscimos do mod, refeito no build. **Outro mod que substitua um deles não funciona junto** (vale o que vier antes na ordem dos VPKs). Se os acréscimos do placar ou da barra de vida não estiverem lá, o mod desliga só essas partes e escreve o motivo no console.
- A Valve não publicou regras sobre mods. Mods de HUD não tiveram banimentos até hoje; mas **timers e trackers são justamente o tipo de mod que a comunidade aponta como mais arriscado** (desde mar/2026 o matchmaking bloqueia mudanças de ConVars no `gameinfo.gi`; este mod mexe só nas SearchPaths). **Use por sua conta e risco.**
- **Privacidade:** com `urlPonte` configurado, o mod abre essa página no navegador embutido do jogo (para o tracker e para salvar os counters editados), e o tracker envia ao `api.deadlock-api.com` os ids/nome Steam dos jogadores da partida.
- A mira, a barra de vida e o placar do topo do jogo são alterados só por estilo na tela (nada de ConVar ou arquivo do jogo); o F8 devolve tudo ao original. O aviso no chat (clique num timer) usa o comando `say_team` e só sai quando você clica.
- Se o HUD não carregar, apague o `pak42_dir.vpk` da pasta addons (ou desative no gerenciador de mods).

### Diagnóstico

O mod escreve no console do jogo (F7) linhas `[DeadlockUtils]`: leitura do placar, árvore de painéis, atalhos, ponte de internet, erros. Para gravar em arquivo, coloque `-condebug` nas opções de inicialização do Deadlock na Steam; o log fica em `game\citadel\console.log`.

## Como funciona

O Panorama do Deadlock **não tem API de jogo em JavaScript**. O mod:

- **lê a UI do jogo**: herói e itens de cada jogador na barra do topo (`#TeamFriendly`/`#TeamEnemy` → `Label.HeroName`, retrato, `Image#ModIconImage` → ícone → item), seu herói pela classe da mira, relógio (`#GameTime`) e chefe do meio (`#MidbossTimerLabel`);
- **cria UI própria** com layouts próprios (`mod/layout/*.xml`), porque no Panorama um painel só recebe o CSS do arquivo de layout a que pertence;
- **comandos de console** via `CitadelConCommand` (`+show_scoreboard`, `hud_free_cursor`); as teclas usam `$.RegisterKeyBind`;
- **internet e armazenamento** pelo navegador embutido (`CitadelHTMLPanel`): carrega `mod/pagina/ponte.html` hospedada em HTTPS (`urlPonte`); os pedidos vão pelo `#fragmento` da URL e as respostas voltam pelo título da página.

## Estrutura

```
install.bat / uninstall.bat   compila e instala / remove (a partir do código)
tools/pacote/           instalador do pacote publicado (install.bat, uninstall.bat, files\instalar.ps1, README.txt)
mod/src/*.js            script do HUD, em módulos (concatenados pelo build, em ordem)
  00-base  05-textos  10-leitura  15-cartaz  20-recomendacao  25-nativos  30-loja  35-editor  40-tab  50-mapa
  60-ponte  70-tracker  75-ajustes (opções)  76-central (janela)  80-mira  82-vida  84-timers  86-topo  90-principal
mod/layout/*.xml        layouts próprios (aba, botão, faixa do Tab, aviso, mapa, tracker, central, mira, timers)
mod/estilo.css          estilos (medidas/texturas copiadas da loja original)
mod/pagina/ponte.js     código que roda no navegador embutido (API + armazenamento)
mod/vendor/hud.xml      hud.xml original do jogo (versão em hud.versao.txt)
app/engine.js           motor de recomendação (mod e app web)
data/                   itens, heróis, builds, regras e config: é aqui que a comunidade contribui
tools/build-mod.ps1     compila o VPK (sem ferramentas da Valve)
tools/atualizar-builds.ps1  regenera data/builds.json a partir do heroes.vdata do jogo
data/textos.json        textos da interface por idioma (en, pt, es, ru); textos das regras ficam nos próprios arquivos de data/rules como { "en", "pt", "es", "ru" }
tools/atualizar-mapa.ps1    regenera data/mapa.json (deadlock-api + túneis do Rem lidos do mapa com o Source2Viewer)
tools/atualizar-itens.ps1   regenera data/itens-detalhes.json (descrição e atributos dos itens nos 4 idiomas, do deadlock-api; usado no tooltip do editor)
tools/bin/s2v/          Source2Viewer CLI (não vai para o git; baixe em github.com/ValveResourceFormat/ValveResourceFormat/releases, arquivo cli-windows-x64.zip)
test/hud-simulado.html  simula o HUD no navegador para testar o script sem abrir o jogo
```

Testar sem abrir o jogo: `iniciar.bat`, compile o mod e abra `http://localhost:8765/test/hud-simulado.html`.

## Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md). Counters por herói também podem ser editados **dentro do jogo** e compartilhados por código.

## Créditos

- Formato dos recursos compilados e injeção no `hud.xml`: [deadlock-build-bubble](https://github.com/cheetohsum/deadlock-build-bubble) (Apache-2.0).
- Sistema de salvar/carregar (transporte pelo navegador embutido): pesquisa de **Predi_i, Hanturaya e BubbleGumXD**, documentada em [Predi-i/Deadlock-UI-Mods](https://github.com/Predi-i/Deadlock-UI-Mods).
- O QOL Addon é feito para complementar o [QOL Lock](https://gamebanana.com/mods/650634), de civo ([QOLLOCK](https://github.com/civo7/QOLLOCK), Apache-2.0); a aba e o tracker dele usam o visual do QOL.
- Leitura dos arquivos do jogo (entidades do mapa, ícones, CSS do minimapa): [Source2Viewer / ValveResourceFormat](https://github.com/ValveResourceFormat/ValveResourceFormat) (MIT).
- Dados descompilados: [GameTracking-Deadlock](https://github.com/SteamTracking/GameTracking-Deadlock). Dados de jogadores: [deadlock-api.com](https://deadlock-api.com).
- Projeto de fã, sem vínculo com a Valve.
