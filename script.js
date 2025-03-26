document.addEventListener("DOMContentLoaded", function () {
    const blogList = document.getElementById("blog-list");

    // 模擬文章資料
    const posts = [
        { id: 1, title: "如何開始學習程式設計？", content: "這篇文章將介紹如何入門程式設計..." },
        { id: 2, title: "JavaScript 基礎教學", content: "學習 JavaScript 的基本概念與應用..." },
        { id: 3, title: "CSS 排版技巧", content: "掌握 CSS Flexbox 與 Grid 佈局..." }
    ];

    // 生成文章列表
    posts.forEach(post => {
        const postElement = document.createElement("div");
        postElement.classList.add("blog-post");

        postElement.innerHTML = `
            <h2 onclick="viewPost(${post.id})">${post.title}</h2>
            <p>${post.content.substring(0, 30)}...</p>
        `;
        blogList.appendChild(postElement);
    });

    // 存入 localStorage
    localStorage.setItem("posts", JSON.stringify(posts));
});

// 跳轉文章詳情
function viewPost(id) {
    window.location.href = `post.html?id=${id}`;
}
document.addEventListener("DOMContentLoaded", function () {
    const blogList = document.getElementById("blog-list");

    // 模擬文章資料
    const posts = [
        { id: 1, title: "如何開始學習程式設計？", content: "這篇文章將介紹如何入門程式設計..." },
        { id: 2, title: "JavaScript 基礎教學", content: "學習 JavaScript 的基本概念與應用..." },
        { id: 3, title: "CSS 排版技巧", content: "掌握 CSS Flexbox 與 Grid 佈局..." }
    ];

    // 生成文章列表
    posts.forEach(post => {
        const postElement = document.createElement("div");
        postElement.classList.add("blog-post");

        postElement.innerHTML = `
            <h2 onclick="viewPost(${post.id})">${post.title}</h2>
            <p>${post.content.substring(0, 30)}...</p>
        `;
        blogList.appendChild(postElement);
    });

    // 存入 localStorage
    localStorage.setItem("posts", JSON.stringify(posts));
});

// 跳轉文章詳情
function viewPost(id) {
    window.location.href = `post.html?id=${id}`;
}
