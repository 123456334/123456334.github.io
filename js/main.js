// 主逻辑模块
const Blog = {
  currentTag: null,
  currentKeyword: '',

  // 初始化
  init() {
    this.bindEvents();
    this.renderTags();
    this.renderPosts();
    this.initBackToTop();
    this.initAnimations();
  },

  // 绑定事件
  bindEvents() {
    // 搜索
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.currentKeyword = e.target.value;
          this.renderPosts();
        }, 300);
      });
    }

    // 移动端菜单
    const menuToggle = document.getElementById('menu-toggle');
    const navLinks = document.getElementById('nav-links');
    if (menuToggle && navLinks) {
      menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
      });
    }
  },

  // 渲染标签云（按层级分组）
  renderTags() {
    const tagCloud = document.getElementById('tag-cloud');
    if (!tagCloud) return;

    const tags = getAllTags();

    // 定义层级结构
    const hierarchy = {
      'STM32': {
        '基础': ['GPIO', 'I2C', 'SPI', '串口', '定时器', 'PWM', 'ADC', 'DMA', '中断', '烧录', '晶振', '时钟'],
        '模块': ['MPU', 'mpu5060', '滤波', '蓝牙', '蓝牙通信'],
        '图片介绍': [],
        'Freertos': ['FreeRTOS', 'RTOS', 'freertos配置']
      },
      'ESP32': {
        '模块': ['filter', 'mpu6000']
      },
      '硬件': {
        '基础电路': []
      }
    };

    // 生成 HTML
    let html = `
      <div class="tag-cloud-title">// 标签筛选</div>
      <span class="tag ${!this.currentTag ? 'active' : ''}" data-tag="">全部文章</span>
    `;

    for (const [mainTag, subGroups] of Object.entries(hierarchy)) {
      html += `<div class="tag-group">`;
      html += `<div class="tag-group-title">${mainTag}</div>`;

      for (const [subTag, keywords] of Object.entries(subGroups)) {
        // 检查这个子分类是否有文章
        const hasPosts = POSTS.some(post =>
          post.tags.includes(mainTag) && post.tags.includes(subTag)
        );

        // 始终显示子分类
        html += `<div class="tag-subgroup">`;
        html += `<span class="tag-subgroup-title">${subTag}</span>`;

        // 添加子分类标签
        html += `<span class="tag tag-sub ${this.currentTag === subTag ? 'active' : ''}" data-tag="${subTag}">${subTag}</span>`;

        // 添加关键词标签
        for (const kw of keywords) {
          if (tags.includes(kw)) {
            html += `<span class="tag tag-keyword ${this.currentTag === kw ? 'active' : ''}" data-tag="${kw}">${kw}</span>`;
          }
        }

        html += `</div>`;
      }

      html += `</div>`;
    }

    tagCloud.innerHTML = html;

    // 绑定标签点击事件
    tagCloud.querySelectorAll('.tag').forEach(tagEl => {
      tagEl.addEventListener('click', () => {
        const tag = tagEl.dataset.tag;
        this.currentTag = tag || null;
        this.renderTags();
        this.renderPosts();
      });
    });
  },

  // 渲染文章列表
  renderPosts() {
    const postsGrid = document.getElementById('posts-grid');
    if (!postsGrid) return;

    let posts = POSTS;

    // 按标签筛选
    if (this.currentTag) {
      posts = getPostsByTag(this.currentTag);
    }

    // 按关键词搜索
    if (this.currentKeyword) {
      posts = searchPosts(this.currentKeyword);
    }

    // 同时应用标签和搜索
    if (this.currentTag && this.currentKeyword) {
      posts = POSTS.filter(post => {
        const matchTag = post.tags.includes(this.currentTag);
        const kw = this.currentKeyword.toLowerCase();
        const matchSearch = post.title.toLowerCase().includes(kw) ||
          post.summary.toLowerCase().includes(kw) ||
          post.tags.some(t => t.toLowerCase().includes(kw));
        return matchTag && matchSearch;
      });
    }

    if (posts.length === 0) {
      postsGrid.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <p>没有找到相关文章</p>
        </div>
      `;
      return;
    }

    postsGrid.innerHTML = posts.map((post, index) => `
      <article class="post-card animate-in" style="animation-delay: ${index * 0.1}s" onclick="location.href='post.html?id=${post.id}'">
        <time class="post-date">${this.formatDate(post.date)}</time>
        <h2 class="post-title">${post.title}</h2>
        <p class="post-summary">${post.summary}</p>
        <div class="post-tags">
          ${post.tags.map((tag, i) =>
            i > 0 ? `<span class="post-tag-separator">›</span><span class="post-tag">${tag}</span>`
                  : `<span class="post-tag">${tag}</span>`
          ).join('')}
        </div>
      </article>
    `).join('');
  },

  // 格式化日期
  formatDate(dateStr) {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 返回顶部按钮
  initBackToTop() {
    const btn = document.getElementById('back-to-top');
    if (!btn) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        btn.classList.add('visible');
      } else {
        btn.classList.remove('visible');
      }
    });

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  },

  // 初始化动画
  initAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.post-card, .skill-item').forEach(el => {
      observer.observe(el);
    });
  }
};

// 简单的 Markdown 渲染器
const MarkdownRenderer = {
  render(text) {
    if (!text) return '';

    let html = text;

    // 代码块
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><code class="language-${lang || ''}">${this.escapeHtml(code.trim())}</code></pre>`;
    });

    // 行内代码
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 标题
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // 粗体和斜体
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // 链接
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // 图片
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

    // 无序列表
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // 有序列表
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // 表格
    html = html.replace(/^\|(.+)\|$/gm, (match, content) => {
      const cells = content.split('|').map(c => c.trim());
      if (cells.every(c => /^-+$/.test(c))) return '';
      const isHeader = !html.match(new RegExp(`^\\|${cells.map(() => '[-]+').join('\\|')}\\|$`, 'm'));
      const tag = isHeader ? 'th' : 'td';
      return '<tr>' + cells.map(c => `<${tag}>${c}</${tag}>`).join('') + '</tr>';
    });
    html = html.replace(/(<tr>.*<\/tr>\n?)+/g, '<table>$&</table>');

    // 分割线
    html = html.replace(/^---$/gm, '<hr>');

    // 引用
    html = html.replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>');

    // 段落
    html = html.replace(/^(?!<[a-z])((?!<\/?\w).+)$/gm, '<p>$1</p>');

    // 清理多余的空行
    html = html.replace(/\n{3,}/g, '\n\n');

    return html;
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// 文章详情页逻辑
const PostPage = {
  init() {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');

    if (!postId) {
      location.href = 'index.html';
      return;
    }

    const post = getPostById(postId);
    if (!post) {
      location.href = 'index.html';
      return;
    }

    this.renderPost(post);
    this.renderTOC(post.content);
    this.renderNavigation(postId);
  },

  renderPost(post) {
    const postHeader = document.getElementById('post-header');
    const postContent = document.getElementById('post-content');

    if (postHeader) {
      postHeader.innerHTML = `
        <h1>${post.title}</h1>
        <div class="post-meta">
          <span class="post-date">${post.date}</span>
          <span class="post-tags">${post.tags.map((tag, i) =>
            i > 0 ? ` › ${tag}` : tag
          ).join('')}</span>
        </div>
      `;
    }

    if (postContent) {
      postContent.innerHTML = MarkdownRenderer.render(post.content);
    }
  },

  renderTOC(content) {
    const toc = document.getElementById('toc');
    if (!toc) return;

    const headings = content.match(/^#{1,3} .+$/gm) || [];
    if (headings.length === 0) {
      toc.style.display = 'none';
      return;
    }

    const tocHTML = headings.map(heading => {
      const level = heading.match(/^#+/)[0].length;
      const text = heading.replace(/^#+\s+/, '');
      const id = text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
      return `<li class="h${level}"><a href="#${id}">${text}</a></li>`;
    }).join('');

    toc.innerHTML = `
      <div class="toc-title">// 目录</div>
      <ul class="toc-list">${tocHTML}</ul>
    `;

    // 给文章内容中的标题添加 id
    const postContent = document.getElementById('post-content');
    if (postContent) {
      postContent.querySelectorAll('h1, h2, h3').forEach(heading => {
        const id = heading.textContent.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
        heading.id = id;
      });
    }

    // 目录高亮
    this.initTOCHighlight();
  },

  initTOCHighlight() {
    const tocLinks = document.querySelectorAll('.toc-list a');
    const headings = document.querySelectorAll('.post-content h1, .post-content h2, .post-content h3');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          tocLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
          });
        }
      });
    }, { rootMargin: '-80px 0px -80% 0px' });

    headings.forEach(heading => observer.observe(heading));
  },

  renderNavigation(currentId) {
    const postNav = document.getElementById('post-nav');
    if (!postNav) return;

    const currentIndex = POSTS.findIndex(p => p.id === currentId);
    const prevPost = currentIndex < POSTS.length - 1 ? POSTS[currentIndex + 1] : null;
    const nextPost = currentIndex > 0 ? POSTS[currentIndex - 1] : null;

    postNav.innerHTML = `
      ${prevPost ? `
        <a href="post.html?id=${prevPost.id}">
          <span class="label">← 上一篇</span>
          <span class="title">${prevPost.title}</span>
        </a>
      ` : '<div></div>'}
      ${nextPost ? `
        <a href="post.html?id=${nextPost.id}">
          <span class="label">下一篇 →</span>
          <span class="title">${nextPost.title}</span>
        </a>
      ` : '<div></div>'}
    `;
  }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  // 根据页面类型初始化
  if (document.getElementById('posts-grid')) {
    Blog.init();
  } else if (document.getElementById('post-content')) {
    PostPage.init();
  }
});
