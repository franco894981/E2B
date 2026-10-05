(() => {
  "use strict";

  const GAME_SECONDS = 45;
  const BEST_SCORE_KEY = "tiroAlAro.mejorRecord";

  const app = document.getElementById("app");
  const startScreen = document.getElementById("startScreen");
  const gameScreen = document.getElementById("gameScreen");
  const endScreen = document.getElementById("endScreen");
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d", { alpha: false });

  const playButton = document.getElementById("playButton");
  const restartButton = document.getElementById("restartButton");
  const homeButton = document.getElementById("homeButton");
  const scoreText = document.getElementById("scoreText");
  const timerText = document.getElementById("timerText");
  const messageBox = document.getElementById("message");
  const bestScoreStart = document.getElementById("bestScoreStart");
  const bestScoreEnd = document.getElementById("bestScoreEnd");
  const finalScore = document.getElementById("finalScore");

  let width = 360;
  let height = 640;
  let pixelRatio = 1;
  let screen = "start";
  let score = 0;
  let bestScore = loadBestScore();
  let timeLeft = GAME_SECONDS;
  let timerStarted = false;
  let timerStartTime = 0;
  let bonusTime = 0;
  let streak = 0;
  let messageUntil = 0;
  let hoopMotionTime = 0;
  let floatingEffects = [];
  let ballTrail = [];
  let audioContext = null;
  let activePointerId = null;
  let isDragging = false;
  let lastFrameTime = performance.now();

  const rest = { x: 180, y: 560 };
  const hoop = {
    x: 180,
    baseX: 180,
    rimY: 155,
    width: 112,
    backboardWidth: 148,
    backboardHeight: 56,
  };

  const ball = {
    x: 180,
    y: 560,
    previousX: 180,
    previousY: 560,
    radius: 20,
    vx: 0,
    vy: 0,
    state: "ready",
    scored: false,
    shotStartedAt: 0,
    resetAt: 0,
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function loadBestScore() {
    try {
      const stored = Number.parseInt(localStorage.getItem(BEST_SCORE_KEY) || "0", 10);
      return Number.isFinite(stored) && stored > 0 ? stored : 0;
    } catch (_error) {
      return 0;
    }
  }

  function saveBestScore(value) {
    try {
      localStorage.setItem(BEST_SCORE_KEY, String(value));
    } catch (_error) {
      // El juego sigue funcionando si el navegador no permite localStorage.
    }
  }

  function updateBestScoreLabels() {
    bestScoreStart.textContent = `Mejor récord: ${bestScore}`;
    bestScoreEnd.textContent = `Mejor récord: ${bestScore}`;
  }

  function updateHud() {
    scoreText.textContent = `Puntos: ${score}`;
    timerText.textContent = `Tiempo: ${Math.ceil(timeLeft)}`;
  }

  function setScreen(nextScreen) {
    screen = nextScreen;
    startScreen.classList.toggle("active", nextScreen === "start");
    gameScreen.classList.toggle("active", nextScreen === "playing");
    endScreen.classList.toggle("active", nextScreen === "end");
  }

  function resizeGame() {
    width = Math.max(300, Math.floor(app.clientWidth || window.innerWidth || 360));
    height = Math.max(460, Math.floor(app.clientHeight || window.innerHeight || 640));
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(width * pixelRatio);
    canvas.height = Math.floor(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    layoutGameObjects();
    drawGame();
  }

  function layoutGameObjects() {
    ball.radius = clamp(width * 0.055, 18, 25);
    rest.x = width / 2;
    rest.y = height - clamp(height * 0.13, 78, 112);

    hoop.x = width / 2;
    hoop.baseX = hoop.x;
    hoop.rimY = clamp(height * 0.255, 128, 215);
    hoop.width = clamp(width * 0.32, 96, 132);
    hoop.backboardWidth = clamp(width * 0.43, 132, 178);
    hoop.backboardHeight = clamp(height * 0.085, 48, 64);

    if (ball.state === "ready" || ball.state === "dragging") {
      resetBall(false);
    }
  }

  function getMaxDrag() {
    return clamp(Math.min(width, height) * 0.34, 112, 150);
  }

  function getLaunchPower() {
    return clamp(height / 48, 11.5, 16.8);
  }

  function getGravity() {
    return height * 1.75;
  }

  function resetBall(shouldDraw = true, wasMiss = false) {
    if (wasMiss) {
      streak = 0;
    }

    isDragging = false;
    activePointerId = null;
    rest.x = clamp(width / 2 + (Math.random() - 0.5) * width * 0.16, ball.radius + 4, width - ball.radius - 4);
    ball.x = rest.x;
    ball.y = rest.y;
    ball.previousX = ball.x;
    ball.previousY = ball.y;
    ball.vx = 0;
    ball.vy = 0;
    ball.state = "ready";
    ball.scored = false;
    ball.shotStartedAt = 0;
    ball.resetAt = 0;

    if (shouldDraw) {
      drawGame();
    }
  }

  function getAudioContext() {
    if (!audioContext) {
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      } catch (_error) {
        return null;
      }
    }
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
    return audioContext;
  }

  function playSound(type) {
    const audio = getAudioContext();
    if (!audio) return;

    const now = audio.currentTime;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const settings = {
      launch: { start: 180, end: 90, duration: 0.12, volume: 0.045, wave: "triangle" },
      score: { start: 520, end: 920, duration: 0.22, volume: 0.07, wave: "sine" },
      finish: { start: 260, end: 110, duration: 0.38, volume: 0.06, wave: "sawtooth" },
    }[type];

    oscillator.type = settings.wave;
    oscillator.frequency.setValueAtTime(settings.start, now);
    oscillator.frequency.exponentialRampToValueAtTime(settings.end, now + settings.duration);
    gain.gain.setValueAtTime(settings.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + settings.duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(now);
    oscillator.stop(now + settings.duration);
  }

  function startGame() {
    getAudioContext();
    score = 0;
    timeLeft = GAME_SECONDS;
    timerStarted = false;
    timerStartTime = 0;
    bonusTime = 0;
    streak = 0;
    hoopMotionTime = 0;
    floatingEffects = [];
    ballTrail = [];
    messageUntil = 0;
    hideMessage();
    setScreen("playing");
    resizeGame();
    resetBall(false);
    updateHud();
    drawGame();
  }

  function showStartScreen() {
    hideMessage();
    resetBall(false);
    updateBestScoreLabels();
    setScreen("start");
  }

  function finishGame() {
    if (screen !== "playing") {
      return;
    }

    timeLeft = 0;
    playSound("finish");
    updateHud();
    hideMessage();

    if (score > bestScore) {
      bestScore = score;
      saveBestScore(bestScore);
    }

    finalScore.textContent = `Puntuación final: ${score}`;
    updateBestScoreLabels();
    setScreen("end");
  }

  function showMessage(text) {
    messageBox.textContent = text;
    messageBox.classList.add("visible");
    messageUntil = performance.now() + 850;
  }

  function hideMessage() {
    messageBox.textContent = "";
    messageBox.classList.remove("visible");
    messageUntil = 0;
  }

  function getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function distanceBetween(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function placeDraggedBall(point) {
    const dx = point.x - rest.x;
    const dy = point.y - rest.y;
    const length = Math.hypot(dx, dy);
    const maxDrag = getMaxDrag();

    if (length <= 0.001) {
      ball.x = rest.x;
      ball.y = rest.y;
      return;
    }

    const ratio = Math.min(1, maxDrag / length);
    ball.x = rest.x + dx * ratio;
    ball.y = rest.y + dy * ratio;
    ball.previousX = ball.x;
    ball.previousY = ball.y;
  }

  function onPointerDown(event) {
    if (screen !== "playing" || ball.state !== "ready" || timeLeft <= 0) {
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const point = getCanvasPoint(event);
    const touchRadius = ball.radius + 32;

    if (distanceBetween(point, ball) > touchRadius) {
      return;
    }

    event.preventDefault();
    isDragging = true;
    activePointerId = event.pointerId;
    ball.state = "dragging";
    placeDraggedBall(point);

    if (canvas.setPointerCapture) {
      canvas.setPointerCapture(activePointerId);
    }

    drawGame();
  }

  function onPointerMove(event) {
    if (!isDragging || event.pointerId !== activePointerId || ball.state !== "dragging") {
      return;
    }

    event.preventDefault();
    placeDraggedBall(getCanvasPoint(event));
    drawGame();
  }

  function onPointerUp(event) {
    if (!isDragging || event.pointerId !== activePointerId || ball.state !== "dragging") {
      return;
    }

    event.preventDefault();
    releaseShot(performance.now());

    if (canvas.releasePointerCapture) {
      canvas.releasePointerCapture(activePointerId);
    }

    activePointerId = null;
    isDragging = false;
  }

  function onPointerCancel(event) {
    // Al soltar un puntero, algunos navegadores emiten después
    // `lostpointercapture`. No debemos cancelar un lanzamiento que ya salió.
    if (!isDragging || ball.state !== "dragging" || event.pointerId !== activePointerId) {
      return;
    }

    if (canvas.releasePointerCapture) {
      canvas.releasePointerCapture(activePointerId);
    }

    resetBall();
  }

  function releaseShot(now) {
    const pullX = rest.x - ball.x;
    const pullY = rest.y - ball.y;
    const pullDistance = Math.hypot(pullX, pullY);

    if (pullDistance < 10) {
      resetBall();
      return;
    }

    if (!timerStarted) {
      timerStarted = true;
      timerStartTime = now;
    }

    const power = getLaunchPower();
    ball.vx = pullX * power;
    ball.vy = pullY * power;
    ball.previousX = ball.x;
    ball.previousY = ball.y;
    ball.scored = false;
    ball.shotStartedAt = now;
    ball.resetAt = 0;
    ballTrail = [];
    ball.state = "flying";
    playSound("launch");
  }

  function updateGame(deltaTime, now) {
    if (screen !== "playing") {
      return;
    }

    updateTimer(now);

    if (screen !== "playing") {
      return;
    }

    if (messageUntil > 0 && now >= messageUntil) {
      hideMessage();
    }

    updateHoop(deltaTime);
    updateFloatingEffects(deltaTime, now);

    if (ball.state === "flying" || ball.state === "scored") {
      ball.previousX = ball.x;
      ball.previousY = ball.y;
      ball.vy += getGravity() * deltaTime;
      ball.vx *= Math.pow(0.998, deltaTime * 60);
      ball.x += ball.vx * deltaTime;
      ball.y += ball.vy * deltaTime;

      if (streak >= 2 && ball.state === "flying") {
        ballTrail.push({ x: ball.x, y: ball.y, life: 1 });
        if (ballTrail.length > 12) ballTrail.shift();
      }

      keepBallInsideSideWalls();

      if (ball.state === "flying") {
        checkForBasket(now);
      }

      const tooLate = now - ball.shotStartedAt > 5200;
      const outOfBounds = ball.y - ball.radius > height + 30 || ball.x < -80 || ball.x > width + 80;

      if (ball.state === "scored" && now >= ball.resetAt) {
        resetBall(false);
      } else if (ball.state === "flying" && (outOfBounds || tooLate)) {
        resetBall(false, true);
      }
    }
  }

  function updateHoop(deltaTime) {
    if (score < 3) {
      hoop.x = hoop.baseX;
      return;
    }

    hoopMotionTime += deltaTime;
    const speed = score >= 7 ? 1.65 : 1.05;
    const amplitude = Math.min(width * 0.22, 94);
    hoop.x = hoop.baseX + Math.sin(hoopMotionTime * speed) * amplitude;
  }

  function updateFloatingEffects(deltaTime, now) {
    floatingEffects = floatingEffects.filter((effect) => effect.until > now);
    for (const effect of floatingEffects) {
      effect.y -= 28 * deltaTime;
    }
}

  function addFloatingEffect(text, color) {
    floatingEffects.push({
      text,
      x: width / 2,
      y: hoop.rimY - 24,
      color,
      until: performance.now() + 800,
    });
  }

  function updateTimer(now) {
    if (!timerStarted) {
      timeLeft = GAME_SECONDS;
      updateHud();
      return;
    }

    timeLeft = Math.max(0, GAME_SECONDS + bonusTime - (now - timerStartTime) / 1000);
    updateHud();

    if (timeLeft <= 0) {
      finishGame();
    }
  }

  function keepBallInsideSideWalls() {
    if (ball.x < ball.radius) {
      ball.x = ball.radius;
      ball.vx = Math.abs(ball.vx) * 0.58;
    } else if (ball.x > width - ball.radius) {
      ball.x = width - ball.radius;
      ball.vx = -Math.abs(ball.vx) * 0.58;
    }
  }

  function checkForBasket(now) {
    if (ball.scored || ball.vy <= 0) {
      return;
    }

    const rimY = hoop.rimY + 2;
    const halfOpening = hoop.width * 0.38;
    const crossedRim = ball.previousY < rimY && ball.y >= rimY;
    const insideOpening = ball.x > hoop.x - halfOpening && ball.x < hoop.x + halfOpening;

    if (!crossedRim || !insideOpening) {
      return;
    }

    ball.scored = true;
    ball.state = "scored";
    ball.resetAt = now + 620;
    score += 1;
    streak += 1;
    bonusTime += 2;
    timeLeft += 2;
    addFloatingEffect("+2s", "#77f29a");
    playSound("score");

    if (streak >= 3) {
      showMessage("¡En llamas!");
    } else if (streak >= 2) {
      showMessage(`¡Racha x${streak}!`);
    } else {
      showMessage("¡Canasta!");
    }
    updateHud();
  }

  function drawGame() {
    ctx.clearRect(0, 0, width, height);
    drawCourt();
    drawHoopBack();

    if (ball.state === "dragging") {
      drawAimGuide();
    }

    drawBallTrail();
    drawBall(ball.x, ball.y, ball.radius);
    drawFloatingEffects();
    drawHoopFront();

    if (screen === "playing" && !timerStarted && ball.state === "ready") {
      drawHint();
    }
  }

  function drawCourt() {
    const wallBottom = height * 0.39;
    const wallGradient = ctx.createLinearGradient(0, 0, 0, wallBottom);
    wallGradient.addColorStop(0, "#75d7df");
    wallGradient.addColorStop(1, "#c7f2e7");
    ctx.fillStyle = wallGradient;
    ctx.fillRect(0, 0, width, wallBottom);

    const floorGradient = ctx.createLinearGradient(0, wallBottom, 0, height);
    floorGradient.addColorStop(0, "#e7a043");
    floorGradient.addColorStop(1, "#bc672c");
    ctx.fillStyle = floorGradient;
    ctx.fillRect(0, wallBottom, width, height - wallBottom);

    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    ctx.fillRect(0, wallBottom - 4, width, 8);

    ctx.strokeStyle = "rgba(255, 247, 214, 0.55)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(width * 0.1, height);
    ctx.lineTo(width * 0.32, wallBottom);
    ctx.moveTo(width * 0.9, height);
    ctx.lineTo(width * 0.68, wallBottom);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 247, 214, 0.42)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(width / 2, height * 0.72, width * 0.27, height * 0.105, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(width * 0.17, height * 0.6);
    ctx.lineTo(width * 0.83, height * 0.6);
    ctx.stroke();

    ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    ctx.beginPath();
    ctx.ellipse(rest.x, rest.y + ball.radius * 1.2, ball.radius * 1.8, ball.radius * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHoopBack() {
    const boardX = hoop.x - hoop.backboardWidth / 2;
    const boardY = hoop.rimY - hoop.backboardHeight - 24;

    roundedRect(boardX + 3, boardY + 5, hoop.backboardWidth, hoop.backboardHeight, 12, "rgba(0, 0, 0, 0.16)");
    roundedRect(boardX, boardY, hoop.backboardWidth, hoop.backboardHeight, 12, "rgba(245, 255, 255, 0.86)");

    ctx.strokeStyle = "rgba(26, 97, 104, 0.42)";
    ctx.lineWidth = 4;
    ctx.strokeRect(hoop.x - hoop.width * 0.25, boardY + 13, hoop.width * 0.5, hoop.backboardHeight - 22);

    const left = hoop.x - hoop.width / 2;
    const right = hoop.x + hoop.width / 2;
    const netTop = hoop.rimY + 8;
    const netBottom = hoop.rimY + clamp(height * 0.07, 38, 54);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.66)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left + 10, netTop);
    ctx.lineTo(hoop.x - 18, netBottom);
    ctx.moveTo(left + 28, netTop + 4);
    ctx.lineTo(hoop.x - 3, netBottom + 2);
    ctx.moveTo(right - 28, netTop + 4);
    ctx.lineTo(hoop.x + 3, netBottom + 2);
    ctx.moveTo(right - 10, netTop);
    ctx.lineTo(hoop.x + 18, netBottom);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.38)";
    ctx.beginPath();
    ctx.moveTo(left + 13, netTop + 14);
    ctx.quadraticCurveTo(hoop.x, netBottom + 8, right - 13, netTop + 14);
    ctx.stroke();
  }

  function drawHoopFront() {
    const rimHeight = clamp(height * 0.018, 10, 14);

    ctx.strokeStyle = "rgba(110, 36, 20, 0.34)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.ellipse(hoop.x + 2, hoop.rimY + 3, hoop.width / 2, rimHeight, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#e44628";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(hoop.x, hoop.rimY, hoop.width / 2, rimHeight, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "#ff7d3a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(hoop.x, hoop.rimY - 1, hoop.width / 2 - 2, rimHeight - 2, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
  }

  function drawBallTrail() {
    if (streak < 2 || ballTrail.length === 0) return;

    ctx.save();
    for (let index = 0; index < ballTrail.length; index += 1) {
      const point = ballTrail[index];
      const strength = (index + 1) / ballTrail.length;
      ctx.globalAlpha = strength * 0.55;
      ctx.fillStyle = index % 2 === 0 ? "#ffcf4a" : "#f05a28";
      ctx.beginPath();
      ctx.arc(point.x, point.y, ball.radius * (0.18 + strength * 0.32), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawFloatingEffects() {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 ${clamp(width * 0.06, 20, 28)}px system-ui, sans-serif`;
    for (const effect of floatingEffects) {
      const alpha = clamp((effect.until - performance.now()) / 800, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = effect.color;
      ctx.strokeStyle = "rgba(5, 42, 49, 0.42)";
      ctx.lineWidth = 4;
      ctx.strokeText(effect.text, effect.x, effect.y);
      ctx.fillText(effect.text, effect.x, effect.y);
    }
    ctx.restore();
  }

  function drawBall(x, y, radius) {
    const gradient = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.42, radius * 0.2, x, y, radius);
    gradient.addColorStop(0, "#ffd06a");
    gradient.addColorStop(0.45, "#f98b2d");
    gradient.addColorStop(1, "#b9471f");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#743017";
    ctx.lineWidth = Math.max(2, radius * 0.12);
    ctx.stroke();

    ctx.lineWidth = Math.max(1.5, radius * 0.08);
    ctx.beginPath();
    ctx.moveTo(x - radius, y);
    ctx.quadraticCurveTo(x, y - radius * 0.22, x + radius, y);
    ctx.moveTo(x - radius, y);
    ctx.quadraticCurveTo(x, y + radius * 0.22, x + radius, y);
    ctx.moveTo(x, y - radius);
    ctx.quadraticCurveTo(x - radius * 0.28, y, x, y + radius);
    ctx.moveTo(x, y - radius);
    ctx.quadraticCurveTo(x + radius * 0.28, y, x, y + radius);
    ctx.stroke();
  }

  function drawAimGuide() {
    const pullX = rest.x - ball.x;
    const pullY = rest.y - ball.y;
    const pullLength = Math.hypot(pullX, pullY);

    if (pullLength < 2) {
      return;
    }

    const unitX = pullX / pullLength;
    const unitY = pullY / pullLength;
    const guideLength = clamp(pullLength * 1.15, 36, 132);
    const arrowX = ball.x + unitX * guideLength;
    const arrowY = ball.y + unitY * guideLength;

    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.82)";
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(arrowX, arrowY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = "rgba(66, 41, 20, 0.38)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(rest.x, rest.y);
    ctx.lineTo(ball.x, ball.y);
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 248, 199, 0.95)";
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(arrowX - unitX * 18 - unitY * 8, arrowY - unitY * 18 + unitX * 8);
    ctx.lineTo(arrowX - unitX * 18 + unitY * 8, arrowY - unitY * 18 - unitX * 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawHint() {
    const text = "Toca el balón y arrastra hacia abajo";
    const boxWidth = Math.min(width - 34, 330);
    const boxHeight = 38;
    const x = (width - boxWidth) / 2;
    const y = rest.y - ball.radius - 58;

    ctx.fillStyle = "rgba(5, 42, 49, 0.55)";
    roundedRect(x, y, boxWidth, boxHeight, 19, "rgba(5, 42, 49, 0.55)");
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 ${clamp(width * 0.04, 14, 17)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, width / 2, y + boxHeight / 2);
  }

  function roundedRect(x, y, rectWidth, rectHeight, radius, fillStyle) {
    const safeRadius = Math.min(radius, rectWidth / 2, rectHeight / 2);

    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.moveTo(x + safeRadius, y);
    ctx.lineTo(x + rectWidth - safeRadius, y);
    ctx.quadraticCurveTo(x + rectWidth, y, x + rectWidth, y + safeRadius);
    ctx.lineTo(x + rectWidth, y + rectHeight - safeRadius);
    ctx.quadraticCurveTo(x + rectWidth, y + rectHeight, x + rectWidth - safeRadius, y + rectHeight);
    ctx.lineTo(x + safeRadius, y + rectHeight);
    ctx.quadraticCurveTo(x, y + rectHeight, x, y + rectHeight - safeRadius);
    ctx.lineTo(x, y + safeRadius);
    ctx.quadraticCurveTo(x, y, x + safeRadius, y);
    ctx.closePath();
    ctx.fill();
  }

  function gameLoop(now) {
    const deltaTime = Math.min((now - lastFrameTime) / 1000, 0.033);
    lastFrameTime = now;

    updateGame(deltaTime, now);

    if (screen === "playing") {
      drawGame();
    }

    requestAnimationFrame(gameLoop);
  }

  playButton.addEventListener("click", startGame);
  restartButton.addEventListener("click", startGame);
  homeButton.addEventListener("click", showStartScreen);

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerCancel);
  canvas.addEventListener("lostpointercapture", onPointerCancel);

  window.addEventListener("resize", resizeGame);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", resizeGame);
  }

  document.addEventListener(
    "touchmove",
    (event) => {
      if (screen === "playing") {
        event.preventDefault();
      }
    },
    { passive: false },
  );

  updateBestScoreLabels();
  updateHud();
  resizeGame();
  requestAnimationFrame(gameLoop);
})();
