const MEDIA = 'assets/preferences/';
const WIDTH = 1280;
const HEIGHT = 720;
const YELLOW = '#fafd6d';
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const wrap = (value, size) => (value % size + size) % size;

const NOTES = ['noteLeft', 'noteDown', 'noteUp', 'noteRight'];
const SIX_NOTES = Array.from({length: 6}, (_, lane) => `note6_${lane}`);
const ESSENTIAL = new Set([...NOTES, ...SIX_NOTES, 'uiLeft', 'uiDown', 'uiUp', 'uiRight', 'accept', 'back']);
const KEYBOARD = {
  noteLeft: ['KeyA', 'ArrowLeft'], noteDown: ['KeyS', 'ArrowDown'],
  noteUp: ['KeyW', 'ArrowUp'], noteRight: ['KeyD', 'ArrowRight'],
  uiLeft: ['KeyA', 'ArrowLeft'], uiDown: ['KeyS', 'ArrowDown'],
  uiUp: ['KeyW', 'ArrowUp'], uiRight: ['KeyD', 'ArrowRight'],
  accept: ['KeyZ', 'Space', 'Enter'], back: ['KeyX', 'Backspace', 'Escape'],
  pause: ['KeyP', 'Enter', 'Escape'], reset: ['KeyR'], cutsceneAdvance: ['KeyZ', 'Enter'],
  favorite: ['KeyF'], freeplayLeft: ['KeyQ'], freeplayRight: ['KeyE'], characterSelect: ['Tab'],
  jumpTop: ['Home'], jumpBottom: ['End'], fullscreen: ['F11'], screenshot: ['F3'],
  volumeUp: ['Equal', 'NumpadAdd'], volumeDown: ['Minus', 'NumpadSubtract'],
  volumeMute: ['Digit0', 'Numpad0'], debugDisplay: ['F6'], dodge: ['Space'],
  ...Object.fromEntries(['KeyS','KeyD','KeyF','KeyJ','KeyK','KeyL'].map((key, lane) => [SIX_NOTES[lane], [key]])),
};
const GAMEPAD = {
  noteLeft: [14, 2, 100, 104], noteDown: [13, 0, 101, 105],
  noteUp: [12, 3, 102, 106], noteRight: [15, 1, 103, 107],
  uiLeft: [14, 100], uiDown: [13, 101], uiUp: [12, 102], uiRight: [15, 103],
  accept: [0], back: [1], pause: [9], reset: [8], cutsceneAdvance: [0], favorite: [3],
  freeplayLeft: [4], freeplayRight: [5], characterSelect: [2], jumpTop: [106], jumpBottom: [105],
  fullscreen: [], screenshot: [], volumeUp: [], volumeDown: [], volumeMute: [], debugDisplay: [], dodge: [6],
  ...Object.fromEntries([4, 14, 13, 0, 1, 5].map((button, lane) => [SIX_NOTES[lane], [button]])),
};

export const PREFERENCE_DEFAULTS = Object.freeze({
  naughtyness: true, strumlineBackground: 0, flashingLights: true, cameraZooms: true,
  subtitles: true, autoPause: true, autoFullscreen: false, debugDisplay: 'Off', debugDisplayBG: .5,
  hideMouse: true, fancyPreview: true, previewOnSave: true,
  comboPopup: true, comboSwoosh: true, comboSwooshSound: true, comboSwooshThreshold: 0,
  cacheComboAssets: true, normalShaders: false, skyDisableMenus: false,
  qtLanguage: 'english', qtSawbladeMode: 'default', qtPlushieButton: true,
});

const validKey = value => typeof value === 'string' && /^(?:Key[A-Z]|Digit[0-9]|Arrow(?:Left|Right|Up|Down)|F(?:[1-9]|1[0-2])|Numpad(?:[0-9]|Add|Subtract|Multiply|Divide|Decimal|Enter)|Bracket(?:Left|Right)|(?:Control|Shift|Alt)(?:Left|Right)|Space|Enter|Escape|Backspace|Tab|Home|End|PageUp|PageDown|Insert|Delete|CapsLock|Backquote|Backslash|Semicolon|Quote|Comma|Period|Slash|Minus|Equal)$/.test(value);
const validButton = value => Number.isInteger(value) && (value >= 0 && value < 32 || value >= 100 && value < 108);
const validBinding = (value, device) => device === 'gamepad' ? validButton(value) : validKey(value);
const limitNumber = (raw, key, fallback, min, max) => Number.isFinite(raw[key]) ? clamp(raw[key], min, max) : fallback;

export function normalizePreferences(raw = {}, base = {}) {
  if (!raw || typeof raw !== 'object') raw = {};
  const result = {...base, ...PREFERENCE_DEFAULTS};
  for (const [key, fallback] of Object.entries(PREFERENCE_DEFAULTS)) {
    if (typeof fallback === 'boolean' && typeof raw[key] === 'boolean') result[key] = raw[key];
  }
  for (const [key, min, max] of [['strumlineBackground', 0, 1], ['debugDisplayBG', 0, 1], ['comboSwooshThreshold', 0, 300]]) {
    result[key] = limitNumber(raw, key, result[key], min, max);
  }
  result.offset = limitNumber(raw, 'offset', base.offset || 0, -1500, 1500);
  result.debugDisplay = ['Off', 'Simple', 'Advanced'].includes(raw.debugDisplay) ? raw.debugDisplay : 'Off';
  result.qtSawbladeMode = ['default', 'instakill', 'disabled'].includes(raw.qtSawbladeMode) ? raw.qtSawbladeMode : 'default';
  result.qtLanguage = raw.qtLanguage === 'spanish' ? 'spanish' : 'english';
  result.bindings = {keyboard: {}, gamepad: {}};
  for (const [device, defaults] of Object.entries({keyboard: KEYBOARD, gamepad: GAMEPAD})) {
    for (const [action, values] of Object.entries(defaults)) {
      const saved = raw.bindings?.[device]?.[action];
      let fallback = values;
      if (device === 'keyboard') {
        const note = NOTES.indexOf(action), six = SIX_NOTES.indexOf(action);
        const legacy = note >= 0 ? (base.keys || raw.keys)?.[note] : six >= 0 ? (base.keys6 || raw.keys6)?.[six] : null;
        if (validKey(legacy)) fallback = [legacy, ...values.slice(1).filter(value => value !== legacy)];
      }
      const binding = Array.isArray(saved) ? saved.slice(0, 4).map(value => validBinding(value, device) ? value : null) : [...fallback];
      result.bindings[device][action] = binding.some(value => value !== null) || !ESSENTIAL.has(action) ? binding : [...fallback];
    }
  }
  syncLegacyKeys(result);
  return result;
}

