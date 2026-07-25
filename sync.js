// Obsidian 笔记同步脚本 v2（支持图片）
const fs = require('fs');
const path = require('path');

// 配置：要同步的仓库路径
const VAULTS = [
  { path: 'D:/blog/blog/blog_stm32', tag: 'STM32' },
  { path: 'D:/blog/blog/blog_esp32', tag: 'ESP32' },
  { path: 'D:/blog/blog/blog_硬件', tag: '硬件' },
  { path: 'D:/blog/blog/blog_项目（上海梦孚）', tag: '基于步态相位检测和空间触觉的' },
];

const BLOG_DIR = 'D:/blog/blog_wbsite';
const ASSETS_DIR = path.join(BLOG_DIR, 'assets');

// 确保 assets 目录存在
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

// 读取目录下所有文件
function getAllFiles(dir, extensions) {
  let results = [];
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        results = results.concat(getAllFiles(fullPath, extensions));
      } else if (extensions.some(ext => item.toLowerCase().endsWith(ext))) {
        results.push(fullPath);
      }
    }
  } catch (e) {
    console.error(`读取目录失败: ${dir}`, e.message);
  }
  return results;
}

// 复制图片到 assets 目录
function copyImages(vaultPath) {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
  const images = getAllFiles(vaultPath, imageExtensions);
  const imageMap = {};

  for (const imgPath of images) {
    const fileName = path.basename(imgPath);
    const destPath = path.join(ASSETS_DIR, fileName);

    try {
      fs.copyFileSync(imgPath, destPath);
      imageMap[fileName] = `assets/${fileName}`;
    } catch (e) {
      console.error(`复制图片失败: ${fileName}`, e.message);
    }
  }

  return imageMap;
}

// 清理文件夹名称，生成可读标签
function cleanFolderName(name, isRoot) {
  // 如果是根目录（仓库名），直接返回清理后的名称
  if (isRoot) {
    return name.replace(/^blog[_\-]?/i, '');
  }

  // 跳过"图片介绍"文件夹
  if (name.includes('图片介绍')) {
    return null;
  }

  return name
    .replace(/^(stm32|esp32|硬件)[_\-]?/i, '')  // 移除前缀
    .replace(/配置$/, '配置')                      // 保留"配置"
    .trim() || null;
}

// 从文件路径提取层级标签
function extractTagsFromPath(filePath, vaultPath) {
  const relativePath = filePath.replace(/\\/g, '/');
  const vaultNormalized = vaultPath.replace(/\\/g, '/');

  // 获取相对于仓库的路径
  const relPath = relativePath.replace(vaultNormalized, '');
  const parts = relPath.split('/').filter(p => p && p !== '.');

  const tags = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    // 跳过 .obsidian、图片介绍
    if (part === '.obsidian' || part === '图片介绍') continue;
    if (part.endsWith('.md')) continue; // 跳过文件名

    // 清理文件夹名称
    const cleanName = cleanFolderName(part, i === 0);
    if (cleanName) {
      // 去重（忽略大小写）
      const lowerTags = tags.map(t => t.toLowerCase());
      if (!lowerTags.includes(cleanName.toLowerCase())) {
        tags.push(cleanName);
      }
    }
  }

  return tags;
}

// 从文件名提取额外标签（避免重复）
function extractTagsFromFilename(fileName) {
  const tags = [];
  const name = fileName.toLowerCase();

  // 常见关键词映射（优先级从高到低）
  const keywords = {
    'gpio': 'GPIO',
    'i2c': 'I2C',
    'spi': 'SPI',
    'uart': 'UART',
    'usart': '串口',
    '串口': '串口',
    'tim': '定时器',
    'timer': '定时器',
    'pwm': 'PWM',
    'adc': 'ADC',
    'dac': 'DAC',
    'dma': 'DMA',
    '中断': '中断',
    'interrupt': '中断',
    'bluetooth': '蓝牙通信',
    '蓝牙通信': '蓝牙通信',
    '蓝牙': '蓝牙通信',  // 统一用"蓝牙通信"
    'wifi': 'WiFi',
    'mpu': 'MPU',
    '陀螺仪': '传感器',
    '加速度': '传感器',
    '滤波': '滤波',
    'filter': '滤波',
    'freertos': 'FreeRTOS',
    'rtos': 'RTOS',
    '烧录': '烧录',
    '下载': '烧录',
    '晶振': '晶振',
    '时钟': '时钟',
    'clock': '时钟',
    '通用配置': '通用配置',
    '通用': '通用配置',
  };

  for (const [keyword, tag] of Object.entries(keywords)) {
    if (name.includes(keyword) && !tags.includes(tag)) {
      tags.push(tag);
    }
  }

  return tags;
}

