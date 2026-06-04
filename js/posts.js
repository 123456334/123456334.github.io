// 博客文章数据
const POSTS = [
  {
    id: "welcome",
    title: "欢迎来到我的博客",
    date: "2026-06-03",
    tags: ["随笔", "博客"],
    summary: "这是我的第一篇博客文章，记录一下搭建这个博客的过程和初衷。",
    content: `
# 欢迎来到我的博客

这是我用纯 HTML/CSS/JS 搭建的个人博客，没有任何框架依赖，轻量且快速。

## 为什么选择静态博客？

- **速度极快** - 没有服务端渲染，直接加载静态文件
- **部署简单** - 放到任何静态托管服务即可
- **完全可控** - 每一行代码都在自己手中

## 技术栈

- HTML5 语义化标签
- CSS3 动画与变量
- 原生 JavaScript ES6+
- 暗黑科技风主题

## 未来计划

1. 添加更多文章
2. 优化移动端体验
3. 增加更多交互效果

---

感谢你的访问，希望这里的内容对你有帮助！
    `
  },
  {
    id: "javascript-tips",
    title: "JavaScript 实用技巧 10 则",
    date: "2026-06-01",
    tags: ["JavaScript", "前端", "技巧"],
    summary: "整理了 10 个日常开发中非常实用的 JavaScript 技巧，提升你的编码效率。",
    content: `
# JavaScript 实用技巧 10 则

## 1. 可选链操作符 (?.)

\`\`\`javascript
const city = user?.address?.city ?? '未知';
\`\`\`

## 2. 空值合并运算符 (??)

\`\`\`javascript
const name = value ?? '默认值';
// 只在 value 为 null 或 undefined 时生效
\`\`\`

## 3. 数组解构赋值

\`\`\`javascript
const [first, second, ...rest] = [1, 2, 3, 4, 5];
// first = 1, second = 2, rest = [3, 4, 5]
\`\`\`

## 4. 对象简写

\`\`\`javascript
const name = 'Tom';
const age = 25;
const person = { name, age }; // 等同于 { name: name, age: age }
\`\`\`

## 5. 模板字符串

\`\`\`javascript
const greeting = \`Hello, \${name}! You are \${age} years old.\`;
\`\`\`

## 6. Array.from 转换类数组

\`\`\`javascript
const divs = Array.from(document.querySelectorAll('div'));
divs.forEach(div => div.classList.add('active'));
\`\`\`

## 7. 使用 Set 去重

\`\`\`javascript
const unique = [...new Set([1, 2, 2, 3, 3, 4])];
// [1, 2, 3, 4]
\`\`\`

## 8. Promise.allSettled

\`\`\`javascript
const results = await Promise.allSettled([
  fetch('/api/1'),
  fetch('/api/2'),
  fetch('/api/3')
]);
// 不会因为某个请求失败而中断
\`\`\`

## 9. 动态导入

\`\`\`javascript
const module = await import('./heavy-module.js');
\`\`\`

## 10. 使用 AbortController 取消请求

\`\`\`javascript
const controller = new AbortController();
fetch(url, { signal: controller.signal });
// 需要取消时
controller.abort();
\`\`\`

---

这些技巧在日常开发中非常实用，建议收藏备用！
    `
  },
  {
    id: "css-grid-guide",
    title: "CSS Grid 布局完全指南",
    date: "2026-05-28",
    tags: ["CSS", "前端", "布局"],
    summary: "深入浅出讲解 CSS Grid 布局，从基础概念到实战应用，一文搞懂 Grid 布局。",
    content: `
# CSS Grid 布局完全指南

## 什么是 CSS Grid？

CSS Grid 是一个二维布局系统，可以同时处理行和列，是现代 CSS 布局的利器。

## 基础概念

### 容器属性

\`\`\`css
.container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto;
  gap: 20px;
}
\`\`\`

### 项目属性

\`\`\`css
.item {
  grid-column: 1 / 3;  /* 跨越 2 列 */
  grid-row: 1 / 2;     /* 占据第 1 行 */
}
\`\`\`

## 常见布局模式

### 圣杯布局

\`\`\`css
.layout {
  display: grid;
  grid-template:
    "header header header" auto
    "nav    main   aside"  1fr
    "footer footer footer" auto
    / 200px 1fr    200px;
}
\`\`\`

### 响应式卡片

\`\`\`css
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}
\`\`\`

## Grid vs Flexbox

| 特性 | Grid | Flexbox |
|------|------|---------|
| 维度 | 二维 | 一轴 |
| 适用场景 | 整体布局 | 组件内部 |
| 对齐方式 | 行列对齐 | 主轴/交叉轴 |

## 浏览器支持

现代浏览器全部支持，IE11 需要前缀。

---

掌握 Grid 布局，让你的页面布局更加灵活高效！
    `
  },
  {
    id: "git-workflow",
    title: "Git 工作流最佳实践",
    date: "2026-05-25",
    tags: ["Git", "工具", "协作"],
    summary: "介绍几种常见的 Git 工作流，帮助团队选择合适的协作方式。",
    content: `
# Git 工作流最佳实践

## 1. 集中式工作流

最简单的模式，所有人直接在 main 分支上协作。

**适用场景**: 小团队、个人项目

## 2. Feature Branch 工作流

每个新功能在独立分支开发，完成后合并到 main。

\`\`\`bash
git checkout -b feature/new-feature
# 开发完成后
git checkout main
git merge feature/new-feature
\`\`\`

**适用场景**: 大多数团队项目

## 3. Git Flow

定义严格的分支模型：

- **main** - 生产环境代码
- **develop** - 开发主分支
- **feature/*** - 功能分支
- **release/*** - 发布分支
- **hotfix/*** - 紧急修复

**适用场景**: 有固定发布周期的项目

## 4. GitHub Flow

简化版工作流，只有 main 和 feature 分支。

\`\`\`bash
# 1. 从 main 创建分支
git checkout -b my-feature

# 2. 提交并推送
git push origin my-feature

# 3. 创建 Pull Request

# 4. 代码审查后合并

# 5. 部署 main 分支
\`\`\`

**适用场景**: 持续部署的项目

## 提交规范

\`\`\`
<type>(<scope>): <subject>

feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试
chore: 构建/工具
\`\`\`

---

选择适合团队的工作流，让协作更加顺畅！
    `
  },
  {
    id: "linux-commands",
    title: "Linux 常用命令速查手册",
    date: "2026-05-20",
    tags: ["Linux", "工具", "运维"],
    summary: "整理了 Linux 系统中最常用的命令，方便日常开发和运维使用。",
    content: `
# Linux 常用命令速查手册

## 文件操作

\`\`\`bash
ls -la          # 列出所有文件（含隐藏）
cp -r src dst   # 递归复制
mv old new      # 移动/重命名
rm -rf dir      # 强制递归删除（危险！）
find . -name "*.js"  # 查找文件
\`\`\`

## 文本处理

\`\`\`bash
grep -r "pattern" .     # 递归搜索
sed -i 's/old/new/g' f  # 替换文本
awk '{print $1}' file   # 提取列
cat file | head -10     # 查看前 10 行
tail -f log.txt         # 实时查看日志
\`\`\`

## 系统信息

\`\`\`bash
uname -a         # 系统信息
df -h            # 磁盘使用
free -h          # 内存使用
top              # 进程监控
ps aux           # 所有进程
\`\`\`

## 网络

\`\`\`bash
curl url         # HTTP 请求
wget url         # 下载文件
netstat -tlnp    # 查看端口
ssh user@host    # SSH 连接
scp file host:~  # 远程复制
\`\`\`

## 权限管理

\`\`\`bash
chmod 755 file   # 设置权限
chown user:group file  # 修改所有者
sudo command     # 以 root 执行
\`\`\`

## 压缩解压

\`\`\`bash
tar -czf archive.tar.gz dir   # 压缩
tar -xzf archive.tar.gz       # 解压
zip -r archive.zip dir        # zip 压缩
unzip archive.zip              # zip 解压
\`\`\`

---

熟练掌握这些命令，让你的 Linux 操作更加高效！
    `
  }
];

// 获取所有标签
function getAllTags() {
  const tags = new Set();
  POSTS.forEach(post => post.tags.forEach(tag => tags.add(tag)));
  return [...tags].sort();
}

// 按标签筛选文章
function getPostsByTag(tag) {
  if (!tag) return POSTS;
  return POSTS.filter(post => post.tags.includes(tag));
}

// 搜索文章
function searchPosts(keyword) {
  const kw = keyword.toLowerCase().trim();
  if (!kw) return POSTS;
  return POSTS.filter(post =>
    post.title.toLowerCase().includes(kw) ||
    post.summary.toLowerCase().includes(kw) ||
    post.tags.some(tag => tag.toLowerCase().includes(kw))
  );
}

// 获取单篇文章
function getPostById(id) {
  return POSTS.find(post => post.id === id);
}
