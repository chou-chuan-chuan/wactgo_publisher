/* this is game zone*/ 

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const gridSize = 20;
const tileCount = canvas.width / gridSize;

let snake = [{ x: 10, y: 10 }];
let velocity = { x: 0, y: 0 };
let food = { x: Math.floor(Math.random() * tileCount), y: Math.floor(Math.random() * tileCount) };
let score = 0;
let highScore = 0;
let gameInterval;

// 食物圖片
const foodImg = new Image();
foodImg.src = "c.jpg";

// 遊戲主迴圈
function drawGame() {
  moveSnake();

  if (checkCollision()) {
    if (score > highScore) highScore = score;
    updateScore();
    alert("Game Over! 你的分數：" + score);
    clearInterval(gameInterval);
    return;
  }

  if (checkFoodCollision()) {
    score++;
    snake.push({});
    placeFood();
    if (score > highScore) highScore = score;
    updateScore();
  }

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawFood();
  drawSnake();
}

function drawSnake() {
  ctx.fillStyle = "orange";
  for (let segment of snake) {
    ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize, gridSize);
  }
}

function moveSnake() {
  const head = { x: snake[0].x + velocity.x, y: snake[0].y + velocity.y };
  snake.unshift(head);
  snake.pop();
}

function checkCollision() {
  const head = snake[0];
  if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) return true;
  for (let i = 1; i < snake.length; i++) {
    if (snake[i].x === head.x && snake[i].y === head.y) return true;
  }
  return false;
}

function drawFood() {
  ctx.drawImage(foodImg, food.x * gridSize, food.y * gridSize, gridSize, gridSize);
}

function checkFoodCollision() {
  return snake[0].x === food.x && snake[0].y === food.y;
}

function placeFood() {
  food.x = Math.floor(Math.random() * tileCount);
  food.y = Math.floor(Math.random() * tileCount);
}

function resetGame() {
  snake = [{ x: 10, y: 10 }];
  velocity = { x: 0, y: 0 };
  score = 0;
  placeFood();
  updateScore();
}

function restartGame() {
  clearInterval(gameInterval);
  resetGame();
  gameInterval = setInterval(drawGame, 120);
}

function updateScore() {
  document.getElementById("scoreBoard").textContent =
    "分數：" + score + "\xa0\xa0\xa0\xa0\xa0\xa0\xa0最高分：" + highScore;
}

// 📌 控制方向（共用）
function setDirection(dir) {
  switch (dir) {
    case "up":
      if (velocity.y === 0) velocity = { x: 0, y: -1 };
      break;
    case "down":
      if (velocity.y === 0) velocity = { x: 0, y: 1 };
      break;
    case "left":
      if (velocity.x === 0) velocity = { x: -1, y: 0 };
      break;
    case "right":
      if (velocity.x === 0) velocity = { x: 1, y: 0 };
      break;
  }
}

// 📌 鍵盤控制
document.addEventListener("keydown", event => {
  switch (event.key) {
    case "ArrowUp": setDirection("up"); event.preventDefault(); break;
    case "ArrowDown": setDirection("down"); event.preventDefault(); break;
    case "ArrowLeft": setDirection("left"); event.preventDefault(); break;
    case "ArrowRight": setDirection("right"); event.preventDefault(); break;
  }
});

// 📌 觸控滑動控制
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener("touchstart", e => {
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
});

canvas.addEventListener("touchend", e => {
  const touch = e.changedTouches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;

  if (Math.abs(dx) > Math.abs(dy)) {
    // 左右滑
    if (dx > 30) setDirection("right");
    else if (dx < -30) setDirection("left");
  } else {
    // 上下滑
    if (dy > 30) setDirection("down");
    else if (dy < -30) setDirection("up");
  }
});

gameInterval = setInterval(drawGame, 120);


/* this is game zone*/ 



