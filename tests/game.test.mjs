import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../dist/vendor/three.module.js';
import * as physics from '../dist/physics.mjs';

// Run the real game and physics; only browser presentation and time are stubbed.
// Frames are advanced explicitly so tests cannot hang on an animation loop.
function boot(storage = new Map()) {
  const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
  const drawCalls = [];
  const drawing = new Proxy({}, {get: (target, key) => target[key] ?? ((...args) => drawCalls.push({method: key, args})), set: (target, key, value) => (target[key] = value, true)});
  function element() {
    const classes = new Set();
    const listeners = new Map();
    return {
      style: {}, dataset: {}, textContent: '', disabled: false, open: false,
      classList: {add: (...items) => items.forEach(item => classes.add(item)), remove: (...items) => items.forEach(item => classes.delete(item)), contains: item => classes.has(item), toggle(item, force = !classes.has(item)) {force ? classes.add(item) : classes.delete(item); return force;}},
      setAttribute() {}, focus() {}, append() {}, setPointerCapture() {},
      querySelector: () => element(), getContext: () => drawing,
      getBoundingClientRect: () => ({left: 0, top: 0, width: 1280, height: 800}),
      addEventListener(name, listener) {listeners.set(name, listener);},
      showModal() {this.open = true;}, close() {this.open = false;}
    };
  }
  const elements = new Map(ids.map(id => [id, element()]));
  let renders = 0, frame = null, time = 0;
  class Renderer {
    shadowMap = {};
    setPixelRatio() {} setSize() {}
    render() {renders++;}
  }
  const context = vm.createContext({
    THREE: {...THREE, WebGLRenderer: Renderer}, ...physics,
    document: {body: element(), hidden: false, getElementById(id) {assert(elements.has(id), `Missing DOM element #${id}`); return elements.get(id);}, createElement: element, addEventListener() {}},
    window: {addEventListener() {}}, matchMedia: () => ({matches: false}),
    devicePixelRatio: 1, innerWidth: 1280, innerHeight: 800,
    requestAnimationFrame(callback) {frame = callback;}, setTimeout: () => 1, clearTimeout() {},
    localStorage: {getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value))}, console
  });
  const source = readFileSync(new URL('../dist/game.mjs', import.meta.url), 'utf8').replace(/^import .*;\s*$/gm, '');
  vm.runInContext(source, context, {filename: 'game.mjs'});
  return {
    run: code => vm.runInContext(code, context), elements, storage, drawCalls,
    tick(count = 1) {for (let i = 0; i < count; i++) {time += 1000 / 60; assert(frame); frame(time);}},
    get renders() {return renders;}
  };
}

test('game boots against actual HTML and renders main-world frames', () => {
  const game = boot();
  assert.equal(game.elements.get('start').disabled, false);
  game.tick();
  game.elements.get('start').onclick();
  game.tick(3);
  assert.equal(game.renders, 4);
  assert.equal(game.run('started && !paused'), true);
  assert.equal(game.run('player.grounded'), true);
});

test('decorative island surfaces are both buildable and physically solid', () => {
  const game = boot();
  const result = game.run(`(() => {
    const before = {platforms: platforms.length, pickable: pickable.length};
    island({x: -200, y: 5, z: 200, w: 12, d: 10, theme: 'green'}, 0, true);
    const falling = createPlayer({x: -200, y: 9, z: 200});
    for(let i = 0; i < 120; i++) stepPlayer(falling, {}, platforms, 1/60);
    return {solid: platforms.length > before.platforms, buildable: pickable.length > before.pickable, y: falling.y, grounded: falling.grounded};
  })()`);
  assert.equal(result.solid, true);
  assert.equal(result.buildable, true);
  assert.equal(result.y, 5);
  assert.equal(result.grounded, true);
});