function syncLegacyKeys(settings) {
  for (const [field, actions] of [['keys', NOTES], ['keys6', SIX_NOTES]]) {
    settings[field] = actions.map(action => settings.bindings.keyboard[action].find(Boolean) || KEYBOARD[action][0]);
  }
}

export function bindingFor(settings, action, input, device = 'keyboard') {
  const bindings = settings.bindings?.[device]?.[action] ?? (device === 'gamepad' ? GAMEPAD : KEYBOARD)[action];
  return input != null && (bindings?.includes(input) ?? false);
}

export function noteLaneFor(settings, input, count = 4, device = 'keyboard') {
  const actions = count === 6 ? SIX_NOTES : NOTES;
  const lane = actions.findIndex(action => bindingFor(settings, action, input, device));
  // Four directional keys remain useful in the optional six-key chart layout.
  if (lane < 0 && count === 6 && device === 'keyboard') {
    const direction = ['ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowRight'].indexOf(input);
    return [0, 4, 1, 2][direction] ?? -1;
  }
  return lane;
}

export class GamepadPoller {
  constructor() { this.held = new Set(); this.connected = false; this.index = null; }
  poll(onButton) {
    let pad = null;
    try {
      const pads = globalThis.navigator?.getGamepads?.() || [];
      pad = pads[this.index] || Array.from(pads).find(candidate => candidate?.connected);
    } catch { /* The browser can restrict Gamepad access in embedded pages. */ }
    this.connected = Boolean(pad);
    this.index = pad?.index ?? null;
    const next = new Set();
    if (pad) {
      for (const [index, button] of pad.buttons.entries()) if (button.pressed || button.value > .5) next.add(index);
      const axes = pad.axes;
      for (const [offset, values] of [[100, [-axes[0], axes[1], -axes[1], axes[0]]], [104, [-axes[2], axes[3], -axes[3], axes[2]]]]) {
        values.forEach((value, index) => {
          const code = offset + index;
          if (value > (this.held.has(code) ? .35 : .55)) next.add(code);
        });
      }
    }
    for (const code of this.held) if (!next.has(code)) onButton(code, false);
    for (const code of next) if (!this.held.has(code)) onButton(code, true);
    this.held = next;
  }
}

export const NAUGHTYNESS_EFFECTS = Object.freeze({
  roses: ['roses-censored', 'roses-pico-censored', 'roses-sky-censored'],
  tankmanDeathQuotes: {bf: [1, 3, 8, 13, 17, 21], pico: [4, 7, 8, 9]},
  resultAnimations: 'Use player result entries tagged safe or naughty for the current setting.',
  skyCleanAnimations: ['gf-crucified', 'sky-christmas', 'sky-pixel'],
  skyWeek7: 'Censored Ugh, Guns and Stress audio/subtitles, and Stress ends its safe intro at 15.5 s.',
  skyPicoIntro: 'Candy blam/dead poses and BOOMpretty sound replace the graphic branch.',
  skyManifestPico: 'The safe ending cuts at 6.4 s before the graphic aftermath.',
});

export function tankmanDeathQuote(actor, opponent, naughtyness = true, random = Math.random) {
  const holding = ['bf-holding-gf', 'pico-holding-nene'].includes(actor);
  if (opponent !== 'tankman' && !holding) return null;
  const identity = ['bf', 'bf-holding-gf', 'bf-qt'].includes(actor) ? 'bf' :
    ['pico', 'pico-playable', 'pico-dark', 'pico-christmas', 'pico-holding-nene', 'pico-sky'].includes(actor) ? 'pico' : null;
  if (!identity) return null;
  const excluded = naughtyness ? [] : NAUGHTYNESS_EFFECTS.tankmanDeathQuotes[identity];
  const choices = Array.from({length: identity === 'bf' ? 25 : 10}, (_, index) => index + 1).filter(index => !excluded.includes(index));
  return `prefs-jeff-${identity}-${choices[clamp(Math.floor(random() * choices.length), 0, choices.length - 1)]}`;
}

export function naughtyAnimation(character, name, naughtyness = true, animationMap = null) {
  if (naughtyness || !NAUGHTYNESS_EFFECTS.skyCleanAnimations.includes(character)) return name;
  if (character !== 'gf-crucified' && !['firstDeath', 'deathLoop', 'deathConfirm'].includes(name)) return name;
  const clean = `${name}-clean`;
  return !animationMap || animationMap[clean] ? clean : name;
}

export function skyDeathSounds(character, naughtyness = true) {
  if (!/^sky(?:-|$)/.test(character || '')) return null;
  const pixel = character === 'sky-pixel';
  const suffix = pixel ? 'pixel-sky' : 'sky';
  const loss = character === 'sky-christmas' ? `sky-christmas${naughtyness ? '' : '-clean'}` : character === 'sky-blazin' ? 'sky-gutpunch' : suffix;
  return {loss: `prefs-fnf_loss_sfx-${loss}`, loop: `prefs-gameOver-${suffix}`, confirm: `prefs-gameOverEnd-${suffix}`};
}

const percent = value => `${Math.round(100 * value)}%`;
const titleCase = value => String(value).slice(0, 1).toUpperCase() + String(value).slice(1);
const flag = (key, label, description, capability) => ({key, label, description, type: 'flag', capability});
const number = (key, label, description, min, max, step, format = String) => ({key, label, description, type: 'number', min, max, step, format});
const choices = (key, label, description, values, format = titleCase, capability) => ({key, label, description, type: 'choices', values, format, capability});
const action = (label, run, description = '') => ({label, run, description, type: 'action'});

