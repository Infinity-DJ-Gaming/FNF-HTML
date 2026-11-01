# Friday Night Funkin' — Weeks 1 + 2

Independent Canvas / Web Audio browser recreation with GitHub Pages hosting. Original game and assets by ninjamuffin99, PhantomArcade, evilsk8r, Kawai Sprite and the Funkin Crew. [Support the original game](https://ninja-muffin24.itch.io/funkin). See NOTICE, LICENSE and provenance.json for attribution.

## Songs

Story mode includes Daddy Dearest (Bopeebo, Fresh, Dad Battle) and Spooky Month (Spookeez, South, Monster). Freeplay also includes the available Erect/Nightmare and Pico Mix versions: 43 charts across six base songs and ten variations. Monster has its original three difficulties and no invented Pico/Erect version.

## Play

Arrows or bound note keys play; Enter confirms or pauses; Escape returns. Options includes timing offset, rebinding, scrolling, practice, autoplay, volume and reduced motion. Scores are saved separately per song, difficulty and character. Practice, autoplay and custom playtests do not save ranked scores.

Freeplay supports previews (Space), favorites (F), search (Ctrl+F), alphabet filters, sorting, Random, instrumental selection (I), character selection (Tab) and the chart editor (7). Character selection replays the original spotlight movie, stage and character animation timelines, music, locked slots, confirmation and exit sequence.

Characters face the opponent. A-Bot's seven-column display uses live FFT audio analysis. Modern stages use the matching Girlfriend artwork and corrected Nene/speaker positions. At 150 BPM and higher, player/opponent idle dances restart every two beats. Spooky Month includes its mansion stages, lightning and thunder.

## Chart editor

Press 7 from play/freeplay. Add, select and delete notes; edit sustains, timing, BPM, speed and sections; copy/paste/mirror/swap sections; scrub or loop audio; undo/redo; import/export classic JSON; load local audio; playtest with Enter. Changes autosave locally. Space plays/pauses, A/D changes section, W/S scrubs, Q/E edits sustain, Ctrl+Z/Y undo/redo and Ctrl+S exports.

## Mods

Open Mods from the main menu, or press M in freeplay. Choose a V-Slice ZIP/FNFC package. The browser saves the archive locally using IndexedDB and discovers nested song folders, variations, declared difficulties, charts, instrumentals, split vocals and audio offsets. Enable, disable or remove packages from the manager. Imported songs appear in freeplay and can open in the chart editor.

Custom Sparrow/Animate character assets and standard stage props are supported. Common data events include camera focus/zoom, animation, camera bop, scroll speed, dance rate and health icons. Browser event behavior approximates the native implementation; script-defined mechanics, Haxe/native extensions, shaders and custom note styles do not execute. Each package includes a compatibility report. This is not a full HaxeFlixel engine port, and arbitrary V-Slice mods may need unsupported features.

## Hosting

Static relative paths, no backend or build dependencies. In repository Settings → Pages, deploy main / root. Serve the modular source with node tools/serve.mjs; run checks with node --test tests/*.test.mjs. The GitHub release bundles readable module sections in app.js and flattens the asset paths.

Large classic atlases are repacked to reduce decoded memory; effects load before countdown, music buffers use a bounded cache, and a render watchdog handles browsers delaying animation frames. Desktop performance still depends on browser, hardware and imported asset sizes.