test('bonus entry stays locked until an actual landing and saves a safe checkpoint', () => {
  const game = boot();
  game.run('start(); startBonus();');
  assert.equal(game.run('currentLevel'), 'main');
  assert.equal(game.run('bonusUnlocked'), false);
  game.run('resetPlayer(player, {x: bonusIsland.x, y: bonusIsland.y + 3, z: bonusIsland.z});');
  game.tick();
  assert.equal(game.run('bonusUnlocked'), false, 'flying above the island must not unlock it');
  game.tick(90);
  assert.equal(game.run('bonusUnlocked'), true);
  assert.equal(game.run('player.grounded'), true);
  assert.equal(game.run('spawn.y'), game.run('bonusIsland.y'));
  assert.equal(game.run('Math.abs(spawn.x-bonusIsland.x) < bonusIsland.w/2-1 && Math.abs(spawn.z-bonusIsland.z) < bonusIsland.d/2-1'), true);
  game.elements.get('bonus-later').onclick();
  game.run('resetPlayer(player, {x: 300, y: -30, z: 300});');
  game.tick(3);
  assert.equal(game.run('player.grounded'), true);
  assert.equal(game.run('player.y'), game.run('bonusIsland.y'));
  const reloaded = boot(game.storage);
  assert.equal(reloaded.run('bonusUnlocked'), true, 'unlock must survive a fresh game instance');
});

test('bonus course has eight distinct crystals, can restart, and returns to main level', () => {
  const game = boot();
  game.run('start(); resetPlayer(player, {x: bonusIsland.x, y: bonusIsland.y + .2, z: bonusIsland.z});');
  game.tick(30);
  game.run('startBonus();');
  assert.equal(game.run('currentLevel'), 'bonus');
  assert.equal(game.run('gemTarget()'), 8);
  assert.equal(game.run('gems.filter(g => g.level === "bonus").length'), 8);
  assert.equal(game.run('gemCount'), 0);
  for (let i = 0; i < 8; i++) {
    game.run(`{const gem = gems.filter(g => g.level === 'bonus')[${i}]; resetPlayer(player, {x: gem.x, y: gem.y - 1, z: gem.z});}`);
    game.tick();
  }
  assert.equal(game.run('gemCount'), 8);
  assert.equal(game.run('gems.filter(g => g.level === "main" && g.collected).length'), 0, 'bonus collection must not affect main crystals');
  game.run('resetPlayer(player, {x: 11, y: 10, z: -111});');
  game.tick();
  assert.equal(game.run('won'), false, 'main portal must not finish the bonus level');
  game.run('resetPlayer(player, goalForLevel("bonus"));');
  game.tick();
  assert.equal(game.run('won && paused'), true);
  assert.equal(game.elements.get('win-dialog').open, true);
  game.run('restartLevel();');
  assert.equal(game.run('currentLevel'), 'bonus');
  assert.equal(game.run('gemCount'), 0);
  assert.equal(game.run('gems.filter(g => g.level === "bonus" && g.collected).length'), 0);
  assert.equal(game.run('won || paused'), false);
  game.run('returnToMain();');
  assert.equal(game.run('currentLevel'), 'main');
  assert.equal(game.run('gemTarget()'), 12);
  assert.equal(game.run('bonusUnlocked'), true);
});

test('bonus return preserves main progress and replay does not revoke persistent access', () => {
  const game = boot();
  game.run('start(); resetPlayer(player,{x:0,y:0,z:-3});');
  game.tick(2);
  const count = game.run('gemCount');
  assert.equal(count, 1);
  game.run('resetPlayer(player,bonusIsland);');
  game.tick(2);
  game.run('startBonus(); returnToMain();');
  assert.equal(game.run('gemCount'), count);
  assert.equal(game.run('checkpointIndex'), 5);
  assert.equal(game.run('gems.filter(g=>g.level==="main"&&g.collected).length'), count);
  game.run('restartLevel();');
  assert.equal(game.run('bonusUnlocked'), true);
  assert.equal(game.run('gemCount'), 0);
  const reloaded = boot(game.storage);
  reloaded.run('startBonus();');
  assert.equal(reloaded.run('currentLevel'), 'bonus');
});

