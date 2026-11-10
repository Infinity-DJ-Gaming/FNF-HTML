import {eventEase} from './song-events.js';

const STREET_STAGES = new Set(['phillyStreets', 'phillyStreetsErect']);
const CAN_ASSETS = {
  arc: 'W7W1_FX_SPRAYCAN',
  intro: 'W7W1_FX_DARNELLINTROCAN',
  blast: 'W7W1_FX_SPRAYPAINTEXPLOSION',
  impactBlast: 'W7W1_FX_SPRAYPAINTEXPLOSIONEZ',
};
const STAGE_ROLES = {girlfriend: 'gf', opponent: 'dad', player: 'bf'};
const regularNeneOrigin = [-329.75, -423.6];
const otisOrigin = [-559.0, -499.0];
const canPilePosition = [920, 1045];
const frameMs = 1000 / 24;
const clamp01 = value => Math.min(1, Math.max(0, value));
const cameraCues = new WeakMap();

function ease(value) {
  const progress = clamp01(value);
  return progress * progress * (3 - 2 * progress);
}

function lerp(from, to, progress) {
  return from + (to - from) * progress;
}

function originalChoice(choice) {
  return !!choice && choice.variant !== 'sky' && !choice.mod;
}

function streetCutsceneView(id, elapsed) {
  if (id === 'darnell-alley') {
    const wide = ease((elapsed - 2000) / 2500);
    const cock = ease((elapsed - 6000) / 400) * (1 - ease((elapsed - 7100) / 1000));
    return {scale: lerp(1.3, .66, wide), centerX: lerp(1968, 1520, wide) + 80 * cock,
      centerY: lerp(899, 910, wide)};
  }
  if (id === '2hot-alley-outro') {
    const reveal = ease((elapsed - 1000) / 2000);
    return {scale: lerp(.77, .69, reveal), centerX: lerp(1510, 1539, reveal),
      centerY: lerp(900, 833.5, reveal)};
  }
  return null;
}

function cueValue(cue, time) {
  if (!cue) return 1;
  const progress = cue.duration ? (time - cue.time) / cue.duration : 1;
  return lerp(cue.from, cue.to, eventEase(cue.ease, cue.direction, progress));
}

function streetZoom(game, stage, time) {
  const chart = game.chart;
  if (!chart) return 1;
  let cues = cameraCues.get(chart);
  if (!cues) {
    cues = [];
    for (const event of chart.events || []) {
      if (event.e !== 'ZoomCamera') continue;
      const value = event.v ?? {};
      const bpm = chart.tempos?.findLast(tempo => tempo.time <= event.t)?.bpm || chart.bpm || 100;
      const duration = value.ease === 'INSTANT' ? 0 : (value.duration ?? 4) * 15000 / bpm;
      const ratio = value.mode === 'stage' ? 1 : stage.cameraZoom || .77;
      cues.push({time: event.t, duration, from: cueValue(cues.at(-1), event.t),
        to: (Number(value.zoom) || 1) / ratio, ease: value.ease, direction: value.easeDir});
    }
    cameraCues.set(chart, cues);
  }
  return cueValue(cues.findLast(cue => cue.time <= time), time);
}