const PREFERENCES = [
  flag('naughtyness', 'Naughtyness', 'When enabled, raunchy content (such as swearing, etc.) is displayed.'),
  flag('downscroll', 'Downscroll', 'When enabled, notes move downwards toward the strumline at the bottom of the screen.'),
  number('strumlineBackground', 'Strumline Background', 'Show a semi-transparent background behind the strumline.', 0, 1, .1, percent),
  flag('flashingLights', 'Flashing Lights', 'When disabled, flashing effects are dampened.'),
  flag('cameraZooms', 'Camera Zooms', 'When enabled, the camera bounces during songs.'),
  flag('subtitles', 'Subtitles', 'When enabled, subtitles appear during some songs and cutscenes.'),
  choices('debugDisplay', 'Debug Display', 'Show the frame rate or the expanded performance display.', ['Off', 'Simple', 'Advanced']),
  number('debugDisplayBG', 'Debug Display BG', 'Adjust the debug display’s background opacity.', 0, 1, .1, percent),
  flag('autoPause', 'Pause on Unfocus', 'Automatically pause when the game loses focus.'),
  flag('autoFullscreen', 'Launch in Fullscreen', 'Enter fullscreen when you start the game.'),
  flag('hideMouse', 'Hide Mouse', 'Hide the pointer when taking a screenshot.', 'screenshots'),
  flag('fancyPreview', 'Fancy Preview', 'Show a preview after taking a screenshot.', 'screenshots'),
  flag('previewOnSave', 'Preview on Save', 'Show the screenshot preview after saving the image.', 'screenshots'),
  flag('comboPopup', 'Combo Popup', 'Show the combo popup when you hit ten or more notes in a row.'),
  flag('comboSwoosh', 'Combo Swoosh', 'Show the combo animation after a break between notes.'),
  flag('comboSwooshSound', 'Combo Swoosh Sound', 'Play the combo sound when the swoosh appears.'),
  number('comboSwooshThreshold', 'Combo Swoosh Threshold', 'The minimum combo needed for the swoosh to play.', 0, 300, 1),
  flag('cacheComboAssets', 'Cache Combo Assets', 'Load the combo art and sound before the song starts.'),
  flag('normalShaders', 'Normal Shaders', 'Use stage shaders in songs on normal stages.'),
  number('volume', 'Volume', 'Adjust the overall game volume.', 0, 1, .05, percent),
  number('sfxVolume', 'Sound Effects', 'Adjust the sound effects volume.', 0, 1, .05, percent),
  flag('ghostTapping', 'Ghost Tapping', 'Allow empty lane presses without a miss.'),
  flag('middlescroll', 'Middlescroll', 'Move your notes to the center of the screen.'),
  flag('reducedMotion', 'Reduced Motion', 'Reduce moving backgrounds and menu effects.'),
  number('backgroundDim', 'Background Dim', 'Dim the stage behind the gameplay HUD.', 0, .8, .1, percent),
  number('scrollSpeed', 'Scroll Speed', 'Multiply the chart’s note speed.', .5, 3, .1, value => `${value.toFixed(1)}x`),
  choices('touchLayout', 'Touch Controls', 'Choose when the onscreen touch controls are visible.', ['auto', 'on', 'off']),
  choices('keyMode', 'Key Mode', 'Choose the lane count for the next song.', [4, 6], value => `${value}K`),
  flag('practice', 'Practice Mode', 'Practice songs without losing on low health. Scores are disabled.'),
  flag('botplay', 'Autoplay', 'Let the game hit notes for you. Scores are disabled.'),
];

const REWIRED = [
  choices('qtLanguage', 'Language', 'Change the language used by QT: Rewired dialogue.', ['english', 'spanish'], titleCase, 'rewiredLanguage'),
  choices('qtSawbladeMode', 'Sawblade Mode', 'Change how the QT: Rewired sawblade mechanic works.', ['default', 'instakill', 'disabled'], titleCase, 'rewiredHazards'),
  flag('qtPlushieButton', 'Plushie Button', 'Show the QT: Rewired plush campaign button in the main menu.', 'rewiredPlushie'),
];

const ROOT_PAGES = [['preferences', 'Preferences'], ['controls', 'Controls'], ['rewired', 'Rewired Options'],
  ['lag', 'Lag Adjustment'], ['save', 'Save Data Options'], ['sky', 'Sky Reborn']];

const BUTTON_LABELS = ['A','B','X','Y','LB','RB','LT','RT','Select','Start','L3','R3','D-Pad Up','D-Pad Down','D-Pad Left','D-Pad Right','Home'];
const STICK_LABELS = ['Left','Down','Up','Right'];
export function inputLabel(value, device = 'keyboard') {
  if (value == null) return '---';
  if (device === 'gamepad') {
    if (value >= 100) return `${value < 104 ? 'L' : 'R'} Stick ${STICK_LABELS[(value - 100) % 4]}`;
    return BUTTON_LABELS[value] || `Button ${value + 1}`;
  }
  return ({Backspace:'Backspace', Backquote:'`', BracketLeft:'[', BracketRight:']', Semicolon:';', Quote:"'", Comma:',', Period:'.',
    Slash:'/', Backslash:'\\', Minus:'-', Equal:'=', Escape:'Escape', NumpadAdd:'Num +', NumpadSubtract:'Num -'})[value] || value.replace(/^(Key|Digit|Arrow)/, '').replace(/^(Control|Shift|Alt)(Left|Right)$/, '$2 $1');
}

function controlGroups(keyMode, capabilities) {
  const noteActions = keyMode === 6 ? SIX_NOTES.map((name, lane) => [name, `Lane ${lane + 1}`]) : NOTES.map((name, lane) => [name, STICK_LABELS[lane]]);
  const groups = [
    ['Notes', noteActions], ['UI', [['uiLeft','Left'],['uiDown','Down'],['uiUp','Up'],['uiRight','Right'],['accept','Accept'],['back','Back'],['pause','Pause'],['reset','Reset']]],
    ['Cutscene', [['cutsceneAdvance','Advance']]],
    ['Freeplay', [['favorite','Favorite'],['freeplayLeft','Left'],['freeplayRight','Right'],['characterSelect','Char Select'],['jumpTop','Jump To Top'],['jumpBottom','Jump To Bottom']]],
    ['Window', [['fullscreen','Fullscreen'], ...(capabilities.screenshots ? [['screenshot','Screenshot']] : [])]],
    ['Volume', [['volumeUp','Up'],['volumeDown','Down'],['volumeMute','Mute']]],
    ['Debug', [['debugDisplay','Display']]],
  ];
  if (capabilities.rewiredHazards) groups.push(['QT Rewired', [['dodge','Dodge']]]);
  return groups;
}

let atlasPromise;
function loadAtlases() {
  if (!atlasPromise) atlasPromise = fetch(MEDIA + 'atlases.json').then(response => {
    if (!response.ok) throw new Error('Could not load settings artwork.');
    return response.json();
  }).catch(error => { atlasPromise = null; throw error; });
  return atlasPromise;
}

const imageCache = new Map();
function loadImage(name) {
  if (!imageCache.has(name)) {
    const image = new Image();
    image.src = MEDIA + name + '.png';
    const loading = image.decode().then(() => image).catch(error => { imageCache.delete(name); throw error; });
    imageCache.set(name, loading);
  }
  return imageCache.get(name);
}

function drawFrame(ctx, image, frame, x, y, scale = 1) {
  if (!image || !frame) return;
  const dx = x - (frame.frameX || 0) * scale;
  const dy = y - (frame.frameY || 0) * scale;
  ctx.drawImage(image, frame.x, frame.y, frame.width, frame.height, dx, dy, frame.width * scale, frame.height * scale);
}

function type(ctx, message, x, y, size = 32, {align = 'center', color = '#fff', outline = 3} = {}) {
  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.font = `${size}px VCR, monospace`;
  ctx.lineJoin = 'round';
  if (outline) {
    ctx.lineWidth = outline * 2;
    ctx.strokeStyle = '#000';
    ctx.strokeText(message, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(message, x, y);
  ctx.restore();
}

function fill(ctx, x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }

function textLines(ctx, sentence, width, size) {
  ctx.save();
  ctx.font = `${size}px VCR, monospace`;
  const lines = [];
  for (const paragraph of sentence.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > width) { lines.push(line); line = word; }
      else line = next;
    }
    lines.push(line);
  }
  ctx.restore();
  return lines;
}