test('every bonus stepping stone can be reached using real double-jump physics', () => {
  const game = boot();
  const results = game.run(`(() => {
    const route = [bonusCourse[0], ...bonusStones.slice(0,3).map(([x,y,z])=>({x,y,z,w:4,d:4})), bonusCourse[1], ...bonusStones.slice(3,6).map(([x,y,z])=>({x,y,z,w:4,d:4})), bonusCourse[2], ...bonusStones.slice(6).map(([x,y,z])=>({x,y,z,w:4,d:4})), bonusCourse[3]];
    return route.slice(1).map((to,i)=>{
      const from=route[i], dx=to.x-from.x, dz=to.z-from.z, length=Math.hypot(dx,dz), ux=dx/length, uz=dz/length;
      // Walk to the departure edge before jumping; each hop starts from rest.
      const edge=Math.min(Math.abs(ux)>.001?(from.w/2-.5)/Math.abs(ux):Infinity,Math.abs(uz)>.001?(from.d/2-.5)/Math.abs(uz):Infinity);
      const p=createPlayer({x:from.x+ux*edge,y:from.y,z:from.z+uz*edge});
      stepPlayer(p,{},platforms,1/60);
      let landed=false;
      for(let frame=0;frame<180;frame++){
        const tx=to.x-p.x,tz=to.z-p.z,dist=Math.hypot(tx,tz);
        stepPlayer(p,{x:dist>.5?tx/dist:0,z:dist>.5?tz/dist:0,jump:frame===0||frame===24},platforms,1/60);
        if(p.grounded&&p.y>=to.y-.01&&p.y<=to.y+1&&Math.abs(p.x-to.x)<to.w/2&&Math.abs(p.z-to.z)<to.d/2){landed=true;break;}
      }
      return {index:i,landed,x:p.x,y:p.y,z:p.z};
    });
  })()`);
  for (const result of results) assert.equal(result.landed, true, `Hop ${result.index} failed: ${JSON.stringify(result)}`);
});

test('minimap follows the current course and only plots its crystals', () => {
  const game = boot(new Map([['skyblock-bonus-unlocked', '1']]));
  game.run('startBonus();');
  game.drawCalls.length = 0;
  game.run('drawMap();');
  assert.equal(game.drawCalls.filter(call => call.method === 'fillRect').length, 5);
  const circles = game.drawCalls.filter(call => call.method === 'arc');
  assert.equal(circles.length, 9, 'eight bonus crystals plus player');
  for (const {args: [x, y]} of circles) assert(x >= 0 && x <= 160 && y >= 0 && y <= 160, 'bonus markers fit the map');
  game.run('returnToMain();');
  game.drawCalls.length = 0;
  game.run('drawMap();');
  assert.equal(game.drawCalls.filter(call => call.method === 'fillRect').length, 7);
  assert.equal(game.drawCalls.filter(call => call.method === 'arc').length, 13);
});

test('storm level is gated by a bonus win and restored from saved completion', () => {
  const game = boot();
  game.run('start(); startStorm();');
  assert.equal(game.run('currentLevel'), 'main');
  assert.equal(game.run('stormUnlocked'), false);
  game.run('bonusUnlocked=true; startBonus();');
  const count = game.run('gemTarget()');
  for (let i = 0; i < count; i++) {
    game.run(`{const gem=gems.filter(g=>g.level==='bonus')[${i}]; resetPlayer(player,{x:gem.x,y:gem.y-1,z:gem.z});}`);
    game.tick();
  }
  assert.equal(game.run('stormUnlocked'), false, 'crystals alone do not finish the bonus level');
  game.run('resetPlayer(player,goalForLevel("bonus"));');
  game.tick();
  assert.equal(game.run('won && stormUnlocked'), true);
  assert.equal(game.storage.get('skyblock-storm-unlocked'), '1');
  const reload = boot(game.storage);
  assert.equal(reload.run('stormUnlocked'), true);
  reload.run('startStorm();');
  assert.equal(reload.run('currentLevel'), 'storm');
  const migrated = boot(new Map([['skyblock-bonus-best','123.4']]));
  assert.equal(migrated.run('stormUnlocked'), true, 'previous bonus completion retains access');
});

