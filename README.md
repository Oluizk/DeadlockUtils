# Deadlock Utils

**English:** [README.en.md](README.en.md)

Mod de HUD para o **Deadlock** (Valve), feito em Panorama (a UI do próprio jogo):

| Função | Como usar |
|---|---|
| **Aba "Deadlock Utils" na loja** | Abra a loja (B): nova aba na barra lateral. Mostra itens perigosos dos inimigos, a **build do seu herói** para a fase atual (dados de popularidade do próprio jogo) e os **counters** contra o time inimigo, nos cartões da loja. Passe o mouse para ver o porquê. |
| **Editor de counters** | Na aba, botão **Editar counters**: escolha o herói inimigo, adicione/remova itens, peso 1 a 4 e motivo. **Copiar código** gera um código curto `DU1:...` (de um herói ou de tudo que você editou) para colar no grupo; quem recebe cola no campo e clica **Importar**. |
| **Itens no Tab** | Segurando Tab, acima dos três círculos de investimento: duas seções, **Counters** (com o retrato de contra quem) e **Recomendados** (build do seu herói). Item que você já tem some; os que não dá para comprar agora (sem almas ou longe da loja) ficam meio transparentes. Hover mostra o porquê; clique compra (perto da loja). |
| **Mapa em tela cheia** | Tecla **M**: o minimapa do jogo fica grande no centro, com o placar aberto: clique para sinalizar, cursor livre, o herói continua andando. Mostra relógio, **próximo buff da ponte** e **chefe do meio**, e **pontos de interesse com filtros**: lanches de cura, estátuas douradas, caixas (normais e resistentes), buffs da ponte, véus cósmicos, sinos, fendas, plataformas de salto, dutos de vapor, cordas, teleportes, lojas, urna, sentinelas, acampamentos (T1/T2/T3/cofres) e os **túneis do Rem** (caminho pontilhado + entradas, tirados do próprio mapa do jogo). Passe o mouse num ícone para ver o que é; **clique para marcar** o local: a marca continua no minimapa pequeno por 60 s depois de fechar (só para você: o jogo não permite que mods mandem ping ao time). Dados: `data/mapa.json` (`tools\atualizar-mapa.ps1`). Abrir a loja ou ESC fecha o mapa. |
| **Tracker** | Tecla **F6** ou botão **Tracker** no menu ESC. Para cada jogador: rank, heróis mais jogados, desempenho com o herói atual e se você já jogou **com/contra** ele (e o resultado). Dados do [deadlock-api.com](https://deadlock-api.com). |
| **Aviso de item perigoso** | Quando um inimigo compra Knockdown, Cursed Relic, Refresher etc., aparece um aviso no topo da tela. |

## Instalar / remover

**Para jogar** (não precisa compilar nada):

1. Baixe o `DeadlockUtils-vX.Y.Z.zip` na página de [Releases](https://github.com/Oluizk/DeadlockUtils/releases) (ou no GameBanana) e extraia.
2. Feche o Deadlock e dê dois cliques em **`install.bat`**. Escolha o idioma do mod: **English** (padrão, Enter), **Português (pt-BR)**, **Español** ou **Русский**. Ele acha o jogo, habilita a pasta de addons no `gameinfo.gi` (com backup) e copia o mod para `game\citadel\addons\pak42_dir.vpk`. No fim ele mostra o seu código de amigo da Steam, para o tracker.
3. Abra o jogo. No tracker, informe o código em loja (B) > Deadlock Utils > Configurações > Tracker.

Para trocar o idioma, rode o `install.bat` de novo (ele já sugere o idioma atual). **`uninstall.bat`** remove o mod e volta o `gameinfo.gi` ao original (se não houver outros mods).

**A partir do código** (para quem mexe no mod): o **`install.bat`** da raiz compila e instala (com a mesma escolha de idioma); o **`uninstall.bat`** remove. Para gerar o pacote de publicação: `powershell -ExecutionPolicy Bypass -File tools\empacotar.ps1` (cria `dist\DeadlockUtils-vX.Y.Z.zip` sem a sua conta Steam gravada).

> **Depois de cada atualização do Deadlock** rode o instalador de novo (a Steam restaura o `gameinfo.gi`). Se o patch mexer no HUD, recompile com `powershell -ExecutionPolicy Bypass -File tools\build-mod.ps1 -AtualizarHud`.

### Teclas

| Tecla | O quê |
|---|---|
| **M** | Mapa grande (de novo para fechar) |
| **F6** | Tracker (também no menu ESC) |
| **F8** | Liga/desliga o mod inteiro (esconde tudo e para de trabalhar) |
| **ESC** | Sempre fecha o mapa e o tracker |

As teclas do mod podem ser trocadas no jogo: loja > aba **Deadlock Utils** > **Configurações** > Atalhos.

### Configurações no jogo

Loja > aba **Deadlock Utils** > **Configurações**:

- **Mapa grande**: tamanho (pequeno, médio, grande), tamanho dos ícones dos heróis e do seu ícone, painel lateral, esconder os detalhes do placar no topo, quanto tempo a marcação fica no minimapa. O tamanho também muda direto no painel do mapa (botões - e +).
- **Minimapa**: deixa o minimapa normal maior (+15%, +30%, +50%), muda o tamanho do seu ícone nele e o tamanho dos pontos (pequenos, médios, grandes ou desligado).
- **Pontos no mapa**: liga e desliga cada tipo de ponto, separado para o mapa grande (botão Mapa) e para o minimapa (botão Mini). O painel do mapa grande tem um botão rápido para mostrar ou esconder os pontos do minimapa.
- **Atalhos**: troca as teclas do mapa, do tracker e de ligar/desligar o mod.

Tudo vale na hora. Para guardar entre partidas, a ponte precisa estar ativa (próxima seção).

### Ativar o tracker e o salvamento (precisa fazer uma vez)

O Panorama do Deadlock não tem armazenamento próprio, e o navegador embutido do jogo só abre páginas **HTTPS** publicadas na internet. O tracker, o salvamento das configurações, dos filtros do mapa e dos counters editados usam uma página pequena, `mod/pagina/ponte.html`, publicada pelo GitHub Pages deste repositório:

1. No repositório do GitHub, abra **Settings > Pages**.
2. Em **Build and deployment**, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)` e salve.
3. Depois de ~1 minuto, abra `https://oluizk.github.io/DeadlockUtils/mod/pagina/ponte.html` no navegador para conferir (página em branco com o título `DU_BOOT`).

O `data/config.json` já aponta para esse endereço (`"urlPonte"`). Num fork, troque pelo endereço do seu GitHub Pages e rode o `install.bat` de novo.

### Configuração: `data/config.json`

- `teclas.mapa` / `teclas.tracker`: teclas criadas pelo mod (`""` para não criar). **Alt+T não é usado** porque T é o Push-to-Talk do jogo: Alt+T abriria o microfone junto.
- `urlPonte`: endereço **HTTPS** onde `mod/pagina/ponte.html` está publicado (ex.: GitHub Pages do repositório). O navegador embutido do jogo só abre páginas HTTPS (build de out/2026); sem isso o tracker e o salvamento dos counters editados ficam desligados (o resto funciona).
- `accountId`: seu id Steam (SteamID3). Se ficar `null`, o build detecta pela pasta `Steam\userdata`. O tracker usa isso para achar sua partida ao vivo e o histórico com cada jogador.
- `idioma`: idioma padrão do build local (`"en"`, `"pt"`, `"es"` ou `"ru"`; vazio = inglês). Quem instala escolhe no `install.bat`, que grava o idioma no `.vpk` instalado.
- `itensPorSecao` (itens em cada seção do Tab), `segundosMarcaMapa` (quanto tempo a marca do mapa fica no minimapa), `buffPonteInicio`/`buffPonteIntervalo` (segundos), `segundosAviso`.

### Avisos

- O mod substitui o `hud.xml` do jogo: **outro mod que também substitua o `hud.xml` não funciona junto**.
- A Valve não publicou regras sobre mods. Mods de HUD não tiveram banimentos até hoje; mas **timers e trackers são justamente o tipo de mod que a comunidade aponta como mais arriscado** (desde mar/2026 o matchmaking bloqueia mudanças de ConVars no `gameinfo.gi`; este mod mexe só nas SearchPaths). **Use por sua conta e risco.**
- **Privacidade:** com `urlPonte` configurado, o mod abre essa página no navegador embutido do jogo (para o tracker e para salvar os counters editados), e o tracker envia ao `api.deadlock-api.com` os ids/nome Steam dos jogadores da partida.
- Se o HUD não carregar, rode o `uninstall.bat`.

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
  00-base  10-leitura  20-recomendacao  30-loja  35-editor  40-tab  50-mapa  60-ponte  70-tracker  90-principal
mod/layout/*.xml        layouts próprios (aba, botão, faixa do Tab, aviso, mapa, tracker)
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
- Transporte pelo navegador embutido: achados documentados em [Predi-i/Deadlock-UI-Mods](https://github.com/Predi-i/Deadlock-UI-Mods).
- Leitura dos arquivos do jogo (entidades do mapa, ícones, CSS do minimapa): [Source2Viewer / ValveResourceFormat](https://github.com/ValveResourceFormat/ValveResourceFormat) (MIT).
- Dados descompilados: [GameTracking-Deadlock](https://github.com/SteamTracking/GameTracking-Deadlock). Dados de jogadores: [deadlock-api.com](https://deadlock-api.com).
- Projeto de fã, sem vínculo com a Valve.
