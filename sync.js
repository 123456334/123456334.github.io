// Obsidian 笔记同步脚本
const fs = require('fs');
const path = require('path');

// 配置：要同步的仓库路径
const VAULTS = [
  { path: 'D:/blog/blog/blog_stm32', tag: 'STM32' },
  { path: 'D:/blog/blog/blog_esp32', tag: 'ESP32' },
  { path: 'D:/blog/blog/blog_硬件', tag: '硬件' },
];

// 读取目录下所有 .md 文件
function getAllMdFiles(dir) {
  let results = [];
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        results = results.concat(getAllMdFiles(fullPath));
      } else if (item.endsWith('.md')) {
        results.push(fullPath);
      }
    }
  } catch (e) {
    console.error(`读取目录失败: ${dir}`, e.message);
  }
  return results;
}

// 解析 Markdown 文件
function parseMdFile(filePath, vaultTag) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath, '.md');

    // 提取标题：取第一个 # 标题，或用文件名
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : fileName.replace(/_/g, ' ');

    // 生成 ID：基于相对路径
    const id = fileName
      .toLowerCase()
      .replace(/[^a-z0-9一-龥]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // 提取标签：从目录结构和内容
    const tags = [vaultTag];
    const relativePath = filePath.replace(/\\/g, '/');
    const pathParts = relativePath.split('/');

    // 从目录名提取标签
    for (const part of pathParts) {
      if (part.includes('基础')) tags.push('基础');
      if (part.includes('模块')) tags.push('模块');
      if (part.includes('配置') || part.includes('config')) tags.push('配置');
      if (part.includes('FreeRTOS') || part.includes('freertos')) tags.push('FreeRTOS');
      if (part.includes('GPIO')) tags.push('GPIO');
      if (part.includes('I2C')) tags.push('I2C');
      if (part.includes('SPI')) tags.push('SPI');
      if (part.includes('UART')) tags.push('UART');
    }

    // 从内容提取标签（Obsidian 标签格式 #tag）
    const tagMatches = content.match(/#[a-zA-Z一-龥][a-zA-Z0-9一-龥]*/g);
    if (tagMatches) {
      tagMatches.forEach(t => {
        const tag = t.substring(1);
        if (!tags.includes(tag) && tag.length < 10) {
          tags.push(tag);
        }
      });
    }

    // 去重
    const uniqueTags = [...new Set(tags)];

    // 生成摘要：取前 150 个字符
    const plainText = content
      .replace(/^#+\s+.+$/gm, '')  // 移除标题
      .replace(/```[\s\S]*?```/g, '')  // 移除代码块
      .replace(/`[^`]+`/g, '')  // 移除行内代码
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // 移除链接格式
      .replace(/[#*_~\[\]()]/g, '')  // 移除其他标记
      .replace(/\n+/g, ' ')  // 换行变空格
      .trim();

    const summary = plainText.substring(0, 150) + (plainText.length > 150 ? '...' : '');

    // 获取文件修改时间作为日期
    const stat = fs.statSync(filePath);
    const date = stat.mtime.toISOString().split('T')[0];

    return {
      id,
      title,
      date,
      tags: uniqueTags,
      summary,
      content: content,
    };
  } catch (e) {
    console.error(`解析文件失败: ${filePath}`, e.message);
    return null;
  }
}

// 主函数
function main() {
  console.log('🔄 开始同步 Obsidian 笔记...\n');

  const allPosts = [];

  for (const vault of VAULTS) {
    console.log(`📂 扫描仓库: ${vault.path}`);
    const files = getAllMdFiles(vault.path);
    console.log(`   找到 ${files.length} 个 .md 文件`);

    for (const file of files) {
      const post = parseMdFile(file, vault.tag);
      if (post) {
        allPosts.push(post);
        console.log(`   ✅ ${post.title}`);
      }
    }
  }

  // 按日期排序（最新的在前）
  allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

  // 生成 posts.js 内容
  const postsJs = `// 博客文章数据（由 sync.js 自动生成）
const POSTS = ${JSON.stringify(allPosts, null, 2)};

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
`;

  // 写入文件
  fs.writeFileSync('D:/blog/blog_wbsite/js/posts.js', postsJs, 'utf-8');

  console.log(`\n✨ 同步完成！共 ${allPosts.length} 篇文章`);
  console.log('📁 已更新: D:/blog/blog_wbsite/js/posts.js');
}

main();
