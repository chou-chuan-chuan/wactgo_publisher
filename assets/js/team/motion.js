function startHover(circle) {
  // 取得這個圈圈底下所有圖片
  const images = circle.querySelectorAll('img');

  // 設定初始顯示圖片的索引為 0
  let index = 0;

  // 先全部隱藏，只有第一張圖片顯示
  images.forEach((img, i) => {
    img.style.opacity = (i === 0) ? 1 : 0;
  });

  // 立即顯示第一張（不用等 setInterval）
  images.forEach((img, i) => img.style.opacity = (i === 0) ? 1 : 0);

  // 馬上啟動圖片輪播，切換更快
  circle._hoverInterval = setInterval(() => {
    images.forEach(img => img.style.opacity = 0);
    index = (index + 1) % images.length;
    images[index].style.opacity = 1;
  }, 300); // 更靈敏的速度
}

function stopHover(circle) {
  // 清除上面啟動的定時器，停止輪播
  clearInterval(circle._hoverInterval);

  // 把所有圖片都設為透明，只有第一張圖片顯示
  const images = circle.querySelectorAll('img');
  images.forEach((img, i) => {
    img.style.opacity = (i === 0) ? 1 : 0;
  });
}