const BEAT = 600;
class LagAudio {
  constructor(settings) { this.settings = settings; this.started = 0; }
  start() {
    this.stop();
    this.started = performance.now();
    this.loopOffset = 0;
    this.previous = 0;
    this.track = new Audio(MEDIA + 'offsetsLoop.ogg');
    this.drums = new Audio(MEDIA + 'drumsLoop.ogg');
    for (const audio of [this.track, this.drums]) { audio.loop = true; audio.preload = 'auto'; }
    this.volume(false);
    this.track.play().catch(() => {});
  }
  beatDrums(enabled) {
    if (!this.track) return;
    this.volume(enabled);
    if (enabled && this.drums.paused) {
      this.drums.currentTime = this.track.currentTime;
      this.drums.play().catch(() => {});
    } else if (!enabled) this.drums.pause();
  }
  volume(drums) {
    if (!this.track) return;
    this.track.volume = (this.settings.volume ?? .7) * .8;
    this.drums.volume = drums ? (this.settings.volume ?? .7) * .9 : 0;
  }
  time() {
    const track = this.track;
    if (!track || track.paused) return Math.max(0, performance.now() - this.started);
    const position = track.currentTime * 1000;
    if (position + BEAT < this.previous && Number.isFinite(track.duration)) this.loopOffset += track.duration * 1000;
    this.previous = position;
    return this.loopOffset + position;
  }
  stop() { this.track?.pause(); this.drums?.pause(); this.track = null; this.drums = null; }
}

export class PreferencesMenu {
  constructor({settings, assets, save = () => {}, onExit = () => {}, announce = () => {}, sfx = () => {},
    exportSave, importSave, clearSave, resetSettings, onLagChange = () => {}, capabilities = {}}) {
    Object.assign(this, {settings, assets, save, onExit, announce, sfx, exportSave, importSave, clearSave, resetSettings, onLagChange});
    this.capabilities = {screenshots: true, rewiredHazards: true, ...capabilities};
    this.images = {};
    this.atlases = {};
    this.lagAudio = new LagAudio(settings);
    this.active = false;
    this.checkboxAt = new Map();
    this.lastPointer = null;
    this.screenshotView = null;
  }

  async load() {
    if (this.loading) return this.loading;
    this.loading = Promise.all([
      loadAtlases().then(atlases => { this.atlases = atlases; }),
      ...['options-bg', 'checkbox', 'latencyArrow', 'latencyReceptor'].map(name => loadImage(name).then(image => { this.images[name] = image; })),
    ]).catch(error => { this.loading = null; this.announce(error.message); });
    return this.loading;
  }

  open({paused = false} = {}) {
    this.active = true;
    this.paused = paused;
    this.page = 'root';
    this.selected = this.rootSelection || 0;
    this.scroll = 0;
    this.prompt = null;
    this.rebind = null;
    this.lagMode = null;
    this.load();
  }

  close() {
    if (this.page === 'lag') { this.lagAudio.stop(); this.onLagChange(false, this.paused); }
    this.active = false;
    this.prompt = null;
    this.rebind = null;
    this.lagMode = null;
  }

  openPage(page) {
    this.rootSelection = this.selected;
    this.page = page;
    this.selected = 0;
    this.scroll = 0;
    this.prompt = null;
    if (page === 'controls') { this.device = 'keyboard'; this.column = 0; this.deviceTabs = true; }
    if (page === 'lag') { this.onLagChange(true, this.paused); this.lagAudio.start(); }
    this.sfx('confirmMenu', .55);
  }

  back() {
    if (this.prompt || this.rebind) { this.prompt = null; this.rebind = null; this.sfx('cancelMenu', .55); return; }
    if (this.lagMode) { this.finishLag(false); return; }
    if (this.page === 'controls' && !this.deviceTabs) { this.deviceTabs = true; this.scroll = 0; return; }
    if (this.page === 'root') {
      this.close();
      this.onExit(this.paused);
    } else {
      if (this.page === 'lag') { this.lagAudio.stop(); this.onLagChange(false, this.paused); }
      this.page = 'root'; this.selected = this.rootSelection; this.scroll = 0;
      this.sfx('cancelMenu', .6);
    }
  }

  rows() {
    if (this.page === 'root') return [...ROOT_PAGES.map(([page, label]) => action(label, () => this.openPage(page))), action('Exit', () => this.back())];
    if (this.page === 'preferences') return PREFERENCES.filter(row => (!row.capability || this.capabilities[row.capability]) && (!this.paused || !['keyMode','practice','botplay'].includes(row.key)));
    if (this.page === 'rewired') return [...REWIRED.filter(row => this.capabilities[row.capability]), action('Exit', () => this.back())];
    if (this.page === 'sky') return [flag('skyDisableMenus', 'Disable Menus', 'Revert the title and main menu to the original game style.'), action('Exit', () => this.back())];
    if (this.page === 'lag') return [number('offset','Offset (Global)','Adjust the timing offset in milliseconds.',-1500,1500,1), action('Reset Offset',() => this.change('offset',0)), action('Offset Calibration',() => this.beginLag('calibrate')), action('Test',() => this.beginLag('test'))];
    if (this.page === 'save') return [
      ...(this.exportSave ? [action('Export Save Data', () => this.exportSave())] : []),
      ...(this.importSave ? [action('Import Save Data', () => this.confirmPrompt('Replace this browser’s save data with a backup?', 'Import', () => this.importSave()))] : []),
      ...(this.clearSave && !this.paused ? [action('Clear Save Data', () => this.confirmPrompt('This will delete all your save data.\nAre you sure?', 'Delete', () => this.clearSave()))] : []),
      ...(this.resetSettings ? [action('Reset Settings', () => this.confirmPrompt('Restore all default settings and controls?', 'Reset', () => this.resetSettings()))] : []),
      action('Exit', () => this.back()),
    ];
    return [];
  }

  get controls() { return controlGroups(this.settings.keyMode, this.capabilities).flatMap(([, rows]) => rows); }

  move(delta) {
    const rows = this.page === 'controls' ? this.controls : this.rows();
    this.selected = wrap(this.selected + delta, rows.length || 1);
    const row = rows[this.selected];
    this.sfx('scrollMenu', .38);
    this.announce(row?.label || row?.[1] || '');
  }

  wheel(delta) {
    if (!this.active || this.prompt || this.rebind || this.lagMode || Math.abs(delta) < 5) return false;
    if (this.page === 'controls') this.deviceTabs = false;
    this.move(Math.sign(delta));
    return true;
  }

