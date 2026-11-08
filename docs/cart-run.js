'use strict';

const canvas = document.querySelector('#mine');
const ctx = canvas.getContext('2d');
const startButton = document.querySelector('#start-btn');
const overlay = document.querySelector('#overlay');
const headline = document.querySelector('#headline');
const hint = document.querySelector('#hint');
const status = document.querySelector('#status');
const phoneStatus = document.querySelector('#phone-status');
const phonePulse = document.querySelector('#phone-pulse');
if (window.top !== window.self) {
  const invite = document.querySelector('#friend-link');
  invite.href = 'https://tavoraz.github.io/The-Salt-Mine-3-Downloads/play-together.html';
  invite.target = '_blank';
  invite.rel = 'noopener';
}
const keys = new Set();
const goal = 799;
const startCart = 278;
const trackY = 293;
const maxTime = 30;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function fresh(mode = 'ready') {
  return { mode, player: 230, cart: startCart, time: maxTime, health: 3, cooldown: 0,
    invulnerable: 0, spawn: 4.7, enemies: [], sparks: [], wave: 0, ring: 0, blocked: false };
}

let state = fresh();
let testingClock = false;

function begin() {
  state = fresh('playing');
  keys.clear();
  overlay.hidden = true;
  canvas.focus({ preventScroll: true });
  status.textContent = 'Stay close to the cart. Knock defenders away when they get near.';
  render();
}

function finish(won) {
  state.mode = won ? 'won' : 'lost';
  keys.clear();
  const progress = Math.floor((state.cart - startCart) / (goal - startCart) * 100);
  headline.textContent = won ? 'Salt delivered!' : 'The cart stopped.';
  hint.textContent = won
    ? 'Try the full Push the Cart battleground with a friend.'
    : `You pushed the cart ${progress}% of the way. Stay near it and save your knockback for close defenders.`;
  startButton.textContent = 'Play again';
  overlay.hidden = false;
  status.textContent = won ? 'You delivered the cart.' : 'Round ended. Ready for another run.';
  startButton.focus();
}

function knockback() {
  if (state.mode !== 'playing' || state.cooldown > 0) return;
  state.cooldown = 2.65;
  state.ring = .34;
  let hits = 0;
  for (const enemy of state.enemies) {
    if (Math.abs(state.player - enemy.x) > 127) continue;
    enemy.x += Math.sign(enemy.x - state.player || 1) * 170;
    enemy.stun = 1.5;
    burst(enemy.x, trackY - 35, '#ffb66c');
    hits++;
  }
  status.textContent = hits ? `Pushed back ${hits} defender${hits === 1 ? '' : 's'}.` : 'Knockback used. Wait for a defender to get closer.';
}

function burst(x, y, color) {
  if (reduceMotion) return;
  for (let i = 0; i < 11; i++) {
    state.sparks.push({ x, y, dx: Math.cos(i * 2.4) * (28 + i * 7), dy: Math.sin(i * 2.4) * 61, time: .44, color });
  }
}

function update(dt) {
  if (state.mode !== 'playing') return;
  state.time -= dt;
  state.cooldown = Math.max(0, state.cooldown - dt);
  state.invulnerable = Math.max(0, state.invulnerable - dt);
  state.ring = Math.max(0, state.ring - dt);
  const direction = Number(keys.has('right')) - Number(keys.has('left'));
  state.player = clamp(state.player + direction * 176 * dt, 65, 842);
  if ((state.spawn -= dt) <= 0) {
    state.enemies.push({ x: 889, speed: 57 + Math.min(state.wave * 5, 18), stun: 0 });
    state.spawn = 5.6;
    state.wave++;
  }
  for (const enemy of state.enemies) {
    enemy.stun = Math.max(0, enemy.stun - dt);
    if (enemy.stun > 0) continue;
    const gap = state.player - enemy.x;
    enemy.x = clamp(enemy.x + clamp(gap, -enemy.speed * dt, enemy.speed * dt), 58, 920);
    if (Math.abs(gap) < 24 && !state.invulnerable) {
      state.health--;
      state.invulnerable = 1.65;
      enemy.x += gap > 0 ? -80 : 80;
      burst(state.player, trackY - 37, '#ff826d');
      status.textContent = 'A defender landed a hit.';
    }
  }
  state.enemies = state.enemies.filter(enemy => enemy.x < 910);
  const near = Math.abs(state.player - state.cart) < 98;
  state.blocked = state.enemies.some(enemy => Math.abs(enemy.x - state.cart) < 46 && enemy.stun <= 0);
  if (near && !state.blocked) state.cart = Math.min(goal, state.cart + dt * 38);
  for (const spark of state.sparks) {
    spark.x += spark.dx * dt; spark.y += spark.dy * dt; spark.time -= dt;
  }
  state.sparks = state.sparks.filter(spark => spark.time > 0);
  if (state.cart >= goal) finish(true);
  else if (state.health <= 0 || state.time <= 0) finish(false);
}

