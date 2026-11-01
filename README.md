# Friday Night Funkin' — Week 1

An independent Canvas / Web Audio recreation of classic Week 1: Bopeebo, Fresh and Dad Battle. Story mode, freeplay, Easy / Normal / Hard, animated original artwork, music, vocals, held notes, scoring, pause/retry, saved high scores and options.

This repository contains the static release. Open the GitHub Pages site to play. All paths are relative; no build step, dependencies or server backend are needed.

## GitHub Pages

In Settings → Pages, choose **Deploy from a branch → main → / (root)**.

## Controls

Arrows or A/S/W/D to play. Enter to select/pause. Escape to return/resume. F for fullscreen, 0 to mute, -/= for volume. Rebind note keys and change timing, scrolling, volume, practice and autoplay in Options. Touchscreens support tapping and holding the player lanes.

## Source and credits

The new browser engine is bundled, with readable module sections, in app.js. Original assets, fonts and all nine charts come from [FunkinCrew/Funkin v0.2.7.1](https://github.com/FunkinCrew/Funkin/tree/v0.2.7.1); see LICENSE, NOTICE and provenance.json. Original game by **ninjamuffin99, PhantomArcade, evilsk8r and Kawai Sprite**. [Support the original game](https://ninja-muffin24.itch.io/funkin).

This fan recreation is not an official release or an exact HaxeFlixel port. The options/results screens and browser timing implementation are custom. Only Week 1 is included.

## Modern freeplay and remixes

The modern menu includes the original DJ Boyfriend/Pico animations, previews, favorites, alphabet filters, search, sorting, Random, character and instrumental selection, album artwork, and records per variant.

There are **24 charts**: nine classic Easy/Normal/Hard charts, six Boyfriend Erect/Nightmare charts, and nine Pico Mix charts. The remixes include their matching instrumentals/vocals and the Erect stage, Pico, Nene and A-Bot artwork. These newer assets come from the user's installed game and retain their creators' copyrights; consult NOTICE and variant-catalog.json.

Freeplay: Space previews, F favorites, Ctrl+F searches, Tab chooses a character, I chooses an instrumental, Home/End jumps through the list. Left/right chooses difficulty, Enter plays.

## Chart editor

Press **7** from gameplay or freeplay. Add/delete/select notes and sustains; edit BPM, speed, turn ownership, section length and note properties; copy/paste/mirror/swap/insert/delete sections; scrub and loop audio; use metronome and note clicks; undo/redo and autosave; import/export classic FNF JSON; load local audio; press Enter to playtest. Custom charts, practice and autoplay do not save ranked scores.

Space plays/pauses, A/D changes section (Shift moves four), W/S or wheel scrubs, Q/E edits a selected sustain, Tab changes panels, Ctrl+Z/Y undoes/redoes, Ctrl+S exports, R resets section (Shift resets song). Character names and alternate-animation flags are retained in exported charts; this project renders the included Week 1 characters.

## Performance

Large classic atlases were repacked and reduced from688MiB to188MiB decoded while keeping logical frame geometry. Gameplay sounds are decoded before the countdown, audio buffers use a bounded cache, and a timer fallback keeps rendering when a browser delays animation frames.
