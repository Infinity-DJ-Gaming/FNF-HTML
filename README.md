# Friday Night Funkin' — Weeks 1–7, Weekend 1 and Sky Reborn

Independent Canvas / Web Audio browser recreation for GitHub Pages. Original game, artwork and music by ninjamuffin99, PhantomArcade, evilsk8r, Kawai Sprite and the Funkin Crew. [Support the original game](https://ninja-muffin24.itch.io/funkin). See NOTICE, LICENSE and provenance.json for attribution.

## Songs and play modes

Story Mode adds Tankman ft. JohnnyUtah (Ugh, Guns, Stress), Due Debts (Darnell, Lit Up, 2hot, Blazin') and Sky Reborn (Wife Forever, Sky, Manifest). These campaigns include their original video cutscenes. Weekend 1 plays as Pico. 2hot has its spray-can and gun actions, and Blazin' centers the player's lanes and uses punches, blocks, dodges and uppercuts.

In Freeplay, press **Tab**, move down from Boyfriend to **Sky**, and press **Enter**. Sky gets her own DJ, score records, results and 23 Sky Mixes. Boyfriend and Pico have their own charts for the Sky Reborn songs. Open **Sky Gallery** from the main menu. The original **S**, **K**, **Y** main-menu secret starts Sky Lyrics.

The built-in Sky integration ports chart data and selected native scripts to JavaScript. Some special scene choreography, effects and optional presentation differ from the desktop mod. The gallery uses its bundled still backgrounds.

Story and freeplay include Tutorial, Daddy Dearest, Spooky Month, Pico, Mommy Mearest, Red Snow and Hating Simulator: 19 base songs and 123 difficulty charts. The available original Erect/Nightmare and Pico Mix arrangements are included with synchronized vocals. Variants absent from the installed game are not invented (for example, no MILF Erect or Week 4 Pico Mix).

4K keeps the original charts. Switch to 6K in Options or with 6 in freeplay: LEFT, UP, RIGHT, LEFT, DOWN, RIGHT. Default bindings are S, D, F, J, K, L. Each song gets deterministic extra notes while retaining original note times, sustains, side ownership and arrow direction. 6K records are separate. Bindings can be changed in Options.

Arrows or bound keys play notes. Enter selects/pauses; Escape returns. Options includes offset/calibration, scroll speed/direction, centered notes, practice, autoplay, volume and reduced motion. Missing notes deducts more health. Practice, autoplay and custom playtests do not save ranked scores.

Mobile devices automatically get full-width centered player lanes, downscroll, a small opponent strumline in the corner and large touch columns. Keep a finger held and slide into a different column to release the old lane and press the next; multiple fingers, holds and touch cancellation are supported. Mobile layout can also be forced on/off in Options. The game fills the viewport.

## Original Week 5/6 sequences

Cocoa, Eggnog, Winter Horrorland, Senpai, Roses and Thorns include their original charts, audio, Christmas/pixel characters, mall/school stages and available native remixes. Week 6 uses pixel arrows, holds, countdown, ratings, combo digits, health icons, A-Bot and pixel game-over assets with nearest-neighbor drawing. Parents' Mom note kinds select their alternate singing animations; no-animation and censor note kinds are retained.

Story mode plays the installed game's exact Senpai/Roses/Thorns dialogue with original animated portraits/boxes, pixel font, typing sounds, music and transitions. Senpai/Roses Pico Mix conversations also play on first freeplay entry, matching their native scripts. Enter, Space or tap completes text/advances; Escape skips. Retries and chart-editor playtests skip introductions. Winter Horrorland has its native lights-on intro, and Eggnog Erect plays its 16-second Santa/parents ending before results. The original Roses story chart fades to red at beat 180, before Thorns. These built-in sequences are implemented in JavaScript; imported Haxe scripts still do not execute.

## Menus, characters and results

Modern freeplay supports previews (Space), favorites (F), search (Ctrl+F), alphabet filters, sorting, Random, instrumental selection (I), character selection (Tab), mods (M) and the chart editor (7). Pico has the original gun blueprint backing card. Character selection replays the spotlight movie and original stage/character timelines, music, locked slots, confirmation and exit sequence.

Native BF/Pico/GF/Nene timelines retain special poses and reactions. Semantic animation events resolve through character definitions, with visible fallbacks for unknown names. Player orientation uses native role-aware flipping for included and imported characters. At 150 BPM and above, player/opponent idle bops use two beats; partners alternate both rocking halves. A-Bot's display uses live audio FFT analysis. Erect stages include their crowd, lighting, props and revised floor/speaker placement. Philly train and limo dancers/fast-car effects are included.

Freeplay ends with a song result. Story mode ends with one combined result after the whole week. Native BF/Pico artwork, music and rank-dependent animation packs cover Gold Perfect, Perfect, Excellent, Great, Good and Loss. Rank uses the original completion formula; the gameplay accuracy display uses weighted hit judgements. Totals, max combo, judgements and misses are shown.

## Chart editor

Press 7 in play/freeplay. The gray inspector follows the supplied five-tab reference: Charting, Events, Note, Section, Song. Add/select/delete/duplicate notes, edit sustains and parameters, change BPM/speed/offset, choose difficulty/cast/stage, swap/mirror/copy/paste/insert/delete sections, scrub/loop audio, adjust track volumes, enable metronome/note clicks, undo/redo and autosave. Import/export classic chart JSON, local audio and events-only JSON. Enter playtests the current chart. Included note atlases can be selected by name; unavailable custom note styles are preserved in JSON and use the standard arrows.

Events supports add/update/delete/duplicate, timestamps, typed fields, raw JSON and timeline markers. Standard camera focus/zoom/bop, animation, per-side scroll speed, target dance rate and health-icon events are implemented. Unknown events and note parameters survive export. Space plays/pauses, A/D changes section, W/S scrubs, Q/E changes sustain, Ctrl+Z/Y undoes/redoes, Ctrl+S exports and 7 exits.

This is a browser editor modeled on the supplied legacy gray screenshot, rather than a full port of V-Slice's modern HaxeUI editor.

## Mods and compatibility

Open Mods in the main menu or press M in freeplay. Import a V-Slice ZIP/FNFC package. Archives stay in local IndexedDB; they are not uploaded. The manager discovers nested song folders, variations, difficulties, charts, instrumentals, split vocals and track offsets. Enable/disable/remove packages locally. Imported songs appear in freeplay and open in the editor.

Sparrow and Animate character artwork, per-animation asset paths, metadata flips/frame indices, standard stage images/props and common data events are supported. Each package includes a compatibility report. Browser camera/stage behavior approximates native behavior; Haxe/HXC scripts, native extensions, GPU shaders, script-specific cutscenes and arbitrary custom note mechanics do not execute. This is not a complete HaxeFlixel engine port, and arbitrary V-Slice mods may require unsupported features.

## Hosting and performance

All paths are relative. No backend, runtime dependency installation or build step is needed for the static release. In GitHub Settings → Pages, deploy main / root. Readable engine modules are bundled as sections in app.js; assets are flattened for distribution. Modular source can be served with `node tools/serve.mjs`. Run `node --test tests/*.test.mjs` and `node tools/check.mjs` for validation.

Classic atlases were repacked with preserved logical frame geometry. Stage images load as needed, effects decode before countdown, song audio uses a bounded cache, and viewport geometry is read once per frame. Performance still depends on browser, device and imported asset sizes.