  change(key, value) {
    this.settings[key] = value;
    this.checkboxAt.set(key, performance.now());
    this.save(key, value);
  }

  adjust(delta, confirm = false) {
    const row = this.rows()[this.selected];
    if (!row) return;
    if (row.type === 'action') { if (confirm) row.run(); return; }
    const old = this.settings[row.key];
    if (row.type === 'flag') this.change(row.key, !old);
    if (row.type === 'choices') this.change(row.key, row.values[wrap(row.values.indexOf(old) + delta, row.values.length)]);
    if (row.type === 'number' && !confirm) this.change(row.key, Math.round(clamp((old ?? row.min) + row.step * delta, row.min, row.max) * 1000) / 1000);
    this.sfx(confirm ? 'confirmMenu' : 'scrollMenu', .42);
    this.announce(`${row.label} ${row.type === 'flag' ? (this.settings[row.key] ? 'on' : 'off') : row.format(this.settings[row.key])}`);
  }

  confirmPrompt(message, label, run) { this.prompt = {message, label, run, selected: 1}; }

  applyPrompt(confirmed) {
    const prompt = this.prompt;
    this.prompt = null;
    this.sfx(confirmed ? 'confirmMenu' : 'cancelMenu', .55);
    if (confirmed) Promise.resolve().then(prompt.run).catch(error => this.announce(error.message));
  }

  startRebind() { this.rebind = {action: this.controls[this.selected][0], column: this.column, device: this.device}; }

  bind(value) {
    const {action: control, column, device} = this.rebind;
    const map = this.settings.bindings[device];
    const current = map[control];
    if (value === 'Digit7') { this.announce('7 opens the chart editor. Choose another key.'); return; }
    if (value != null && !validBinding(value, device)) return;
    if (value == null && ESSENTIAL.has(control) && current.filter((binding, index) => binding != null && index !== column).length === 0) {
      this.announce('Keep at least one binding for this action.');
      return;
    }
    const noteGroup = NOTES.includes(control) ? NOTES : SIX_NOTES.includes(control) ? SIX_NOTES : [];
    const previous = current[column] ?? null;
    if (value != null) {
      const duplicate = current.indexOf(value);
      if (duplicate >= 0 && duplicate !== column) current[duplicate] = previous;
      for (const other of noteGroup) {
        if (other === control) continue;
        const index = map[other].indexOf(value);
        if (index < 0) continue;
        if (previous == null && map[other].filter(binding => binding != null).length === 1) {
          this.announce('That input is the only binding for another note.');
          return;
        }
        map[other][index] = previous;
      }
    }
    while (current.length <= column) current.push(null);
    current[column] = value;
    syncLegacyKeys(this.settings);
    this.save('bindings', this.settings.bindings);
    this.rebind = null;
    this.sfx('confirmMenu', .55);
    this.announce(value == null ? 'Binding removed.' : `${inputLabel(value, device)} assigned.`);
  }

  beginLag(mode) {
    this.lagMode = mode;
    this.lagStart = Math.floor(this.lagAudio.time() / BEAT) * BEAT + 4 * BEAT;
    this.lagSamples = [];
    this.lastTapBeat = -1;
    this.lastTapAt = -Infinity;
    this.lagAudio.beatDrums(true);
    this.announce(mode === 'calibrate' ? 'Press any key to the beat. Enter saves the estimate.' : 'Hit the notes as they arrive. Escape returns.');
  }

  tapLag(input, device) {
    const time = this.lagAudio.time() - this.lagStart - (this.lagMode === 'test' ? this.settings.offset : 0);
    const beat = Math.round(time / BEAT);
    const error = time - beat * BEAT;
    if (beat < 0 || beat === this.lastTapBeat || Math.abs(error) > 280) return;
    if (this.lagMode === 'test' && noteLaneFor(this.settings, input, 4, device) !== beat % 4) return;
    this.lastTapBeat = beat;
    this.lastTapAt = performance.now();
    this.lagSamples.push(error);
  }

  averageLag() { return this.lagSamples.length ? Math.round(this.lagSamples.reduce((sum, value) => sum + value, 0) / this.lagSamples.length) : 0; }

  finishLag(apply) {
    if (apply && this.lagMode === 'calibrate') {
      if (this.lagSamples.length < 4) { this.announce('Tap at least four beats first.'); return; }
      this.change('offset', this.averageLag());
    }
    this.lagMode = null;
    this.lagAudio.beatDrums(false);
    this.sfx(apply ? 'confirmMenu' : 'cancelMenu', .55);
  }

  keydown(event) {
    if (!this.active) return false;
    event.preventDefault?.();
    return this.input(event.code, 'keyboard', event.repeat);
  }

  gamepad(button, pressed) { return this.active && pressed ? this.input(button, 'gamepad') : this.active; }

  input(code, device, repeat = false) {
    const matches = control => bindingFor(this.settings, control, code, device);
    const keyboard = device === 'keyboard';
    // These escape routes stay available during an incomplete control change.
    const back = matches('back') || keyboard && code === 'Escape';
    const confirm = matches('accept') || keyboard && code === 'Enter';
    const direction = ['uiLeft', 'uiDown', 'uiUp', 'uiRight'].findIndex(matches);
    const horizontal = direction === 0 ? -1 : direction === 3 ? 1 : 0;
    const vertical = direction === 1 ? 1 : direction === 2 ? -1 : 0;
    if (repeat && !horizontal && !vertical) return true;
    if (this.rebind) {
      if (repeat) return true;
      if (keyboard && code === 'Escape') this.back();
      else if (keyboard && code === 'Backspace') this.bind(null);
      else if (this.rebind.device === device) this.bind(code);
      return true;
    }
    if (this.prompt) {
      if (back) this.applyPrompt(false);
      else if (horizontal) this.prompt.selected = 1 - this.prompt.selected;
      else if (confirm && !repeat) this.applyPrompt(this.prompt.selected === 0);
      return true;
    }
    if (this.lagMode) {
      if (back) this.finishLag(false);
      else if (confirm && this.lagMode === 'calibrate' && (keyboard && code === 'Enter' || !keyboard && this.lagSamples.length >= 4)) this.finishLag(true);
      else if (!repeat) this.tapLag(code, device);
      return true;
    }
    if (back) { this.back(); return true; }
    if (this.page === 'controls') {
      if (keyboard && code === 'Tab' || this.deviceTabs && horizontal) this.chooseDevice(this.device === 'keyboard' ? 'gamepad' : 'keyboard');
      else if (this.deviceTabs && (confirm || vertical > 0)) this.deviceTabs = false;
      else if (!this.deviceTabs) {
        if (vertical) this.move(vertical);
        else if (horizontal) this.column = 1 - this.column;
        else if (confirm && !repeat) this.startRebind();
      }
      return true;
    }
    if (vertical) this.move(vertical);
    else if (horizontal) this.adjust(horizontal);
    else if (confirm && !repeat) this.adjust(1, true);
    return true;
  }