function rect(x, y, w, h, color) {
  ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
}

function polygon(points, color) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.closePath(); ctx.fill();
}

function circle(x, y, r, color) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

function background() {
  const glow = ctx.createLinearGradient(0, 0, 0, 416);
  glow.addColorStop(0, '#14212d'); glow.addColorStop(.62, '#294555'); glow.addColorStop(1, '#20272c');
  rect(0, 0, 900, 416, glow);
  for (let i = 0; i < 8; i++) {
    const x = i * 137 - 15;
    polygon([[x, 0], [x + 101, 0], [x + 137, 126], [x + 70, 258], [x - 29, 256]], i % 2 ? '#1d3544' : '#233c4b');
    polygon([[x + 41, 211], [x + 58, 135], [x + 78, 215], [x + 57, 242]], '#416d81');
    polygon([[x + 58, 135], [x + 65, 214], [x + 57, 242]], '#82bed5');
  }
  polygon([[0, 95], [153, 24], [358, 78], [531, 28], [742, 71], [900, 17], [900, 0], [0, 0]], '#14212c');
  for (let x of [67, 299, 531, 765]) {
    rect(x, 89, 13, 180, '#563f35');
    rect(x - 15, 89, 46, 11, '#745647');
    rect(x + 12, 105, 28, 6, '#9c7860');
    const lantern = ctx.createRadialGradient(x + 33, 124, 1, x + 33, 124, 68);
    lantern.addColorStop(0, '#ffb64c70'); lantern.addColorStop(1, '#ffb64c00');
    circle(x + 33, 124, 68, lantern);
    rect(x + 26, 115, 14, 20, '#aa7847');
    rect(x + 29, 118, 8, 14, '#ffd386');
  }
  polygon([[0, 267], [900, 267], [900, 416], [0, 416]], '#262d2f');
  for (let x = 17; x < 900; x += 39) polygon([[x, 285], [x + 18, 285], [x + 24, 338], [x + 3, 338]], '#4b3a34');
  rect(0, 292, 900, 6, '#a1a0a0'); rect(0, 326, 900, 6, '#6b6c71');
  rect(798, 225, 63, 102, '#4b3f36'); rect(804, 231, 51, 89, '#23333b');
  rect(821, 237, 15, 8, '#ffd280'); rect(799, 221, 61, 8, '#c79a56');
  ctx.font = 'bold 15px system-ui'; ctx.fillStyle = '#ffe2a6'; ctx.textAlign = 'center'; ctx.fillText('LIFT', 830, 269);
}

function hero(x, enemy, stunned) {
  const color = enemy ? '#dd745c' : '#75dcf7';
  circle(x, trackY + 9, 18, '#141719');
  rect(x - 12, trackY - 39, 24, 36, enemy ? '#763b37' : '#326981');
  polygon([[x - 15, trackY - 42], [x + 15, trackY - 42], [x + 11, trackY - 25], [x - 11, trackY - 25]], color);
  circle(x, trackY - 49, 12, stunned ? '#a09386' : color);
  rect(x - 13, trackY - 4, 8, 13, '#18262d'); rect(x + 5, trackY - 4, 8, 13, '#18262d');
  if (!enemy) {
    polygon([[x - 8, trackY - 69], [x + 8, trackY - 69], [x, trackY - 61]], '#fff1c9');
  }
}