test('storm return and replay preserve bonus progress independently of main progress', () => {
  const game = boot(new Map([['skyblock-bonus-unlocked','1'],['skyblock-storm-unlocked','1']]));
  game.run('start(); resetPlayer(player,{x:0,y:0,z:-3});');
  game.tick(2);
  game.run('startBonus();');
  game.run("{const gem=gems.find(g=>g.level==='bonus');resetPlayer(player,{x:gem.x,y:gem.y-1,z:gem.z});}");
  game.tick();
  assert.equal(game.run('gemCount'), 1);
  game.run('startStorm();');
  assert.equal(game.run('gemCount'), 0);
  game.run('returnToBonus();');
  assert.equal(game.run('currentLevel'), 'bonus');
  assert.equal(game.run('gemCount'), 1);
  assert.equal(game.run('gems.filter(g=>g.level==="bonus"&&g.collected).length'), 1);
  game.run('returnToMain();');
  assert.equal(game.run('currentLevel'), 'main');
  assert.equal(game.run('gemCount'), 1);
  game.run('startStorm(); restartLevel();');
  assert.equal(game.run('currentLevel'), 'storm');
  assert.equal(game.run('gemCount'), 0);
  assert.equal(game.run('won || paused'), false);
  assert.equal(game.run('stormUnlocked'), true);
});

test('every storm island transfer lands safely with and without gliding', () => {
  for (const glide of [false, true]) {
    for (let padIndex = 0; padIndex < 3; padIndex++) {
      const game = boot(new Map([['skyblock-storm-unlocked','1']]));
      game.run(`startStorm(); {const pad=windPads[${padIndex}];resetPlayer(player,{x:pad.x,y:pad.y,z:pad.z});}`);
      game.tick();
      let airborne = false, landed = false;
      for (let frame = 0; frame < 600; frame++) {
        game.run(`{const to=stormCourse[${padIndex+1}],dx=to.x-player.x,dz=to.z-player.z,len=Math.hypot(dx,dz);joy.x=len>1?dx/len:0;joy.z=len>1?dz/len:0;glideHeld=${glide};}`);
        game.tick();
        if (game.run('!player.grounded')) airborne = true;
        if (airborne && game.run(`player.grounded&&Math.abs(player.y-stormCourse[${padIndex+1}].y)<.01`)) {landed=true;break;}
        if (game.run('fallCount>0')) break;
      }
      assert.equal(landed, true, `pad ${padIndex}, glide ${glide}: ${game.run('JSON.stringify(player)')}`);
      assert.equal(game.run('fallCount'), 0);
      game.run('clearInput(); glideHeld=false;');
      game.tick(20);
      assert.equal(game.run('player.grounded'), true, 'landing must not repeatedly relaunch the player');
    }
  }
});

test('storm crystals, final portal, restart, and map use the storm level', () => {
  const game = boot(new Map([['skyblock-storm-unlocked','1']]));
  game.run('startStorm();');
  assert.equal(game.run('gemTarget()'), 8);
  game.drawCalls.length = 0;
  game.run('drawMap();');
  assert.equal(game.drawCalls.filter(call => call.method === 'fillRect').length, 5);
  assert.equal(game.drawCalls.filter(call => call.method === 'arc').length, 9);
  for (let i = 0; i < 8; i++) {
    game.run(`{const gem=gems.filter(g=>g.level==='storm')[${i}];resetPlayer(player,{x:gem.x,y:gem.y-1,z:gem.z});}`);
    game.tick();
  }
  assert.equal(game.run('gemCount'), 8);
  game.run('resetPlayer(player,goalForLevel("bonus"));');
  game.tick();
  assert.equal(game.run('won'), false);
  game.run('resetPlayer(player,goalForLevel("storm"));');
  game.tick();
  assert.equal(game.run('won && paused'), true);
  assert.equal(game.elements.get('win-dialog').open, true);
  assert(game.storage.has('skyblock-build-v1-storm-best'));
  game.run('restartLevel();');
  assert.equal(game.run('currentLevel'), 'storm');
  assert.equal(game.run('won || paused'), false);
  assert.equal(game.run('gemCount'), 0);
  assert.equal(game.run('gems.filter(g=>g.level==="storm"&&g.collected).length'), 0);
});

