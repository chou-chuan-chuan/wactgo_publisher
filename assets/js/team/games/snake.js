(() => {
  "use strict";

  const game = document.getElementById("snakeGame");
  const canvas = document.getElementById("gameCanvas");
  const scoreBoard = document.getElementById("scoreBoard");
  const restartButton = document.getElementById("restartButton");

  if (!game || !canvas || !scoreBoard || !restartButton) return;

  const ctx = canvas.getContext("2d");
  const gridSize = 20;
  const tileCount = canvas.width / gridSize;
  const foodImg = new Image();
  foodImg.src = "assets/images/games/c.jpg";

  let snake;
  let velocity;
  let food;
  let score;
  let highScore = 0;
  let gameInterval;
  let isGameOver = false;
  let touchStartX = 0;
  let touchStartY = 0;

  function isActive() {
    return game === document.activeElement || game.contains(document.activeElement);
  }

  function updateScore() {
    scoreBoard.textContent = `分數：${score}\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0最高分：${highScore}`;
  }

  function placeFood() {
    do {
      food = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount)
      };
    } while (snake.some(segment => segment.x === food.x && segment.y === food.y));
  }

  function drawFood() {
    if (foodImg.complete && foodImg.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(foodImg, food.x * gridSize, food.y * gridSize, gridSize, gridSize);
      return;
    }

    ctx.fillStyle = "#9d5935";
    ctx.fillRect(food.x * gridSize + 3, food.y * gridSize + 3, gridSize - 6, gridSize - 6);
  }

  function drawSnake() {
    ctx.fillStyle = "orange";
    snake.forEach(segment => {
      ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize, gridSize);
    });
  }

  function drawBoard() {
    ctx.fillStyle = "#fbfaf6";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawFood();
    drawSnake();

    if (isGameOver) {
      ctx.fillStyle = "rgba(251, 250, 246, 0.92)";
      ctx.fillRect(0, 160, canvas.width, 80);
      ctx.fillStyle = "#292622";
      ctx.font = '26px "辰宇落雁體", serif';
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", canvas.width / 2, 198);
      ctx.font = '16px "辰宇落雁體", serif';
      ctx.fillText("按「再玩一次」重新開始", canvas.width / 2, 224);
    }

    const stateLabel = isGameOver ? "遊戲結束" : "遊戲進行中";
    canvas.setAttribute("aria-label", `貪吃蛇遊戲棋盤，${stateLabel}，分數 ${score}`);
  }

  function moveSnake() {
    if (velocity.x === 0 && velocity.y === 0) return;
    const head = { x: snake[0].x + velocity.x, y: snake[0].y + velocity.y };
    snake.unshift(head);
    snake.pop();
  }

  function checkCollision() {
    const head = snake[0];
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) return true;
    return snake.slice(1).some(segment => segment.x === head.x && segment.y === head.y);
  }

  function checkFoodCollision() {
    return snake[0].x === food.x && snake[0].y === food.y;
  }

  function drawGame() {
    if (isGameOver) return;
    moveSnake();

    if (checkCollision()) {
      isGameOver = true;
      highScore = Math.max(highScore, score);
      updateScore();
      clearInterval(gameInterval);
      drawBoard();
      window.WactgoLeaderboard?.showScoreSubmission("snake", score);
      return;
    }

    if (checkFoodCollision()) {
      score += 1;
      snake.push({ ...snake[snake.length - 1] });
      highScore = Math.max(highScore, score);
      placeFood();
      updateScore();
    }

    drawBoard();
  }

  function resetGame() {
    snake = [{ x: 10, y: 10 }];
    velocity = { x: 0, y: 0 };
    score = 0;
    isGameOver = false;
    placeFood();
    updateScore();
    drawBoard();
  }

  function restartGame() {
    clearInterval(gameInterval);
    window.WactgoLeaderboard?.hideScoreSubmission("snake");
    resetGame();
    gameInterval = setInterval(drawGame, 120);
    game.focus({ preventScroll: true });
  }

  function setDirection(direction) {
    if (isGameOver) return;

    const nextVelocity = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 }
    }[direction];

    if (!nextVelocity) return;
    const isReverse = velocity.x + nextVelocity.x === 0 && velocity.y + nextVelocity.y === 0;
    const hasStarted = velocity.x !== 0 || velocity.y !== 0;
    if (!hasStarted || !isReverse) velocity = nextVelocity;
  }

  document.addEventListener("keydown", event => {
    if (!isActive()) return;

    const directions = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right"
    };

    if (directions[event.key]) {
      event.preventDefault();
      setDirection(directions[event.key]);
    }
  });

  canvas.addEventListener("pointerdown", () => game.focus({ preventScroll: true }));

  canvas.addEventListener("touchstart", event => {
    event.preventDefault();
    game.focus({ preventScroll: true });
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }, { passive: false });

  canvas.addEventListener("touchend", event => {
    event.preventDefault();
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 30) setDirection("right");
      if (dx < -30) setDirection("left");
    } else {
      if (dy > 30) setDirection("down");
      if (dy < -30) setDirection("up");
    }
  }, { passive: false });

  restartButton.addEventListener("click", restartGame);
  foodImg.addEventListener("load", drawBoard);

  if (document.fonts) {
    document.fonts.ready.then(drawBoard);
  }

  resetGame();
  gameInterval = setInterval(drawGame, 120);
})();