function render() {
  background();
  const { player, cart, health, time, cooldown, ring, blocked } = state;
  const fraction = (cart - startCart) / (goal - startCart);
  rect(22, 18, 340, 36, '#132028'); rect(22, 55, 340, 6, '#4a5962');
  rect(22, 55, 340 * fraction, 6, '#ffd280');
  ctx.textAlign = 'left'; ctx.font = 'bold 17px system-ui'; ctx.fillStyle = '#fce9bd';
  ctx.fillText(blocked ? 'CART CONTESTED' : 'DELIVER THE SALT', 34, 42);
  ctx.textAlign = 'right'; ctx.fillText(`${Math.ceil(Math.max(0, time))}s  ·  ${health}/3 HP`, 878, 42);
  ctx.font = '15px system-ui'; ctx.fillStyle = '#bbd5df';
  ctx.fillText(cooldown ? `Knockback ${cooldown.toFixed(1)}s` : 'Knockback ready', 878, 64);
  const hpLabel = `${Math.ceil(Math.max(0, time))}s · ${health}/3 HP`;
  const pulseLabel = cooldown ? `Knockback ${cooldown.toFixed(1)}s` : 'Knockback ready';
  if (phoneStatus.textContent !== hpLabel) phoneStatus.textContent = hpLabel;
  if (phonePulse.textContent !== pulseLabel) phonePulse.textContent = pulseLabel;
  circle(cart - 20, trackY + 10, 11, '#13181e'); circle(cart + 20, trackY + 10, 11, '#13181e');
  polygon([[cart - 30, trackY - 41], [cart + 30, trackY - 41], [cart + 24, trackY + 4], [cart - 24, trackY + 4]], '#8b623e');
  polygon([[cart - 21, trackY - 42], [cart - 7, trackY - 66], [cart + 2, trackY - 48], [cart + 15, trackY - 70], [cart + 24, trackY - 41]], '#92d5ee');
  rect(cart - 28, trackY - 37, 56, 6, '#c49262');
  for (const enemy of state.enemies) hero(enemy.x, true, enemy.stun > 0);
  hero(player, false, false);
  if (ring && !reduceMotion) {
    ctx.strokeStyle = '#a6efff'; ctx.globalAlpha = ring / .34;
    ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(player, trackY - 14, 25 + (1 - ring / .34) * 104, 28, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (const spark of state.sparks) circle(spark.x, spark.y, 2.1, spark.color);
}

const mapped = { ArrowLeft: 'left', ArrowRight: 'right', KeyA: 'left', KeyD: 'right' };
window.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey || state.mode !== 'playing') return;
  if (mapped[event.code]) { event.preventDefault(); keys.add(mapped[event.code]); }
  if (event.code === 'Space' && event.target?.tagName !== 'BUTTON') { event.preventDefault(); if (!event.repeat) knockback(); }
});
window.addEventListener('keyup', event => keys.delete(mapped[event.code]));
window.addEventListener('blur', () => keys.clear());
for (const direction of ['left', 'right']) {
  const button = document.querySelector('#' + direction);
  button.addEventListener('pointerdown', event => {
    button.setPointerCapture(event.pointerId); keys.add(direction);
  });
  for (const end of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    button.addEventListener(end, () => keys.delete(direction));
  }
}
startButton.addEventListener('click', begin);
document.querySelector('#pulse').addEventListener('click', knockback);
window.render_game_to_text = () => JSON.stringify({
  mode: state.mode, axis: 'x increases toward the lift on the right', player: Math.round(state.player),
  cart: Math.round(state.cart), lift: goal, seconds: Number(Math.max(0,state.time).toFixed(1)),
  health: state.health, contested: state.blocked, cooldown: Number(state.cooldown.toFixed(1)),
  enemies: state.enemies.map(e => ({ x: Math.round(e.x), stunned: e.stun > 0 }))
});
window.advanceTime = ms => {
  testingClock = true;
  const frames = clamp(Math.round(ms / (1000 / 60)), 1, 7200);
  for (let i = 0; i < frames; i++) update(1 / 60);
  render();
};
let last = performance.now();
function frame(now) {
  if (!testingClock) { update(Math.min((now - last) / 1000, .05)); render(); }
  last = now;
  requestAnimationFrame(frame);
}
render();
requestAnimationFrame(frame);