test('invalid historic times do not unlock the storm course', () => {
  for (const value of ['', '-1', 'not-a-time', 'Infinity']) {
    const game = boot(new Map([['skyblock-bonus-best', value]]));
    assert.equal(game.run('stormUnlocked'), false, `invalid historic time ${JSON.stringify(value)}`);
  }
});

test('secret shortcut is locked until a downward fall through the right-hand gate', () => {
  const game = boot();
  assert.equal(game.elements.get('intro-secret').classList.contains('hidden'), true);
  assert.equal(game.elements.get('secret-action').classList.contains('hidden'), true);
  game.run('start(); startSecret();');
  assert.equal(game.run('currentLevel'), 'main');
  assert.equal(game.run('secretUnlocked'), false);
  game.run('resetPlayer(player,{x:80,y:-2,z:-100}); player.vy=-200;');
  game.tick();
  assert.equal(game.run('currentLevel'), 'secret', 'fast downward crossing must enter the secret level');
  assert.equal(game.run('secretUnlocked'), true);
  assert.equal(game.storage.get('skyblock-secret-unlocked'), '1');
  assert.equal(game.run('fallCount'), 0, 'the entrance must not count as a death');
  assert.equal(game.elements.get('secret-dialog').open, true);
  game.elements.get('close-secret').onclick();
  game.tick(3);
  assert.equal(game.run('player.grounded'), true);
  assert.equal(game.run('player.y'), -8);
  const reloaded = boot(game.storage);
  assert.equal(reloaded.elements.get('intro-secret').classList.contains('hidden'), false);
  assert.equal(reloaded.elements.get('secret-action').classList.contains('hidden'), false);
  reloaded.run('startSecret();');
  assert.equal(reloaded.run('currentLevel'), 'secret');
});

test('ordinary falls, upward crossings and non-main levels never trigger secret entry', () => {
  for (const entry of [
    {x:0,y:-2,z:-100,vy:-200},
    {x:80,y:-2,z:-70,vy:-200},
    {x:120,y:-2,z:-100,vy:-200},
    {x:80,y:-4,z:-100,vy:100}
  ]) {
    const game = boot();
    game.run(`start(); resetPlayer(player,${JSON.stringify(entry)}); player.vy=${entry.vy};`);
    game.tick();
    assert.equal(game.run('currentLevel'), 'main', JSON.stringify(entry));
    assert.equal(game.run('secretUnlocked'), false);
  }
  const bonus = boot(new Map([['skyblock-bonus-unlocked','1']]));
  bonus.run('startBonus();resetPlayer(player,{x:80,y:-2,z:-100});player.vy=-200;');
  bonus.tick();
  assert.equal(bonus.run('currentLevel'), 'bonus');
  assert.equal(bonus.run('secretUnlocked'), false);
  const fallen = boot();
  fallen.run('start();resetPlayer(player,{x:0,y:-30,z:-100});');
  fallen.tick(3);
  assert.equal(fallen.run('currentLevel'), 'main');
  assert.equal(fallen.run('fallCount'), 1);
  assert.equal(fallen.run('player.grounded'), true);
});

