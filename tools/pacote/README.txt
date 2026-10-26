DEADLOCK UTILS  (version {VERSAO})
https://github.com/Oluizk/DeadlockUtils

================================ ENGLISH ================================

INSTALL
  1. Close Deadlock.
  2. Extract the whole .zip to any folder.
  3. Double-click install.bat and pick your language:
       1 English   2 Português (pt-BR)   3 Español   4 Русский
     (Enter = English, or the language you picked last time)
  4. Open Deadlock.

  The installer finds the game, enables the mods folder in gameinfo.gi (with a backup)
  and copies the mod to game\citadel\addons\pak42_dir.vpk.
  To change the language later, just run install.bat again.
  After a Deadlock update, if the mod disappears, run install.bat again.

UNINSTALL
  Close Deadlock and double-click uninstall.bat.

HOW TO USE
  Shop (B) > Deadlock Utils tab     your hero's build, counters to the enemy team, dangerous items
  Hold Tab                          recommended items above the investments (click to buy)
  M                                 big map with timers, points of interest and filters
  F6 or ESC menu                    tracker (player ranks and history)
  F8                                turns the mod on and off
  Settings (in the shop tab)        map and minimap sizes, points, hotkeys, tracker

  Tracker: in Settings > Tracker, enter your Steam friend code
  (Steam > Friends > Add a Friend). The installer shows yours at the end.

MANUAL INSTALL (without the .bat, English only)
  1. Copy files\pak42_dir.vpk to  ...\steamapps\common\Deadlock\game\citadel\addons\
  2. In ...\Deadlock\game\citadel\gameinfo.gi, replace the lines
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

NOTES
  - The mod replaces the game HUD (hud.xml): another mod that does the same will not work with it.
  - Valve has not published rules about mods. HUD mods have not led to bans so far, but use it at
    your own risk.
  - The tracker and saved settings use the project's GitHub Pages page and the public
    deadlock-api.com API. No password is ever requested.

=========================== PORTUGUÊS (BRASIL) ===========================

INSTALAR
  1. Feche o Deadlock.
  2. Extraia o .zip inteiro em qualquer pasta.
  3. Dê dois cliques em install.bat e escolha o idioma:
       1 English   2 Português (pt-BR)   3 Español   4 Русский
     (Enter = inglês, ou o idioma que você escolheu da última vez)
  4. Abra o Deadlock.

  O instalador acha o jogo sozinho, habilita a pasta de mods no gameinfo.gi (com backup)
  e copia o mod para game\citadel\addons\pak42_dir.vpk.
  Para trocar o idioma depois, é só rodar o install.bat de novo.
  Depois de uma atualização do Deadlock, se o mod sumir, rode o install.bat de novo.

REMOVER
  Feche o Deadlock e dê dois cliques em uninstall.bat.

COMO USAR
  Loja (B) > aba Deadlock Utils    build do seu herói, counters do time inimigo, itens perigosos
  Segurar Tab                       itens recomendados acima dos investimentos (clique compra)
  M                                 mapa grande com timers, pontos de interesse e filtros
  F6 ou menu ESC                    tracker (rank e histórico dos jogadores)
  F8                                liga e desliga o mod
  Configurações (na aba da loja)    tamanhos do mapa e do minimapa, pontos, teclas, tracker

  Tracker: em Configurações > Tracker, informe seu código de amigo da Steam
  (Steam > Amigos > Adicionar um amigo). O instalador mostra o seu no final.

INSTALAR NA MÃO (sem o .bat, só em inglês)
  1. Copie files\pak42_dir.vpk para  ...\steamapps\common\Deadlock\game\citadel\addons\
  2. Em ...\Deadlock\game\citadel\gameinfo.gi, troque as linhas
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

AVISOS
  - O mod substitui o HUD do jogo (hud.xml): outro mod que também faça isso não funciona junto.
  - A Valve não publicou regras sobre mods. Mods de HUD não tiveram banimentos até hoje, mas use por
    sua conta e risco.
  - O tracker e o salvamento das configurações usam uma página do GitHub Pages do projeto e a API
    pública do deadlock-api.com. Nenhuma senha é pedida.

================================ ESPAÑOL ================================

  Instalar: cierra Deadlock, extrae el .zip, haz doble clic en install.bat y elige 3 (Español).
  Quitar: cierra Deadlock y haz doble clic en uninstall.bat.
  Teclas: tienda (B) > pestaña Deadlock Utils, mantener Tab, M (mapa), F6 (tracker), F8 (activar/desactivar).

================================ РУССКИЙ ================================

  Установка: закройте Deadlock, распакуйте .zip, запустите install.bat и выберите 4 (Русский).
  Удаление: закройте Deadlock и запустите uninstall.bat.
  Клавиши: лавка (B) > вкладка Deadlock Utils, удерживать Tab, M (карта), F6 (трекер), F8 (вкл/выкл).