  chooseDevice(device) { this.device = device; this.deviceTabs = true; this.selected = 0; this.column = 0; this.scroll = 0; }

  bold(ctx, label, x, y, {align = 'left', alpha = 1, maxWidth = 1220, scale = 1} = {}) {
    if (!this.assets?.frame('alphabet', 'A bold')) {
      type(ctx, label.toUpperCase(), x, y, 58 * scale, {align, outline: 5});
      return;
    }
    const letters = [...label.toUpperCase()];
    const width = letters.reduce((sum, letter) => sum + ((this.assets.frame('alphabet', `${letter} bold`)?.width || 29) + 3), 0);
    this.assets.letters(ctx, label, x, y, Math.min(scale, maxWidth / Math.max(width, 1)), {align, alpha});
  }

  handwriting(ctx, label, x, y, {alpha = 1, maxWidth = 275} = {}) {
    const glyphs = [...String(label)].map(letter => {
      if (letter === ' ') return null;
      const upper = letter.toUpperCase();
      const prefix = /^[A-Z]$/.test(upper) ? `${upper} ${letter === upper ? 'capital' : 'lowercase'}` : `${letter}0`;
      return this.assets?.frame('alphabet', prefix) || this.assets?.frame('alphabet', `${letter} lowercase`) || this.assets?.frame('alphabet', `${upper} capital`);
    });
    const letters = [...String(label)];
    if (glyphs.some((glyph, index) => !glyph && letters[index] !== ' ')) {
      ctx.save(); ctx.globalAlpha *= alpha;
      type(ctx, String(label), x, y + 6, 40, {align: 'left', color: '#050105', outline: 0});
      ctx.restore();
      return Math.min(maxWidth, 25 * letters.length);
    }
    const width = glyphs.reduce((sum, glyph) => sum + (glyph ? glyph.width + 2 : 22), 0);
    const scale = Math.min(1, maxWidth / Math.max(width, 1));
    let dx = x;
    for (const glyph of glyphs) {
      if (glyph) {
        const baseline = 57 - (glyph.height || 0);
        this.assets.draw(ctx, 'alphabet', glyph, dx, y + baseline * scale, scale, alpha);
      }
      dx += (glyph ? glyph.width + 2 : 22) * scale;
    }
    return width * scale;
  }

  target(id, label, x, y, w, h, action, low = 0, high = HEIGHT) {
    const top = Math.max(y, low);
    const bottom = Math.min(y + h, high);
    if (bottom - top > 14) this.targets.push({id: `pref-${id}`, label, x, y: top, w, h: bottom - top, action});
  }

  checkbox(ctx, key, x, y, checked, now) {
    const image = this.images.checkbox;
    const frames = this.atlases.checkbox || [];
    if (!image) {
      fill(ctx, x + 10, y, 66, 66, '#000'); fill(ctx, x + 15, y + 5, 56, 56, checked ? '#f1523e' : '#fff');
      if (checked) type(ctx, '✓', x + 40, y - 16, 74, {color:'#ffce37'});
      return;
    }
    const animations = frames.filter(frame => frame.name.startsWith('Check Box selecting animation'));
    const age = now - (this.checkboxAt.get(key) ?? -10000);
    const frame = checked ? animations[Math.min(animations.length - 1, Math.max(0, Math.floor(age * .024)))] : frames.find(item => item.name.startsWith('Check Box unselected'));
    if (!frame) return;
    if (checked) drawFrame(ctx, image, frame, x + 3, y - 48, .7);
    else drawFrame(ctx, image, frame, x + 20, y - 3, .7);
  }

  description(ctx, description) {
    if (!description) return;
    fill(ctx, 50, 590, 1180, 86, '#0009');
    textLines(ctx, description, 1155, 31).slice(0, 3).forEach((line, index) => type(ctx, line, 640, 601 + index * 29, 31));
  }

  drawList(ctx, now) {
    const rows = this.rows();
    const centered = ['root', 'save'].includes(this.page);
    const spacing = centered ? 100 : 120;
    const offset = this.page === 'save' ? 100 : 30;
    const needed = clamp(offset + this.selected * spacing - 493, 0, Math.max(0, offset + rows.length * spacing - 614));
    this.scroll = this.settings.reducedMotion ? needed : this.scroll + (needed - this.scroll) * .25;
    rows.forEach((row, index) => {
      const y = offset + index * spacing - this.scroll;
      if (y < -100 || y > HEIGHT) return;
      const selected = this.selected === index;
      let x = centered ? 640 : (selected ? 150 : 120);
      if (row.type === 'flag') this.checkbox(ctx, row.key, 0, y, Boolean(this.settings[row.key]), now);
      if (row.type === 'number' || row.type === 'choices') {
        const valueWidth = this.handwriting(ctx, row.format(this.settings[row.key]), 14, y, {maxWidth: 210});
        x += valueWidth - 75;
      }
      if (!centered && row.type === 'action') x = selected ? 50 : 15;
      this.bold(ctx, row.label, x, y, {align: centered ? 'center' : 'left', alpha: selected ? 1 : .6, maxWidth: centered ? 1220 : 1250 - x});
      const interactiveWidth = row.type === 'number' ? 1030 : WIDTH;
      this.target(`row-${index}`, row.label, 0, y - 12, interactiveWidth, spacing, () => { this.selected = index; this.adjust(1, row.type !== 'number'); });
      if (row.type === 'number' && selected) {
        type(ctx, '−', 1090, y + 60, 22); type(ctx, '+', 1190, y + 60, 22);
        this.target(`minus-${index}`, `Decrease ${row.label}`, 1030, y, 105, 90, () => this.adjust(-1));
        this.target(`plus-${index}`, `Increase ${row.label}`, 1135, y, 110, 90, () => this.adjust(1));
      }
    });
    if (!centered) this.description(ctx, rows[this.selected]?.description);
    if (this.page === 'rewired') type(ctx, 'QT: Rewired v2.1.0', 10, 690, 16, {align: 'left', outline: 1});
  }