test('leaving the secret level restores main progress at a safe checkpoint', () => {
  const game = boot();
  game.run('start();resetPlayer(player,{x:0,y:0,z:-3});');
  game.tick(2);
  assert.equal(game.run('gemCount'), 1);
  game.run('resetPlayer(player,{x:80,y:-2,z:-100});player.vy=-200;');
  game.tick();
  game.elements.get('close-secret').onclick();
  game.run('returnFromSecret();');
  assert.equal(game.run('currentLevel'), 'main');
  assert.equal(game.run('gemCount'), 1);
  assert.equal(game.run('gems.filter(g=>g.level==="main"&&g.collected).length'), 1);
  game.tick(3);
  assert.equal(game.run('player.grounded'), true);
  assert.equal(game.run('fallCount'), 0);
  assert.equal(game.run('secretUnlocked'), true);
});

test('secret gate uses the exact swept crossing position rather than frame endpoints', () => {
  const hit = boot();
  hit.run('start(); Object.assign(player,{x:120,y:-5,z:-100,vy:-100,grounded:false});');
  assert.equal(hit.run('checkSecretFall({x:80,y:-1,z:-100})'), true, 'crossing is inside although endpoint is outside');
  const miss = boot();
  miss.run('start(); Object.assign(player,{x:80,y:-5,z:-100,vy:-100,grounded:false});');
  assert.equal(miss.run('checkSecretFall({x:160,y:-1,z:-100})'), false, 'crossing is outside although endpoint is inside');
  assert.equal(miss.run('currentLevel'), 'main');
});

test('grounded runes create continuous walkable crystal bridges and reset removes them', () => {
  const game = boot(new Map([['skyblock-secret-unlocked','1']]));
  game.run('startSecret();');
  assert.equal(game.run('activateRune(0)'), false, 'rune cannot be activated remotely');
  game.run('{const r=secretRunes[0];resetPlayer(player,{x:r.x,y:r.y+2,z:r.z});}');
  assert.equal(game.run('activateRune(0)'), false, 'rune cannot be activated in flight');
  for (let i = 0; i < 3; i++) {
    game.run(`{const r=secretRunes[${i}];resetPlayer(player,{x:r.x,y:r.y,z:r.z});}`);
    game.tick(2);
    assert.equal(game.run(`secretRunes[${i}].active`), true);
    const pieceCount = game.run('secretBridgePieces.length');
    assert(pieceCount > 0);
    assert.equal(game.run(`activateRune(${i})`), false);
    assert.equal(game.run('secretBridgePieces.length'), pieceCount, 'no duplicate bridge on repeated rune activation');
    let reached = false;
    for (let frame = 0; frame < 400; frame++) {
      game.run(`{const to=secretCourse[${i+1}],dx=to.x-player.x,dz=to.z-player.z,len=Math.hypot(dx,dz);joy.x=len>.5?dx/len:0;joy.z=len>.5?dz/len:0;}`);
      game.tick();
      assert.equal(game.run('player.grounded'), true, `bridge ${i} has a gap at ${game.run('JSON.stringify(player)')}`);
      if (game.run(`Math.hypot(player.x-secretCourse[${i+1}].x,player.z-secretCourse[${i+1}].z)<1`)) {reached=true;break;}
    }
    assert.equal(reached, true, `bridge ${i} cannot be crossed on foot`);
    game.run('clearInput();');
  }
  assert.equal(game.run('fallCount'), 0);
  const removed = game.run(`(() => {const pieces=secretBridgePieces.slice();resetRuneBridges();return pieces.every(piece=>!platforms.includes(piece.p)&&!pickable.includes(piece.mesh)&&!scene.children.includes(piece.mesh));})()`);
  assert.equal(removed, true);
  assert.equal(game.run('secretBridgePieces.length'), 0);
  assert.equal(game.run('secretRunes.some(r=>r.active)'), false);
});