export function officialStageLayout(game, stage, view) {
  const choice = game.choice;
  if (!stage || !originalChoice(choice)) return view;
  const {time = 0, intro = false, cutsceneId, elapsed = time, reducedMotion = false} = view;
  const result = {...view, pan: view.pan || 0, actors: {}, propZ: {}};
  if (STREET_STAGES.has(choice.stage)) {
    const scripted = streetCutsceneView(cutsceneId, elapsed);
    // Native stage coordinates keep both performers and the cans on the same pavement.
    const scale = scripted?.scale ?? .65;
    result.scale = scale;
    result.originX = 640 - (scripted?.centerX ?? 1539) * scale;
    result.originY = 360 - (scripted?.centerY ?? 875) * scale;
    if (scripted) result.pan = 0;
    if (scripted) result.bump = 1;
    else if (choice.baseSong === '2hot' && !intro && game.chart)
      result.bump = streetZoom(game, stage, time) + ((view.bump ?? 1) - (game.eventZoom || 1));
    result.propZ.spraycanPile = 345;
  } else if (choice.stage === 'phillyBlazin') {
    // The fight uses a fixed, wider two-shot than the singing stages.
    result.pan = 0;
    result.actors.opponent = {position: [443, 634], actorScale: .99, globalOffsets: false};
    result.actors.player = {position: [831, 637], actorScale: .99, globalOffsets: false};
    result.actors.girlfriend = {position: [648, 515], actorScale: .57};
    return result;
  } else if (choice.baseSong === 'stress' && choice.variant === 'pico') {
    result.scale = .70;
    result.originX = 82;
    result.originY = -99;
    // The Erect camera's offsets follow the actors while the backdrop retains parallax.
    if (intro || reducedMotion) result.pan = 0;
  } else if (choice.baseSong === 'guns' && !intro && !cutsceneId && !reducedMotion) {
    // The melody enters on beat 224 (185 BPM) and releases to BF on beat 256.
    const lift = 174 * ease((time - 72648.65) / 4950) * (1 - ease((time - 79650) / 6000));
    if (lift <= 0) return view;
    result.originY += lift * .80;
    result.pan -= lift * .58;
    const dad = stage.characters?.dad;
    if (dad) result.actors.opponent = {position: [result.originX + dad.position[0] * result.scale - result.pan,
      result.originY + dad.position[1] * result.scale - lift]};
    return result;
  } else return view;

  for (const [role, key] of Object.entries(STAGE_ROLES)) {
    const placement = stage.characters?.[key];
    if (!placement) continue;
    const [x, y] = placement.position;
    result.actors[role] = {
      position: [result.originX + x * result.scale - result.pan, result.originY + y * result.scale],
      actorScale: result.scale * (placement.scale || 1),
    };
  }
  return result;
}

export function officialPartnerAnchor(id, config, position, scale, options = {}) {
  const otis = id === 'otis-speaker';
  if (!otis && !['nene', 'nene-tankmen', 'nene-christmas'].includes(id)) return null;
  const originalOrigin = otis ? otisOrigin : regularNeneOrigin;
  const renderedOrigin = options.bounds?.slice(0, 2) || config?.normalizedNativeOrigin || originalOrigin;
  const size = options.bounds?.slice(2) || config?.logicalIdleSize || [493.62, 566.1903];
  const offsets = options.globalOffsets === false ? [0, 0] : config?.globalOffsets || [4, -89];
  const localScale = scale * (config?.metadata?.scale || 1);
  const topLeftX = position[0] + (options.topLeft ? 0 : -size[0] * localScale / 2);
  const topLeftY = position[1] + (options.topLeft ? 0 : -size[1] * localScale);
  // Sprite frames were trimmed around a different origin. Rebase the mount by the
  // same amount so the deck stays under the character through every animation.
  const dx = (otis ? 170 : -95) + originalOrigin[0] - renderedOrigin[0];
  const dy = (otis ? 457 : 386) + originalOrigin[1] - renderedOrigin[1];
  return {bodyX: topLeftX + (dx + offsets[0]) * localScale,
    bodyY: topLeftY + (dy + offsets[1]) * localScale, scale: localScale};
}

export function officialRequiredAssets(choice) {
  if (!originalChoice(choice) || !STREET_STAGES.has(choice.stage)) return [];
  if (choice.baseSong === 'darnell' && choice.variant !== 'bf' && choice.variant !== 'erect')
    return [CAN_ASSETS.intro, CAN_ASSETS.arc, CAN_ASSETS.blast];
  if (choice.baseSong === '2hot') return [CAN_ASSETS.arc, CAN_ASSETS.blast, CAN_ASSETS.impactBlast];
  return [];
}

export function officialRequiredSounds(choice) {
  if (!officialRequiredAssets(choice).length) return [];
  const sounds = ['Darnell_Lighter', 'Gun_Prep', 'Kick_Can_UP', 'Kick_Can_FORWARD',
    'shot1', 'shot2', 'shot3', 'shot4'];
  sounds.push(...(choice.baseSong === '2hot' ? ['Pico_Bonk'] : ['darnell_laugh', 'nene_laugh']));
  return sounds.map(name => 'W7W1_' + name);
}

export function isOfficialCanNote(choice, kind) {
  return originalChoice(choice) && choice.baseSong === '2hot' &&
    ['lightcan', 'kickcan', 'kneecan', 'cockgun', 'firegun'].includes(kind);
}

export function canFire(game, time) {
  const elapsed = time - (game.officialCan?.cockedAt ?? -Infinity);
  return elapsed >= 0 && elapsed <= 1000;
}

