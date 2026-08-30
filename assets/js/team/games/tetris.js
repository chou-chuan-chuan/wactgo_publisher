(() => {
  "use strict";

  const COLS = 10;
  const ROWS = 20;
  const BLOCK_SIZE = 30;
  const LINE_SCORES = [0, 100, 300, 500, 800];

  const PIECES = {
    I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
    O: [[1, 1], [1, 1]],
    S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]]
  };

  const COLORS = {
    I: "#b98652",
    J: "#68645f",
    L: "#c68a4b",
    O: "#d1b37a",
    S: "#85866f",
    T: "#987362",
    Z: "#aa6e58"
  };

  class TetrisGame {
    constructor(root) {
      this.root = root;
      this.canvas = root.querySelector("#tetrisCanvas");
      this.ctx = this.canvas.getContext("2d");
      this.nextCanvas = root.querySelector("#nextCanvas");
      this.nextCtx = this.nextCanvas.getContext("2d");
      this.scoreElement = root.querySelector("#tetrisScore");
      this.linesElement = root.querySelector("#tetrisLines");
      this.levelElement = root.querySelector("#tetrisLevel");
      this.pauseButton = root.querySelector("#tetrisPauseButton");
      this.restartButton = root.querySelector("#tetrisRestartButton");

      this.board = this.createBoard();
      this.bag = [];
      this.current = null;
      this.nextType = this.takeFromBag();
      this.score = 0;
      this.lines = 0;
      this.level = 1;
      this.state = "ready";
      this.gameOverNotified = false;
      this.dropCounter = 0;
      this.lastTime = 0;
      this.animationFrame = null;

      this.bindEvents();
      this.spawnPiece();
      this.updateUI();
      this.draw();
      if (document.fonts) {
        document.fonts.ready.then(() => {
          this.draw();
          this.drawNext();
        });
      }
      this.loop = this.loop.bind(this);
      this.animationFrame = requestAnimationFrame(this.loop);
    }

    createBoard() {
      return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    }

    refillBag() {
      this.bag = Object.keys(PIECES);
      for (let index = this.bag.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [this.bag[index], this.bag[swapIndex]] = [this.bag[swapIndex], this.bag[index]];
      }
    }

    takeFromBag() {
      if (this.bag.length === 0) this.refillBag();
      return this.bag.pop();
    }

    createPiece(type) {
      const matrix = PIECES[type].map(row => [...row]);
      return {
        type,
        matrix,
        x: Math.floor((COLS - matrix[0].length) / 2),
        y: 0
      };
    }

    spawnPiece() {
      this.current = this.createPiece(this.nextType);
      this.nextType = this.takeFromBag();
      this.drawNext();

      if (this.collides(this.current.matrix, this.current.x, this.current.y)) {
        this.state = "over";
        this.updateUI();
        if (!this.gameOverNotified) {
          this.gameOverNotified = true;
          if (typeof window !== "undefined") {
            window.WactgoLeaderboard?.showScoreSubmission("tetris", this.score);
          }
        }
      }
    }

    collides(matrix, offsetX, offsetY) {
      return matrix.some((row, y) => row.some((value, x) => {
        if (!value) return false;
        const boardX = offsetX + x;
        const boardY = offsetY + y;
        return boardX < 0 || boardX >= COLS || boardY >= ROWS ||
          (boardY >= 0 && this.board[boardY][boardX] !== null);
      }));
    }

    move(horizontal, vertical) {
      if (this.state !== "running") return false;
      const nextX = this.current.x + horizontal;
      const nextY = this.current.y + vertical;
      if (this.collides(this.current.matrix, nextX, nextY)) return false;
      this.current.x = nextX;
      this.current.y = nextY;
      return true;
    }

    rotateMatrix(matrix, direction) {
      const rotated = matrix.map((row, y) => row.map((value, x) => matrix[matrix.length - 1 - x][y]));
      if (direction < 0) return this.rotateMatrix(this.rotateMatrix(rotated, 1), 1);
      return rotated;
    }

    rotate(direction) {
      if (this.state !== "running") return;
      const rotated = this.rotateMatrix(this.current.matrix, direction);
      const wallKicks = [0, -1, 1, -2, 2];
      const validKick = wallKicks.find(offset => !this.collides(rotated, this.current.x + offset, this.current.y));
      if (validKick === undefined) return;
      this.current.matrix = rotated;
      this.current.x += validKick;
    }

    softDrop() {
      if (this.state !== "running") return;
      if (this.move(0, 1)) {
        this.score += 1;
        this.dropCounter = 0;
        this.updateUI();
      } else {
        this.lockPiece();
      }
    }

    hardDrop() {
      if (this.state !== "running") return;
      let distance = 0;
      while (this.move(0, 1)) distance += 1;
      this.score += distance * 2;
      this.lockPiece();
    }

    stepDown() {
      if (!this.move(0, 1)) this.lockPiece();
      this.dropCounter = 0;
    }

    lockPiece() {
      this.current.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
          if (!value) return;
          const boardY = this.current.y + y;
          if (boardY >= 0) this.board[boardY][this.current.x + x] = this.current.type;
        });
      });

      const cleared = this.clearLines();
      if (cleared > 0) {
        this.lines += cleared;
        this.score += LINE_SCORES[cleared] * this.level;
        this.level = Math.floor(this.lines / 10) + 1;
      }
      this.spawnPiece();
      this.updateUI();
    }

    clearLines() {
      let cleared = 0;
      for (let y = ROWS - 1; y >= 0; y -= 1) {
        if (this.board[y].every(Boolean)) {
          this.board.splice(y, 1);
          this.board.unshift(Array(COLS).fill(null));
          cleared += 1;
          y += 1;
        }
      }
      return cleared;
    }

    getDropInterval() {
      return Math.max(100, 900 - (this.level - 1) * 70);
    }

    getGhostY() {
      let ghostY = this.current.y;
      while (!this.collides(this.current.matrix, this.current.x, ghostY + 1)) ghostY += 1;
      return ghostY;
    }

    startIfReady() {
      if (this.state !== "ready") return;
      this.state = "running";
      this.dropCounter = 0;
      this.lastTime = performance.now();
      this.updateUI();
    }

    restart() {
      if (typeof window !== "undefined") {
        window.WactgoLeaderboard?.hideScoreSubmission("tetris");
      }
      this.board = this.createBoard();
      this.bag = [];
      this.nextType = this.takeFromBag();
      this.score = 0;
      this.lines = 0;
      this.level = 1;
      this.state = "running";
      this.gameOverNotified = false;
      this.dropCounter = 0;
      this.lastTime = performance.now();
      this.spawnPiece();
      this.updateUI();
      this.root.focus({ preventScroll: true });
    }

    togglePause() {
      if (this.state === "ready") {
        this.startIfReady();
        return;
      }
      if (this.state === "over") return;
      this.state = this.state === "paused" ? "running" : "paused";
      this.dropCounter = 0;
      this.lastTime = performance.now();
      this.updateUI();
    }

    isActive() {
      return this.root === document.activeElement || this.root.contains(document.activeElement);
    }

    handleAction(action) {
      this.startIfReady();
      if (this.state !== "running") return;
      if (action === "left") this.move(-1, 0);
      if (action === "right") this.move(1, 0);
      if (action === "down") this.softDrop();
      if (action === "rotate") this.rotate(1);
      if (action === "drop") this.hardDrop();
      this.draw();
    }

    bindEvents() {
      document.addEventListener("keydown", event => {
        if (!this.isActive()) return;

        const action = {
          ArrowLeft: "left",
          ArrowRight: "right",
          ArrowDown: "down",
          ArrowUp: "rotate",
          KeyX: "rotate",
          Space: "drop"
        }[event.code];

        if (action) {
          event.preventDefault();
          this.handleAction(action);
          return;
        }

        if (event.code === "KeyZ") {
          event.preventDefault();
          this.startIfReady();
          this.rotate(-1);
          this.draw();
        }

        if (event.code === "KeyP") {
          event.preventDefault();
          this.togglePause();
          this.draw();
        }
      });

      this.canvas.addEventListener("pointerdown", () => {
        this.root.focus({ preventScroll: true });
        this.startIfReady();
      });

      this.root.querySelectorAll("[data-tetris-action]").forEach(button => {
        button.addEventListener("click", () => this.handleAction(button.dataset.tetrisAction));
      });

      this.pauseButton.addEventListener("click", () => {
        this.togglePause();
        this.draw();
      });

      this.restartButton.addEventListener("click", () => this.restart());
    }

    updateUI() {
      this.scoreElement.textContent = this.score.toLocaleString("zh-TW");
      this.linesElement.textContent = this.lines;
      this.levelElement.textContent = this.level;
      this.pauseButton.textContent = this.state === "paused" ? "繼續" : "暫停";
      this.pauseButton.disabled = this.state === "over";
      this.restartButton.textContent = this.state === "ready" ? "開始遊戲" : "重新開始";

      const stateLabels = {
        ready: "尚未開始",
        running: "遊戲進行中",
        paused: "遊戲暫停",
        over: "遊戲結束"
      };
      this.canvas.setAttribute("aria-label", `10 乘 20 俄羅斯方塊棋盤，${stateLabels[this.state]}，分數 ${this.score}`);
    }

    drawCell(context, x, y, type, alpha = 1, size = BLOCK_SIZE) {
      context.save();
      context.globalAlpha = alpha;
      context.fillStyle = COLORS[type];
      context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      context.strokeStyle = alpha < 1 ? COLORS[type] : "rgba(45, 42, 39, 0.45)";
      context.lineWidth = alpha < 1 ? 2 : 1;
      context.strokeRect(x * size + 2, y * size + 2, size - 4, size - 4);
      context.restore();
    }

    drawMatrix(context, matrix, offsetX, offsetY, type, alpha = 1, size = BLOCK_SIZE) {
      matrix.forEach((row, y) => row.forEach((value, x) => {
        if (value) this.drawCell(context, offsetX + x, offsetY + y, type, alpha, size);
      }));
    }

    drawGrid() {
      this.ctx.strokeStyle = "#f0ede8";
      this.ctx.lineWidth = 1;
      for (let x = 1; x < COLS; x += 1) {
        this.ctx.beginPath();
        this.ctx.moveTo(x * BLOCK_SIZE + 0.5, 0);
        this.ctx.lineTo(x * BLOCK_SIZE + 0.5, this.canvas.height);
        this.ctx.stroke();
      }
      for (let y = 1; y < ROWS; y += 1) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, y * BLOCK_SIZE + 0.5);
        this.ctx.lineTo(this.canvas.width, y * BLOCK_SIZE + 0.5);
        this.ctx.stroke();
      }
    }

    drawOverlay(title, subtitle) {
      this.ctx.fillStyle = "rgba(251, 250, 246, 0.92)";
      this.ctx.fillRect(0, 245, this.canvas.width, 110);
      this.ctx.fillStyle = "#292622";
      this.ctx.textAlign = "center";
      this.ctx.font = '22px "辰宇落雁體", serif';
      this.ctx.fillText(title, this.canvas.width / 2, 290);
      this.ctx.font = '15px "辰宇落雁體", serif';
      this.ctx.fillText(subtitle, this.canvas.width / 2, 321);
    }

    drawNext() {
      const matrix = PIECES[this.nextType];
      const previewSize = 24;
      const width = matrix[0].length * previewSize;
      const height = matrix.length * previewSize;
      const offsetX = (this.nextCanvas.width - width) / (2 * previewSize);
      const offsetY = (this.nextCanvas.height - height) / (2 * previewSize);

      this.nextCtx.fillStyle = "#fbfaf6";
      this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
      this.drawMatrix(this.nextCtx, matrix, offsetX, offsetY, this.nextType, 1, previewSize);
    }

    draw() {
      this.ctx.fillStyle = "#fbfaf6";
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.drawGrid();

      this.board.forEach((row, y) => row.forEach((type, x) => {
        if (type) this.drawCell(this.ctx, x, y, type);
      }));

      if (this.current) {
        const ghostY = this.getGhostY();
        this.drawMatrix(this.ctx, this.current.matrix, this.current.x, ghostY, this.current.type, 0.2);
        this.drawMatrix(this.ctx, this.current.matrix, this.current.x, this.current.y, this.current.type);
      }

      if (this.state === "ready") this.drawOverlay("TETRIS", "點擊棋盤或按開始遊戲");
      if (this.state === "paused") this.drawOverlay("PAUSED", "按 P 或繼續回到遊戲");
      if (this.state === "over") this.drawOverlay("GAME OVER", "按重新開始再玩一次");
    }

    loop(time = 0) {
      const delta = Math.min(time - this.lastTime, 1000);
      this.lastTime = time;

      if (this.state === "running") {
        this.dropCounter += delta;
        if (this.dropCounter >= this.getDropInterval()) this.stepDown();
      }

      this.draw();
      this.animationFrame = requestAnimationFrame(this.loop);
    }
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { TetrisGame, PIECES, COLS, ROWS };
  }

  if (typeof document !== "undefined") {
    const root = document.getElementById("tetrisGame");
    if (root) new TetrisGame(root);
  }
})();