test('secret finish requires all six fragments and three runes; restart clears both', () => {
  const game = boot(new Map([['skyblock-secret-unlocked','1']]));
  game.run('startSecret();');
  assert.equal(game.run('gemTarget()'), 6);
  game.drawCalls.length = 0;
  game.run('drawMap();');
  assert.equal(game.drawCalls.filter(call=>call.method==='fillRect').length, 5);
  assert.equal(game.drawCalls.filter(call=>call.method==='arc').length, 7);
  for (let i = 0; i < 6; i++) {
    game.run(`{const g=gems.filter(g=>g.level==='secret')[${i}];resetPlayer(player,{x:g.x,y:g.y-1,z:g.z});}`);
    game.tick();
  }
  assert.equal(game.run('gemCount'), 6);
  game.run('resetPlayer(player,goalForLevel("secret"));');
  game.tick(2);
  assert.equal(game.run('won'), false, 'fragments alone must not open the secret finish');
  for (let i = 0; i < 3; i++) {
    game.run(`{const r=secretRunes[${i}];resetPlayer(player,{x:r.x,y:r.y,z:r.z});}`);
    game.tick(2);
  }
  game.run('resetPlayer(player,goalForLevel("secret"));');
  game.tick(2);
  assert.equal(game.run('won && paused'), true);
  assert.equal(game.elements.get('win-dialog').open, true);
  assert(game.storage.has('skyblock-build-v1-secret-best'));
  game.run('restartLevel();');
  assert.equal(game.run('currentLevel'), 'secret');
  assert.equal(game.run('gemCount'), 0);
  assert.equal(game.run('won || paused'), false);
  assert.equal(game.run('secretRunes.some(r=>r.active)'), false);
  assert.equal(game.run('secretBridgePieces.length'), 0);
  assert.equal(game.run('gems.some(g=>g.level==="secret"&&g.collected)'), false);
  assert.equal(game.run('secretUnlocked'), true);
});

test('all five construction gaps resist sprint double-jumps, including gliding timing sweeps', () => {
  const game = boot();
  const escapes = game.run(`(() => {
    const escaped=[];
    for(const site of constructionSites)for(const glide of [false,true])for(let second=6;second<=90;second+=6){
      const dx=site.to.x-site.from.x,dz=site.to.z-site.from.z,len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len;
      const edge=Math.min(Math.abs(ux)>.001?(site.from.w/2+.40)/Math.abs(ux):Infinity,Math.abs(uz)>.001?(site.from.d/2+.40)/Math.abs(uz):Infinity);
      const p=createPlayer({x:site.from.x+ux*edge,y:site.from.y,z:site.from.z+uz*edge});
      Object.assign(p,{grounded:true,vx:ux*11,vz:uz*11});
      for(let frame=0;frame<600;frame++){
        stepPlayer(p,{x:ux,z:uz,sprint:true,glide,jump:frame===0||frame===second},platforms,1/60);
        if(p.grounded&&Math.abs(p.y-site.to.y)<.05&&Math.abs(p.x-site.to.x)<site.to.w/2+.43&&Math.abs(p.z-site.to.z)<site.to.d/2+.43){escaped.push({site:site.id,glide,second});break;}
        if(p.y<site.to.y-3)break;
      }
    }
    return escaped;
  })()`);
  assert.equal(escapes.length, 0, `unbuilt route bypassed: ${JSON.stringify(escapes)}`);
});

