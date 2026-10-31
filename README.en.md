# Deadlock Utils

**Português:** [README.md](README.md)

An in-game HUD mod for **Deadlock** (Valve), built with Panorama, the game's own UI system. Everything lives inside the game and follows the game's look: no overlay, no external app.

| Feature | How to use |
|---|---|
| **"Deadlock Utils" shop tab** | Open the shop (B): a new tab in the sidebar with the **counters** against the enemy team, on the shop's own item cards (native tooltip and click to buy). Items you already own stay on the page, marked by the game. The **Recommended Build** for your hero in the current phase (popularity data shipped with the game) is optional: turn it on in Settings > General. The tab remembers itself: close the shop on it and it is there when you open the shop again. |
| **Counter editor** | In the tab, **Edit counters**: pick an enemy hero, add or remove items, weight 1 to 4 and a reason. **Copy code** creates a short `DU1:...` code (one hero or everything you edited) to share; whoever receives it pastes it and clicks **Import**. |
| **Items on Tab** | While holding Tab, above the three investment circles, two rows of shop-style cards (the tier's paper card, icon, name, price, Active tag): **Counters** (with the portrait of who it counters) and **Your guide**, the next items of the build you picked in the shop's **Builds** tab (or the Recommended Build, if it is on). Each card's state (can buy, not enough souls, away from a shop) is read from the shop every 0.1 s; a bought item leaves the row right away. Hover shows why, click buys. |
| **Settings window** | **Right Shift**, the **Deadlock Utils** button in the ESC menu or **Settings** in the shop tab. Its own window with sections (General, Crosshair, Health, Scoreboard, Map, Map points, Hotkeys, Tracker, Backup), **search** across every option, **live preview** of the crosshair and the health bar, the default value on each option and a **backup code** `DUC1:...` to give your whole setup to a friend or another PC. |
| **Custom crosshair** | Settings > Crosshair. 8 styles (cross, cross + dot, dot, circle, circle + dot, T, X, chevron), color (palette or `#RRGGBB`), length, thickness, center gap, dot size, radius, opacity and outline. 5 presets. It hides only the game reticle: hit markers, ammo and reload stay from the game, and it hides together with the game crosshair (dead, other camera). |
| **Health bar** | Settings > Health. Colors by **bands** (75%, 50%, 25%), **gradient** or **fixed color**, pulse at critical health, colored health number, **instant health** (the bar changes right away, without the game animation that fills and drains it slowly) and a **small health bar near the crosshair** (below/left/right, number or %, only below X%). |
| **Scoreboard timers** | Inside the top scoreboard, next to the Rejuvenator timer and with the same look: **urn** (lights up when it is up, green or red border when your team or the enemy is carrying it, otherwise the time until the next one) and **bridge buffs** (read from the minimap, with the buff type icon; otherwise the time until the next ones). The **soul lead** shows next to the souls of the team that is ahead (+12%, green if it is yours). Holding Tab or on the big map, the bridge timer also shows over each bridge on the minimap. The time lights up when it is close (with a sound, if you want). Outside the match (hideout, countdown, end) none of it shows. |
| **Top scoreboard** | In the game's own scoreboard: every hero level always visible, colored against yours (blue below, red above), and faded portraits for enemies your team cannot see. |
| **Big map** | Press **M**: the game's own minimap becomes big in the middle of the screen. You can still ping, the cursor is free and your hero keeps moving. It shows every timer (clock, bridge, Rejuvenator, urn, rift, souls; click one to tell your team in chat), plus **points of interest with filters**: healing snacks, golden statues, crates, bridge buffs, cosmic veils, bells, rifts, jump pads, steam vents, ropes, teleporters, shops, soul urn, base sentries, neutral camps and **Rem's tunnels** (dotted paths and entrances, read from the game's own map files). Hover an icon to see what it is; **click to mark** the spot, and the mark stays on the regular minimap for a while after closing. ESC, M or opening the shop closes it. |
| **Transparent map** | Settings > Map: the big map and the minimap can be made see-through (85% to 40%) so you see the game behind them. The hero and objective icons fade with the map. |
| **Minimap points** | The same points can show on the regular minimap, with their own filters and smaller icons. |
| **Tracker** | **F6** or the **Tracker** button in the ESC menu. For each player: rank with the game's own badge, win rate bar, most played heroes, performance on the current hero and your record **with and against** them. Data from [deadlock-api.com](https://deadlock-api.com). |
| **Dangerous item alert** | When an enemy buys Knockdown, Cursed Relic, Refresher and similar items, an alert shows at the top of the screen with the enemy portrait and the item icon. |

## Using QOL Lock? Deadlock Utils - QOL Addon

[QOL Lock](https://gamebanana.com/mods/650634) (by civo) replaces the same HUD files as Deadlock Utils, so the regular version does not run with it. **Deadlock Utils - QOL Addon** (`DeadlockUtils-QOL-Addon-vX.Y.Z.zip`, file `pak43_dir.vpk`) runs together with QOL Lock without replacing any of its files: it loads through `hud_playerintents.xml`, which QOL Lock does not ship.

- QOL Lock keeps its HUD, menu, health bar, scoreboard and minimap.
- The addon adds the shop tab with counters and the counter editor, the Tab row, the custom crosshair, healing and jump pad points on the minimap (other points optional), the tracker and the dangerous item alert.
- All its settings are in a **Deadlock Utils** tab inside the QOL Lock window (ESC > QOL LOCK, "Addons" group), with QOL's look; there is no separate settings window. It follows QOL Lock's language when it is one of the mod's four.
- Keep QOL Lock first in the mod order. Do not install the regular version together: if both are running, the addon turns itself off and the regular version warns you.

## Install / uninstall

**To play** (no build needed):

The mod is a single file, `pak42_dir.vpk`.

1. **With a mod manager** (easiest): use the 1-click install button on GameBanana (Deadlock Mod Manager, Grimoire, HELLCAT) and launch the game from the manager ("Launch Modded").
2. **Manually:** download `DeadlockUtils-vX.Y.Z.zip` from [Releases](https://github.com/Oluizk/DeadlockUtils/releases), copy `pak42_dir.vpk` to `game\citadel\addons\` and enable the addons folder in `gameinfo.gi` (steps in the zip's `README.txt`). To remove it, delete the file.
3. Open the game. For the tracker, enter your Steam friend code in **Right Shift > Tracker**.

**Language:** English by default. Change it in the settings window (**Right Shift**) > **General > Language** (English, Português, Español, Русский); it switches right away and is saved.

> **After every Deadlock update**, run the installer again (Steam restores `gameinfo.gi`).

### Hotkeys

| Key | What |
|---|---|
| **M** | Big map (press again to close) |
| **F6** | Tracker (also in the ESC menu) |
| **Right Shift** | Settings window (also in the ESC menu > Deadlock Utils) |
| **F8** | Turns the whole mod on and off (and gives back the game crosshair, health bar and scoreboard) |
| **ESC** | Always closes the map, the tracker and the settings |

Hotkeys can be changed in game: **Right Shift > Hotkeys**.

For modders: every option in the settings window is one line in `SECOES_CFG` (`mod/src/75-ajustes.js`), with its default in `AJUSTES_PADRAO` and the texts `cfg.<id>` / `cfg.<id>.desc` in `data/textos.json`; the window draws itself (toggle, buttons, number, color, key, chips).

### Saving settings and the tracker

Deadlock's Panorama has no storage of its own, and the in-game browser only opens **HTTPS** pages. Saved settings, map filters, edited counters and the tracker use a small page, `mod/pagina/ponte.html`, served by this repository's GitHub Pages. Without it, everything still works but settings only last until you close the game.

### Language

English by default; pick **English, Português (pt-BR), Español or Русский** in Right Shift > General > Language; everything is translated, including counter reasons and alerts, and item names come from the game's own localization. UI texts live in `data/textos.json` and rule texts in `data/rules/*.json` as `{ "en", "pt", "es", "ru" }`; see [CONTRIBUTING.md](CONTRIBUTING.md).

## Notes

- The regular version replaces these game HUD layouts: `hud.xml`, `citadel_hud_top_bar.xml`, `citadel_hud_top_bar_player.xml` and `hud_health.xml`. The QOL Addon replaces only `hud_playerintents.xml`. Each one is the original from the same game version plus the mod's additions, rebuilt by the build script. **Another mod that replaces one of them will not work together with it.** If the scoreboard or health bar additions are missing, the mod turns off only those parts and logs why in the console.
- Valve has not published rules about mods. HUD mods have not led to bans so far, but timers and trackers are the kind of mod the community considers riskier. **Use it at your own risk.**
- **Privacy:** the tracker sends the Steam ids/names of the players in your match to `api.deadlock-api.com`. No password is ever requested.
- The crosshair, health bar and top scoreboard changes are on-screen styles only (no ConVars or game files); F8 restores everything. The team chat message (click a timer) uses `say_team` and is only sent when you click.
- If the HUD does not load after a game update, remove `pak42_dir.vpk` (or disable it in your mod manager) and wait for a mod update.

## For developers

Build and install from source: `install.bat` in the repository root (same language prompt); `uninstall.bat` removes it. Build the QOL Addon: `tools\build-mod.ps1 -Alvo qol` (writes `build\qol\pak43_dir.vpk`). Create the release packages: `powershell -ExecutionPolicy Bypass -File tools\empacotar.ps1` (writes `dist\DeadlockUtils-vX.Y.Z.zip` and `dist\DeadlockUtils-QOL-Addon-vX.Y.Z.zip`, each with its `.vpk` and `README.txt`, without the builder's Steam account). Test without the game: `iniciar.bat`, then open `http://localhost:8765/test/hud-simulado.html`. More in the Portuguese README and in [CONTRIBUTING.md](CONTRIBUTING.md).

## Credits

- Compiled resource format and `hud.xml` injection: [deadlock-build-bubble](https://github.com/cheetohsum/deadlock-build-bubble) (Apache-2.0).
- Saving/loading system (in-game browser transport): research by **Predi_i, Hanturaya and BubbleGumXD**, documented in [Predi-i/Deadlock-UI-Mods](https://github.com/Predi-i/Deadlock-UI-Mods).
- The QOL Addon is made to complement [QOL Lock](https://gamebanana.com/mods/650634) by civo ([QOLLOCK](https://github.com/civo7/QOLLOCK), Apache-2.0); its tab and tracker use QOL's look.
- Reading game files (map entities, icons, UI styles): [Source2Viewer / ValveResourceFormat](https://github.com/ValveResourceFormat/ValveResourceFormat) (MIT).
- Decompiled data: [GameTracking-Deadlock](https://github.com/SteamTracking/GameTracking-Deadlock). Player data and map points: [deadlock-api.com](https://deadlock-api.com).
- Fan project, not affiliated with Valve.