  drawControls(ctx) {
    const groups = controlGroups(this.settings.keyMode, this.capabilities);
    let y = 126, index = 0, selectionY = 196;
    const lines = [];
    for (const [title, rows] of groups) {
      lines.push({title, y}); y += 70;
      for (const [control, label] of rows) {
        if (index === this.selected) selectionY = y;
        lines.push({control, label, y, index}); index++; y += 70;
      }
    }
    const needed = this.deviceTabs ? 0 : Math.max(0, selectionY - 535);
    this.scroll = this.settings.reducedMotion ? needed : this.scroll + (needed - this.scroll) * .25;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 100, WIDTH, 620); ctx.clip();
    for (const line of lines) {
      const pos = line.y - this.scroll;
      if (pos < 28 || pos > HEIGHT) continue;
      if (line.title) { this.bold(ctx, line.title, 640, pos, {align: 'center'}); continue; }
      const active = !this.deviceTabs && line.index === this.selected;
      this.bold(ctx, line.label, 50, pos, {alpha: active ? 1 : .6, maxWidth: 670});
      for (let column = 0; column < 2; column++) {
        const value = this.settings.bindings[this.device][line.control]?.[column];
        const label = inputLabel(value, this.device);
        const x = 750 + column * 285;
        this.handwriting(ctx, label, x, pos, {alpha: active && column === this.column ? 1 : .63, maxWidth: column ? 230 : 255});
        this.target(`bind-${line.control}-${column}`, `${line.label} ${column ? 'secondary' : 'primary'}: ${label}`, x - 15, pos - 5, 255, 68, () => {
          this.deviceTabs = false; this.selected = line.index; this.column = column; this.startRebind();
        }, 100);
      }
    }
    ctx.restore();
    fill(ctx, 0, 0, WIDTH, 100, YELLOW);
    this.bold(ctx, 'Keyboard', 610, 19, {align: 'right', alpha: this.device === 'keyboard' ? 1 : .55});
    this.bold(ctx, 'Gamepad', 670, 19, {alpha: this.device === 'gamepad' ? 1 : .55});
    this.target('keyboard', 'Keyboard controls', 194, 0, 445, 100, () => this.chooseDevice('keyboard'));
    this.target('gamepad', 'Gamepad controls', 640, 0, 440, 100, () => this.chooseDevice('gamepad'));
  }

  drawLag(ctx, now) {
    fill(ctx, 0, 0, WIDTH, HEIGHT, '#000');
    const testing = this.lagMode === 'test';
    const time = this.lagAudio.time() - this.lagStart - (testing ? this.settings.offset : 0);
    const hitY = testing ? this.settings.downscroll ? 570 : 110 : 350;
    const sign = testing && this.settings.downscroll ? -1 : 1;
    const drawArrow = (name, x, y, lane, size) => {
      const image = this.images[name];
      if (!image) return;
      ctx.save(); ctx.translate(x, y); ctx.rotate([-.5, 1, 0, .5][lane] * Math.PI);
      ctx.drawImage(image, -size / 2, -size / 2, size, size); ctx.restore();
    };
    const flash = this.settings.flashingLights && now - this.lastTapAt < 100;
    const laneX = lane => testing ? 472 + lane * 112 : 640;
    for (let lane = 0; lane < (testing ? 4 : 1); lane++) drawArrow('latencyReceptor', laneX(lane), hitY, testing ? lane : 2, flash ? 137 : 118);
    for (let beat = Math.max(0, Math.floor(time / BEAT)); beat <= Math.max(0, Math.ceil(time / BEAT)) + 3; beat++) {
      const diff = beat * BEAT - time;
      if (diff < -180 || beat === this.lastTapBeat) continue;
      const lane = beat % 4;
      drawArrow('latencyArrow', laneX(lane), hitY + sign * diff * .37, testing ? lane : 2, 118);
    }
    type(ctx, testing ? 'Hit the notes as they come in!' : 'Press any key to the beat!', 640, testing ? 305 : 95);
    const sample = this.lagSamples.length;
    type(ctx, time < 0 ? `Starting in ${Math.ceil(-time / BEAT)}` : `Current ${testing ? 'Timing' : 'Offset'}: ${this.averageLag()}ms`, 640, 598);
    type(ctx, `${sample} hits${testing ? '   •   ESC: Back' : '   •   Enter: Apply   •   ESC: Cancel'}`, 640, 654, 20);
    if (!testing) this.target('tap', 'Tap to the beat', 210, 155, 860, 400, () => this.tapLag('Space', 'keyboard'));
    else for (let lane = 0; lane < 4; lane++) {
      this.target(`test-${lane}`, `${STICK_LABELS[lane]} test note`, laneX(lane) - 54, hitY - 64, 108, 128, () => {
        const input = this.settings.bindings.keyboard[NOTES[lane]].find(Boolean);
        this.tapLag(input, 'keyboard');
      });
    }
    this.target('lag-return', 'Exit lag adjustment', 0, 652, 225, 68, () => this.finishLag(false));
    if (!testing && sample >= 4) this.target('lag-apply', 'Apply calibration', 420, 648, 440, 72, () => this.finishLag(true));
  }

  drawPrompt(ctx) {
    this.targets = [];
    fill(ctx, 0, 0, WIDTH, HEIGHT, '#0008'); fill(ctx, 100, 100, 1080, 520, YELLOW);
    const binding = this.rebind;
    const message = binding ? (binding.device === 'gamepad' ? 'Press a gamepad button to rebind.\nBackspace to unbind. Escape to cancel.' : 'Press any key to rebind.\nBackspace to unbind. Escape to cancel.') : this.prompt.message;
    textLines(ctx, message, 950, 38).forEach((line, index) => type(ctx, line, 640, 218 + index * 52, 38, {color:'#000', outline:0}));
    if (binding) {
      this.bold(ctx, 'Cancel', 640, 468, {align:'center', scale:.75});
      this.target('bind-cancel','Cancel rebinding',440,449,400,110,() => this.back());
    } else {
      const labels = [this.prompt.label, 'Cancel'];
      labels.forEach((label, index) => {
        const x = index ? 900 : 380;
        this.bold(ctx, label, x, 465, {align:'center', alpha:this.prompt.selected === index ? 1 : .55});
        this.target(`prompt-${index}`,label,x-190,443,380,120,() => this.applyPrompt(index === 0));
      });
    }
  }

  draw(ctx, now = performance.now()) {
    if (!this.active) return [];
    this.targets = [];
    ctx.save();
    if (this.lagMode) this.drawLag(ctx, now);
    else {
      const background = this.images['options-bg'];
      if (background) {
        const width = WIDTH * 1.1, height = background.height * width / background.width;
        ctx.drawImage(background, (WIDTH - width) / 2, (HEIGHT - height) / 2, width, height);
      } else fill(ctx, 0, 0, WIDTH, HEIGHT, '#b65b8a');
      if (this.page === 'controls') this.drawControls(ctx);
      else this.drawList(ctx, now);
    }
    if (this.page !== 'root' && !this.lagMode) {
      type(ctx, 'ESC: BACK', 1258, 692, 16, {align:'right',outline:1});
      this.target('back','Back',1120,679,160,41,() => this.back());
    }
    if (this.prompt || this.rebind) this.drawPrompt(ctx);
    ctx.restore();
    return this.targets;
  }

  trackPointer(canvas, clientX, clientY) {
    const bounds = canvas.getBoundingClientRect();
    this.lastPointer = [(clientX - bounds.left) * canvas.width / bounds.width, (clientY - bounds.top) * canvas.height / bounds.height];
  }

  async captureScreenshot(canvas) {
    let capture = canvas;
    if (!this.settings.hideMouse && this.lastPointer) {
      capture = document.createElement('canvas');
      capture.width = canvas.width;
      capture.height = canvas.height;
      const ctx = capture.getContext('2d');
      ctx.drawImage(canvas, 0, 0);
      const [x, y] = this.lastPointer;
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + 4, y + 24); ctx.lineTo(x + 9, y + 17);
      ctx.lineTo(x + 18, y + 18); ctx.closePath();
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
      ctx.fill(); ctx.stroke();
    }
    const blob = await new Promise(resolve => capture.toBlob(resolve, 'image/png'));
    if (!blob) { this.announce('Screenshot could not be created.'); return false; }
    const url = URL.createObjectURL(blob);
    if (this.settings.fancyPreview && !this.settings.previewOnSave) this.showScreenshot(url);
    const download = document.createElement('a');
    download.href = url;
    download.download = `funkin-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
    download.click();
    if (this.settings.fancyPreview && this.settings.previewOnSave) this.showScreenshot(url);
    setTimeout(() => URL.revokeObjectURL(url), 6000);
    this.announce('Screenshot saved.');
    return true;
  }

  showScreenshot(url) {
    this.screenshotView?.remove();
    const preview = document.createElement('img');
    preview.alt = 'Screenshot preview';
    preview.src = url;
    Object.assign(preview.style, {position:'fixed', right:'20px', bottom:'20px', width:'min(28vw, 380px)',
      border:'4px solid white', borderRadius:'3px', boxShadow:'0 5px 20px #000b', zIndex:1000, pointerEvents:'none'});
    (document.fullscreenElement || document.body).append(preview);
    this.screenshotView = preview;
    setTimeout(() => preview.remove(), 2600);
  }
}

export function drawDebugDisplay(ctx, settings, {fps = 0, frameMs = 0, scene = '', songTime = null} = {}) {
  if (!settings.debugDisplay || settings.debugDisplay === 'Off') return;
  const advanced = settings.debugDisplay === 'Advanced';
  const rows = [`FPS: ${Math.round(fps)}`];
  if (advanced) {
    rows.push(`Frame: ${frameMs.toFixed(1)} ms`, `Scene: ${scene}`);
    if (Number.isFinite(songTime)) rows.push(`Song: ${Math.round(songTime)} ms`);
    if (globalThis.performance?.memory) rows.push(`Memory: ${(performance.memory.usedJSHeapSize / 1048576).toFixed(1)} MB`);
  }
  ctx.save();
  fill(ctx, 5, 5, advanced ? 245 : 125, 9 + 21 * rows.length, `rgba(0,0,0,${settings.debugDisplayBG})`);
  rows.forEach((row, index) => type(ctx, row, 11, 10 + index * 21, 18, {align:'left', outline:0}));
  ctx.restore();
}

export class ComboFeedback {
  constructor(settings, audio) {
    this.settings = settings;
    this.audio = audio;
    this.images = {};
    this.reset();
  }

  reset() {
    this.pending = null;
    this.active = null;
    this.popupAt = -Infinity;
    this.series = 0;
  }

  async load() {
    if (!this.loading) this.loading = Promise.all([
      loadAtlases().then(atlases => { this.atlases = atlases; }),
      ...['swoosh','digits','combo-pixel'].map(name => loadImage(name).then(image => { this.images[name] = image; })),
    ]).catch(error => { this.loading = null; throw error; });
    return this.loading;
  }

  async prepare() {
    if (!this.settings.cacheComboAssets || !this.settings.comboSwoosh && !this.settings.comboPopup) return;
    await Promise.all([
      this.load(),
      this.settings.comboSwooshSound && this.audio?.load?.('prefs-comboSound.ogg'),
    ]).catch(() => {});
  }

  hit(note, time, combo, bpm, botplay = false) {
    if (this.settings.comboPopup && combo >= 10) this.popupAt = time;
    if (!this.settings.comboSwoosh || botplay) return;
    const sustain = Math.max(0, Number(note?.length ?? note?.sustain ?? note?.duration) || 0);
    this.series++;
    this.pending = {due: time + 937.5 + sustain, combo: this.series, started: null};
  }

  draw(ctx, {time, combo, bpm = 100, pixel = false, botplay = false, middlescroll = false, classicCombo} = {}) {
    const popupAge = time - this.popupAt;
    const fadeStart = 60000 / bpm;
    if (this.settings.comboPopup && popupAge >= 0 && popupAge < fadeStart + 200) {
      const image = pixel ? this.images['combo-pixel'] : classicCombo;
      if (pixel && !image && !this.loading) this.load().catch(() => {});
      if (image) {
        const elapsed = popupAge / 1000;
        const y = 317 - 150 * elapsed + 300 * elapsed * elapsed;
        const scale = pixel ? 4 : .6;
        ctx.save();
        ctx.globalAlpha *= 1 - clamp((popupAge - fadeStart) / 200, 0, 1);
        if (pixel) ctx.imageSmoothingEnabled = false;
        ctx.drawImage(image, 589 + elapsed * 4, y, image.width * scale, image.height * scale);
        ctx.restore();
      }
    }
    if (!combo) { this.pending = null; this.series = 0; }
    if (!this.settings.comboSwoosh || botplay) { this.active = null; this.pending = null; this.series = 0; return; }
    if (this.pending && time >= this.pending.due && this.pending.combo >= this.settings.comboSwooshThreshold) {
      this.active = this.pending;
      this.pending = null;
      this.series = 0;
      if (!this.loading) this.load().catch(() => {});
    }
    const active = this.active;
    if (!active || !this.atlases || !this.images.swoosh || !this.images.digits) return;
    if (active.started === null) {
      active.started = time;
      if (this.settings.comboSwooshSound) this.audio?.sfx?.('prefs-comboSound');
    }
    const age = time - active.started;
    const x = middlescroll ? -235 : 30, y = middlescroll ? 325 : 300;
    const frame = Math.floor(age * .024);
    if (frame >= this.atlases.swoosh.length) { this.active = null; return; }
    drawFrame(ctx, this.images.swoosh, this.atlases.swoosh[frame], x, y);
    const digits = String(active.combo);
    for (const [index, value] of [...digits].entries()) {
      const frames = this.atlases.digits.filter(item => item.name.startsWith(value));
      const digit = frames[Math.floor(age * .020)];
      if (!digit) continue;
      const remaining = digits.length - index;
      drawFrame(ctx, this.images.digits, digit, x + 568 - remaining * (50 + digit.width / 2), y + 35 * remaining - 44);
    }
  }
}