export function applyOfficialCanNote(game, kind, time, actors, playSound, miss) {
  if (!isOfficialCanNote(game.choice, kind)) return false;
  const state = game.officialCan ??= {cans: [], cockedAt: null};
  const pose = (role, name, frames) => {
    if (actors[role]) actors[role].forced = {name, since: time, until: time + frames * frameMs, lock: true};
  };
  if (kind === 'lightcan' && !miss) {
    pose('opponent', 'lightCan', 15);
    playSound('W7W1_Darnell_Lighter', .65);
  } else if (kind === 'kickcan' && !miss) {
    state.cans = state.cans.filter(can => time - can.start < 2400);
    state.cans.push({start: time});
    pose('opponent', 'kickCan', 12);
    playSound('W7W1_Kick_Can_UP', .55);
  } else if (kind === 'kneecan' && !miss) {
    pose('opponent', 'kneeCan', 11);
    playSound('W7W1_Kick_Can_FORWARD', .55);
  } else if (kind === 'cockgun') {
    state.cockedAt = miss ? null : time;
    if (!miss) {
      pose('player', 'cock', 15);
      playSound('W7W1_Gun_Prep', .65);
    }
  } else if (kind === 'firegun') {
    const can = state.cans.find(item => item.shot == null && time - item.start <= 19 * frameMs + 60);
    if (!miss && canFire(game, time)) {
      if (can) can.shot = time;
      pose('player', 'shoot', 7);
      playSound('W7W1_shot' + (1 + Math.floor(Math.random() * 4)), .65);
    } else {
      // The chart's missing shot waits for the authored impact rather than exploding at the receptor.
      state.cockedAt = null;
      game.stats.health = Math.max(0, game.stats.health - (miss ? .38 : .50));
      pose('player', 'shootMISS', 15);
      playSound('W7W1_Pico_Bonk', .65);
    }
  }
  return true;
}

function drawClip(ctx, assets, atlas, prefix, age, world, view, hold = false) {
  if (age < 0 || !assets.images[atlas]) return;
  const frames = assets.frames(atlas, prefix);
  const index = Math.floor(age / frameMs);
  const frame = frames[hold ? Math.min(index, frames.length - 1) : index];
  if (!frame) return;
  const scale = view.scale ?? view.worldScale;
  assets.draw(ctx, atlas, frame, view.originX + world[0] * scale - (view.pan || 0),
    view.originY + world[1] * scale, scale);
}

function drawCan(ctx, assets, can, time, pile, view, phase) {
  const origin = [pile[0] - 10, pile[1] - 550];
  const age = time - can.start;
  if (can.shot != null) {
    const sinceShot = time - can.shot;
    if (phase === 'pile') drawClip(ctx, assets, CAN_ASSETS.arc, 'W7W1 can Can Shot ', sinceShot, origin, view);
    if (phase === 'afterActors') drawClip(ctx, assets, CAN_ASSETS.blast, 'Explosion 1 movie0',
      sinceShot - 3 * frameMs, [origin[0] + 150, origin[1] - 250], view);
  } else if (age < 19 * frameMs) {
    if (phase === 'pile') drawClip(ctx, assets, CAN_ASSETS.arc, 'W7W1 can Can Start ', age, origin, view);
  } else if (phase === 'pile') {
    drawClip(ctx, assets, CAN_ASSETS.arc, 'W7W1 can Hit Pico ', age - 19 * frameMs, origin, view);
  } else if (phase === 'afterActors') {
    drawClip(ctx, assets, CAN_ASSETS.impactBlast, 'explosion round 1 short0', age - 26 * frameMs,
      [origin[0] + 750, origin[1] - 100], view);
  }
}

export function drawOfficialStageFX(ctx, assets, game, stage, view, options = {}) {
  const choice = game.choice;
  if (!originalChoice(choice) || !STREET_STAGES.has(choice.stage)) return;
  const {time = 0, elapsed = time, cutsceneId, phase = 'afterActors'} = options;
  const pile = stage?.props?.find(prop => prop.name === 'spraycanPile')?.position || canPilePosition;
  if (cutsceneId === 'darnell-alley') {
    if (elapsed >= 7100) {
      drawCan(ctx, assets, {start: 6400, shot: 7100}, elapsed, pile, view, phase);
    } else if (elapsed >= 6400 && phase === 'pile') {
      const forward = elapsed >= 6900;
      drawClip(ctx, assets, CAN_ASSETS.intro, forward ? 'can kick quick0' : 'can kicked up0',
        elapsed - (forward ? 6900 : 6400), [pile[0] + 30, pile[1] - 320], view, true);
    }
  } else if (!cutsceneId && choice.baseSong === '2hot') {
    for (const can of game.officialCan?.cans || []) drawCan(ctx, assets, can, time, pile, view, phase);
  }
}
