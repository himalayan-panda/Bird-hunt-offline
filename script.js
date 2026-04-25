const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const waveEl = document.getElementById("wave");
const statusEl = document.getElementById("status");
const speedSlider = document.getElementById("speed");
const speedValue = document.getElementById("speed-value");
const startButton = document.getElementById("start-button");
const PIXELS_PER_CM = 37.8;
const BASE_CM_PER_STEP = 0.01;
const BASE_STEP_SECONDS = 0.01;
const ESCAPE_LINE_RATIO = 0.16;
const ESCAPE_TEASERS = [
  "That bird just filed a successful sky-escape report.",
  "Too slow, sky ranger. The bird is laughing behind a cloud.",
  "Bird escaped. It probably told its friends about your aim.",
  "The mountain birds thank you for the dramatic warning shots.",
  "Escape confirmed. That feathered rascal wins this round.",
  "The bird slipped past like a tiny winged ninja.",
  "Missed it by a flap. The sky has claimed another victor."
];

const state = {
  birds: [],
  animationFrame: null,
  lastTime: 0,
  score: 0,
  waveIndex: 0,
  speedLevel: Number(speedSlider.value),
  running: false,
  countdownUntilNextWave: 0,
  mountainPeaks: [],
  aimPoint: null,
  overlayTitle: "Click Start Game to Begin",
  overlaySubtitle: "Hit every bird before it escapes."
};

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.floor(rect.width * ratio);
  const height = Math.floor(rect.height * ratio);

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    buildMountainPeaks();
    drawScene(0);
  }
}

function buildMountainPeaks() {
  const peaks = [];
  const baseY = canvas.height * 0.74;
  const spacing = canvas.width / 5;
  for (let i = -1; i < 6; i += 1) {
    const x = i * spacing + (i % 2 === 0 ? spacing * 0.3 : spacing * 0.65);
    const y = baseY - canvas.height * (0.14 + (i % 3) * 0.06);
    peaks.push({ x, y });
  }
  state.mountainPeaks = peaks;
}

function getEscapeLineY() {
  return canvas.height * ESCAPE_LINE_RATIO;
}

function resetGame() {
  state.birds = [];
  state.score = 0;
  state.waveIndex = 0;
  state.running = true;
  state.countdownUntilNextWave = 0;
  state.lastTime = 0;
  state.overlayTitle = "";
  state.overlaySubtitle = "";
  updateHud("Hunt the bird");
  spawnWave();
}