test('each construction site must be built nearby and can then be crossed with collected materials', () => {
  const probe = boot();
  const siteCount = probe.run('constructionSites.length');
  assert.equal(siteCount, 5);
  for(let index=0;index<siteCount;index++) {
    const game = boot(new Map([['skyblock-bonus-unlocked','1'],['skyblock-storm-unlocked','1'],['skyblock-secret-unlocked','1']]));
    const level = game.run(`constructionSites[${index}].level`);
    game.run(level==='main'?'start();':level==='bonus'?'startBonus();':level==='storm'?'startStorm();':'startSecret();');
    assert.equal(game.run('blocksLeft()'), 12);
    const packs = game.run('blockPickups.filter(p=>p.level===currentLevel).length');
    for(let i=0;i<packs;i++) {
      game.run(`{const pack=blockPickups.filter(p=>p.level===currentLevel)[${i}];resetPlayer(player,{x:pack.x,y:pack.y-1,z:pack.z});}`);
      game.tick(2);
    }
    assert.equal(game.run('blocksCollected[currentLevel]'), packs*8);
    const available=game.run('blocksLeft()');
    const id=game.run(`constructionSites[${index}].id`);
    game.run(`{const s=constructionSites[${index}],a=s.spots[0],b=s.spots.at(-1),dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz);resetPlayer(player,{x:a.x-dx/l*2,y:s.from.y,z:a.z-dz/l*2});}`);
    game.tick(2);
    game.run('for(let i=0;i<100;i++)buildBridgeStep();');
    const initiallyBuilt=game.run('built.length');
    assert(initiallyBuilt>0,`${id}: initial construction must be possible`);
    assert(initiallyBuilt<game.run(`constructionSites[${index}].spots.length`),`${id}: cannot build the whole bridge remotely`);
    let reached=false;
    for(let frame=0;frame<800;frame++) {
      game.run(`buildBridgeStep();{const site=constructionSites[${index}],last=site.spots.at(-1),to=(player.x-last.x)*(last.x-site.spots[0].x)+(player.z-last.z)*(last.z-site.spots[0].z)<-1?last:site.to,dx=to.x-player.x,dz=to.z-player.z,l=Math.hypot(dx,dz);joy.x=l>.1?dx/l:0;joy.z=l>.1?dz/l:0;}`);
      game.tick();
      assert.equal(game.run('player.grounded'),true,`${id}: gap in constructed path`);
      if(game.run(`{const t=constructionSites[${index}].to;Math.abs(player.x-t.x)<t.w/2-.45&&Math.abs(player.z-t.z)<t.d/2-.45;}`)){reached=true;break;}
    }
    assert.equal(reached,true,`${id}: destination unreachable after construction`);
    assert.equal(game.run('fallCount'),0);
    assert.equal(game.run('blocksLeft()'),available-game.run('built.length'));
    game.run('closeDialogs();paused=false;reclaimBlocks();');
    game.tick(2);
    assert.equal(game.run('built.filter(b=>b.level===currentLevel).length'),0);
    assert.equal(game.run('blocksLeft()'),available);
    assert.equal(game.run('player.grounded'),true);
    assert.equal(game.run('fallCount'),0);
  }
});

test('building inventory and reclamation are isolated by level and reset with that level', () => {
  const game=boot(new Map([['skyblock-bonus-unlocked','1']]));
  game.run('start();{const p=blockPickups.find(p=>p.level==="main");resetPlayer(player,{x:p.x,y:p.y-1,z:p.z});}');
  game.tick(2);
  assert.equal(game.run('blocksCollected.main'),8);
  game.run('addBuiltBlock(0,4,0);');
  assert.equal(game.run('blocksLeft()'),19);
  game.run('startBonus();');
  assert.equal(game.run('blocksLeft()'),12);
  game.run('{const p=blockPickups.find(p=>p.level==="bonus");resetPlayer(player,{x:p.x,y:p.y-1,z:p.z});}');
  game.tick(2);
  game.run('addBuiltBlock(130,18,-112);reclaimBlocks();');
  assert.equal(game.run('blocksLeft()'),20);
  assert.equal(game.run('built.filter(b=>b.level==="main").length'),1);
  game.run('restartLevel();');
  assert.equal(game.run('blocksLeft()'),12);
  assert.equal(game.run('blockPickups.some(p=>p.level==="bonus"&&p.collected)'),false);
  game.run('returnToMain();');
  assert.equal(game.run('blocksLeft()'),19);
  assert.equal(game.run('blocksCollected.main'),8);
  game.run('reclaimBlocks();');
  assert.equal(game.run('blocksLeft()'),20);
  game.tick(2);
  assert.equal(game.run('player.grounded'),true);
  assert.equal(game.run('fallCount'),0);
});