// 解析 Markdown 文件
function parseMdFile(filePath, vaultTag, imageMap, vaultPath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath, '.md');

    // 转换 Obsidian 图片语法: ![[image.png]] -> ![image](assets/image.png)
    content = content.replace(/!\[\[([^\]]+\.\w+)\]\]/g, (match, imageName) => {
      const cleanName = imageName.trim();
      if (imageMap[cleanName]) {
        return `![${cleanName}](${imageMap[cleanName]})`;
      }
      return `![${cleanName}](assets/${cleanName})`;
    });

    // 转换 Obsidian 内部链接: [[link]] -> `link`
    content = content.replace(/\[\[([^\]]+)\]\]/g, '`$1`');

    // 转换 Obsidian 高亮: ==text== -> **text**
    content = content.replace(/==([^=]+)==/g, '**$1**');

    // 提取标题
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : fileName.replace(/_/g, ' ').replace(/^\d+\./, '').trim();

    // 生成 ID
    const id = fileName
      .toLowerCase()
      .replace(/[^a-z0-9一-龥]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // 从文件夹路径提取层级标签
    const folderTags = extractTagsFromPath(filePath, vaultPath);

    // 从文件名提取额外标签
    const filenameTags = extractTagsFromFilename(fileName);

    // 合并所有标签，避免重复（忽略大小写）
    const tags = [];
    const allTags = [vaultTag, ...folderTags, ...filenameTags];
    for (const tag of allTags) {
      const lowerTags = tags.map(t => t.toLowerCase());
      if (!lowerTags.includes(tag.toLowerCase())) {
        tags.push(tag);
      }
    }

    const uniqueTags = tags;

    // 生成摘要：取前 150 个字符
    const plainText = content
      .replace(/^#+\s+.+$/gm, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`[^`]+`/g, '')
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[#*_~\[\]()]/g, '')
      .replace(/\n+/g, ' ')
      .trim();

    const summary = plainText.substring(0, 150) + (plainText.length > 150 ? '...' : '');

    // 获取文件修改时间
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

// 从文章标签自动生成层级结构
function generateHierarchy(posts) {
  const hierarchy = {};

  for (const post of posts) {
    const tags = post.tags;
    if (tags.length < 2) continue;

    const mainTag = tags[0]; // 第一个标签是主分类（如 STM32、ESP32、硬件）
    const subTag = tags[1];  // 第二个标签是子分类（如 基础、模块）

    if (!hierarchy[mainTag]) {
      hierarchy[mainTag] = {};
    }

    if (!hierarchy[mainTag][subTag]) {
      hierarchy[mainTag][subTag] = [];
    }

    // 添加剩余的标签作为关键词
    for (let i = 2; i < tags.length; i++) {
      const keyword = tags[i];
      if (!hierarchy[mainTag][subTag].includes(keyword)) {
        hierarchy[mainTag][subTag].push(keyword);
      }
    }
  }

  return hierarchy;
}

// 更新 main.js 中的层级结构
function updateMainJs(hierarchy) {
  const mainJsPath = path.join(BLOG_DIR, 'js/main.js');

  try {
    let content = fs.readFileSync(mainJsPath, 'utf-8');

    // 生成新的层级结构代码
    const hierarchyCode = JSON.stringify(hierarchy, null, 8)
      .replace(/"/g, "'")
      .replace(/^( +)/gm, '        $1');

    // 替换 hierarchy 部分
    const hierarchyRegex = /const hierarchy = \{[\s\S]*?\};/;
    const newHierarchy = `const hierarchy = ${hierarchyCode};`;

    if (hierarchyRegex.test(content)) {
      content = content.replace(hierarchyRegex, newHierarchy);
    } else {
      console.log('⚠️  未找到 hierarchy 定义，跳过更新 main.js');
      return false;
    }

    fs.writeFileSync(mainJsPath, content, 'utf-8');
    return true;
  } catch (e) {
    console.error('更新 main.js 失败:', e.message);
    return false;
  }
}

// 主函数
function main() {
  console.log('🔄 开始同步 Obsidian 笔记...\n');

  // 清空 assets 目录
  if (fs.existsSync(ASSETS_DIR)) {
    const files = fs.readdirSync(ASSETS_DIR);
    for (const file of files) {
      fs.unlinkSync(path.join(ASSETS_DIR, file));
    }
    console.log('🗑️  已清空 assets 目录\n');
  }

  const allPosts = [];
  let totalImages = 0;

  for (const vault of VAULTS) {
    console.log(`📂 扫描仓库: ${vault.path}`);

    // 复制图片
    const imageMap = copyImages(vault.path);
    const imageCount = Object.keys(imageMap).length;
    totalImages += imageCount;
    console.log(`   📷 复制了 ${imageCount} 张图片`);

    // 扫描 Markdown 文件
    const files = getAllFiles(vault.path, ['.md']);
    console.log(`   📝 找到 ${files.length} 个 .md 文件`);

    for (const file of files) {
      const post = parseMdFile(file, vault.tag, imageMap, vault.path);
      if (post) {
        allPosts.push(post);
        console.log(`   ✅ ${post.title}`);
      }
    }
    console.log('');
  }

  // 按日期排序
  allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

  // 生成 posts.js
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

  fs.writeFileSync(path.join(BLOG_DIR, 'js/posts.js'), postsJs, 'utf-8');

  // 自动生成并更新层级结构
  console.log('🏷️  更新标签层级结构...');
  const hierarchy = generateHierarchy(allPosts);
  const updated = updateMainJs(hierarchy);
  if (updated) {
    console.log('   ✅ 已更新 main.js 中的标签层级\n');
  }

  console.log('✨ 同步完成！');
  console.log(`   📝 文章: ${allPosts.length} 篇`);
  console.log(`   📷 图片: ${totalImages} 张`);
  console.log(`   📁 已更新: js/posts.js`);
  if (updated) {
    console.log(`   📁 已更新: js/main.js（标签层级）`);
  }
}

main();
