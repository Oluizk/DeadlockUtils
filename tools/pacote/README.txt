DEADLOCK UTILS  (version {VERSAO})
https://github.com/Oluizk/DeadlockUtils

================================ ENGLISH ================================

INSTALL WITH A MOD MANAGER (easiest)
  Use the 1-click install button on GameBanana (Deadlock Mod Manager, Grimoire, HELLCAT...).
  Then launch the game from the manager ("Launch Modded").

INSTALL MANUALLY
  1. Close Deadlock.
  2. Copy pak42_dir.vpk to  ...\steamapps\common\Deadlock\game\citadel\addons\
     (create the "addons" folder if it does not exist; if you already have a mod named
     pak42_dir.vpk, rename this one to another free number, e.g. pak43_dir.vpk)
  3. In ...\Deadlock\game\citadel\gameinfo.gi, replace the lines
         Game    citadel
         Game    core
     with
         Game    citadel/addons
         Mod     citadel
         Write   citadel
         Game    citadel
         Mod     core
         Write   core
         Game    core
     (skip this step if you already use other mods: it is already done)
  4. Open Deadlock. After game updates, Steam may restore gameinfo.gi: redo step 3.

  To remove: delete pak42_dir.vpk from the addons folder.

LANGUAGE
  English by default. To change: shop (B) > Deadlock Utils tab > Settings > Language
  (English, Português, Español, Русский). It changes right away.

HOW TO USE
  Shop (B) > Deadlock Utils tab     your hero's build, counters to the enemy team, dangerous items
  Hold Tab                          recommended items above the investments (click to buy)
  M                                 big map with timers, points of interest and filters
  F6 or ESC menu                    tracker (player ranks and history)
  F8                                turns the mod on and off
  Settings (in the shop tab)        language, map and minimap sizes, points, hotkeys, tracker

  Tracker: in Settings > Tracker, enter your Steam friend code (Steam > Friends > Add a Friend).

NOTES
  - The mod replaces the game HUD (hud.xml): another mod that does the same will not work with it.
  - Valve has not published rules about mods. HUD mods have not led to bans so far, but use it at
    your own risk.
  - The tracker and saved settings use the project's GitHub Pages page and the public
    deadlock-api.com API. No password is ever requested.

=========================== PORTUGUÊS (BRASIL) ===========================

INSTALAR COM UM GERENCIADOR DE MODS (mais fácil)
  Use o botão de instalação em 1 clique do GameBanana (Deadlock Mod Manager, Grimoire, HELLCAT...).
  Depois abra o jogo pelo gerenciador ("Launch Modded").

INSTALAR NA MÃO
  1. Feche o Deadlock.
  2. Copie pak42_dir.vpk para  ...\steamapps\common\Deadlock\game\citadel\addons\
     (crie a pasta "addons" se não existir; se você já tem um mod chamado pak42_dir.vpk,
     renomeie este para outro número livre, por exemplo pak43_dir.vpk)
  3. Em ...\Deadlock\game\citadel\gameinfo.gi, troque as linhas
         Game    citadel
         Game    core
     por
         Game    citadel/addons
         Mod     citadel
         Write   citadel
         Game    citadel
         Mod     core
         Write   core
         Game    core
     (pule este passo se você já usa outros mods: ele já está feito)
  4. Abra o Deadlock. Depois de atualizações do jogo, a Steam pode restaurar o gameinfo.gi: refaça o passo 3.

  Para remover: apague o pak42_dir.vpk da pasta addons.

IDIOMA
  Inglês por padrão. Para trocar: loja (B) > aba Deadlock Utils > Configurações > Idioma
  (English, Português, Español, Русский). Muda na hora.

COMO USAR
  Loja (B) > aba Deadlock Utils    build do seu herói, counters do time inimigo, itens perigosos
  Segurar Tab                       itens recomendados acima dos investimentos (clique compra)
  M                                 mapa grande com timers, pontos de interesse e filtros
  F6 ou menu ESC                    tracker (rank e histórico dos jogadores)
  F8                                liga e desliga o mod
  Configurações (na aba da loja)    idioma, tamanhos do mapa e do minimapa, pontos, teclas, tracker

  Tracker: em Configurações > Tracker, informe seu código de amigo da Steam
  (Steam > Amigos > Adicionar um amigo).

AVISOS
  - O mod substitui o HUD do jogo (hud.xml): outro mod que também faça isso não funciona junto.
  - A Valve não publicou regras sobre mods. Mods de HUD não tiveram banimentos até hoje, mas use por
    sua conta e risco.
  - O tracker e o salvamento das configurações usam uma página do GitHub Pages do projeto e a API
    pública do deadlock-api.com. Nenhuma senha é pedida.