function updateHud(statusText) {
  scoreEl.textContent = String(state.score);
  const birdsInWave = state.waveIndex + 1;
  waveEl.textContent = `${birdsInWave} ${birdsInWave === 1 ? "Bird" : "Birds"}`;
  statusEl.textContent = statusText;
  startButton.textContent = state.running ? "Restart Game" : "Start Again";
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function spawnWave() {
  const count = state.waveIndex + 1;
  const baseY = canvas.height * 0.66;
  const spawnZones = [
    canvas.width * 0.2,
    canvas.width * 0.5,
    canvas.width * 0.78
  ];

  state.birds = Array.from({ length: count }, (_, index) => {
    const startX = spawnZones[index % spawnZones.length] + randomBetween(-55, 55);
    const startY = baseY + randomBetween(20, 85);
    const targetX = startX + randomBetween(-260, 260);
    const targetY = getEscapeLineY();
    const radius = canvas.width * 0.022;

    return {
      x: startX,
      y: startY,
      startX,
      startY,
      targetX,
      targetY,
      radius,
      baseSpeed: randomBetween(0.92, 1.08),
      speed: 0,
      wingPhase: randomBetween(0, Math.PI * 2),
      alive: true
    };
  });

  syncBirdSpeeds();

  updateHud(`Wave ${state.waveIndex + 1}`);
}

function advanceWave() {
  state.waveIndex += 1;
  spawnWave();
}

function endGame() {
  state.running = false;
  state.birds = [];
  state.overlayTitle = "Game Over";
  state.overlaySubtitle = `${randomItem(ESCAPE_TEASERS)} Final score: ${state.score}. Press Start Again to retry.`;
  updateHud(`Game over at ${state.score} points`);
}

function getPixelsPerSecondForLevel(level) {
  return ((PIXELS_PER_CM * BASE_CM_PER_STEP) / BASE_STEP_SECONDS) * level;
}

function syncBirdSpeeds() {
  for (const bird of state.birds) {
    bird.speed = bird.baseSpeed * getPixelsPerSecondForLevel(state.speedLevel);
  }
}

function updateBirds(deltaSeconds) {
  for (const bird of state.birds) {
    if (!bird.alive) {
      continue;
    }

    const dx = bird.targetX - bird.x;
    const dy = bird.targetY - bird.y;
    const distance = Math.hypot(dx, dy);

    if (bird.y <= getEscapeLineY()) {
      endGame();
      return;
    }

    const step = Math.min(distance, bird.speed * deltaSeconds);
    bird.x += (dx / distance) * step;
    bird.y += (dy / distance) * step;
    bird.wingPhase += deltaSeconds * 16;

    if (bird.x <= bird.radius) {
      bird.x = bird.radius;
      bird.targetX = Math.min(
        canvas.width - bird.radius,
        bird.x + Math.abs(bird.targetX - bird.x)
      );
    } else if (bird.x >= canvas.width - bird.radius) {
      bird.x = canvas.width - bird.radius;
      bird.targetX = Math.max(
        bird.radius,
        bird.x - Math.abs(bird.targetX - bird.x)
      );
    }
  }

  if (state.birds.length > 0 && state.birds.every((bird) => !bird.alive)) {
    state.countdownUntilNextWave -= deltaSeconds;
    if (state.countdownUntilNextWave <= 0) {
      advanceWave();
    }
  }
}

function drawSky() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#1c1c1c");
  gradient.addColorStop(0.55, "#090909");
  gradient.addColorStop(1, "#000000");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 30; i += 1) {
    const x = (canvas.width / 30) * i + (i % 3) * 11;
    const y = canvas.height * 0.15 + (i % 5) * 18;
    const r = 1 + (i % 2);
    ctx.fillStyle = i % 4 === 0 ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMountains() {
  const baseY = canvas.height * 0.82;

  ctx.fillStyle = "#2a2a2a";
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  for (const peak of state.mountainPeaks) {
    ctx.lineTo(peak.x, peak.y);
  }
  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#101010";
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  ctx.lineTo(canvas.width * 0.18, baseY - canvas.height * 0.12);
  ctx.lineTo(canvas.width * 0.35, canvas.height);
  ctx.lineTo(canvas.width * 0.55, baseY - canvas.height * 0.18);
  ctx.lineTo(canvas.width * 0.8, canvas.height);
  ctx.lineTo(canvas.width, baseY - canvas.height * 0.14);
  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = Math.max(1.5, canvas.width * 0.0024);
  ctx.beginPath();
  ctx.moveTo(canvas.width * 0.14, baseY - canvas.height * 0.09);
  ctx.lineTo(canvas.width * 0.18, baseY - canvas.height * 0.12);
  ctx.lineTo(canvas.width * 0.21, baseY - canvas.height * 0.07);
  ctx.moveTo(canvas.width * 0.53, baseY - canvas.height * 0.14);
  ctx.lineTo(canvas.width * 0.55, baseY - canvas.height * 0.18);
  ctx.lineTo(canvas.width * 0.59, baseY - canvas.height * 0.12);
  ctx.stroke();
}

function drawBird(bird) {
  if (!bird.alive) {
    return;
  }

  const flap = Math.sin(bird.wingPhase) * bird.radius * 0.45;
  const heading = Math.atan2(bird.targetY - bird.y, bird.targetX - bird.x);

  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(heading + Math.PI / 2);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(2, bird.radius * 0.22);
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-bird.radius * 0.6, -bird.radius * 0.65, -bird.radius * 1.1, flap - bird.radius * 0.2);
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(bird.radius * 0.6, -bird.radius * 0.65, bird.radius * 1.1, -flap - bird.radius * 0.2);
  ctx.stroke();

  ctx.fillStyle = "#f2f2f2";
  ctx.beginPath();
  ctx.ellipse(0, bird.radius * 0.2, bird.radius * 0.28, bird.radius * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCrosshair() {
  if (!state.aimPoint) {
    return;
  }

  const centerX = state.aimPoint.x;
  const centerY = state.aimPoint.y;
  const outerRadius = canvas.width * 0.015;
  const innerRadius = Math.max(2, canvas.width * 0.0025);

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#ff3b30";
  ctx.beginPath();
  ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
  ctx.fill();
}

function drawEscapeLine() {
  const lineY = getEscapeLineY();
  const dashWidth = canvas.width * 0.018;
  const gapWidth = canvas.width * 0.01;

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = Math.max(2, canvas.width * 0.0024);
  ctx.setLineDash([dashWidth, gapWidth]);
  ctx.beginPath();
  ctx.moveTo(canvas.width * 0.05, lineY);
  ctx.lineTo(canvas.width * 0.95, lineY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = `700 ${Math.max(14, canvas.width * 0.013)}px Trebuchet MS`;
  ctx.textAlign = "left";
  ctx.fillText("Escape line", canvas.width * 0.06, lineY - canvas.height * 0.018);
  ctx.restore();
}

function drawMessageOverlay() {
  if (state.running) {
    return;
  }

  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = `700 ${Math.max(24, canvas.width * 0.035)}px Trebuchet MS`;
  ctx.fillText(state.overlayTitle, canvas.width / 2, canvas.height * 0.25);
  ctx.font = `400 ${Math.max(16, canvas.width * 0.016)}px Trebuchet MS`;
  drawWrappedCenteredText(
    state.overlaySubtitle,
    canvas.width / 2,
    canvas.height * 0.31,
    canvas.width * 0.84,
    Math.max(22, canvas.height * 0.038)
  );
}

function drawWrappedCenteredText(text, centerX, startY, maxWidth, lineHeight) {
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width <= maxWidth || !currentLine) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  lines.forEach((line, index) => {
    ctx.fillText(line, centerX, startY + index * lineHeight);
  });
}

function drawScene(deltaSeconds) {
  drawSky();
  drawEscapeLine();
  drawMountains();

  for (const bird of state.birds) {
    drawBird(bird);
  }

  if (state.running && deltaSeconds > 0 && state.birds.every((bird) => !bird.alive)) {
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = `600 ${Math.max(18, canvas.width * 0.018)}px Trebuchet MS`;
    ctx.textAlign = "center";
    ctx.fillText("Great shot. Next wave incoming...", canvas.width / 2, canvas.height * 0.16);
  }

  drawCrosshair();
  drawMessageOverlay();
}

function animate(timestamp) {
  resizeCanvas();

  if (!state.lastTime) {
    state.lastTime = timestamp;
  }

  const deltaSeconds = Math.min((timestamp - state.lastTime) / 1000, 0.032);
  state.lastTime = timestamp;

  if (state.running) {
    updateBirds(deltaSeconds);
  }

  drawScene(deltaSeconds);
  state.animationFrame = window.requestAnimationFrame(animate);
}

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  };
}

