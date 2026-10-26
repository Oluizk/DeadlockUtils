# Deadlock Utils

**Português:** [README.md](README.md)

An in-game HUD mod for **Deadlock** (Valve), built with Panorama, the game's own UI system. Everything lives inside the game and follows the game's look: no overlay, no external app.

| Feature | How to use |
|---|---|
| **"Deadlock Utils" shop tab** | Open the shop (B): a new tab in the sidebar. It shows dangerous items the enemies bought, the **build for your hero** in the current game phase (popularity data shipped with the game) and **counters** against the enemy team, using the shop's own item cards (native tooltip and click to buy). Items you already own stay on the page, marked by the game. |
| **Counter editor** | In the tab, **Edit counters**: pick an enemy hero, add or remove items, weight 1 to 4 and a reason. **Copy code** creates a short `DU1:...` code (one hero or everything you edited) to share; whoever receives it pastes it and clicks **Import**. |
| **Items on Tab** | While holding Tab, above the three investment circles: **Counters** (with the portrait of who it counters) and **Recommended** (your hero's build). Items you own disappear; items you cannot buy right now (not enough souls or away from a shop) are faded. Hover shows why, click buys. |
| **Big map** | Press **M**: the game's own minimap becomes big in the middle of the screen. You can still ping, the cursor is free and your hero keeps moving. It shows the clock, the **next bridge buff** and the **mid boss**, plus **points of interest with filters**: healing snacks, golden statues, crates, bridge buffs, cosmic veils, bells, rifts, jump pads, steam vents, ropes, teleporters, shops, soul urn, base sentries, neutral camps and **Rem's tunnels** (dotted paths and entrances, read from the game's own map files). Hover an icon to see what it is; **click to mark** the spot, and the mark stays on the regular minimap for a while after closing. ESC, M or opening the shop closes it. |
| **Minimap points** | The same points can show on the regular minimap, with their own filters and smaller icons. |
| **Tracker** | **F6** or the **Tracker** button in the ESC menu. For each player: rank, most played heroes, performance on the current hero and whether you played **with or against** them (and the result). Data from [deadlock-api.com](https://deadlock-api.com). |
| **Dangerous item alert** | When an enemy buys Knockdown, Cursed Relic, Refresher and similar items, an alert shows at the top of the screen. |
| **Settings** | In the shop tab, **Settings**: big map size, hero icon sizes, side panel, scoreboard details, mark duration, minimap size, minimap points, per-layer filters, hotkeys and your Steam friend code for the tracker. Changes apply right away. |

## Install / uninstall

**To play** (no build needed):

1. Download `DeadlockUtils-vX.Y.Z.zip` from [Releases](https://github.com/Oluizk/DeadlockUtils/releases) (or GameBanana) and extract it.
2. Close Deadlock and double-click **`Instalar.bat`**. It finds the game, enables the addons folder in `gameinfo.gi` (with a backup) and copies `pak42_dir.vpk` to `game\citadel\addons\`. At the end it shows your Steam friend code for the tracker.
3. Open the game. For the tracker, enter the code in shop (B) > Deadlock Utils > Settings > Tracker.

**`Desinstalar.bat`** removes the mod and restores `gameinfo.gi` (if no other mods are installed). Manual install steps are in `LEIA-ME.txt` inside the zip.

> **After every Deadlock update**, run the installer again (Steam restores `gameinfo.gi`).

### Hotkeys

| Key | What |
|---|---|
| **M** | Big map (press again to close) |
| **F6** | Tracker (also in the ESC menu) |
| **F8** | Turns the whole mod on and off |
| **ESC** | Always closes the map and the tracker |

Hotkeys can be changed in game: shop > **Deadlock Utils** tab > **Settings** > Hotkeys.

### Saving settings and the tracker

Deadlock's Panorama has no storage of its own, and the in-game browser only opens **HTTPS** pages. Saved settings, map filters, edited counters and the tracker use a small page, `mod/pagina/ponte.html`, served by this repository's GitHub Pages. Without it, everything still works but settings only last until you close the game.

### Language

The mod uses the game's language (Portuguese, English or Spanish; anything else falls back to English). Translations live in `data/textos.json`; see [CONTRIBUTING.md](CONTRIBUTING.md). The counter reasons in `data/rules/` are in Portuguese for now.

## Notes

- The mod replaces the game's `hud.xml`: **another mod that also replaces `hud.xml` will not work together with it**.
- Valve has not published rules about mods. HUD mods have not led to bans so far, but timers and trackers are the kind of mod the community considers riskier. **Use it at your own risk.**
- **Privacy:** the tracker sends the Steam ids/names of the players in your match to `api.deadlock-api.com`. No password is ever requested.
- If the HUD does not load after a game update, run `Desinstalar.bat` and wait for a mod update.

## For developers

Build and install from source: `instalar-mod.bat`. Create the release package: `powershell -ExecutionPolicy Bypass -File tools\empacotar.ps1` (writes `dist\DeadlockUtils-vX.Y.Z.zip`, without the builder's Steam account). Test without the game: `iniciar.bat`, then open `http://localhost:8765/test/hud-simulado.html`. More in the Portuguese README and in [CONTRIBUTING.md](CONTRIBUTING.md).

## Credits

- Compiled resource format and `hud.xml` injection: [deadlock-build-bubble](https://github.com/cheetohsum/deadlock-build-bubble) (Apache-2.0).
- In-game browser transport: findings documented in [Predi-i/Deadlock-UI-Mods](https://github.com/Predi-i/Deadlock-UI-Mods).
- Reading game files (map entities, icons, UI styles): [Source2Viewer / ValveResourceFormat](https://github.com/ValveResourceFormat/ValveResourceFormat) (MIT).
- Decompiled data: [GameTracking-Deadlock](https://github.com/SteamTracking/GameTracking-Deadlock). Player data and map points: [deadlock-api.com](https://deadlock-api.com).
- Fan project, not affiliated with Valve.
