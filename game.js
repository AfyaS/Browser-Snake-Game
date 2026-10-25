/**
 * Retro-Modern Snake Game for Web & GitHub Pages
 * Zero dependencies - vanilla JS + HTML5 Canvas + Web Audio API
 */

(function () {
  'use strict';

  // --- Configuration & Constants ---
  const GRID_SIZE = 20; // 20x20 grid
  const CELL_SIZE = 20; // 20px per cell = 400x400 canvas coordinate space
  const CANVAS_SIZE = 400;

  const SPEEDS = {
    easy: 140,
    normal: 100,
    hard: 65,
  };

  // --- Sound Effects using Web Audio API ---
  class SoundController {
    constructor() {
      this.ctx = null;
      this.muted = localStorage.getItem('snake_muted') === 'true';
    }

    init() {
      try {
        if (!this.ctx) {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (AudioCtx) {
            this.ctx = new AudioCtx();
          }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
      } catch {
        // AudioContext not allowed or not supported
      }
    }

    toggleMute() {
      this.muted = !this.muted;
      try {
        localStorage.setItem('snake_muted', this.muted);
      } catch {
        // LocalStorage access restricted
      }
      return this.muted;
    }

    playEat() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        const now = this.ctx.currentTime;
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(720, now + 0.08);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.08);
      } catch {
        // Ignore audio playback errors
      }
    }

    playBonus() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      try {
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'triangle';
          const start = now + idx * 0.06;
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.22, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.1);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(start);
          osc.stop(start + 0.1);
        });
      } catch {
        // Ignore audio playback errors
      }
    }

    playGameOver() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        const now = this.ctx.currentTime;
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.35);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
      } catch {
        // Ignore audio playback errors
      }
    }

    playWin() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      try {
        const now = this.ctx.currentTime;
        const fanfare = [523.25, 659.25, 783.99, 1046.5, 1318.5];
        fanfare.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'triangle';
          const start = now + idx * 0.08;
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.25, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(start);
          osc.stop(start + 0.18);
        });
      } catch {
        // Ignore audio playback errors
      }
    }

    playClick() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;

      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        const now = this.ctx.currentTime;
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.03);
      } catch {
        // Ignore audio playback errors
      }
    }
  }

  // --- Main Game Class ---
  class SnakeGame {
    constructor() {
      this.canvas = document.getElementById('game-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.sound = new SoundController();

      // UI Elements
      this.currentScoreEl = document.getElementById('current-score');
      this.highScoreEl = document.getElementById('high-score');
      this.finalScoreEl = document.getElementById('final-score');
      this.gameOverTitleEl = document.getElementById('game-over-title');
      this.newHighScoreMsg = document.getElementById('new-high-score-msg');
      this.bonusBarContainer = document.getElementById('bonus-bar-container');
      this.bonusBar = document.getElementById('bonus-bar');

      // Overlays
      this.startOverlay = document.getElementById('start-overlay');
      this.pauseOverlay = document.getElementById('pause-overlay');
      this.gameOverOverlay = document.getElementById('game-over-overlay');

      // Buttons
      this.startBtn = document.getElementById('start-btn');
      this.resumeBtn = document.getElementById('resume-btn');
      this.restartBtn = document.getElementById('restart-btn');
      this.pauseToggleBtn = document.getElementById('pause-toggle-btn');
      this.pauseIcon = document.getElementById('pause-icon');
      this.soundToggleBtn = document.getElementById('sound-toggle-btn');
      this.soundIcon = document.getElementById('sound-icon');
      this.diffButtons = document.querySelectorAll('.diff-btn');

      // Mobile controls
      this.dpadUp = document.getElementById('dpad-up');
      this.dpadDown = document.getElementById('dpad-down');
      this.dpadLeft = document.getElementById('dpad-left');
      this.dpadRight = document.getElementById('dpad-right');

      // High Score retrieval with fallback
      this.highScore = 0;
      try {
        this.highScore = parseInt(localStorage.getItem('snake_highscore') || '0', 10);
      } catch {
        this.highScore = 0;
      }
      this.highScoreEl.textContent = this.highScore;

      // Game state variables
      this.baseSpeed = SPEEDS.normal;
      this.currentSpeed = this.baseSpeed;
      this.lastTickTime = 0;
      this.lastFrameTime = 0;
      this.animFrameId = null;
      this.gameStatus = 'idle'; // 'idle', 'running', 'paused', 'gameover', 'victory'
      this.score = 0;
      this.applesEaten = 0;

      // Snake, inputs & food state
      this.snake = [];
      this.direction = { x: 1, y: 0 };
      this.inputQueue = []; // Queue for responsive, un-suicidal rapid turns
      this.food = { x: 14, y: 10 };
      this.bonusFood = null; // { x, y, duration, remaining }

      // Setup High-DPI Canvas Rendering
      this.setupCanvasDPI();
      window.addEventListener('resize', () => this.setupCanvasDPI());

      // Initialize UI & Events
      this.setupSoundUI();
      this.bindEvents();
      this.drawInitialBoard();
    }

    setupCanvasDPI() {
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = CANVAS_SIZE * dpr;
      this.canvas.height = CANVAS_SIZE * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.render();
    }

    setupSoundUI() {
      this.soundIcon.textContent = this.sound.muted ? '🔇' : '🔊';
    }

    bindEvents() {
      // Button Clicks (with blur() to prevent keyboard Space from triggering them)
      this.startBtn.addEventListener('click', (e) => {
        e.currentTarget.blur();
        this.startGame();
      });

      this.resumeBtn.addEventListener('click', (e) => {
        e.currentTarget.blur();
        this.resumeGame();
      });

      this.restartBtn.addEventListener('click', (e) => {
        e.currentTarget.blur();
        this.startGame();
      });

      this.pauseToggleBtn.addEventListener('click', (e) => {
        e.currentTarget.blur();
        if (this.gameStatus === 'running') {
          this.pauseGame();
        } else if (this.gameStatus === 'paused') {
          this.resumeGame();
        }
      });

      this.soundToggleBtn.addEventListener('click', (e) => {
        e.currentTarget.blur();
        const isMuted = this.sound.toggleMute();
        this.soundIcon.textContent = isMuted ? '🔇' : '🔊';
        if (!isMuted) this.sound.playClick();
      });

      // Difficulty buttons
      this.diffButtons.forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.currentTarget.blur();
          this.sound.playClick();
          this.diffButtons.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.baseSpeed = parseInt(btn.dataset.speed, 10);
          // Recalculate current speed with current progression
          this.currentSpeed = Math.max(45, this.baseSpeed - Math.floor(this.applesEaten * 1.5));
        });
      });

      // Keyboard input
      window.addEventListener('keydown', (e) => this.handleKeyDown(e));

      // Mobile D-Pad with touch deduplication
      let lastTouchTime = 0;
      const bindDpad = (el, dir) => {
        el.addEventListener(
          'touchstart',
          (e) => {
            e.preventDefault();
            lastTouchTime = performance.now();
            this.sound.init();
            this.changeDirection(dir);
          },
          { passive: false }
        );

        el.addEventListener('click', (e) => {
          e.currentTarget.blur();
          // Suppress synthesized mouse clicks following touch
          if (performance.now() - lastTouchTime < 400) return;
          this.sound.init();
          this.changeDirection(dir);
        });
      };

      bindDpad(this.dpadUp, { x: 0, y: -1 });
      bindDpad(this.dpadDown, { x: 0, y: 1 });
      bindDpad(this.dpadLeft, { x: -1, y: 0 });
      bindDpad(this.dpadRight, { x: 1, y: 0 });

      // Canvas Touch Gestures (Tap to start/resume, Swipe to steer)
      let touchStartX = 0;
      let touchStartY = 0;

      this.canvas.addEventListener(
        'touchstart',
        (e) => {
          this.sound.init();
          if (e.touches.length > 0) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
          }
        },
        { passive: true }
      );

      this.canvas.addEventListener(
        'touchmove',
        (e) => {
          // Prevent screen scroll while swiping on game canvas
          e.preventDefault();
        },
        { passive: false }
      );

      this.canvas.addEventListener(
        'touchend',
        (e) => {
          if (e.changedTouches.length === 0) return;
          const touchEndX = e.changedTouches[0].clientX;
          const touchEndY = e.changedTouches[0].clientY;
          const dx = touchEndX - touchStartX;
          const dy = touchEndY - touchStartY;

          // Short tap (< 20px displacement)
          if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
            if (this.gameStatus === 'idle' || this.gameStatus === 'gameover' || this.gameStatus === 'victory') {
              this.startGame();
            } else if (this.gameStatus === 'paused') {
              this.resumeGame();
            }
            return;
          }

          // Swipe gesture
          if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) this.changeDirection({ x: 1, y: 0 });
            else this.changeDirection({ x: -1, y: 0 });
          } else {
            if (dy > 0) this.changeDirection({ x: 0, y: 1 });
            else this.changeDirection({ x: 0, y: -1 });
          }
        },
        { passive: true }
      );
    }

    handleKeyDown(e) {
      this.sound.init();

      // Prevent window scrolling with Arrow keys and Space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      // Space key toggles pause / start / restart
      if (e.key === ' ' || e.code === 'Space') {
        if (this.gameStatus === 'running') {
          this.pauseGame();
        } else if (this.gameStatus === 'paused') {
          this.resumeGame();
        } else if (this.gameStatus === 'idle' || this.gameStatus === 'gameover' || this.gameStatus === 'victory') {
          this.startGame();
        }
        return;
      }

      // Enter key starts / restarts
      if (e.key === 'Enter') {
        if (this.gameStatus === 'idle' || this.gameStatus === 'gameover' || this.gameStatus === 'victory') {
          this.startGame();
        }
        return;
      }

      // Directional inputs
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          this.changeDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          this.changeDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          this.changeDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          this.changeDirection({ x: 1, y: 0 });
          break;
      }
    }

    changeDirection(newDir) {
      if (this.gameStatus !== 'running') return;

      // Determine the reference direction: the last queued direction, or current moving direction
      const lastDir = this.inputQueue.length > 0
        ? this.inputQueue[this.inputQueue.length - 1]
        : this.direction;

      // Disallow 180° reverse turns into snake's neck
      if (lastDir.x + newDir.x === 0 && lastDir.y + newDir.y === 0) {
        return;
      }

      // Disallow redundant inputs in the same direction
      if (lastDir.x === newDir.x && lastDir.y === newDir.y) {
        return;
      }

      // Buffer up to 2 queued turns for smooth arcade feel
      if (this.inputQueue.length < 2) {
        this.inputQueue.push(newDir);
      }
    }

    startGame() {
      // Cancel any existing loop
      if (this.animFrameId) {
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }

      this.sound.playClick();
      this.score = 0;
      this.applesEaten = 0;
      this.currentSpeed = this.baseSpeed;
      this.currentScoreEl.textContent = '0';

      // Initial snake: 3 segments starting in center moving right
      this.snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 },
      ];
      this.direction = { x: 1, y: 0 };
      this.inputQueue = [];

      this.bonusFood = null;
      this.bonusBarContainer.classList.add('hidden');

      this.spawnFood();

      // Overlays
      this.startOverlay.classList.add('hidden');
      this.pauseOverlay.classList.add('hidden');
      this.gameOverOverlay.classList.add('hidden');
      this.newHighScoreMsg.classList.add('hidden');
      this.pauseIcon.textContent = '⏸️';

      this.gameStatus = 'running';
      this.lastTickTime = performance.now();
      this.lastFrameTime = performance.now();
      this.animFrameId = requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    pauseGame() {
      if (this.gameStatus !== 'running') return;
      this.gameStatus = 'paused';
      this.sound.playClick();
      if (this.animFrameId) {
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }
      this.pauseOverlay.classList.remove('hidden');
      this.pauseIcon.textContent = '▶️';
    }

    resumeGame() {
      if (this.gameStatus !== 'paused') return;
      this.gameStatus = 'running';
      this.sound.playClick();
      this.pauseOverlay.classList.add('hidden');
      this.pauseIcon.textContent = '⏸️';

      const now = performance.now();
      this.lastTickTime = now;
      this.lastFrameTime = now;
      this.animFrameId = requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    gameOver() {
      this.gameStatus = 'gameover';
      this.sound.playGameOver();
      this.pauseIcon.textContent = '⏸️';

      if (this.animFrameId) {
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }
      this.bonusFood = null;
      this.bonusBarContainer.classList.add('hidden');

      this.gameOverTitleEl.textContent = 'GAME OVER';
      this.gameOverTitleEl.className = 'game-over-title';
      this.finalScoreEl.textContent = this.score;

      this.checkHighScore();
      this.gameOverOverlay.classList.remove('hidden');
    }

    victory() {
      this.gameStatus = 'victory';
      this.sound.playWin();
      this.pauseIcon.textContent = '⏸️';

      if (this.animFrameId) {
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }
      this.bonusFood = null;
      this.bonusBarContainer.classList.add('hidden');

      this.gameOverTitleEl.textContent = '🏆 VICTORY! 🏆';
      this.gameOverTitleEl.className = 'game-over-title victory-title';
      this.finalScoreEl.textContent = this.score;

      this.checkHighScore();
      this.gameOverOverlay.classList.remove('hidden');
    }

    checkHighScore() {
      if (this.score > this.highScore) {
        this.highScore = this.score;
        try {
          localStorage.setItem('snake_highscore', this.highScore);
        } catch {
          // LocalStorage unavailable
        }
        this.highScoreEl.textContent = this.highScore;
        this.newHighScoreMsg.classList.remove('hidden');
      }
    }

    getEmptyCells() {
      const occupied = new Set();
      for (const seg of this.snake) {
        occupied.add(`${seg.x},${seg.y}`);
      }
      if (this.bonusFood) {
        occupied.add(`${this.bonusFood.x},${this.bonusFood.y}`);
      }
      if (this.food) {
        occupied.add(`${this.food.x},${this.food.y}`);
      }

      const empty = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
          if (!occupied.has(`${x},${y}`)) {
            empty.push({ x, y });
          }
        }
      }
      return empty;
    }

    spawnFood() {
      const emptyCells = this.getEmptyCells();
      if (emptyCells.length === 0) {
        // Board is completely full - player won!
        this.victory();
        return;
      }
      const choice = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      this.food = choice;
    }

    spawnBonusFood() {
      const emptyCells = this.getEmptyCells();
      if (emptyCells.length === 0) return;

      const choice = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      const duration = 5000; // 5 seconds

      this.bonusFood = {
        x: choice.x,
        y: choice.y,
        duration: duration,
        remaining: duration,
      };

      this.bonusBarContainer.classList.remove('hidden');
      this.bonusBar.style.width = '100%';
    }

    gameLoop(timestamp) {
      if (this.gameStatus !== 'running') return;

      const delta = timestamp - this.lastFrameTime;
      this.lastFrameTime = timestamp;

      // Handle Bonus Food Timer smoothly via delta time (immune to pause glitches)
      if (this.bonusFood) {
        this.bonusFood.remaining -= delta;
        const ratio = Math.max(0, this.bonusFood.remaining / this.bonusFood.duration);
        this.bonusBar.style.width = `${ratio * 100}%`;

        if (this.bonusFood.remaining <= 0) {
          this.bonusFood = null;
          this.bonusBarContainer.classList.add('hidden');
        }
      }

      // Check tick execution
      const elapsedTick = timestamp - this.lastTickTime;
      if (elapsedTick >= this.currentSpeed) {
        this.lastTickTime = timestamp;
        this.tick();
      }

      // Render updated frame
      this.render();

      if (this.gameStatus === 'running') {
        this.animFrameId = requestAnimationFrame((ts) => this.gameLoop(ts));
      }
    }

    tick() {
      // Pull next direction from buffered input queue
      if (this.inputQueue.length > 0) {
        this.direction = this.inputQueue.shift();
      }

      // Calculate new head position
      const head = {
        x: this.snake[0].x + this.direction.x,
        y: this.snake[0].y + this.direction.y,
      };

      // Wall collision check
      if (
        head.x < 0 ||
        head.x >= GRID_SIZE ||
        head.y < 0 ||
        head.y >= GRID_SIZE
      ) {
        this.gameOver();
        return;
      }

      // Self collision check:
      // Note: the current tail segment (snake[snake.length - 1]) will move away on this tick
      // unless food was eaten. If head moves into the tail square without food, it's NOT a collision.
      const willGrow =
        (this.food && head.x === this.food.x && head.y === this.food.y) ||
        (this.bonusFood && head.x === this.bonusFood.x && head.y === this.bonusFood.y);

      const segmentsToCheck = willGrow ? this.snake.length : this.snake.length - 1;
      for (let i = 0; i < segmentsToCheck; i++) {
        if (this.snake[i].x === head.x && this.snake[i].y === head.y) {
          this.gameOver();
          return;
        }
      }

      // Insert new head
      this.snake.unshift(head);

      let ateFood = false;

      // Check regular food collision
      if (this.food && head.x === this.food.x && head.y === this.food.y) {
        this.score += 10;
        this.applesEaten++;
        this.sound.playEat();
        this.spawnFood();
        ateFood = true;

        // Progressive speed acceleration
        this.currentSpeed = Math.max(45, this.baseSpeed - Math.floor(this.applesEaten * 1.5));

        // Spawn bonus golden food every 5 regular apples
        if (this.applesEaten % 5 === 0 && !this.bonusFood) {
          this.spawnBonusFood();
        }
      }

      // Check bonus food collision
      if (this.bonusFood && head.x === this.bonusFood.x && head.y === this.bonusFood.y) {
        this.score += 30;
        this.sound.playBonus();
        this.bonusFood = null;
        this.bonusBarContainer.classList.add('hidden');
        ateFood = true;
      }

      // If no food was eaten on this tick, remove tail segment
      if (!ateFood) {
        this.snake.pop();
      }

      // Update score display
      this.currentScoreEl.textContent = this.score;
      if (this.score > this.highScore) {
        this.highScoreEl.textContent = this.score;
      }
    }

    render() {
      // Clear canvas with deep aesthetic berry-black
      this.ctx.fillStyle = '#170c22';
      this.ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Draw subtle alternating grid checkerboard with cute soft violet/pink tint
      this.ctx.fillStyle = 'rgba(244, 114, 182, 0.035)';
      for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
          if ((x + y) % 2 === 0) {
            this.ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          }
        }
      }

      // Draw regular food (Sweet Berry / Apple)
      if (this.food) {
        this.drawApple(this.food.x, this.food.y);
      }

      // Draw bonus food (Golden Star Apple)
      if (this.bonusFood) {
        this.drawBonusFood(this.bonusFood.x, this.bonusFood.y);
      }

      // Draw snake (without eyes)
      this.drawSnake();
    }

    drawApple(gx, gy) {
      const px = gx * CELL_SIZE;
      const py = gy * CELL_SIZE;
      const radius = CELL_SIZE / 2 - 2;
      const cx = px + CELL_SIZE / 2;
      const cy = py + CELL_SIZE / 2 + 1;

      // Glow effect
      this.ctx.save();
      this.ctx.shadowBlur = 12;
      this.ctx.shadowColor = '#f43f5e';

      // Cute strawberry pink apple body
      this.ctx.fillStyle = '#f43f5e';
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Specular shine
      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      this.ctx.beginPath();
      this.ctx.arc(cx - radius / 3, cy - radius / 3, radius / 3, 0, Math.PI * 2);
      this.ctx.fill();

      // Cute minty green leaf
      this.ctx.fillStyle = '#34d399';
      this.ctx.beginPath();
      this.ctx.ellipse(cx + 2, cy - radius, 3, 2, Math.PI / 4, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    drawBonusFood(gx, gy) {
      const px = gx * CELL_SIZE;
      const py = gy * CELL_SIZE;
      const cx = px + CELL_SIZE / 2;
      const cy = py + CELL_SIZE / 2;

      // Pulsing golden glow effect
      const pulse = (Math.sin(performance.now() / 140) + 1) / 2;
      this.ctx.save();
      this.ctx.shadowBlur = 14 + pulse * 10;
      this.ctx.shadowColor = '#fbbf24';

      // Outer golden body
      this.ctx.fillStyle = '#fbbf24';
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, CELL_SIZE / 2 - 1.5, 0, Math.PI * 2);
      this.ctx.fill();

      // Inner glittering star / shine core
      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = '#fef3c7';
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, CELL_SIZE / 3.8, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    drawSnake() {
      for (let i = this.snake.length - 1; i >= 0; i--) {
        const seg = this.snake[i];
        const px = seg.x * CELL_SIZE;
        const py = seg.y * CELL_SIZE;
        const isHead = i === 0;

        if (isHead) {
          // Head: cute candy hot-pink with glowing halo, NO EYES
          this.ctx.save();
          this.ctx.shadowBlur = 14;
          this.ctx.shadowColor = 'rgba(244, 114, 182, 0.8)';
          this.ctx.fillStyle = '#f472b6';

          this.drawRoundedRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2, 7);
          this.ctx.restore();

          // Cute forked snake tongue
          this.drawTongue(px, py);
        } else {
          // Body segments: smooth pastel candy gradient from bubblegum pink to lilac lavender
          const progress = i / Math.max(1, this.snake.length);
          // R: 251 -> 192 (pastel pink to lilac)
          // G: 113 -> 132
          // B: 181 -> 252
          const r = Math.round(251 - progress * 55);
          const g = Math.round(113 + progress * 20);
          const b = Math.round(181 + progress * 71);

          this.ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          this.drawRoundedRect(px + 1.5, py + 1.5, CELL_SIZE - 3, CELL_SIZE - 3, 5);
        }
      }
    }

    drawTongue(headX, headY) {
      // Flickering animation: tongue extends and flicks playfully
      const flickCycle = (Math.sin(performance.now() / 110) + 1) / 2; // 0 to 1
      if (flickCycle < 0.2) return; // Retracts momentarily

      const reach = 3 + flickCycle * 5; // Extends 3 to 8px
      const forkLen = 2.5;
      const forkSpread = 2.2;

      const cx = headX + CELL_SIZE / 2;
      const cy = headY + CELL_SIZE / 2;

      let startX, startY, midX, midY, fork1X, fork1Y, fork2X, fork2Y;

      if (this.direction.x === 1) {
        // Moving Right
        startX = headX + CELL_SIZE - 1;
        startY = cy;
        midX = startX + reach;
        midY = cy;
        fork1X = midX + forkLen;
        fork1Y = midY - forkSpread;
        fork2X = midX + forkLen;
        fork2Y = midY + forkSpread;
      } else if (this.direction.x === -1) {
        // Moving Left
        startX = headX + 1;
        startY = cy;
        midX = startX - reach;
        midY = cy;
        fork1X = midX - forkLen;
        fork1Y = midY - forkSpread;
        fork2X = midX - forkLen;
        fork2Y = midY + forkSpread;
      } else if (this.direction.y === -1) {
        // Moving Up
        startX = cx;
        startY = headY + 1;
        midX = cx;
        midY = startY - reach;
        fork1X = midX - forkSpread;
        fork1Y = midY - forkLen;
        fork2X = midX + forkSpread;
        fork2Y = midY - forkLen;
      } else {
        // Moving Down
        startX = cx;
        startY = headY + CELL_SIZE - 1;
        midX = cx;
        midY = startY + reach;
        fork1X = midX - forkSpread;
        fork1Y = midY + forkLen;
        fork2X = midX + forkSpread;
        fork2Y = midY + forkLen;
      }

      this.ctx.save();
      this.ctx.strokeStyle = '#f43f5e';
      this.ctx.lineWidth = 1.8;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.shadowBlur = 4;
      this.ctx.shadowColor = 'rgba(244, 63, 94, 0.5)';

      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY);
      this.ctx.lineTo(midX, midY);
      this.ctx.lineTo(fork1X, fork1Y);
      this.ctx.moveTo(midX, midY);
      this.ctx.lineTo(fork2X, fork2Y);
      this.ctx.stroke();
      this.ctx.restore();
    }

    drawRoundedRect(x, y, w, h, radius) {
      this.ctx.beginPath();
      this.ctx.moveTo(x + radius, y);
      this.ctx.lineTo(x + w - radius, y);
      this.ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      this.ctx.lineTo(x + w, y + h - radius);
      this.ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      this.ctx.lineTo(x + radius, y + h);
      this.ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      this.ctx.lineTo(x, y + radius);
      this.ctx.quadraticCurveTo(x, y, x + radius, y);
      this.ctx.closePath();
      this.ctx.fill();
    }

    drawInitialBoard() {
      // Draw preview snake and apple for the title screen
      this.snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 },
      ];
      this.food = { x: 14, y: 10 };
      this.render();
    }
  }

  // Start instance once DOM is ready
  window.addEventListener('DOMContentLoaded', () => {
    new SnakeGame();
  });
})();