function handleCanvasClick(event) {
  if (!state.running || event.button !== 0) {
    return;
  }

  const point = getCanvasPoint(event);
  const hitBird = state.birds.find((bird) => {
    if (!bird.alive) {
      return false;
    }
    return Math.hypot(point.x - bird.x, point.y - bird.y) <= bird.radius * 1.5;
  });

  if (!hitBird) {
    return;
  }

  hitBird.alive = false;
  state.score += 10;
  updateHud("Hit confirmed");

  if (state.birds.every((bird) => !bird.alive)) {
    state.countdownUntilNextWave = 0.85;
    updateHud("Wave cleared");
  }
}

function handlePointerMove(event) {
  state.aimPoint = getCanvasPoint(event);
}

function handlePointerLeave() {
  state.aimPoint = null;
}

speedSlider.addEventListener("input", () => {
  state.speedLevel = Number(speedSlider.value);
  speedValue.textContent = String(state.speedLevel);
  syncBirdSpeeds();
});

startButton.addEventListener("click", () => {
  resizeCanvas();
  resetGame();
});

canvas.addEventListener("mousedown", handleCanvasClick);
canvas.addEventListener("mousemove", handlePointerMove);
canvas.addEventListener("mouseleave", handlePointerLeave);
canvas.addEventListener("contextmenu", (event) => event.preventDefault());
window.addEventListener("resize", resizeCanvas);

buildMountainPeaks();
resizeCanvas();
animate(0);
