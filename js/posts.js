// 博客文章数据（由 sync.js 自动生成）
const POSTS = [
  {
    "id": "驱动马达代码",
    "title": "驱动马达代码",
    "date": "2026-07-24",
    "tags": [
      "基于步态相位检测与空间触觉同步干扰的智能长袜系统",
      "驱动",
      "驱动马达代码"
    ],
    "content": "## Motor 库设计思路\n\n### 1. 整体架构：两层分离\n\n```\n上层（空间触觉模式）→ 告诉用户\"方向感\"\n        ↓\n底层（PWM 驱动）    → 控制马达转多快\n```\n\n**底层**只管\"让第 n 个马达转多少\"（PWM 0~255），**上层**只管\"按什么顺序、以什么速度、转多长时间\"——互不干扰。\n\n### 2. 底层：为啥用 LEDC PWM\n\n```cpp\nledcSetup(ch, 5000, 8);   // 5kHz, 8位精度(0~255)\nledcAttachPin(pin, ch);\n```\n\n- 8 个马达各占一个独立 LEDC 通道，**互不影响**\n- 5kHz 频率：刚好在人耳可听范围外，**没有高频噪音**\n- 8 位精度（0~255）：足够平滑调速，且 `analogWrite` 也是 8 位，习惯一致\n\n### 3. 引脚布局思路\n\n```\n脚底 → 胫骨前肌(0,1)     ← 正前方\n      腓肠肌内外侧(2,3)   ← 正后方\n      比目鱼肌(4)         ← 后侧偏中\n      腓骨长肌(5)         ← 外侧\n      跟腱左右(6,7)       ← 底部两侧\n```\n\n8 个马达不是随意排的，是按 **小腿解剖位置** 围绕一圈。这样可以通过马达的先后顺序，让用户感知 **方向**（上扫、下扫、环绕）。\n\n### 4. 上层模式的设计逻辑\n\n每种模式本质是一个 **\"时间 × 马达 × 转速\" 的序列**：\n\n| 模式 | 核心逻辑 |\n|------|----------|\n| 上扫 | `for(跟腱 → 小腿肚 → 胫骨)` 逐级点亮，模拟 **\"从脚底往膝盖传\"** |\n| 下扫 | 反向，模拟 **\"从膝盖往脚底传\"** |\n| 内外扫 | 内侧组 → 外侧组，模拟 **\"从内踝滚到外踝\"** |\n| 脉冲 | 同步全震 `30→255→30`，模拟 **\"跺脚\"** 的感觉 |\n| 环绕 | 单马达绕圈 `0→1→2→...→7`，模拟 **\"绕着腿转圈\"** |\n| 定点 | 逐个位置强振 300ms，让用户 **\"定位哪个点在震\"** |\n\n关键设计决策：\n- **阻塞执行**（用 `delay`）：因为模式都很短（1~3 秒），简单可靠，不用搞状态机\n- **硬编码转速和时长**：不搞参数化，减少调用方的复杂度\n\n### 5. 可以改进的方向（如果后续想深入）\n\n**a）非阻塞执行** — 用定时器 + 状态机代替 `delay`，让马达和传感器采集同时跑：\n```cpp\nvoid Motor_Update() {\n    switch (step) {\n        case 0: if (millis() - t > 90) { ... step++; }\n    }\n}\n```\n\n**b）传感器联动** — 把马达模式和足底数据、陀螺仪数据联动：\n- 前掌压力大 → 胫骨马达加强\n- 检测到摆动相（脚离地）→ 停止所有马达省电\n- 走路时脚跟先着地 → 跟腱马达先震再往上扫\n\n**c）马达串行输出** — 如果未来马达数量增加到几十个，GPIO 不够用，可以改用 PCA9685（I2C 驱动板）或 WS2812 振子，只需改底层 `Motor_SetSpeed`。\n\n**d）强度自适应** — 根据用户按压力度、运动速度自动调节马达振幅，避免太弱没感觉、太强麻腿。\n\n\n## ESP32 LEDC 底层原理\n\nLEDC = **LED PWM Controller**，是 ESP32 内部的一个**独立硬件外设**，和 CPU 是并行的。\n\n### 1. 硬件框图\n\n```\nCPU 只需写寄存器\n        │\n        ▼\n   ┌────────────┐\n   │   LEDC     │  ← 独立硬件，CPU 写完就不管了\n   │  控制器     │\n   └────┬───────┘\n        │ 硬件自动翻转引脚电平\n   ┌────┴────┐\n   │  GPIO   │\n   │  引脚   │  ← 输出 PWM 方波\n   └─────────┘\n```\n\n关键区别：`digitalWrite` 是 CPU 亲自去写引脚，而 LEDC 是**告诉硬件\"你帮我按这个频率和占空比自动翻转\"**，CPU 就可以去干别的事了。\n\n### 2. 内部工作原理（两大部分）\n\n#### ① 定时器（Timer）— 决定频率\n\n```\n定时器时钟 (80MHz APB)\n       │\n       ▼\n   ┌────────────┐\n   │  分频器     │  ← divider = (80M / freq / 2^resolution) - 1\n   └──────┬─────┘\n          │ 每 tick 加 1\n     ┌────┴─────┐\n     │  计数器   │  ← 从 0 数到 2^resolution - 1，然后归零\n     └────┬─────┘\n          │ 计数溢出 → 一个完整周期\n```\n\n**频率计算公式：**\n```\nPWM频率 = 80MHz / (divider + 1) / 2^resolution\n```\n\n你代码里的 `ledcSetup(ch, 5000, 8)`：\n```\ndivider = 80_000_000 / 5000 / 256 - 1 ≈ 62\n实际频率 ≈ 80M / 63 / 256 ≈ 4960 Hz ≈ 5kHz\n```\n\n#### ② 通道（Channel）— 决定占空比\n\n```\n计数器值 ──────────────┐\n                       ▼\n                 ┌──────────┐\n  占空比寄存器 ──→│  比较器   │  ← 计数器 > 占空比？输出低电平\n                 └────┬─────┘                     否则输出高电平\n                      ▼\n                   GPIO 引脚 ← 硬件自动翻转，CPU 完全不用管\n```\n\n**占空比 = `duty / 2^resolution`**，所以 8 位分辨率下 duty=255 就是 100%，duty=128 就是 50%。\n\n### 3. 代码背后发生了什么\n\n```cpp\n// ① 配置：分配硬件资源\nledcSetup(0, 5000, 8);\n//  → 占用 LEDC 的一个定时器\n//  → 设置分频系数 divider = 62\n//  → 设置计数器上限 = 255\n\n// ② 绑定：把通道和引脚连起来\nledcAttachPin(3, 0);\n//  → 通道 0 的输出直接硬连线到 GPIO 3\n//  → 点此之后，GPIO 3 不再受 digitalWrite 控制\n\n// ③ 调速：只需要写一个寄存器\nledcWrite(0, 200);\n//  → 把 200 写入通道 0 的占空比寄存器\n//  → 比较器自动工作，输出占空比 ≈ 78% 的方波\n```\n\n### 4. 为什么比 software PWM 好\n\n| | LEDC（硬件 PWM） | software PWM（自己写 delay） |\n|---|---|---|\n| CPU 占用 | **0%**，写完寄存器就完事 | 100%，必须在循环里精确延时 |\n| 抖动 | **无**，硬件时钟精确 | 有，受中断影响 |\n| 同时控制 | 8 路独立，互不干扰 | 越多路越不稳定 |\n| 频率精度 | 硬件分频，精确到 Hz | 受 `delayMicroseconds` 精度限制 |\n\n### 5. 特别注意：ESP32 的 LEDC 资源\n\n```\nESP32 总共:\n  - 4 个定时器（但只能指定 8 级分频精度）\n  - 16 个通道（共享定时器分组）\n  - 8 位分辨率下，最多 8 路独立频率\n```\n\n你的代码 `ledcSetup(0~7, 5000, 8)` 用了 8 个通道，共享同一个定时器（所有通道频率都是 5kHz），每个通道独立控制占空比，正好是标准用法。\n"
  },
  {
    "id": "足部压力传感器代码",
    "title": "足部压力传感器代码",
    "date": "2026-07-22",
    "tags": [
      "基于步态相位检测与空间触觉同步干扰的智能长袜系统",
      "传感",
      "足部压力传感器代码"
    ],
    "summary": "经典蓝牙与低功耗蓝牙的区别：蓝牙4.0、经典蓝牙、BT、BLE的关系与区别bt ble-CSDN博客 蓝牙ble介绍：        ESP32教程第二章讲义 - 哔哩哔哩                 低功耗蓝牙协议BLE初探：了解BLE协议的运作原理 - 知乎                 ...",
    "content": "经典蓝牙与低功耗蓝牙的区别：[蓝牙4.0、经典蓝牙、BT、BLE的关系与区别_bt ble-CSDN博客](https://blog.csdn.net/qlexcel/article/details/116738423)\n\n蓝牙ble介绍：        [ESP32教程第二章讲义 - 哔哩哔哩](https://www.bilibili.com/opus/697239519074713670)\n                [低功耗蓝牙协议(BLE)初探：了解BLE协议的运作原理 - 知乎](https://zhuanlan.zhihu.com/p/658050437) \n                [一文搞定蓝牙基础及蓝牙协议栈 ble（GAP ATT GATT协议栈，profile/uuid/特征值/service，广播，扫描，连接）_ble协议栈-CSDN博客](https://blog.csdn.net/qq_52815427/article/details/148256512)\n                [蓝牙BLE技术详解-CSDN博客](https://blog.csdn.net/daocaokafei/article/details/114735021)\n                \n\n\n## 足部压力传感器模块整体思路\n\n分两层：**BLE 通信层**（`Foot`）→ **数据分析层**（`Position`）\n\n### 第一层：Foot 模块 — BLE 接收 + 协议解析\n\n**硬件流：**\n```\n鞋垫压力传感器\n    ↓ BLE 无线（蓝牙 4.0）\nMX-01 蓝牙模块（在鞋垫里）\n    ↓ BLE 通知（Notify）\nESP32（作为 BLE 客户端）\n```\n\n**数据帧格式（39 字节）：**\n```\n┌────┬────┬────────────────────────────────────────┬────┐\n│0xAA│左右│  18个压力点 × 2字节（大端序）           │校验│\n│ 1B │ 1B │              36B                       │ 1B │\n└────┴────┴────────────────────────────────────────┴────┘\n```\n\n**协议解析状态机：**\n```c\nprocessByte(每收到一个字节) {\n    if (不在帧内)  等待 0xAA 帧头\n    if (在帧内)    存入缓冲区\n    if (收满39字节) 校验和检查 → 解析18个压力值 → 标记就绪\n                 校验失败 → 重同步搜索下一个0xAA\n}\n```\n\n**BLE 连接管理：**\n- `Foot_Begin()` → 创建 BLE 客户端，按 MAC 地址连接传感器\n- `Foot_Update()` → 主循环高频调用，断线自动 3 秒重试\n- 注册 Notify 回调 → 传感器有新数据自动推过来\n\n### 第二层：Position 模块 — 姿态/步态分析\n\n接收 Foot 的 18 点原始压力值，做三层分析：\n\n**① 总压力计算**\n```c\n总压 = 18个点累加\nif (总压 < 20g) → 脚离地\n```\n\n**② 脚掌姿态判断**\n```\n按身体区域分组：\n  脚趾(4点)  前掌(4点)  足弓(3点)  脚跟(4点)\n\n计算前后占比：\n  前区占比 = (脚趾+前掌) / 总压\n  后区占比 = 脚跟 / 总压\n\n规则：\n  前区 > 55% 且 后区 < 45%  → 踮脚\n  后区 > 55%               → 脚跟\n  前区 > 35% 且 后区 > 25%  → 前掌\n  其余                    → 平踩（再判断内外偏）\n\n内外偏检测：\n  内侧压力占比 > 60% → 内偏\n  内侧压力占比 < 40% → 外偏\n```\n\n**③ 步态相位分析**\n```c\n总压 < 20g       → 摆动相（脚离地）\n脚跟≥30 前掌<30  → 脚跟着地\n脚跟≥30 前掌≥30  → 站立中期\n脚跟<30 前掌≥30  → 蹬离期\n\n拖步检测：\n  站立相持续 > 1.5s + 身体几乎静止 → 拖步\n```\n\n### 数据流向\n\n```\n传感器蓝牙 → ESP32 BLE 接收\n                   ↓\n            Foot 协议解析\n            (18个原始压力值)\n                   ↓\n            Position 分析\n            ├── 脚掌姿态\n            ├── 步态相位  \n            └── 总压/前后占比\n                   ↓\n            串口打印 ←→ Bluetooth 推送手机\n```\n\n\n\n## BLE 蓝牙低功耗原理（以足底传感器为例）\n\n### BLE 的核心概念\n\nBLE 不像传统蓝牙那样建立\"管道\"持续传输数据，而是基于 **GATT 协议**（通用属性协议），结构为：\n\n```\nBLE 设备\n  └── Service（服务）—— 功能分类\n        └── Characteristic（特征）—— 具体数据通道\n              └── Descriptor（描述符）—— 配置参数\n```\n\n对应到压力传感器：\n```\n鞋垫传感器（BLE Server）\n  └── Service: 0000fff0-...\n        └── Characteristic: 0000fff1-...   ← 压力数据在这里\n              └── Descriptor: 0x2902 (CCCD)  ← 启用/关闭通知\n```\n\n### 角色分工\n\n| 设备 | BLE 角色 | 做的事 |\n|---|---|---|\n| **鞋垫传感器** | **Server（外设）** | 采集压力 → 存到特征值 → 主动通知 |\n| **ESP32** | **Client（中心）** | 搜索设备 → 连接 → 订阅通知 → 接收数据 |\n\n这和手机+手表的模式一样：手表是 Server 发数据，手机是 Client 收数据。\n\n### 三种数据传输方式\n\n```c\n// 1. Read — Client 主动去取（低效）\nESP32 问：\"fff1 的值是多少？\"\n鞋垫回答：\"0,12,34,56,78,...\"\n\n// 2. Notify — Server 主动推送（本项目用的）\n鞋垫主动说：\"新数据来了！0,12,34,56,78,...\"\nESP32 被动接收（无需应答，最快）\n\n// 3. Indicate — Server 主动推送+确认\n鞋垫说：\"新数据来了！0,12,34,56,...\"  \nESP32 回答：\"收到了！\"（带确认，慢一些）\n```\n\n本项目中压力传感器以 **50~100Hz** 的频率通过 **Notify** 推送数据，ESP32 只需接收。\n\n### 连接流程（时序图）\n\n```\nESP32 (Client)                 鞋垫传感器 (Server)\n    │                                   │\n    │                                   │── 广播 (Advertising) ──\n    │                                   │   数据包包含：设备名、服务UUID\n    │                                   │   间隔 20ms~10s 发一次\n    │                                   │\n    │←───────── Scan 扫描 ──────────    │\n    │   收到广播包，解析出 MAC 地址       │\n    │   \"FF:24:05:10:6C:5F - 有fff0服务\" │\n    │                                   │\n    │────── Connect 发起连接 ────────────→│\n    │                                   │\n    │←──── Connection 连接建立 ──────────│  双方协商连接参数\n    │                                   │  连接间隔 7.5ms~4s\n    │                                   │\n    │──── 1. 发现服务 ──────────────────→│\n    │    \"有哪些Service？\"                │\n    │←─── Service List ───────────────── │\n    │    \"有一个fff0服务\"                 │\n    │                                   │\n    │──── 2. 发现特征值 ────────────────→│\n    │    \"fff0服务里有什么特征？\"          │\n    │←─── Characteristic List ────────── │\n    │    \"有一个fff1特征，支持Notify\"      │\n    │                                   │\n    │──── 3. 订阅通知 (CCCD) ───────────→│\n    │    写 0x2902 描述符 = 0x0001       │\n    │    \"有新数据请主动通知我\"            │\n    │←─── CCCD OK ───────────────────── │\n    │                                   │\n    │←──── 4. Notify: 39字节数据帧 ───── │  从此自动接收\n    │←──── Notify: 39字节数据帧 ──────── │  50~100Hz\n    │←──── Notify: 39字节数据帧 ──────── │  持续不断\n```\n\n### 关键 BLE 术语\n\n| 术语 | 作用 | 类比 |\n|---|---|---|\n| **Service** | 功能分类，UUID=fff0 | 像 WiFi 的 SSID |\n| **Characteristic** | 具体数据通道，UUID=fff1 | 像 TCP 端口 |\n| **Notify** | Server 主动推，不要应答 | 像 UDP 广播 |\n| **CCCD (0x2902)** | 开关，写0x0001=开通知 | 像订阅按钮 |\n| **Advertising** | 广播自己的存在 | 像举着牌子喊\"我在这\" |\n| **Connection Interval** | 收发窗口间隔 | 越快越费电 |\n| **MTU** | 单次最大传输字节数 | 23 字节默认（可协商到 512）|\n\n### 本项目的蓝牙冲突问题\n\nESP32 同时跑了两个 BLE 角色：\n```\nBLE Central（Client）← 连压力传感器（Foot模块）\nBLE Peripheral（Server）← 连手机 Blinker App\n```\n\n同一颗芯片同时做\"中心\"和\"外设\"→ 两个角色争抢射频时间片 → 会导致连接不稳定，之前报的 `retrieveDescriptors()` 错误就是这个原因。解决办法通常是调整连接间隔、加长等待时间。\n\n\n## Foot 模块用到的 C 语言语法\n\n### 1. 预处理指令\n\n```c\n#ifndef FOOT_H        // 防止头文件重复包含\n#define FOOT_H\n#include <Arduino.h>  // 包含头文件（<>系统路径）\n#include \"Foot.h\"     // 包含头文件（\"\"本地路径）\n#define FOOT_POINT_COUNT 18  // 宏定义常量\n#define SENSOR_MAC  \"FF:24:05:10:6C:5F\"  // 宏定义字符串常量\nstatic bool initDone = false;  // static 变量未定义错误，直接编译\n```\n\n### 2. 基本数据类型\n\n```c\nuint8_t   s_rxIndex = 0;     // 8位无符号整数 (0~255)\nuint16_t  sum;                // 16位无符号整数 (0~65535)\nuint32_t  lastTry;            // 32位无符号整数\nint       retry;              // 有符号整数\nbool      s_inFrame = false;  // 布尔型 (true/false)\nfloat     ratio;              // 单精度浮点数\nsize_t    length;             // 大小类型（sizeof 返回值）\n```\n\n### 3. 数组\n\n```c\nuint8_t s_rxBuf[39];                  // 一维数组声明\nuint16_t s_points[FOOT_POINT_COUNT];  // 用宏定义长度的数组\nuint8_t val[] = {0x01, 0x00};         // 初始化列表\n```\n\n### 4. 指针\n\n```c\nconst uint16_t* Foot_GetPoints(void) {\n    return s_points;           // 返回数组首地址（指针）\n}\n\nstatic void notifyCallback(\n    BLERemoteCharacteristic* pChr,  // 对象指针参数\n    uint8_t* pData,                 // 数据缓冲区指针\n    size_t length,                  // 长度\n    bool isNotify\n);\n```\n\n### 5. 枚举\n\n```c\ntypedef enum {\n    FOOT_LEFT  = 0x01,   // 枚举常量可赋具体值\n    FOOT_RIGHT = 0x02\n} FootSide;\n```\n\n### 6. 函数定义与调用\n\n```c\n// 无参无返回值\nvoid Foot_Update(void);\n\n// 有参有返回值\nstatic bool parseFrame(void) {\n    // ...\n    return true;\n}\n\n// static 函数（文件内私有，外部不可见）\nstatic inline void resetParser(void) {  // inline：建议编译器内联展开\n    s_rxIndex = 0;\n    s_inFrame = false;\n}\n\n// 函数重载（C++特性，C不支持）\nvoid pChr->registerForNotify(notifyCallback);           // 无参\nvoid pChr->registerForNotify(callback, true, false);    // 三参\n```\n\n### 7. 运算符\n\n```c\n// 算术运算符\nsum += s_rxBuf[i];             // 复合赋值\ns_rxIndex++;                   // 自增\n\n// 位运算符\nsum & 0xFF                     // 按位与（取低8位）\n(s_rxBuf[2 + 2*i] << 8)       // 左移（合并高低字节）\n(s_side ** FOOT_LEFT) ? :     // 三目运算符\n\n// 逻辑运算符\nlength ** 0 || pData ** nullptr  // 逻辑或\nindex ** 0 || index > COUNT      // 多个条件\n```\n\n### 8. 控制流程\n\n```c\n// if-else\nif (!s_inFrame) {\n    // ...\n} else {\n    // ...\n}\n\n// if-else if-else\nif (index == 0) {\n    return 0;\n} else if (index > FOOT_POINT_COUNT) {\n    return 0;\n} else {\n    return s_points[index - 1];\n}\n\n// for 循环\nfor (uint8_t i = 0; i < FOOT_POINT_COUNT; i++)\n    s_points[i] = ...;   // 单语句可省略大括号\n\n// while 循环\nwhile (true) { }         // 无限循环\n\n// switch-case\nswitch (cmd) {\n    case 'a': ... break;\n    default:  ... break;\n}\n```\n\n### 9. 关键字\n\n```c\nstatic uint8_t s_rxBuf[39];        // 静态：文件作用域，值保持\nstatic inline void resetParser()   // inline：避免函数调用开销\nconst uint16_t* getPoints()        // const：返回只读指针\nvoid Foot_Begin(void)              // void：无返回值/无参数\nreturn;                            // 提前返回\n```\n\n### 10. 结构体/类（C++ 特性）\n\n```c\n// 类（C++特有）\nclass FootClientCB : public BLEClientCallbacks {\n    void onConnect(BLEClient* p) override {\n        Serial.println(\"连接\");\n    }\n    void onDisconnect(BLEClient* p) override {\n        s_subscribed = false;\n    }\n};\n\n// 对象（C++）\nBLEClient*  s_client = nullptr;     // 类指针\nBLEDevice::createClient();          // 静态方法调用\ns_client->isConnected();            // 箭头成员访问\npChr->registerForNotify(callback);  // 方法调用\n```\n\n### 11. 内存操作\n\n```c\n#include <cstring>       // C++风格的 string.h\n\nmemset(s_points, 0, sizeof(s_points));   // 内存清零\nmemmove(s_rxBuf, s_rxBuf + i, remain);  // 内存移动（支持重叠）\nmemcpy(&g_sensor, data, sizeof(SensorPacket));  // 内存拷贝\nsizeof(s_footPoints)     // 获取变量字节数\n```\n\n### 12. 强制类型转换\n\n```c\n(uint16_t)s_rxBuf[2 + 2 * i] << 8   // 小转大，隐式提升\n(uint16_t)MPU_I2C_ADDR              // 显式转换，C风格\n(const char*)data[0]                 // 类型转换\nnew FootClientCB()                  // new 表达式（C++动态分配）\n```\n\n### 总结：C vs C++\n\nFoot 模块**以 C 为主**，只是少量用了 C++ 特性：\n\n| C 语法占比 | 具体内容 |\n|---|---|\n| **~90%** | 宏定义、函数、数组、指针、枚举、for/if/switch |\n| **~10%** | 类继承（BLE 回调）、`new` 关键字、`::` 域运算符 |\n\n\n## BLE Notify 底层原理\n\n### 它不是\"直接发数据\"——而是\"读属性值\"\n\n很多人误解为 Notify 是\"鞋垫主动往 ESP32 发数据包\"，实际上 BLE 里**没有\"主动发\"这个操作**。底层是这样的：\n\n### GATT 属性表（核心）\n\n鞋垫（Server）内部维护一张**属性表**，就像一个小型数据库：\n\n```c\n// 鞋垫MCU内存中的属性表（简化）\n属性表:\n┌────────┬──────────┬──────────────────────────────────┐\n│ Handle │  UUID    │  当前值                           │\n├────────┼──────────┼──────────────────────────────────┤\n│ 0x0001 │ 0x2800   │ Service Declaration = fff0        │\n│ 0x0002 │ 0x2803   │ Char Declaration = fff1 [Notify]  │\n│ 0x0003 │ 0xfff1   │ ⭐ 当前压力数据 (39字节)          │  ← 数据在这里\n│ 0x0004 │ 0x2902   │ CCCD = 0x0000 (默认关闭)           │  ← 开关在这里\n└────────┴──────────┴──────────────────────────────────┘\n```\n\n**Notify 的本质：** ESP32 订阅后，每次鞋垫更新 Handle=0x0003 的属性值时，BLE 协议栈自动把新值\"推\"给所有订阅过的客户端。\n\n### 详细的 5 步流程\n\n#### 第 1 步：发现属性\n\n```\nESP32: \"Handle 0x0001 是什么？\"\n鞋垫: \"这是一个 Service，UUID=fff0\"\n\nESP32: \"这个 Service 里有哪些 Characteristic？\"  \n鞋垫: \"有一个 Characteristic，UUID=fff1，Handle=0x0003\"\n\nESP32: \"Handle 0x0003 的特征有什么属性？\"\n鞋垫: \"支持 Notify\"\n```\n\n#### 第 2 步：写 CCCD — 告诉鞋垫\"我要收通知\"\n\n```\nESP32 → 鞋垫: \"我要写 Handle 0x0004 (CCCD)\"\nESP32 → 鞋垫: \"写入值 = 0x0001\"\n\n鞋垫 收到 0x0001 后的内部变化:\n  if (收到 CCCD == 0x0001) {\n      把当前客户端加入\"通知列表\"\n      // 注意：只是记下来，还没发数据\n  }\n```\n\nCCCD 值含义：\n- `0x0000` = 不通知（默认）\n- `0x0001` = 启用通知（Notify）\n- `0x0002` = 启用指示（Indicate，带确认）\n\n#### 第 3 步：鞋垫采集压力 → 更新属性值\n\n```c\n// 鞋垫MCU的主循环（伪代码）\nwhile (1) {\n    uint16_t pressure[18] = readADC_all();    // 采集18个ADC\n    uint8_t frame[39] = packFrame(pressure);   // 打包成39字节\n    writeAttribute(0x0003, frame, 39);         // 更新属性表的值\n}\n```\n\n#### 第 4 步：BLE 协议栈自动触发 Notify（关键！）\n\n这不是蓝牙芯片额外\"发\"数据——**写属性值就自动触发了**：\n\n```c\n// BLE协议栈内部（相当于自动执行）\nvoid writeAttribute(uint16_t handle, uint8_t* data, uint16_t len) {\n    // 1. 更新内存中的属性值\n    attributeTable[handle].value = data;\n    \n    // 2. 检查这个属性所在的 Characteristic 有没有 CCCD\n    //    Handle 0x0003 属于 Characteristic 0x0002\n    //    它的 CCCD 在 Handle 0x0004\n    \n    // 3. 检查 CCCD 的值\n    if (attributeTable[0x0004].value ** 0x0001) {\n        // 有客户端订阅了 Notify！\n        \n        // 4. 构造通知包\n        // ┌────┬──────────────┬──────────┐\n        // │ 操作码 │ Handle │ 新值(39字节)│\n        // │ 0x1B  │ 0x0003 │ 压力数据   │\n        // └────┴──────────────┴──────────┘\n        \n        // 5. 塞进 Link Layer 队列，等待射频时间片发出\n        enqueue_notify_packet(0x0003, data, len);\n    }\n}\n```\n\n**关键：** 写属性值 → BLE 协议栈自动判断是否要发 Notify，**不需要额外调用\"发送函数\"**。\n\n#### 第 5 步：射频发送\n\n```c\n// Link Layer 在连接事件中发送\nif (current_event ** CONNECTION_EVENT) {\n    if (notify_queue 不为空) {\n        // 从队列取出一个通知包\n        packet = dequeue_notify();\n        \n        // 用 2.4GHz GFSK 调制发出\n        // 数据包结构：\n        // ┌─────┬──────────┬──────────┬──────────┬──────┐\n        // │前导码│ 接入地址 │  LL头    │  数据    │ CRC  │\n        // │ 1B  │   4B     │   2B     │ 可变长度  │  3B  │\n        // └─────┴──────────┴──────────┴──────────┴──────┘\n        //                       LL头含操作码 0x1B (Notify)\n        radio_send(packet);\n    }\n}\n```\n\n### ESP32 端：收到 Notify 后\n\n```c\n// BLE协议栈收到数据包 →\n// 解出操作码 0x1B, Handle=0x0003 → 触发回调\n\nvoid notifyCallback(BLERemoteCharacteristic* pChr, \n                    uint8_t* pData, size_t length, bool isNotify) {\n    // pData 指向的就是鞋垫刚写入属性表的39字节\n    // length = 39\n    // isNotify = true（表示这是通知，不是指示）\n    \n    for (size_t i = 0; i < length; i++) {\n        processByte(pData[i]);  // 喂给状态机\n    }\n}\n```\n\n**注意：** ESP32 收 Notify 其实是在中断上下文（BLE 事件回调）中执行的，所以 Inside callback 不能做 `delay()`, `Serial.print()` 等耗时操作。\n\n### 为什么叫\"Notify\"（通知）？\n\n| 层级 | Notify | 普通发送 |\n|---|---|---|\n| 应用层 | \"鞋垫告诉 ESP32 新值\" | \"鞋垫向 ESP32 发数据\" |\n| GATT 层 | \"属性值更新通知\" | \"L2CAP Send\" |\n| Link Layer | 操作码 0x1B | 操作码 0x02 |\n| **数据流** | **读属性 → 改值 → 自动推** | **创建连接 → 发 → 收** |\n\n**Notify 本质上不是\"发送数据\"，而是\"属性值的更新被同步给订阅者\"。** 这是一个发布-订阅模式（Pub-Sub），不是传统的发送-接收模式。\n\n### 总结：一条数据从踩到显示的路径\n\n```\n人脚一踩\n   ↓\n18个传感器电阻变化\n   ↓\n鞋垫MCU的ADC采样\n   ↓\nMCU算出压力值，写入属性表 Handle 0x0003\n   ↓\nBLE协议栈自动检查 CCCD = 0x0001 → 构造 Notify 包\n   ↓\n2.4GHz 射频发出，操作码 0x1B\n   ↓\nESP32 BLE协议栈收到 → 解析出 Handle + 数据\n   ↓\n触发 notifyCallback\n   ↓\nprocessByte() 状态机\n   ↓\n18个压力值就绪\n```\n\n\n\n## GATT 在足部压力传感器中的完整使用\n\n### 项目中的两个 GATT 场景\n\n```\nGATT Client (ESP32) ←→ GATT Server (鞋垫)\n       ↓\n主动发现服务、订阅通知、接收数据\n\nGATT Server (ESP32) ←→ GATT Client (手机 Blinker App)\n       ↓\n广播、等手机连接、响应数据请求\n```\n\n主要讲前半段——ESP32 读取鞋垫压力数据的 GATT 过程。\n\n### 第 1 步：发现 Service（GATT Discover All Primary Services）\n\n```cpp\n// Foot.cpp 第 119-120 行\nBLERemoteService* pSvc = s_client->getService(SVC_UUID);\n// SVC_UUID = \"0000fff0-0000-1000-8000-00805f9b34fb\"\n```\n\n底层发生了什么：\n\n```\nESP32 → 鞋垫:  \"你有哪些 Primary Service？\"\n              (GATT 请求: opcode=0x04, Read By Group Type, UUID=0x2800)\n\n鞋垫 → ESP32:  我一个 Service：\n              ┌────────────────────────────────────────────┐\n              │ Handle 0x0001 ~ 0x0004                    │\n              │ UUID = 0000fff0-...                       │\n              │ Attribute Type = 0x2800 (Primary Service) │\n              └────────────────────────────────────────────┘\n\nESP32:  找到了 fff0 服务，Handle 范围 0x0001~0x0004\n```\n\n### 第 2 步：发现 Characteristic（GATT Discover All Characteristics）\n\n```cpp\n// Foot.cpp 第 122 行\nBLERemoteCharacteristic* pChr = pSvc->getCharacteristic(DATA_UUID);\n// DATA_UUID = \"0000fff1-0000-1000-8000-00805f9b34fb\"\n```\n\n底层发生了什么：\n\n```\nESP32 → 鞋垫:  \"fff0 服务里有哪些 Characteristic？\"\n              (GATT 请求: opcode=0x08, Read By Type, UUID=0x2803)\n\n鞋垫 → ESP32:  Handle 0x0002:\n              ┌───────────────────────────────────────────┐\n              │ Handle: 0x0002 (Characteristic 声明)     │\n              │ 属性: 0x10 (Notify)                      │\n              │ 值 Handle: 0x0003                        │\n              │ UUID: 0000fff1-... (fff1 特征)           │\n              └───────────────────────────────────────────┘\n\nESP32:  找到了 fff1 特征，值在 Handle 0x0003，支持 Notify\n```\n\n### 第 3 步：读 Characteristic 属性（GATT Read）\n\nESP32 顺便检查这个特征有什么属性：\n\n```cpp\n// ESP32 在构造 BLERemoteCharacteristic 时自动执行\npChr->canNotify();  // → true（支持通知）\npChr->canRead();    // → false（不支持主动读）\n```\n\n### 第 4 步：订阅 Notify（GATT Write Descriptor + CCCD）\n\n这是最关键的一步，对应 `Foot.cpp` 第 128~141 行：\n\n```cpp\n// Foot.cpp 第 128 行\npChr->registerForNotify(notifyCallback);\n\n// 然后手动写 CCCD（第 131-141 行）\nBLERemoteDescriptor* cccd = pChr->getDescriptor(BLEUUID((uint16_t)0x2902));\nuint8_t val[] = {0x01, 0x00};   // 0x0001 = 启用 Notify\ncccd->writeValue(val, 2);\n```\n\n底层 GATT 过程：\n\n```\n发现 CCCD (0x2902)：\nESP32:  \"Handle 0x0003 有哪些 Descriptor？\"\n       (GATT: Find Information, opcode=0x04)\n鞋垫:   Handle 0x0004 是 CCCD，UUID=0x2902\n\n写 CCCD 启用通知：\nESP32 → 鞋垫:  \"我要写 Handle 0x0004，值 = 0x0001\"\n              (GATT Write Request，opcode=0x12)\n              数据包：\n              ┌────┬──────────┬─────────┐\n              │0x12│ 0x0004   │ 0x0100  │\n              │op  │ Handle   │ Value   │\n              └────┴──────────┴─────────┘\n\n鞋垫 → ESP32:  \"写入成功\" (Write Response，opcode=0x13)\n              \n鞋垫内心:  \"收到！以后属性值变了就主动通知出去\"\n```\n\n### 第 5 步：接收数据（GATT Handle Value Notification）\n\n鞋垫采集完压力，更新属性表后自动触发：\n\n```c\n// 鞋垫MCU内部（伪代码）\nvoid onNewPressureData(uint8_t frame[39]) {\n    // 1. 更新属性值\n    attribute_table[0x0003].value = frame;\n    \n    // 2. GATT 协议栈自动检查 CCCD\n    if (attribute_table[0x0004].value ** 0x0001) {\n        // 有人订阅了 → 自动构包发送\n        // 操作码：0x1B (Handle Value Notification)\n        // Handle: 0x0003\n        // Value: frame (39字节)\n        gatt_send_notification(0x0003, frame, 39);\n    }\n}\n```\n\nESP32 收到后 GATT 协议栈自动触发回调：\n\n```cpp\n// Foot.cpp 第 81-84 行\nstatic void notifyCallback(BLERemoteCharacteristic* pChr, \n                           uint8_t* pData, size_t length, bool isNotify) {\n    if (length ** 0 || pData == nullptr) return;\n    for (size_t i = 0; i < length; i++) processByte(pData[i]);\n}\n```\n\n### 完整 GATT 数据包结构\n\n一次 Notify 在空中的实际数据包：\n\n```\n空中数据包 (LE Uncoded):\n┌────────┬──────────┬─────────────┬──────────────────────────┬──────────┐\n│ 前导码  │ 接入地址 │ LL 数据头   │      L2CAP 数据段        │   CRC    │\n│  1B    │   4B     │    2B       │      可变长度            │   3B     │\n└────────┴──────────┴─────────────┴──────────────────────────┴──────────┘\n                                  │\n                    ┌─────────────┴──────────────────────────┐\n                    │  L2CAP Header (4B)                     │\n                    │  ├── 长度: 41 (39 + 2)                  │\n                    │  └── CID: 0x0004 (ATT)                 │\n                    │                                         │\n                    │  ATT Packet:                            │\n                    │  ├── Opcode: 0x1B (Handle Value Notify) │\n                    │  ├── Handle: 0x0003                     │\n                    │  └── Value: 39字节压力数据               │\n                    └─────────────────────────────────────────┘\n```\n\n### 流程图总结\n\n```\n┌────── ESP32 侧 ──────┬────── GATT 空中包 ──────┬─── 鞋垫侧 ──────┐\n│                       │                          │                  │\n│ s_client->connect()   │── 连接请求/接受 ────────→│  BLE 连接建立     │\n│                       │                          │                  │\n│ getService(fff0)      │── Read By Group Type ───→│  返回 Service    │\n│                       │←─ Service Handle 范围 ───│                  │\n│                       │                          │                  │\n│ getCharacteristic(fff1)│── Read By Type ────────→│  返回 Char 声明  │\n│                       │←─ Handle+UUID+属性 ─────│                  │\n│                       │                          │                  │\n│ getDescriptor(0x2902) │── Find Information ─────→│  返回 CCCD       │\n│                       │←─ Descriptor Handle ────│                  │\n│                       │                          │                  │\n│ cccd->writeValue()    │── Write Request ────────→│  保存值=0x0001  │\n│                       │←─ Write Response ───────│  \"已记住\"        │\n│                       │                          │                  │\n│                       │                          │  鞋垫采集到新数据 │\n│                       │                          │  ↓               │\n│                       │                          │  写属性表0x0003  │\n│                       │                          │  ↓               │\n│ notifyCallback()      │←─ Handle Value Notify ──│  检查CCCD=0x0001 │\n│  processByte()        │   操作码 0x1B            │  → 自动发送     │\n│                       │                          │                  │\n└───────────────────────┴──────────────────────────┴──────────────────┘\n                          ↑                    ↑\n                   全部是 GATT 操作     全部是 GATT 操作\n```\n\n**整个数据交换过程没有一行\"原始蓝牙发收代码\"，全部通过 GATT 属性读写 + 通知完成。**"
  },
  {
    "id": "mpu6050代码",
    "title": "mpu6050代码",
    "date": "2026-07-21",
    "tags": [
      "基于步态相位检测与空间触觉同步干扰的智能长袜系统",
      "传感",
      "mpu6050代码"
    ],
    "summary": "整个模块分三层，从底层到上层： MPU6050 通过 硬件 I2C（GPIO 16=SDA, GPIO 17=SCL）与 ESP32 通信。 三个底层函数： -  — 向指定寄存器写一个字节 -  — 从指定寄存器读一个字节 -  — 批量读取多个字节（一次读 14 字节：加速度 6 + 温度 2 ...",
    "content": "## MPU6050 模块整体思路\n\n整个模块分三层，从底层到上层：\n\n```\n应用层（Position.cpp）\n  └── 摆腿判断 + 步态分析\n       └── 驱动层（Mpu6050.cpp）\n            ├── I2C 读写寄存器\n            ├── 原始数据 → 物理量\n            └── 互补滤波解算姿态\n```\n\n### 第一层：硬件通信（I2C 读写）\n\nMPU6050 通过 **硬件 I2C**（GPIO 16=SDA, GPIO 17=SCL）与 ESP32 通信。\n\n三个底层函数：\n- `mpu_i2c_write(reg, data)` — 向指定寄存器写一个字节\n- `mpu_i2c_read(reg)` — 从指定寄存器读一个字节\n- `mpu_i2c_read_bytes(reg, buf, len)` — 批量读取多个字节（一次读 14 字节：加速度 6 + 温度 2 + 陀螺仪 6）\n\n### 第二层：传感器配置 + 数据转换\n\n**初始化（MPU6050_Init）：**\n1. 复位传感器（写 0x80 到电源管理寄存器）\n2. 检查 WHO_AM_I 寄存器是否等于 0x68（确认是 MPU6050）\n3. 配置采样率 200Hz、低通滤波 44Hz、量程 ±250°/s、±2g\n\n**陀螺仪校准（MPU6050_Calibrate）：**\n- 传感器必须保持静止，采集 500 个样本，去掉异常值后取平均\n- 这个平均值就是\"零偏\"（gyro_offset），静止时陀螺仪理论上应为 0，实际有误差\n\n**原始值 → 物理量：**\n```\n加速度(g) = 原始值 / 16384\n角速度(°/s) = 原始值 / 131 - 零偏\n```\n\n### 第三层：姿态解算（互补滤波）\n\n这是核心。思路是**两种传感器取长补短**：\n\n| 传感器 | 优点 | 缺点 |\n|---|---|---|\n| **陀螺仪** | 反应快，不受震动影响 | 有零偏，**积分会漂移** |\n| **加速度计** | 有绝对参考（重力方向） | 受震动干扰，反应慢 |\n\n**互补滤波的做法：**\n1. 陀螺仪积分算出角度变化（短期准）\n2. 加速度计算出水平倾角（长期准）\n3. 融合公式：`最终角度 = 陀螺仪×0.98 + 加速度计×0.02`\n\n运动时优先信陀螺仪（98%），静止时缓慢拉向加速度计的值来消除漂移。\n\n**Yaw（偏航角）的特殊处理：**\n- 只有陀螺仪积分，没有绝对参考（加速度计测不出绕 Z 轴的旋转）\n- 加死区：微小角速度不积分，防止静止时飘走\n- 加衰减：静止时缓慢回到 0\n\n### Position 模块（上层应用）\n\n```cpp\nPosition_Init()      → 初始化 MPU6050 + 校准\nPosition_Update()    → 读传感器 → 解算角度 → 判断摆腿状态\n```\n\n摆腿判断逻辑：\n- 竖轴（Z）角速度 > 50°/s → 左转/右转\n- 膝轴（Y）角速度 > 60°/s → 前摆/后摆\n- 否则 → 静止\n\n### 数据流向\n\n\n```\nMPU6050 芯片\n    ↓ I2C 读取原始寄存器值\n原始 16 位整数 (accel[3], gyro[3])\n    ↓ 除以比例因子，减去零偏\n物理量 (accel_g, gyro_dps)  ← 单位 g 和 °/s\n    ↓ 互补滤波\n姿态角 (roll, pitch, yaw)   ← 单位 °\n    ↓\n→ 送给 Bluetooth 模块推送到手机\n→ 串口打印调试\n```\n\nMPU6050 模块一共用到以下寄存器：\n\n| 地址 | 名称 | 作用 |\n|---|---|---|\n| **0x6B** | `REG_PWR_MGMT` | **电源管理**：写入 0x80 复位芯片，写入 0x00 退出复位并选择 X 轴陀螺仪为时钟源 |\n| **0x75** | `REG_WHO_AM_I` | **器件 ID**：读回来应该是 0x68，用来确认 I2C 通信正常 |\n| **0x3B ~ 0x40** | `REG_ACCEL_XOUT` | **加速度数据**：连续 6 字节，每轴 2 字节（X高→X低→Y高→Y低→Z高→Z低） |\n| **0x43 ~ 0x48** | `REG_GYRO_XOUT_H` | **陀螺仪数据**：连续 6 字节，每轴 2 字节（X高→X低→Y高→Y低→Z高→Z低） |\n| **0x19** | `REG_SMPLRT_DIV` | **采样率分频**：写入 0x04，采样率 = 1000Hz / (1+4) = 200Hz |\n| **0x1A** | `REG_CONFIG** | **数字低通滤波(DLPF)**：写入 0x03，截止频率 44Hz |\n| **0x1B** | `REG_GYRO_CONFIG** | **陀螺仪量程**：写入 0x00，量程 ±250°/s |\n| **0x1C** | `REG_ACCEL_CONFIG` | **加速度量程**：写入 0x00，量程 ±2g |\n\n### 寄存器读写流程\n\n```\n初始化：\n  0x6B ← 0x80     复位芯片\n  0x6B ← 0x00     退出复位\n  0x75 → 0x68?    检查 ID\n  0x19 ← 0x04     采样率 200Hz\n  0x1A ← 0x03     低通滤波 44Hz\n  0x1B ← 0x00     陀螺仪 ±250°/s\n  0x1C ← 0x00     加速度 ±2g\n\n数据读取（一次批量读 14 字节）：\n  0x3B → AX_H, AX_L, AY_H, AY_L, AZ_H, AZ_L       (加速度 6 字节)\n         T_H,  T_L                                  (温度 2 字节，跳过)\n  0x43 → GX_H, GX_L, GY_H, GY_L, GZ_H, GZ_L       (陀螺仪 6 字节)\n```\n\n除了温度那 2 个字节没用到，其他寄存器全部参与了传感器配置和数据采集。\nMPU6050 模块用到的 C 语言语法：\n\n### 1. 预处理指令\n\n```c\n#include \"Mpu6050.h\"    // 包含头文件\n#include <math.h>        // 包含系统库\n#define ACCEL_SCALE 16384.0f  // 宏定义常量\n```\n\n### 2. 数据类型\n\n```c\nstatic bool mpu_ok = false;          // 布尔类型（C99 stdbool.h）\nstatic int16_t accel[3];             // 16位有符号整数\nstatic uint8_t reg;                   // 8位无符号整数\nstatic uint32_t now;                  // 32位无符号整数\nstatic float angle[3];               // 单精度浮点数\nstatic unsigned long last_time;       // 无符号长整数\nstatic size_t length;                 // 大小类型（sizeof 返回类型）\n```\n\n### 3. 变量修饰\n\n```c\nstatic float gyro_offset[3];         // 静态变量（文件作用域，值保持）\nstatic uint8_t init_count = 0;        // 函数调用间保持值的局部变量\nstatic inline float accel_roll()      // inline 内联函数（减少调用开销）\nconst uint8_t* buf;                   // const 只读指针\n```\n\n### 4. 数组\n\n```c\nuint8_t buf[14];                      // 一维数组\nfloat gyro_offset[3] = {0, 0, 0};     // 数组初始化\nfloat g[3];                            // 声明数组\n```\n\n### 5. 指针\n\n```c\nvoid MPU6050_GetAngle(float* roll, float* pitch, float* yaw);  // 指针参数（输出参数）\nif (gyro_x) *gyro_x = gyro_dps[0];    // 空指针检查 + 解引用赋值\nuint16_t* p;                           // 指针变量\n```\n\n### 6. 函数\n\n```c\n// 有参有返回值\nfloat accel_roll(float ay, float az) {\n    return atan2f(ay, az) * 57.29578f;\n}\n\n// 无参无返回值\nvoid MPU6050_Update(void) {\n    // ...\n}\n\n// 静态函数（文件内私有）\nstatic void mpu_i2c_write(uint8_t reg, uint8_t data);\n```\n\n### 7. 运算符\n\n```c\n// 位运算\ngyro[0] = (buf[8] << 8) | buf[9];   // 左移 + 按位或（合并高低字节）\n\n// 算术运算\nfloat ax = accel[0] / ACCEL_SCALE;   // 除法\nfloat dt = (now - last) / 1000000.0f; // 减法 + 除法\nangle[0] += gy * dt;                  // 复合赋值\n\n// 三目运算符\nreturn (status & 0x20) ? true : false;\n```\n\n### 8. 控制流程\n\n```c\n// if-else\nif (mpu_ok) {\n    // ...\n} else {\n    return;\n}\n\n// for 循环\nfor (uint8_t i = 0; i < 500; i++) {\n    // ...\n}\n\n// 多重 if-else if\nif (fabs(gx) < STILL_THRESH && fabs(gy) < STILL_THRESH && fabs(gz) < STILL_THRESH) {\n    if (still_count < STILL_COUNT) still_count++;\n} else {\n    still_count = 0;\n}\n```\n\n### 9. 强制类型转换\n\n```c\nuint16_t len = (uint16_t)MPU_I2C_ADDR;  // 把枚举/宏转成指定类型\n```\n\n### 10. 数学库函数\n\n```c\natan2f(ay, az);       // 反正切（弧度）\nsqrtf(ay * ay + az * az);  // 平方根\nfabsf(gx);             // 浮点数绝对值\nconstrain(dt, 0.001f, 0.02f);  // 限幅（Arduino 特有，非标准 C）\nisnan(t);              // 判断是否为 NaN（非数）\n```\n\n### 11. 结构体（间接用到）\n\n虽然 MPU6050 模块本身没定义结构体，但 `Wire.write()`、`Serial.println()` 等库函数内部使用了结构体。"
  },
  {
    "id": "医学背景",
    "title": "医学背景",
    "date": "2026-07-20",
    "tags": [
      "基于步态相位检测与空间触觉同步干扰的智能长袜系统",
      "系统",
      "医学背景"
    ],
    "summary": "肌肉位置 第010期：认识你的肌肉之下肢肌：小腿肌 - 知乎 步态相位 基于足压与姿态信息融合的步态相位识别方法05-0177-08.html 人体行走步态周期转换为不同相位描述步态相位-CSDN博客",
    "content": "肌肉位置\n[第010期：认识你的肌肉之下肢肌：小腿肌 - 知乎](https://zhuanlan.zhihu.com/p/31065422)\n\n步态相位\n[基于足压与姿态信息融合的步态相位识别方法](https://bzxb.cqut.edu.cn/html/202505/2096-2304\\(2025\\)05-0177-08.html)\n[人体行走步态周期转换为不同相位描述_步态相位-CSDN博客](https://blog.csdn.net/m0_55919967/article/details/141024977)\n"
  },
  {
    "id": "电子基础",
    "title": "电子基础",
    "date": "2026-07-20",
    "tags": [
      "基于步态相位检测与空间触觉同步干扰的智能长袜系统",
      "系统",
      "电子基础"
    ],
    "summary": "Arduino编程语句参考 – 太极创客 I2C通信",
    "content": "[Arduino编程语句参考 – 太极创客](http://www.taichi-maker.com/homepage/reference-index/arduino-code-reference/)\nI2C通信\n![I2C1.png](assets/I2C1.png)\n![I2C2.png](assets/I2C2.png)\n![I2C3.png](assets/I2C3.png)\n![I2C4.png](assets/I2C4.png)"
  },
  {
    "id": "电子硬件系统",
    "title": "1.足部压力传感器选型",
    "date": "2026-07-19",
    "tags": [
      "基于步态相位检测与空间触觉同步干扰的智能长袜系统",
      "传感",
      "1.足部压力传感器选型"
    ],
    "summary": "目的：选择足底压力传感器旨在精准检测步态相位，为触觉干预提供时间基准；同时获取足底空间压力分布，实现异常区域与刺激点的精确映射，构建闭环反馈控制。其柔性薄膜形态可无缝嵌入长袜，数字接口便于与主控高速通信，有效保障系统实时性、空间准确性与集成便捷性。 原理:足底压力传感器的核心原理是阵列式电阻扫描。 ...",
    "content": "# 1.足部压力传感器选型\n**目的**：选择足底压力传感器旨在精准检测**步态相位**，为触觉干预提供时间基准；同时获取足底空间压力分布，实现异常区域与刺激点的精确映射，构建**闭环反馈控制**。其柔性薄膜形态可无缝嵌入长袜，数字接口便于与主控高速通信，有效保障系统实时性、空间准确性与集成便捷性。\n\n**原理**:足底压力传感器的核心原理是**阵列式电阻扫描**。\n鞋垫内嵌柔性薄膜传感器，压力感应点呈行列矩阵分布。足底受压时，对应交叉点的电阻值会随压力增大而减小。\n\n工作时，微控制器（MCU）通过模拟开关**逐行逐列**高速切换通道，对每个感应点施加电压。每个点相当于一个可变电阻，与固定电阻组成分压电路，压力变化引起电压变化。该模拟信号经模数转换器（ADC）采集，最终转化为**数字压力值**输出.\n\n通过高速循环扫描所有交叉点，系统即可实时还原整个足底的动态压力分布热力图。\n![足部压力传感器.jpg](assets/足部压力传感器.jpg)\n\n**传感器用户手册**\n![【冠拓电子】足底压力传感器用户手册.pdf](assets/【冠拓电子】足底压力传感器用户手册.pdf)\n**总结**：深入了解足底压力传感器的工作原理，对我们后续项目代码的编写和功能实现有着至关重要的指导作用。正所谓**知己知彼，百战不殆**，只有清楚掌握了硬件的信号输出特性、扫描时序和电气参数，我们才能合理设计驱动程序中的采样频率、通道切换逻辑和中断处理。例如，了解阵列扫描的循环周期，就能精确计算每次完整采集所需的时间，从而为实时数据处理和通信协议分配适当的时序资源。同时，知晓压力与电阻的非线性关系，有助于我们在代码中实现数据校准和滤波算法，确保最终应用层获取的压力分布数据准确可靠。这种对底层硬件的透彻理解，将直接提升代码的健壮性和项目的整体成功率。\n\n# 2  陀螺仪姿态角速度加速度传感器MPU6050模块\n\n**目的**：选型目的：捕捉足部三维空间角速度与姿态变化，弥补压力传感器无法感知空中运动姿态的不足。两者融合实现“何时触地”与“如何运动”的完整步态还原，识别摆腿，前进，后退等异常姿态。\n\n**工作原理**：工作原理：基于MEMS科里奥利效应。内部谐振质量块高速振荡，旋转时受科里奥利力产生横向位移，通过差分电容检测，经16位ADC转换为数字角速度值，通过I²C/SPI接口输出。\n![MPU6050.jpeg](assets/MPU6050.jpeg)\n**具体详细原理**见此链接\n[MPU6050工作原理及STM32控制MPU6050_关闭i2c主模式和fifo-CSDN博客](https://blog.csdn.net/he__yuan/article/details/76559569)\n\n**引脚介绍**：VIN:电源供电引脚\n          GND:芯片接地引脚\n          SCL:I2C通信引脚，时钟线\n          SDA:I2C通信引脚，数据线\n          **芯片手册见下方链接**\n[1457707046159.pdf](https://atta.szlcsc.com/upload/public/pdf/source/20140425/1457707046159.pdf)\n\n**总结**：通过学习，掌握了MPU5050基于MEMS科里奥利效应的角速度测量原理：谐振质量块高速振荡，旋转时产生横向位移，经差分电容检测和16位ADC转换为数字量输出。\n深刻体会到，理解其量程配置、采样率与通信时序，是后续驱动编写及姿态融合算法开发的关键，直接影响干预系统实时性与准确性。\n\n# 3 驱动马达模块\n\t\n**目的**  \n选择普通振动马达（ERM偏心转子马达）直接由ESP32的PWM驱动，实现足底振动反馈。其体积小、功耗低，驱动电路仅需MOS管开关，无需专用驱动芯片，便于嵌入长袜，满足基础触觉干预需求。\n\n**原理**  \n基于偏心质量块旋转产生离心力。ESP32输出PWM信号控制MOS管导通占空比，调节马达两端平均电压以改变转速，从而控制振动强度与节奏。通过配置定时器频率和占空比，即可实现不同触觉模式。\n![马达.jpg](assets/马达.jpg)\n引脚：VCC:电源供电引脚。\n       GND：电源接地引脚。\n       IN：使能PWM引脚，用来控制马达的输出。\n\n**总结** ：通过学习，掌握了ERM马达基于PWM占空比调速的原理及MOS管驱动电路设计要点。深刻理解其启动电压、额定电压与工作电流等电气参数，是PWM频率与幅值配置的直接依据，直接影响振动强度与触觉反馈效果，为后续驱动代码编写奠定基础。\n\n# 4主控ESP32-S3\n**目的**:ESP32作为系统主控，负责多传感器数据采集、融合决策与无线通信。双核架构可并行处理步态算法与蓝牙/Wi-Fi协议栈，丰富的外设接口（SPI/I²C）满足多模块集成需求，ULP协处理器支持深度睡眠低功耗采样，延长穿戴设备续航。\n\n**原理**:基于双核Tensilica LX6处理器，主频240MHz。PRO_CPU运行无线协议栈，APP_CPU承载用户算法，实现并行处理。通过SPI/I²C采集压力与姿态数据，经运算生成触觉指令后经I²C发送至DRV2605。ULP协处理器可在主CPU休眠时独立采样，降低系统功耗..\n\n![ESP32-S3.jpg](assets/ESP32-S3.jpg)\n通过VSCODE 搭配插件进行编程，运用 Arduino语言以此来实现项目功能的实现。\n# 5 电源系统\n**前言** ：在完成各个模块选型了，但是模块正常工作是需要一定的电压的，那电压是怎么来的呢，这里，我们采用3.7v的锂电池串联合成7.4v的锂电池，既保证了正常的电压电流输出，能实现轻量化设备保证。\n\n但这时候又有问题来了，不同的模块的供电是不一样的，我们怎么去实现电压变化，来供给模块了，这里我们就采用了**DCDC降压模块**\n\n![DCDC降压模块.jpg](assets/DCDC降压模块.jpg)\n引脚：VIN+:正电源输入\n       VIN-:负电源输入，一般接电源地\n       OUT+:降压的正电源输出\n       OUT-:降压的负电源输出，一般电源接地\n\n![DCDC电路原理图.png](assets/DCDC电路原理图.png)\n\n\n\n\n![DCDCpcb图.png](assets/DCDCpcb图.png)\n\n以此来实现整个电路的电压转换。\n# 6 硬件联动\n\n**前言**：在完成各模块原理选型后，下一步便是通过严谨的电路连接实现系统联动。合理的硬件拓扑需统筹接口匹配（如ESP32的I²C总线同时挂载MPU5050与DRV2605，SPI连接压力传感器）、电平转换（3.3V统一供电避免逻辑电平冲突）、电源分配（各模块独立去耦电容）及信号线抗干扰设计（串阻匹配、布线隔离）。\n规范的电路连接不仅确保数据链路的稳定传输，更能提升系统长期穿戴的可靠性与抗扰性，为后续代码调试奠定坚实的硬件基础。\n\n在确定电路连接方案后，我们选择**嘉立创EDA**作为电路设计与PCB布局工具。这是一款国产免费云端EDA平台，具备原理图绘制、PCB布局布线、元件库管理及3D预览等完整功能，支持团队协作与版本管理，非常适合智能长袜这类多模块集成项目。\n其内置的海量元件库涵盖ESP32、MPU5050、DRV2605及各类连接器，省去手动建库的繁琐。\n通过嘉立创EDA完成原理图设计后，可一键导入PCB进行布局布线，其自动布线结合手动优化可高效完成紧凑型多层板设计，搭配嘉立创PCB打样服务可实现快速迭代，有效缩短项目硬件开发周期并保证电路可靠性。\n![嘉立创.png](assets/嘉立创.png)\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n"
  },
  {
    "id": "电子软件配置",
    "title": "电子软件配置",
    "date": "2026-07-19",
    "tags": [
      "基于步态相位检测与空间触觉同步干扰的智能长袜系统",
      "系统",
      "电子软件配置"
    ],
    "summary": "编程软件采用vscode搭配platform插件，进行编程 VSCode+PlatformIO环境搭建（在线安装+离线快速安装）&创建VSCode platformio工程（以ESP32-S3为例）vscode安装platformio-CSDN博客 嘉立创下载 软件下载 - 嘉立创EDA 上位机：v...",
    "content": "\n编程软件采用vscode搭配platform插件，进行编程\n[VSCode+PlatformIO环境搭建（在线安装+离线快速安装）&创建VSCode platformio工程（以ESP32-S3为例）_vscode安装platformio-CSDN博客](https://blog.csdn.net/WYW35416/article/details/145674518)\n![vscode加platform.png](assets/vscode加platform.png)\n\n嘉立创下载\n[软件下载 - 嘉立创EDA](https://lceda.cn/page/download)\n\n上位机：vofa+，方便我们进行调试。\n![上位机.zip](assets/上位机.zip)\n\n传感器上位机：![足底压力传感器上位机.zip](assets/足底压力传感器上位机.zip)"
  },
  {
    "id": "micropython-esp32开发板-无线wifi-蓝牙双核模块-micro接口",
    "title": "MicroPython ESP32开发板 无线WIFI+蓝牙双核模块 MICRO接口",
    "date": "2026-07-15",
    "tags": [
      "ESP32",
      "板子类型",
      "蓝牙通信",
      "WiFi"
    ],
    "summary": "1.图片介绍 2.platform型号选择 \tEspressif ESP32 Dev Module",
    "content": "1.图片介绍\n\n![67541b691f37a991abe22df5becc64fe.jpg](assets/67541b691f37a991abe22df5becc64fe.jpg)\n\n2.platform型号选择\n\tEspressif ESP32 Dev Module\n\n"
  },
  {
    "id": "未命名",
    "title": "未命名",
    "date": "2026-07-15",
    "tags": [
      "ESP32",
      "板子类型"
    ],
    "summary": "1.图片介绍 2.型号选择",
    "content": "1.图片介绍\n![38d25bafe2978d47b45dbeebc4cc75de.jpg](assets/38d25bafe2978d47b45dbeebc4cc75de.jpg)\n\n\n2.型号选择\n"
  },
  {
    "id": "配置",
    "title": "配置",
    "date": "2026-07-14",
    "tags": [
      "STM32",
      "模块",
      "无刷电机驱动_bldc"
    ],
    "summary": "1.",
    "content": "1."
  },
  {
    "id": "芯片电路引脚说明",
    "title": "芯片电路引脚说明",
    "date": "2026-07-12",
    "tags": [
      "硬件",
      "基础电路"
    ],
    "summary": "VCC\t     电路的供电正电压\t     一般表示模拟信号电源 GND\t 电路的供电负电压\t     表示模拟信号地 VDD\t     芯片的工作正电压\t     表示数字信号电源 VSS\t     芯片的工作负电压\t     表示数字电源地 VDDA\t 芯片的工作正电压模拟\t VSSA\t 芯片...",
    "content": "VCC\t     电路的供电正电压\t     一般表示模拟信号电源\nGND\t 电路的供电负电压\t     表示模拟信号地\nVDD\t     芯片的工作正电压\t     表示数字信号电源\nVSS\t     芯片的工作负电压\t     表示数字电源地\nVDDA\t 芯片的工作正电压(模拟)\t\nVSSA\t 芯片的工作负电压(模拟)\t\nVDDD\t 芯片的工作正电压(数字)\t\nVSSD\t 芯片的工作负电压(数字)\t\nVREF+\t ADC基准参考电压(正)\t\nVREF-\t ADC基准参考电压(负)\t\nVBAT\t 电池或其他电源供电\t\nVEE\t     负电压供电\t\n"
  },
  {
    "id": "大纲",
    "title": "大纲",
    "date": "2026-07-12",
    "tags": [
      "基于步态相位检测与空间触觉同步干扰的智能长袜系统",
      "系统",
      "大纲"
    ],
    "summary": "",
    "content": "\n"
  },
  {
    "id": "tb6612",
    "title": "tb6612",
    "date": "2026-06-05",
    "tags": [
      "硬件",
      "模块",
      "tb6612"
    ],
    "summary": "1.该模块为常见电机驱动模块，芯片内置mos，方便实现驱动电机，可以实现2路电机驱动，但驱动电流有限。 2.电路图如下：     16脚：给pwm波控制转速     15脚：给高低电平，和14脚一高一低，控制转速的方向。 \t14脚：给高低电平，和14脚一高一低，控制转速的方向。 \t13脚：使能端，给...",
    "content": "1.该模块为常见电机驱动模块，芯片内置mos，方便实现驱动电机，可以实现2路电机驱动，但驱动电流有限。\n2.电路图如下：\n    16脚：给pwm波控制转速\n    15脚：给高低电平，和14脚一高一低，控制转速的方向。\n\t14脚：给高低电平，和14脚一高一低，控制转速的方向。\n\t13脚：使能端，给高电平可以使芯片正常工作，低电平可以使芯片停止工作。\n\t12脚：给高低电平，和11脚一高一低，控制转速的方向。\n\t11脚：给高低电平，和12脚一高一低，控制转速的方向。\n\t10脚：给pwm波控制转速。\n\t9脚：接地。\n\t8脚：接地。\n\t7脚：输出一路和6脚相对应。\n\t6脚：输出一路和7脚相对应。\n\t5脚：输出一路和4脚相对应。\n\t4脚：输出一路和5脚相对应。\n\t3脚：接地。\n\t2脚：电源接3.3v。\n\t1脚：接大电源，要接2个滤波电容，因为该芯片负载的电压有限，不能太大。\n\n\n![tb6612.png](assets/tb6612.png)\n"
  },
  {
    "id": "stm32-usart",
    "title": "一.stm32_usart_串口打印",
    "date": "2026-06-03",
    "tags": [
      "STM32",
      "基础",
      "串口"
    ],
    "summary": "1.先按，进行基础配置，然后进行下一步usart基础设置。 2.进行串口配置，需要注意的的是波特率，需要一一对应。   3.进行串口打印：使用重定向printf重写HALUARTTransmit，这样只需要调用printf，就可以打印所需要的信息。最后一步在勾Keil 里勾选选项非常重要 。 1.先...",
    "content": "# 一.stm32_usart_串口打印\n1.先按`stm32_通用配置`，进行基础配置，然后进行下一步usart基础设置。\n2.进行串口配置，需要注意的的是**波特率**，需要一一对应。\n![串口配置.png](assets/串口配置.png) \n3.进行串口打印：使用重定向printf重写HAL_UART_Transmit，这样只需要调用printf，就可以打印所需要的信息。**最后一步在勾Keil 里勾选选项非常重要** 。\n![串口打印.png](assets/串口打印.png)\n\n# 二 stm32_usart 串口通信\n1.先按`stm32_通用配置`，进行基础配置，然后进行下一步usart基础设置。\n2.进行串口配置，需要注意的的是**波特率**，需要一一对应。\n![串口配置.png](assets/串口配置.png)\n3.中断开启，dma开启。\n![串口通信2.png](assets/串口通信2.png)\n![串口通信1.png](assets/串口通信1.png)"
  },
  {
    "id": "1-蓝牙通信",
    "title": "蓝牙通信",
    "date": "2026-06-03",
    "tags": [
      "STM32",
      "模块",
      "蓝牙通信"
    ],
    "summary": "通过蓝牙进行通信，有主从机设置。",
    "content": "通过蓝牙进行通信，有主从机设置。"
  },
  {
    "id": "2-蓝牙通信-c",
    "title": "蓝牙通信.c",
    "date": "2026-06-03",
    "tags": [
      "STM32",
      "模块",
      "蓝牙通信"
    ],
    "summary": "直接引用，注意串口引脚是否对应，然后通信和打印的串口引脚不能是同一个，得分开,还需要注意蓝牙模块的波特率，在这里只写了蓝牙的接收，并没有写发送.",
    "content": "直接引用，注意串口引脚是否对应，然后通信和打印的串口引脚不能是同一个，得分开,还需要注意蓝牙模块的**波特率**，在这里只写了蓝牙的接收，并没有写发送.\n```\n#include \"serial.h\"\n\n/* 手动实现 strlen */\nstatic uint16_t my_strlen(const char *s)\n{\n    uint16_t len = 0;\n    while (*s++) len++;\n    return len;\n}\n\n/* ==========================================================**\n *                      私有变量\n * **========================================================** */\nstatic Serial_Handle serial;\nstatic UART_HandleTypeDef *huart_bt;\n\n/* **========================================================**\n *                      公共接口\n * **========================================================== */\n\nvoid Serial_Init(void)\n{\n    /* 清空结构体 */\n    for (uint16_t i = 0; i < sizeof(serial); i++) {\n        ((uint8_t *)&serial)[i] = 0;\n    }\n\n    /* 指向 CubeMX 的 huart2 */\n    extern UART_HandleTypeDef huart2;\n    huart_bt = &huart2;\n\n    /* 使能 IDLE 中断 */\n    __HAL_UART_ENABLE_IT(huart_bt, UART_IT_IDLE);\n\n    /* 启动 DMA 环形接收 */\n    HAL_UART_Receive_DMA(huart_bt, serial.buf, BT_RX_BUF_SIZE);\n}\n\nbool Serial_HasData(void)\n{\n    return serial.complete;\n}\n\nuint16_t Serial_ReadData(uint8_t *buf, uint16_t max_len)\n{\n    uint16_t len = serial.rx_len;\n    if (len > max_len) len = max_len;\n\n    for (uint16_t i = 0; i < len; i++) {\n        buf[i] = serial.buf[i];\n    }\n\n    /* 重置标志，准备下一帧 */\n    serial.rx_len = 0;\n    serial.complete = false;\n\n    return len;\n}\n\nvoid Serial_Send(const uint8_t *data, uint16_t len)\n{\n    HAL_UART_Transmit(huart_bt, (uint8_t *)data, len, 100);\n}\n\nvoid Serial_SendString(const char *str)\n{\n    Serial_Send((const uint8_t *)str, my_strlen(str));\n}\n\n/* ==========================================================**\n *                      中断回调\n * **========================================================== */\n\n/* USART2 中断处理（需要在 stm32f1xx_it.c 中调用） */\nvoid Serial_IRQHandler(void)\n{\n    /* 检查 IDLE 中断 */\n    if (__HAL_UART_GET_FLAG(huart_bt, UART_FLAG_IDLE)) {\n        /* 清除 IDLE 标志 */\n        __HAL_UART_CLEAR_IDLEFLAG(huart_bt);\n\n        /* 暂停 DMA，计算本次接收长度 */\n        HAL_UART_DMAStop(huart_bt);\n\n        /* 计算接收字节数：总缓冲 - DMA 剩余计数 */\n        serial.rx_len = BT_RX_BUF_SIZE - __HAL_DMA_GET_COUNTER(huart_bt->hdmarx);\n\n        /* 标记接收完成 */\n        if (serial.rx_len > 0) {\n            serial.complete = true;\n        }\n\n        /* 重新启动 DMA 接收 */\n        HAL_UART_Receive_DMA(huart_bt, serial.buf, BT_RX_BUF_SIZE);\n    }\n\n    /* 处理其他 UART 中断 */\n    HAL_UART_IRQHandler(huart_bt);\n}\n\n/* HAL DMA 半满/全满回调（空实现，不处理，靠 IDLE 中断） */\nvoid HAL_UART_RxHalfCpltCallback(UART_HandleTypeDef *huart)\n{\n    (void)huart;\n}\n\nvoid HAL_UART_RxCpltCallback(UART_HandleTypeDef *huart)\n{\n    /* DMA 环形模式不会触发全满回调，IDLE 中断统一处理 */\n    (void)huart;\n}\n\n```"
  },
  {
    "id": "3-蓝牙通信-h",
    "title": "蓝牙通信.h",
    "date": "2026-06-03",
    "tags": [
      "STM32",
      "模块",
      "蓝牙通信"
    ],
    "summary": "直接引用，注意串口引脚是否对应，然后通信和打印的串口引脚不能是同一个，得分开，还需要注意蓝牙模块的波特率",
    "content": "直接引用，注意串口引脚是否对应，然后通信和打印的串口引脚不能是同一个，得分开，还需要注意蓝牙模块的**波特率**\n```\n#ifndef __SERIAL_H__\n#define __SERIAL_H__\n\n#include \"main.h\"\n#include <stdint.h>\n#include <stdbool.h>\n\n/* ===========================================================**\n *                      配置\n * **=========================================================** */\n#define BT_UART             USART2\n#define BT_RX_BUF_SIZE      128\n\n/* **=========================================================**\n *                      类型定义\n * **=========================================================** */\ntypedef struct {\n    uint8_t  buf[BT_RX_BUF_SIZE];   /* DMA 环形接收缓冲区 */\n    volatile uint16_t rx_len;        /* 本次帧接收长度 */\n    volatile bool     complete;      /* 帧接收完成标志（IDLE 中断置位） */\n} Serial_Handle;\n\n/* **=========================================================**\n *                      函数声明\n * **=========================================================== */\n\n/* 初始化蓝牙串口（启动 DMA + IDLE 接收） */\nvoid Serial_Init(void);\n\n/* 检查是否收到完整一帧数据 */\nbool Serial_HasData(void);\n\n/* 读取接收到的帧数据，返回实际长度 */\nuint16_t Serial_ReadData(uint8_t *buf, uint16_t max_len);\n\n/* 发送数据 */\nvoid Serial_Send(const uint8_t *data, uint16_t len);\nvoid Serial_SendString(const char *str);\n\n#endif\n```"
  },
  {
    "id": "4-蓝牙模块bt37",
    "title": "蓝牙模块bt37",
    "date": "2026-06-03",
    "tags": [
      "STM32",
      "模块",
      "蓝牙通信"
    ],
    "summary": "1.该模块只能作为从机接收端，不能用来进行发送信息。 2.相关指令",
    "content": "1.该模块只能作为从机接收端，不能用来进行发送信息。\n2.相关指令\n![BT37蓝牙指令表.jpg](assets/BT37蓝牙指令表.jpg)"
  },
  {
    "id": "按键电路",
    "title": "按键电路",
    "date": "2026-06-03",
    "tags": [
      "硬件",
      "基础电路",
      "按键电路"
    ],
    "summary": "1.加电容是防止硬件消抖，软件也需要在程序上进行一定的消抖。 2.rc的取值决定了响应的时间，原理是rc充放电原理，选值可以采用典型值，如200k，100nf或者其他，据情况来定。",
    "content": "1.加电容是防止硬件消抖，软件也需要在程序上进行一定的消抖。\n2.rc的取值决定了响应的时间，原理是rc充放电原理，选值可以采用典型值，如200k，100nf或者其他，据情况来定。\n\n\n\n![按键电路图片.png](assets/按键电路图片.png)\n"
  },
  {
    "id": "1-freertos",
    "title": "freertos",
    "date": "2026-05-30",
    "tags": [
      "STM32",
      "Freertos",
      "freertos配置",
      "RTOS"
    ],
    "summary": "需要开源的源码（自备已有），然后导入keil项目你需要做的，之后还需要做一些相关文件的改动，一些定义的修改，这里需要看视频讲解和配合ai查找错误，视频建议就先看尚硅谷的无人机里面的freerrtos的视频。",
    "content": "需要开源的源码（自备已有），然后导入keil项目你需要做的，之后还需要做一些相关文件的改动，一些定义的修改，这里需要看视频讲解和配合ai查找错误，视频建议就先看尚硅谷的无人机里面的freerrtos的视频。"
  },
  {
    "id": "2-freertos-h",
    "title": "freertos.h",
    "date": "2026-05-30",
    "tags": [
      "STM32",
      "Freertos",
      "freertos配置",
      "RTOS"
    ],
    "summary": "直接引用 需要注意的是这里引用了串口打印功能来做示例，具体怎么写还得根据你所做的项目来更改，不过这个是可以验证你的项目文件是否移植好了，freertos是否能用了。",
    "content": "直接引用\n需要注意的是这里引用了串口打印功能来做示例，具体怎么写还得根据你所做的项目来更改，不过这个是可以验证你的项目文件是否移植好了，freertos是否能用了。\n\n```\n#ifndef APPLICATION_H\n#define APPLICATION_H\n\n#include \"FreeRTOS.h\"\n#include \"task.h\"\n#include \"Usart_pritf.h\"\n\nvoid application_start(void);\n\n#endif\n\n```"
  },
  {
    "id": "3-freertos-c",
    "title": "freertos.c",
    "date": "2026-05-30",
    "tags": [
      "STM32",
      "Freertos",
      "freertos配置",
      "RTOS"
    ],
    "summary": "直接引用 需要注意的是这里引用了串口打印功能来做示例，具体怎么写还得根据你所做的项目来更改，不过这个是可以验证你的项目文件是否移植好了，freertos是否能用了。",
    "content": "直接引用\n需要注意的是这里引用了串口打印功能来做示例，具体怎么写还得根据你所做的项目来更改，不过这个是可以验证你的项目文件是否移植好了，freertos是否能用了。\n```\n#include \"APPLICATION.h\"\n\n  \n\nvoid task1(void *args);\n\nvoid task2(void *args);\n\n#define TASK1_STACK_SIZE 128\n\n#define TASK2_STACK_SIZE 128\n\n#define TASK1_PRIORITY 1     //优先级，越小优先级越小  不推荐写0   范围0-4\n\n#define TASK2_PRIORITY 1\n\nTaskHandle_t task1_handle;\n\nTaskHandle_t task2_handle;\n\n  \n\nvoid application_start(void)\n\n{\n\n //创建任务\n\n xTaskCreate(task1, \"task1\", TASK1_STACK_SIZE, NULL, TASK1_PRIORITY, &task1_handle);\n\n xTaskCreate(task2, \"task2\", TASK2_STACK_SIZE, NULL, TASK2_PRIORITY, &task2_handle);\n\n  \n  \n\n //启动调度器\n\n vTaskStartScheduler();\n\n  \n  \n\n}\n\n  \n\nvoid task1(void *args)\n\n{\n\n  while (1)\n\n  {\n\n    printf(\"Task 1 is running\\n\");\n\n    vTaskDelay(pdMS_TO_TICKS(1000));\n\n  }\n\n}\n\n  \n  \n\nvoid task2(void *args)\n\n{\n\nwhile (1)\n\n{\n\n  printf(\"Task 2 is running\\n\");\n\n  vTaskDelay(pdMS_TO_TICKS(1000));\n\n}\n\n  \n\n}\n```"
  },
  {
    "id": "stm32-mpu5060-c",
    "title": "stm32 mpu5060.c",
    "date": "2026-05-30",
    "tags": [
      "STM32",
      "模块",
      "mpu5060",
      "MPU"
    ],
    "summary": "直接引用，不要加滤波文件，已经很平滑了 注意所定义的i2c引脚，需要做一定的修改根据你的项目所定义的i2c，其他没问题.",
    "content": "直接引用，不要加滤波文件，已经很平滑了\n注意所定义的**i2c引脚**，需要做一定的修改根据你的项目所定义的i2c，其他没问题.\n\n```\n\n#include \"MPU6050.h\"\n\n#include \"i2c.h\"\n\n  \n\n//保存偏移量的值（使用int32_t，避免计算时溢出）\n\nint32_t acc_x_offset=0;\n\nint32_t acc_y_offset=0;\n\nint32_t acc_z_offset=0;\n\nint32_t gyro_x_offset=0;\n\nint32_t gyro_y_offset=0;\n\nint32_t gyro_z_offset=0;\n\n  \n  \n  \n\nvoid MPU6050_Write_Reg(uint8_t reg,uint8_t data)\n\n{\n\n    HAL_StatusTypeDef status;\n\n    uint32_t timeout = 10;  // 10ms超时\n\n    status = HAL_I2C_Mem_Write(&hi2c1,MPU6050_ADDR_WRITE,reg,I2C_MEMADD_SIZE_8BIT,&data,1,timeout);\n\n    if (status != HAL_OK) {\n\n        // I2C错误，不卡死\n\n    }\n\n}\n\n  \n\n// 检测MPU6050是否在线\n\nuint8_t MPU6050_Is_Ready(void)\n\n{\n\n    return HAL_I2C_IsDeviceReady(&hi2c1, MPU6050_ADDR_WRITE, 3, 10) == HAL_OK;\n\n}\n\n  \n\n// I2C总线恢复（当总线挂起时调用）\n\nvoid MPU6050_Bus_Reset(void)\n\n{\n\n    // 拉低SDA 9次，产生STOP信号释放总线\n\n    for (int i = 0; i < 9; i++) {\n\n        HAL_GPIO_WritePin(GPIOB, GPIO_PIN_8, GPIO_PIN_RESET);\n\n        HAL_Delay(1);\n\n        HAL_GPIO_WritePin(GPIOB, GPIO_PIN_8, GPIO_PIN_SET);\n\n        HAL_Delay(1);\n\n    }\n\n}\n\n  \n\nvoid MPU6050_Read_Reg(uint8_t reg,uint8_t*data)\n\n{\n\n    HAL_StatusTypeDef status;\n\n    uint32_t timeout = 10;  // 10ms超时\n\n    status = HAL_I2C_Mem_Read(&hi2c1,MPU6050_ADDR_WRITE,reg,I2C_MEMADD_SIZE_8BIT,data,1,timeout);\n\n    if (status != HAL_OK) {\n\n        // I2C错误时，尝试总线恢复一次\n\n        MPU6050_Bus_Reset();\n\n        HAL_Delay(5);\n\n        *data = 0;  // 默认值\n\n    }\n\n}\n\n  \n\nvoid MPU6050_calculate_offset(void) // 零偏校准\n\n{\n\n    // 等待停放平稳 前后的值差小于50，连续100次，最多等待3秒\n\n    Accel_srtuct current_accel = {0};\n\n    Accel_srtuct last_accel = {0};\n\n    uint8_t count = 0;\n\n    uint16_t timeout = 0;\n\n    MPU6050_Get_Acc(&last_accel);\n\n    while (count < 100 && timeout < 1200)  // 1200次 × 5ms = 6秒超时\n\n    {\n\n        MPU6050_Get_Acc(&current_accel);\n\n        if (abs(current_accel.accel_x - last_accel.accel_x) < 100 &&\n\n            abs(current_accel.accel_y - last_accel.accel_y) < 100 &&\n\n            abs(current_accel.accel_z - last_accel.accel_z) < 100)\n\n        {\n\n            count++;\n\n        }\n\n        else\n\n        {\n\n            count = 0;\n\n        }\n\n        last_accel = current_accel;\n\n        HAL_Delay(5);\n\n        timeout++;\n\n    }\n\n    // 飞机平稳（或超时）\n\n    // 直接读取原始寄存器值，避免累减偏移量\n\n    uint8_t high = 0, low = 0;\n\n    for (int i = 0; i < 100; i++)  // 100次采样（已足够）\n\n    {\n\n        // 加速度原始值（强制类型转换避免符号问题）\n\n        MPU6050_Read_Reg(0X3B, &high);\n\n        MPU6050_Read_Reg(0X3C, &low);\n\n        acc_x_offset += (int16_t)((high << 8) | low);\n\n  \n\n        MPU6050_Read_Reg(0X3D, &high);\n\n        MPU6050_Read_Reg(0X3E, &low);\n\n        acc_y_offset += (int16_t)((high << 8) | low);\n\n  \n\n        MPU6050_Read_Reg(0X3F, &high);\n\n        MPU6050_Read_Reg(0X40, &low);\n\n        acc_z_offset += (int16_t)((high << 8) | low);\n\n  \n\n        // 陀螺仪原始值\n\n        MPU6050_Read_Reg(0X43, &high);\n\n        MPU6050_Read_Reg(0X44, &low);\n\n        gyro_x_offset += (int16_t)((high << 8) | low);\n\n  \n\n        MPU6050_Read_Reg(0X45, &high);\n\n        MPU6050_Read_Reg(0X46, &low);\n\n        gyro_y_offset += (int16_t)((high << 8) | low);\n\n  \n\n        MPU6050_Read_Reg(0X47, &high);\n\n        MPU6050_Read_Reg(0X48, &low);\n\n        gyro_z_offset += (int16_t)((high << 8) | low);\n\n  \n\n        HAL_Delay(5);\n\n    }\n\n    acc_x_offset /= 100;  // 100次平均\n\n    acc_y_offset /= 100;\n\n    acc_z_offset /= 100;\n\n    gyro_x_offset /= 100;\n\n    gyro_y_offset /= 100;\n\n    gyro_z_offset /= 100;\n\n    // 调试：打印校准后的偏移量\n\n    printf(\"OFFSET:%d,%d,%d\\n\", acc_x_offset, acc_y_offset, acc_z_offset);\n\n}\n\n  \n\nvoid MPU6050_Init()\n\n{\n\n   //1.重启电源\n\n   MPU6050_Write_Reg(0X6B,0X80);\n\n   //重置完成之后，0x6b后寄存器的值为0x40，表示为低功耗\n\n   uint8_t data = 0;\n\n   uint32_t timeout = 1000; // 超时计数\n\n   while ((data != 0x40) && (timeout--))\n\n   {\n\n       MPU6050_Read_Reg(0X6B, &data);\n\n       HAL_Delay(1); // 加小延时，避免疯狂读取\n\n   }\n\n   if (timeout == 0)\n\n   {\n\n       // 初始化失败处理（可以打印错误或返回）\n\n       return;\n\n   }\n\n  \n\n   //唤醒进行正常工作\n\n   MPU6050_Write_Reg(0X6B,0X00);\n\n   //选择合适的量程，在合适的范围内越小越好\n\n   //填写角速度\n\n   MPU6050_Write_Reg(0X1B,3<<3);\n\n   //填写加速度\n\n   MPU6050_Write_Reg(0X1C,0x00);\n\n   //中断使能\n\n   MPU6050_Write_Reg(0X38,0X00);\n\n   //用户配置\n\n   MPU6050_Write_Reg(0X6A,0X00);\n\n   //采样频率 必须大于后续使用频率，香农定理\n\n   //计算关系，这里是500hz\n\n   MPU6050_Write_Reg(0X19,0X01);\n\n   //低通滤波\n\n   MPU6050_Write_Reg(0X1A,1);\n\n   //配置时钟\n\n   MPU6050_Write_Reg(0X6B,0X01);\n\n   //使能加速度\n\n   MPU6050_Write_Reg(0X6C,0X00);\n\n   //进行零偏校准\n\n   MPU6050_calculate_offset();\n\n  \n\n}\n\n  \n\nvoid MPU6050_Get_Gyro(Gyro_srtuct*gyro)//角速度\n\n{\n\n    uint8_t high=0;\n\n    uint8_t low=0;\n\n    //x\n\n    MPU6050_Read_Reg(0X43,&high);\n\n    MPU6050_Read_Reg(0X44,&low);\n\n    gyro->gyro_x=(int16_t)((high <<8) | low) - gyro_x_offset;\n\n    //y\n\n    MPU6050_Read_Reg(0X45,&high);\n\n    MPU6050_Read_Reg(0X46,&low);\n\n    gyro->gyro_y=(int16_t)((high <<8) | low) - gyro_y_offset;\n\n    //z\n\n    MPU6050_Read_Reg(0X47,&high);\n\n    MPU6050_Read_Reg(0X48,&low);\n\n    gyro->gyro_z=(int16_t)((high <<8) | low) - gyro_z_offset;\n\n  \n\n}\n\n  \n\nvoid MPU6050_Get_Acc(Accel_srtuct*accel)//加速度\n\n{\n\n    uint8_t high=0;\n\n    uint8_t low=0;\n\n    MPU6050_Read_Reg(0X3B,&high);\n\n    MPU6050_Read_Reg(0X3C,&low);\n\n    accel->accel_x=(int16_t)((high <<8) | low) - acc_x_offset;\n\n    //y\n\n    MPU6050_Read_Reg(0X3D,&high);\n\n    MPU6050_Read_Reg(0X3E,&low);\n\n    accel->accel_y=(int16_t)((high <<8) | low) - acc_y_offset;\n\n    //z 不减去偏移，保留重力加速度\n\n    MPU6050_Read_Reg(0X3F,&high);\n\n    MPU6050_Read_Reg(0X40,&low);\n\n    accel->accel_z=(int16_t)((high <<8) | low);\n\n}\n\n  \n\nvoid MPU6050_Get_Data(Gyro_Accel_Struct*data)//总数据\n\n{\n\n    MPU6050_Get_Gyro(&data->gyro);\n\n    MPU6050_Get_Acc(&data->accel);\n\n  \n\n}\n\n  \n\n/* ==========================================================**\n\n *               姿态解算（供 main.c 调用）\n\n * **========================================================== */\n\n  \n\n#include <math.h>\n\n  \n\n/* 姿态状态 */\n\nstatic float   angle[3]    = {0, 0, 0};   /* Roll, Pitch, Yaw */\n\nstatic float   gyro_dps[3] = {0, 0, 0};   /* 角速度 °/s */\n\nstatic uint8_t init_count = 0;\n\nstatic uint32_t last_tick = 0;\n\n  \n\n/* 陀螺仪灵敏度 (±2000°/s, 对应 MPU6050_Init 中 3<<3) */\n\n#define GYRO_SCALE_2000  16.4f\n\n#define ACCEL_SCALE_2G   16384.0f\n\n  \n\nstatic inline float accel_roll_f(float ay, float az) {\n\n    return atan2f(ay, az) * 57.29578f;\n\n}\n\n  \n\nstatic inline float accel_pitch_f(float ax, float ay, float az) {\n\n    return atan2f(-ax, sqrtf(ay * ay + az * az)) * 57.29578f;\n\n}\n\n  \n\nstatic inline float clamp_f(float val, float lo, float hi) {\n\n    if (val < lo) return lo;\n\n    if (val > hi) return hi;\n\n    return val;\n\n}\n\n  \n\nbool MPU6050_IsOK(void)\n\n{\n\n    return MPU6050_Is_Ready() == 1;\n\n}\n\n  \n\nvoid MPU6050_Calibrate(void)\n\n{\n\n    MPU6050_calculate_offset();\n\n    last_tick = HAL_GetTick();\n\n}\n\n  \n\nvoid MPU6050_Calculate_Position(void)\n\n{\n\n    Gyro_Accel_Struct data;\n\n    MPU6050_Get_Data(&data);\n\n  \n\n    /* 预热 */\n\n    if (init_count < 20) {\n\n        float ax = data.accel.accel_x / ACCEL_SCALE_2G;\n\n        float ay = data.accel.accel_y / ACCEL_SCALE_2G;\n\n        float az = data.accel.accel_z / ACCEL_SCALE_2G;\n\n        angle[0] = accel_roll_f(ay, az);\n\n        angle[1] = accel_pitch_f(ax, ay, az);\n\n        angle[2] = 0;\n\n        last_tick = HAL_GetTick();\n\n        init_count++;\n\n        return;\n\n    }\n\n  \n\n    /* 时间间隔 */\n\n    uint32_t now = HAL_GetTick();\n\n    float dt = (now - last_tick) / 1000.0f;\n\n    if (dt < 0.001f) dt = 0.001f;\n\n    if (dt > 0.020f) dt = 0.020f;\n\n    last_tick = now;\n\n  \n\n    /* 原始数据直接转物理量，不做任何二次滤波 */\n\n    float ax = data.accel.accel_x / ACCEL_SCALE_2G;\n\n    float ay = data.accel.accel_y / ACCEL_SCALE_2G;\n\n    float az = data.accel.accel_z / ACCEL_SCALE_2G;\n\n    float gx = data.gyro.gyro_x / GYRO_SCALE_2000;\n\n    float gy = data.gyro.gyro_y / GYRO_SCALE_2000;\n\n    float gz = data.gyro.gyro_z / GYRO_SCALE_2000;\n\n  \n\n    gyro_dps[0] = gy;  /* Roll */\n\n    gyro_dps[1] = gx;  /* Pitch */\n\n    gyro_dps[2] = gz;  /* Yaw */\n\n  \n\n    /* 加速度计角度 */\n\n    float accel_r = accel_roll_f(ay, az);\n\n    float accel_p = accel_pitch_f(ax, ay, az);\n\n  \n\n    /* 互补滤波：陀螺积分 + 加速度计修正 */\n\n    angle[0] = (angle[0] + gy * dt) * 0.85f + accel_r * 0.15f;\n\n    angle[1] = (angle[1] + gx * dt) * 0.85f + accel_p * 0.15f;\n\n  \n\n    /* Yaw */\n\n    if (fabsf(gz) > 0.5f) angle[2] += gz * dt;\n\n  \n\n    /* 限幅 */\n\n    angle[0] = clamp_f(angle[0], -90.0f, 90.0f);\n\n    angle[1] = clamp_f(angle[1], -90.0f, 90.0f);\n\n    if (angle[2] > 180.0f)  angle[2] -= 360.0f;\n\n    if (angle[2] < -180.0f) angle[2] += 360.0f;\n\n}\n\n  \n\nvoid MPU6050_GetAngle(float *roll, float *pitch, float *yaw)\n\n{\n\n    if (roll)  *roll  = angle[0];\n\n    if (pitch) *pitch = angle[1];\n\n    if (yaw)   *yaw   = angle[2];\n\n}\n\n  \n\nvoid MPU6050_GetGyro(float *gyro_x, float *gyro_y, float *gyro_z)\n\n{\n\n    if (gyro_x) *gyro_x = gyro_dps[0];\n\n    if (gyro_y) *gyro_y = gyro_dps[1];\n\n    if (gyro_z) *gyro_z = gyro_dps[2];\n\n}\n```\n\n\n\n"
  },
  {
    "id": "stm32-mpu5060-h",
    "title": "stm32 mpu5060.h",
    "date": "2026-05-30",
    "tags": [
      "STM32",
      "模块",
      "mpu5060",
      "MPU"
    ],
    "summary": "直接引用，不要加滤波文件，已经很平滑了 注意所定义的i2c引脚，需要做一定的修改根据你的项目所定义的i2c，其他没问题",
    "content": "直接引用，不要加滤波文件，已经很平滑了\n注意所定义的**i2c引脚**，需要做一定的修改根据你的项目所定义的i2c，其他没问题\n```\n\n#ifndef __MPU6050__\n\n#define __MPU6050__\n\n  \n\n#include \"main.h\"\n\n#include <stdint.h>\n\n#include <stdbool.h>\n\n  \n\n#define MPU6050_ADDR       0x68\n\n#define MPU6050_ADDR_WRITE 0xD0\n\n#define MPU6050_ADDR_READ  0xD1\n\n  \n\n/* 结构体定义 */\n\ntypedef struct {\n\n    int16_t accel_x;\n\n    int16_t accel_y;\n\n    int16_t accel_z;\n\n} Accel_srtuct;\n\n  \n\ntypedef struct {\n\n    int16_t gyro_x;\n\n    int16_t gyro_y;\n\n    int16_t gyro_z;\n\n} Gyro_srtuct;\n\n  \n\ntypedef struct {\n\n    Accel_srtuct accel;\n\n    Gyro_srtuct  gyro;\n\n} Gyro_Accel_Struct;\n\n  \n\ntypedef struct {\n\n    float yaw;\n\n    float pitch;\n\n    float roll;\n\n} Euller_struct;\n\n  \n\n/* 基础接口 */\n\nvoid    MPU6050_Init(void);\n\nuint8_t MPU6050_Is_Ready(void);\n\nvoid    MPU6050_Bus_Reset(void);\n\n  \n\n/* 数据读取 */\n\nvoid MPU6050_Get_Gyro(Gyro_srtuct *gyro);\n\nvoid MPU6050_Get_Acc(Accel_srtuct *accel);\n\nvoid MPU6050_Get_Data(Gyro_Accel_Struct *data);\n\n  \n\n/* 姿态解算接口（main.c 调用） */\n\nbool  MPU6050_IsOK(void);\n\nvoid  MPU6050_Calibrate(void);\n\nvoid  MPU6050_Calculate_Position(void);\n\nvoid  MPU6050_GetAngle(float *roll, float *pitch, float *yaw);\n\nvoid  MPU6050_GetGyro(float *gyro_x, float *gyro_y, float *gyro_z);\n\n  \n\n#endif\n\n\n```"
  },
  {
    "id": "1-stm32-串口打印",
    "title": "stm32 串口打印",
    "date": "2026-05-30",
    "tags": [
      "STM32",
      "模块",
      "串口打印",
      "串口"
    ],
    "summary": "这里对进行进一步的完善，方便文件架构整齐和代码管理，将串口打印封装成文件，方便止于main主文件里调用，还能在其他文件里引用，方便调试处理。",
    "content": "这里对`stm32_usart`进行进一步的完善，方便文件架构整齐和代码管理，将串口打印封装成文件，方便止于main主文件里调用，还能在其他文件里引用，方便调试处理。\n"
  },
  {
    "id": "2-stm32-串口打印-c",
    "title": "stm32 串口打印.c",
    "date": "2026-05-30",
    "tags": [
      "STM32",
      "模块",
      "串口打印",
      "串口"
    ],
    "summary": "直接引用 这里需注意你所用的串口引脚，可能是uart1，可能是uart2，需要进行对应的修改",
    "content": "直接引用\n这里需注意你所用的**串口引脚**，可能是uart1，可能是uart2，需要进行对应的修改\n\n```\n#include \"Usart_pritf.h\"\n\n#include \"usart.h\"\n\n  \n\n/* printf重定向到UART2 */\n\nint fputc(int ch, FILE *f)\n\n{\n\n    HAL_UART_Transmit(&huart2, (uint8_t *)&ch, 1, 10);\n\n    return ch;\n\n}\n\n  \n\n/* VOFA+ FireWater 协议发送（CSV文本格式，最稳定）\n\n * 格式: \"ch1,ch2,ch3\\n\"\n\n */\n\nvoid VOFA_Send(float ch1, float ch2, float ch3)\n\n{\n\n    printf(\"%.2f,%.2f,%.2f\\n\", ch1, ch2, ch3);\n\n}\n\n\n\n\n```"
  },
  {
    "id": "3-stm32-串口打印-h",
    "title": "stm32 串口打印.h",
    "date": "2026-05-30",
    "tags": [
      "STM32",
      "模块",
      "串口打印",
      "串口"
    ],
    "summary": "直接引用 这里需注意你所用的串口引脚，可能是uart1，可能是uart2，需要进行对应的修改",
    "content": "直接引用\n这里需注意你所用的**串口引脚**，可能是uart1，可能是uart2，需要进行对应的修改\n\n\n```\n\n#ifndef USART_PRITF_H\n\n#define USART_PRITF_H\n\n  \n\n#include <stdio.h>\n\n  \n\n/* printf重定向到UART2 */\n\nint fputc(int ch, FILE *f);\n\n  \n\n/* VOFA+ FireWater 协议发送（CSV文本格式） */\n\nvoid VOFA_Send(float ch1, float ch2, float ch3);\n\n  \n\n#endif\n\n\n\n```"
  },
  {
    "id": "filter-c",
    "title": "filter.c",
    "date": "2026-05-29",
    "tags": [
      "ESP32",
      "模块",
      "filter",
      "滤波"
    ],
    "summary": "",
    "content": "```\n#include \"filter.h\"\n\n#include <stdlib.h>\n\n  \n  \n\n#define ALPHA 0.03      /* 一阶低通滤波系数（减小使滤波更强） */\n\n#define LIMIT_THRESHOLD 200  /* 限幅阈值（超过此差值认为是尖峰） */\n\n  \n\n/* 限幅滤波：记录上次原始值 */\n\nstatic int16_t last_raw[3] = {0, 0, 0};\n\n  \n\n/**\n\n * @brief 限幅滤波（去除突变尖峰）\n\n * @param axis 轴号 0=X, 1=Y, 2=Z\n\n * @param newValue 新值\n\n * @return 滤波后的值\n\n */\n\nint16_t Filter_Limit(int16_t axis, int16_t newValue)\n\n{\n\n    if (abs(newValue - last_raw[axis]) > LIMIT_THRESHOLD) {\n\n        newValue = last_raw[axis];  // 突变过大，用上次值\n\n    }\n\n    last_raw[axis] = newValue;\n\n    return newValue;\n\n}\n\n  \n\n/**\n\n * @brief 一阶低通滤波\n\n * @param newValue 需要滤波的值\n\n * @param preFilteredValue 上一次滤波过的值\n\n * @return 滤波后的值\n\n */\n\nint16_t Filter_LowPass(int16_t newValue, int16_t preFilteredValue)\n\n{\n\n    return (int16_t)(ALPHA * newValue + (1 - ALPHA) * preFilteredValue);\n\n}\n\n  \n\n/* 卡尔曼滤波参数 */\n\nKalmanFilter_Struct kfs[3] = {\n\n    {0.02, 0, 0, 0, 0.001, 0.543},\n\n    {0.02, 0, 0, 0, 0.001, 0.543},\n\n    {0.02, 0, 0, 0, 0.001, 0.543}\n\n};\n\n  \n\n/**\n\n * @brief 卡尔曼滤波\n\n * @param kf 卡尔曼滤波器结构体指针\n\n * @param input 输入值\n\n * @return 滤波后的值\n\n */\n\ndouble Filter_KalmanFilter(KalmanFilter_Struct *kf, double input)\n\n{\n\n    kf->Now_P = kf->LastP + kf->Q;\n\n    kf->Kg = kf->Now_P / (kf->Now_P + kf->R);\n\n    kf->out = kf->out + kf->Kg * (input - kf->out);\n\n    kf->LastP = (1 - kf->Kg) * kf->Now_P;\n\n    return kf->out;\n\n  \n  \n\n}\n```"
  },
  {
    "id": "filter-h",
    "title": "filter.h",
    "date": "2026-05-29",
    "tags": [
      "ESP32",
      "模块",
      "filter",
      "滤波"
    ],
    "summary": "",
    "content": "```\n#ifndef __FILTER_H\n\n#define __FILTER_H\n\n  \n\n#include \"stdint.h\"\n\n  \n\n/* 卡尔曼滤波器结构体 */\n\ntypedef struct\n\n{\n\n    float LastP;   // 上一时刻的状态方差\n\n    float Now_P;    // 当前时刻的状态方差\n\n    float out;      // 滤波器的输出值\n\n    float Kg;       // 卡尔曼增益\n\n    float Q;        // 过程噪声的方差\n\n    float R;        // 测量噪声的方差\n\n} KalmanFilter_Struct;\n\n  \n\nextern KalmanFilter_Struct kfs[3];\n\n  \n\nint16_t Filter_Limit(int16_t axis, int16_t newValue);\n\nint16_t Filter_LowPass(int16_t newValue, int16_t preFilteredValue);\n\ndouble Filter_KalmanFilter(KalmanFilter_Struct *kf, double input);\n\n  \n\n#endif\n```"
  },
  {
    "id": "mpu6000-c",
    "title": "mpu6000.c",
    "date": "2026-05-29",
    "tags": [
      "ESP32",
      "模块",
      "mpu6000",
      "MPU"
    ],
    "summary": "",
    "content": "\n\n\n```\n#include \"MPU6000_6050.h\"\n\n#include <math.h>\n\n#include <SPI.h>\n\n  \n\n// 寄存器地址\n\n#define REG_PWR_MGMT     0x6B\n\n#define REG_WHO_AM_I     0x75\n\n#define REG_ACCEL_XOUT   0x3B\n\n#define REG_GYRO_XOUT_H  0x43\n\n#define REG_CONFIG       0x1A\n\n#define REG_GYRO_CONFIG  0x1B\n\n#define REG_ACCEL_CONFIG 0x1C\n\n#define REG_SMPLRT_DIV   0x19\n\n  \n\n// 物理量转换系数\n\n#define ACCEL_SCALE    16384.0f  // ±2g\n\n#define GYRO_SCALE     131.0f    // ±250°/s\n\n  \n\n// 滤波参数\n\n#define DT             0.004f   // 4ms采样周期 (250Hz)\n\n#define INIT_DELAY     50\n\n#define STILL_THRESH   2.0f     // 静止阈值 (°/s)\n\n#define STILL_COUNT    20\n\n#define COMPLEMENTARY_FILTER 0.98f\n\n#define YAW_DEADZONE   0.15f    // Yaw死区 (°/s)，低于此值视为静止\n\n#define YAW_DECAY      0.9995f  // Yaw静止衰减系数 (越小衰减越快)\n\n  \n\nstatic bool mpu_ok = false;\n\n  \n\n// 原始数据\n\nstatic int16_t accel[3], gyro[3];\n\n  \n\n// 校准偏移\n\nstatic float gyro_offset[3] = {0, 0, 0};\n\n  \n\n// 姿态数据\n\nstatic float angle[3] = {0, 0, 0};\n\nstatic float gyro_dps[3] = {0, 0, 0};  // 角速度 (°/s)\n\n  \n\n// 中间变量\n\nstatic uint8_t still_count = 0;\n\nstatic uint8_t init_count = 0;\n\nstatic unsigned long last_update_time = 0;\n\n  \n\n// SPI实例\n\nstatic SPIClass spi = SPIClass(VSPI);\n\n  \n\n// ===========** SPI操作 **===========\n\n  \n\nstatic void mpu_spi_write(uint8_t reg, uint8_t data)\n\n{\n\n    digitalWrite(MPU_SPI_CS, LOW);\n\n    spi.transfer(reg & 0x7F);\n\n    spi.transfer(data);\n\n    digitalWrite(MPU_SPI_CS, HIGH);\n\n}\n\n  \n\nstatic uint8_t mpu_spi_read(uint8_t reg)\n\n{\n\n    digitalWrite(MPU_SPI_CS, LOW);\n\n    spi.transfer(reg | 0x80);\n\n    uint8_t data = spi.transfer(0x00);\n\n    digitalWrite(MPU_SPI_CS, HIGH);\n\n    return data;\n\n}\n\n  \n\nstatic void mpu_spi_read_bytes(uint8_t reg, uint8_t* buf, uint8_t len)\n\n{\n\n    digitalWrite(MPU_SPI_CS, LOW);\n\n    spi.transfer(reg | 0x80);\n\n    for (uint8_t i = 0; i < len; i++) {\n\n        buf[i] = spi.transfer(0x00);\n\n    }\n\n    digitalWrite(MPU_SPI_CS, HIGH);\n\n}\n\n  \n\n// ===========** 辅助函数 **=========**\n\n  \n\nstatic inline float accel_roll(float ay, float az)\n\n{\n\n    return atan2f(ay, az) * 57.29578f;\n\n}\n\n  \n\nstatic inline float accel_pitch(float ax, float ay, float az)\n\n{\n\n    return atan2f(-ax, sqrtf(ay * ay + az * az)) * 57.29578f;\n\n}\n\n  \n\n// **=========** 公共接口 **===========\n\n  \n\nbool MPU6000_IsOK(void)\n\n{\n\n    return mpu_ok;\n\n}\n\n  \n\nvoid MPU6000_Init(void)\n\n{\n\n    Serial.println(\"[MPU6000] Initializing SPI...\");\n\n    pinMode(MPU_SPI_CS, OUTPUT);\n\n    digitalWrite(MPU_SPI_CS, HIGH);\n\n    spi.begin(MPU_SPI_SCK, MPU_SPI_MISO, MPU_SPI_MOSI, MPU_SPI_CS);\n\n    spi.setFrequency(MPU_SPI_SPEED);\n\n    // 复位\n\n    mpu_spi_write(REG_PWR_MGMT, 0x80);\n\n    delay(100);\n\n    mpu_spi_write(REG_PWR_MGMT, 0x00);\n\n    delay(100);\n\n    // 检查ID\n\n    uint8_t whoami = mpu_spi_read(REG_WHO_AM_I);\n\n    Serial.printf(\"[MPU6000] WHO_AM_I: 0x%02X \", whoami);\n\n    if (whoami ** 0x68 || whoami ** 0x70 || whoami ** 0x71 || whoami ** 0x73 || whoami == 0x75) {\n\n        Serial.println(\"OK!\");\n\n        mpu_ok = true;\n\n    } else {\n\n        Serial.println(\"ERROR!\");\n\n        mpu_ok = false;\n\n        return;\n\n    }\n\n    // 配置参数\n\n    mpu_spi_write(REG_SMPLRT_DIV, 0x04);    // 采样率 = 1kHz / (4+1) = 200Hz\n\n    mpu_spi_write(REG_CONFIG, 0x03);         // 陀螺仪滤波44Hz\n\n    mpu_spi_write(REG_GYRO_CONFIG, 0x00);    // ±250°/s\n\n    mpu_spi_write(REG_ACCEL_CONFIG, 0x00);   // ±2g\n\n    last_update_time = micros();\n\n    Serial.println(\"[MPU6000] Ready!\");\n\n}\n\n  \n\nvoid MPU6000_Calibrate(void)\n\n{\n\n    if (!mpu_ok) return;\n\n  \n\n    Serial.println(\"[MPU6000] Calibrating... Keep still for 3s!\");\n\n  \n\n    // 丢弃前100个不稳定样本\n\n    for (int i = 0; i < 100; i++) {\n\n        uint8_t buf[14];\n\n        mpu_spi_read_bytes(REG_ACCEL_XOUT, buf, 14);\n\n        delay(5);\n\n    }\n\n  \n\n    // 采集500个稳定样本\n\n    float sum[3] = {0, 0, 0};\n\n    float sum_sq[3] = {0, 0, 0};\n\n    int valid = 0;\n\n  \n\n    for (int i = 0; i < 500; i++) {\n\n        uint8_t buf[14];\n\n        mpu_spi_read_bytes(REG_ACCEL_XOUT, buf, 14);\n\n  \n\n        gyro[0] = (buf[8] << 8) | buf[9];\n\n        gyro[1] = (buf[10] << 8) | buf[11];\n\n        gyro[2] = (buf[12] << 8) | buf[13];\n\n  \n\n        float g[3] = {\n\n            gyro[0] / GYRO_SCALE,\n\n            gyro[1] / GYRO_SCALE,\n\n            gyro[2] / GYRO_SCALE\n\n        };\n\n  \n\n        // 异常值剔除：超过±10°/s的样本跳过\n\n        if (fabs(g[0]) < 10.0f && fabs(g[1]) < 10.0f && fabs(g[2]) < 10.0f) {\n\n            for (int j = 0; j < 3; j++) {\n\n                sum[j] += g[j];\n\n                sum_sq[j] += g[j] * g[j];\n\n            }\n\n            valid++;\n\n        }\n\n        delay(2);\n\n    }\n\n  \n\n    if (valid > 50) {\n\n        for (int j = 0; j < 3; j++) {\n\n            gyro_offset[j] = sum[j] / valid;\n\n            float variance = sum_sq[j] / valid - gyro_offset[j] * gyro_offset[j];\n\n            Serial.printf(\"[MPU6000] Gyro[%d] Offset=%.4f °/s  StdDev=%.4f\\n\",\n\n                          j, gyro_offset[j], sqrtf(fabs(variance)));\n\n        }\n\n        Serial.printf(\"[MPU6000] Calibration done! (%d/%d samples)\\n\", valid, 500);\n\n    } else {\n\n        Serial.println(\"[MPU6000] Calibration failed! Too many outliers.\");\n\n    }\n\n}\n\n  \n\nvoid MPU6000_GetAngle(float* roll, float* pitch, float* yaw)\n\n{\n\n    if (roll) *roll = angle[0];\n\n    if (pitch) *pitch = angle[1];\n\n    if (yaw) *yaw = angle[2];\n\n}\n\n  \n\nvoid MPU6000_GetGyro(float* gyro_x, float* gyro_y, float* gyro_z)\n\n{\n\n    if (gyro_x) *gyro_x = gyro_dps[0];\n\n    if (gyro_y) *gyro_y = gyro_dps[1];\n\n    if (gyro_z) *gyro_z = gyro_dps[2];\n\n}\n\n  \n\nvoid MPU6000_Calculate_Position(void)\n\n{\n\n    if (!mpu_ok) {\n\n        // VOFA_Send(0, 0, 0, 0);\n\n        return;\n\n    }\n\n  \n\n    uint8_t buf[14];\n\n    mpu_spi_read_bytes(REG_ACCEL_XOUT, buf, 14);\n\n  \n\n    accel[0] = (buf[0] << 8) | buf[1];\n\n    accel[1] = (buf[2] << 8) | buf[3];\n\n    accel[2] = (buf[4] << 8) | buf[5];\n\n    gyro[0]  = (buf[8] << 8) | buf[9];\n\n    gyro[1]  = (buf[10] << 8) | buf[11];\n\n    gyro[2]  = (buf[12] << 8) | buf[13];\n\n  \n\n    // 预热\n\n    if (init_count < 10) {\n\n        init_count++;\n\n        return;\n\n    }\n\n  \n\n    // 计算时间间隔\n\n    unsigned long now = micros();\n\n    float dt = (now - last_update_time) / 1000000.0f;\n\n    dt = constrain(dt, 0.001f, 0.02f);  // 限制在1ms-20ms\n\n    last_update_time = now;\n\n  \n\n    // 转换为物理量\n\n    float ax = accel[0] / ACCEL_SCALE;\n\n    float ay = accel[1] / ACCEL_SCALE;\n\n    float az = accel[2] / ACCEL_SCALE;\n\n    float gx = gyro[0] / GYRO_SCALE - gyro_offset[0];\n\n    float gy = gyro[1] / GYRO_SCALE - gyro_offset[1];\n\n    float gz = gyro[2] / GYRO_SCALE - gyro_offset[2];\n\n  \n\n    // 存储角速度（修正：roll用gy，pitch用gx）\n\n    gyro_dps[0] = gy;       // Roll角速度\n\n    gyro_dps[1] = gx;       // Pitch角速度\n\n    gyro_dps[2] = gz;       // Yaw角速度\n\n  \n\n    // 静止检测（用于互补滤波）\n\n    if (fabs(gx) < STILL_THRESH && fabs(gy) < STILL_THRESH && fabs(gz) < STILL_THRESH) {\n\n        if (still_count < STILL_COUNT) still_count++;\n\n    } else {\n\n        still_count = 0;\n\n    }\n\n  \n\n    // 加速度计计算角度（修正：roll用ax，pitch用ay）\n\n    float accel_r = accel_pitch(ax, ay, az);   // Roll用pitch公式\n\n    float accel_p = accel_roll(ay, az);         // Pitch用roll公式\n\n  \n\n    // 互补滤波融合（修正：roll用gy积分，pitch用gx积分）\n\n    float alpha = COMPLEMENTARY_FILTER;\n\n  \n\n    if (still_count >= STILL_COUNT) {\n\n        // 静止时信任加速度计\n\n        angle[0] = angle[0] * 0.95f + accel_r * 0.05f;  // Roll\n\n        angle[1] = angle[1] * 0.95f + accel_p * 0.05f; // Pitch\n\n    } else {\n\n        // 运动时陀螺仪为主，加速度计修正（修正：roll用gy积分，pitch用gx积分）\n\n        angle[0] = angle[0] + gy * dt;      // Roll = gy\n\n        angle[1] = angle[1] + gx * dt;      // Pitch = gx\n\n        angle[0] = angle[0] * alpha + accel_r * (1.0f - alpha);\n\n        angle[1] = angle[1] * alpha + accel_p * (1.0f - alpha);\n\n    }\n\n  \n\n    // 偏航角（Yaw）- 带死区和静止衰减，抑制漂移\n\n    if (fabs(gz) < YAW_DEADZONE) {\n\n        // 角速度很小，视为静止，不积分，缓慢衰减回零\n\n        angle[2] *= YAW_DECAY;\n\n    } else {\n\n        angle[2] += gz * dt;\n\n    }\n\n  \n\n    // 限幅\n\n    angle[0] = constrain(angle[0], -90, 90);\n\n    angle[1] = constrain(angle[1], -90, 90);\n\n    if (angle[2] > 180) angle[2] -= 360;\n\n    if (angle[2] < -180) angle[2] += 360;\n\n  \n\n    // VOFA_Send(angle[0], angle[1], angle[2], 0);  // 注释掉，避免干扰调试输出\n\n}\n\n```\n\n\n"
  },
  {
    "id": "mpu6000-h",
    "title": "mpu6000.h",
    "date": "2026-05-29",
    "tags": [
      "ESP32",
      "模块",
      "mpu6000",
      "MPU"
    ],
    "summary": "",
    "content": "\n```\n\n#ifndef MPU6000_6050_H\n\n#define MPU6000_6050_H\n\n  \n\n#include <Arduino.h>\n\n#include <SPI.h>\n\n  \n\n// ===========================================================**\n\n//                      SPI引脚定义\n\n// **===========================================================\n\n// 默认使用VSPI: SCK=18, MISO=19, MOSI=23, CS=5\n\n// 可根据实际接线修改\n\n#define MPU_SPI_SCK   18\n\n#define MPU_SPI_MISO  19\n\n#define MPU_SPI_MOSI  23\n\n#define MPU_SPI_CS    5\n\n  \n\n// SPI时钟频率 (MPU6000支持最高20MHz)\n\n#define MPU_SPI_SPEED 1000000  // 1MHz，稳定优先\n\n  \n\nvoid MPU6000_Init(void);\n\nvoid MPU6000_Calculate_Position(void);\n\nvoid MPU6000_Calibrate(void);\n\n  \n\n// 获取姿态角度（Roll, Pitch, Yaw）\n\nvoid MPU6000_GetAngle(float* roll, float* pitch, float* yaw);\n\n  \n\n// 获取角速度（°/s）\n\nvoid MPU6000_GetGyro(float* gyro_x, float* gyro_y, float* gyro_z);\n\n  \n\n// 检查MPU6000是否正常\n\nbool MPU6000_IsOK(void);\n\n  \n\n#endif\n\n\n\n```\n"
  },
  {
    "id": "mpu6000",
    "title": "mpu6000",
    "date": "2026-05-29",
    "tags": [
      "ESP32",
      "模块",
      "mpu6000",
      "MPU"
    ],
    "summary": "代码还需要完善，yaw角还有一点点偏移问题，后续可以改进提高，此代码可以与进行联动使输出的数据更加稳定。",
    "content": "代码还需要完善，yaw角还有一点点偏移问题，后续可以改进提高，此代码可以与`filter.h``filter.c`进行联动使输出的数据更加稳定。"
  },
  {
    "id": "stm32-i2c",
    "title": "stm32 i2c",
    "date": "2026-05-27",
    "tags": [
      "STM32",
      "基础",
      "I2C"
    ],
    "summary": "1.先按，进行基础配置，然后进行下一步i2c基础设置。 2.配置i2c，其中需要值得注意的是i2c clock speed和speed mode，需要根据实际所需要的通信的i2c从设备的条件来进行配置。 3.去写对应的i2c读取函数，得根据你所通信的设备来去对应写。",
    "content": "1.先按`stm32_通用配置`，进行基础配置，然后进行下一步i2c基础设置。\n2.配置i2c，其中需要值得注意的是**i2c clock speed**和**speed mode**，需要根据实际所需要的通信的i2c从设备的条件来进行配置。\n![i2c配置2.png](assets/i2c配置2.png)\n![i2c配置1.png](assets/i2c配置1.png)\n\n3.去写对应的i2c读取函数，得根据你所通信的设备来去对应写。\n"
  },
  {
    "id": "stm32-mpu5060",
    "title": "stm32 mpu5060",
    "date": "2026-05-27",
    "tags": [
      "STM32",
      "模块",
      "mpu5060",
      "MPU"
    ],
    "summary": "1.先进行，，，进行相应的初始化，方便下一步函数读写 2.进行读写，输出",
    "content": "1.先进行`stm32_通用配置`，`stm32_i2c`，`stm32_usart`，进行相应的初始化，方便下一步函数读写\n2.进行读写，输出\n"
  },
  {
    "id": "stm32-滤波-c",
    "title": "stm32 滤波.c",
    "date": "2026-05-27",
    "tags": [
      "STM32",
      "模块",
      "滤波"
    ],
    "summary": "直接引用",
    "content": "直接引用\n```\n#include \"filter.h\"\n#include \"main.h\"\n\n#define ALPHA 0.03      /* 一阶低通滤波系数（减小使滤波更强） */\n#define LIMIT_THRESHOLD 200  /* 限幅阈值（超过此差值认为是尖峰） */\n\n/* 限幅滤波：记录上次原始值 */\nstatic int16_t last_raw[3] = {0, 0, 0};\n\n/**\n * @brief 限幅滤波（去除突变尖峰）\n * @param axis 轴号 0=X, 1=Y, 2=Z\n * @param newValue 新值\n * @return 滤波后的值\n */\nint16_t Filter_Limit(int16_t axis, int16_t newValue)\n{\n    if (abs(newValue - last_raw[axis]) > LIMIT_THRESHOLD) {\n        newValue = last_raw[axis];  // 突变过大，用上次值\n    }\n    last_raw[axis] = newValue;\n    return newValue;\n}\n\n/**\n * @brief 一阶低通滤波\n * @param newValue 需要滤波的值\n * @param preFilteredValue 上一次滤波过的值\n * @return 滤波后的值\n */\nint16_t Filter_LowPass(int16_t newValue, int16_t preFilteredValue)\n{\n    return (int16_t)(ALPHA * newValue + (1 - ALPHA) * preFilteredValue);\n}\n\n/* 卡尔曼滤波参数 */\nKalmanFilter_Struct kfs[3] = {\n    {0.02, 0, 0, 0, 0.001, 0.543},\n    {0.02, 0, 0, 0, 0.001, 0.543},\n    {0.02, 0, 0, 0, 0.001, 0.543}\n};\n\n/**\n * @brief 卡尔曼滤波\n * @param kf 卡尔曼滤波器结构体指针\n * @param input 输入值\n * @return 滤波后的值\n */\ndouble Filter_KalmanFilter(KalmanFilter_Struct *kf, double input)\n{\n    kf->Now_P = kf->LastP + kf->Q;\n    kf->Kg = kf->Now_P / (kf->Now_P + kf->R);\n    kf->out = kf->out + kf->Kg * (input - kf->out);\n    kf->LastP = (1 - kf->Kg) * kf->Now_P;\n    return kf->out;\n\n\n}\n\n\n```"
  },
  {
    "id": "stm32-滤波-h",
    "title": "stm32 滤波.h",
    "date": "2026-05-27",
    "tags": [
      "STM32",
      "模块",
      "滤波"
    ],
    "summary": "直接引用",
    "content": "直接引用\n```\n#ifndef __FILTER_H\n#define __FILTER_H\n\n#include \"stdint.h\"\n\n/* 卡尔曼滤波器结构体 */\ntypedef struct\n{\n    float LastP;   // 上一时刻的状态方差\n    float Now_P;    // 当前时刻的状态方差\n    float out;      // 滤波器的输出值\n    float Kg;       // 卡尔曼增益\n    float Q;        // 过程噪声的方差\n    float R;        // 测量噪声的方差\n} KalmanFilter_Struct;\n\nextern KalmanFilter_Struct kfs[3];\n\nint16_t Filter_Limit(int16_t axis, int16_t newValue);\nint16_t Filter_LowPass(int16_t newValue, int16_t preFilteredValue);\ndouble Filter_KalmanFilter(KalmanFilter_Struct *kf, double input);\n\n#endif\n```"
  },
  {
    "id": "stm32-烧录问题",
    "title": "stm32 烧录问题",
    "date": "2026-05-25",
    "tags": [
      "STM32",
      "基础",
      "烧录"
    ],
    "summary": "1.出现无法烧录问题，先检查接线是否有问题，然后如果还是出现烧录问题如图 2.一边一直按复位键，一边点烧录 3.如果还是不行，进行下面的操作，将flash进行擦除，然后再烧录代码就行。",
    "content": "1.出现无法烧录问题，先检查接线是否有问题，然后如果还是出现烧录问题如图\n![烧录问题.png](assets/烧录问题.png)2.一边一直按复位键，一边点烧录\n3.如果还是不行，进行下面的操作，将flash进行擦除，然后再烧录代码就行。\n![烧录解除.png](assets/烧录解除.png)"
  },
  {
    "id": "stm32-gpio",
    "title": "stm32 gpio",
    "date": "2026-05-24",
    "tags": [
      "STM32",
      "基础",
      "GPIO"
    ],
    "summary": "1.先按，进行基础配置，然后进行下一步gpio基础设置 2.直接点击芯片上的引脚进行配置，选择输出模式或者输入模式 3.调用函数：HALGPIOWritePin，HALGPIOTogglePin，HALGPIOReadPin，写电平，翻转电平，读电平，具体函数怎么写，可以直接查看定义。",
    "content": "1.先按`stm32_通用配置`，进行基础配置，然后进行下一步gpio基础设置\n2.直接点击芯片上的引脚进行配置，选择输出模式或者输入模式\n![gpio模式配置.png](assets/gpio模式配置.png)\n3.调用函数：HAL_GPIO_WritePin，HAL_GPIO_TogglePin，HAL_GPIO_ReadPin，写电平，翻转电平，读电平，具体函数怎么写，可以直接查看定义。\n"
  },
  {
    "id": "stm32-tim",
    "title": "一.定时器tim_pwm波形输出",
    "date": "2026-05-24",
    "tags": [
      "STM32",
      "基础",
      "定时器"
    ],
    "summary": "1.先按，进行基础配置，然后进行下一步tim基础设置。 2.先选择你所需要的定时器TIM，然后选择指定的通道数，选择模式。在counter setting 列表中，需要配置psc和counter period。在 Parameter Settings 页配置预分频系数为 71，计数周期自动加载值为 ...",
    "content": "# 一.定时器tim_pwm波形输出\n1.先按`stm32_通用配置`，进行基础配置，然后进行下一步tim基础设置。\n2.先选择你所需要的定时器TIM，然后选择指定的通道数，选择模式。在counter setting 列表中，需要配置psc和counter period。在 Parameter Settings 页配置预分频系数为 71，计数周期(自动加载值)为 499，定时器溢出频率，即PWM的周期，就是 72MHz/(71+1)/(499+1) = 2kHz\n![tim_pwm波形输出.png](assets/tim_pwm波形输出.png)\n3.函数调用：HAL_TIM_PWM_Start进行初始化， HAL_TIM_SET_COMPARE进行设置占空比，**注意占空比的值不能超过设置的值，**这样就能输出脉冲波形。\n\n"
  },
  {
    "id": "stm32-通用配置",
    "title": "stm32 通用配置",
    "date": "2026-05-24",
    "tags": [
      "STM32",
      "基础",
      "通用配置"
    ],
    "summary": "1.stm32cubmx通用所有项目都必须进行配置选项 2.下载烧录配置  3. 晶振配置：一般使用外部晶振（频率更高效果更好） 4.时钟配置：板子上晶振原件显示的频率是多少（不同开发板不同芯片的晶振频率对应也不一样），一般直接启动到最大频率,2个例子。 5.选择编译环境，生成代码，转到vscode...",
    "content": "1.stm32cubmx通用所有项目都必须进行配置选项\n2.下载烧录配置\n![下载烧录.png](assets/下载烧录.png) 3. 晶振配置：一般使用外部晶振（频率更高效果更好）\n![高速时钟.png](assets/高速时钟.png)4.时钟配置：板子上晶振原件显示的频率是多少（不同开发板不同芯片的晶振频率对应也不一样），一般直接启动到最大频率,2个例子。\n![时钟树1.png](assets/时钟树1.png)\n5.选择编译环境，生成代码，转到vscode\n![编译环境1.png](assets/编译环境1.png)![编译环境2.png](assets/编译环境2.png)\n6.附件：stm32f103c8t6引脚定义图\n![STM32F103C8T6引脚定义图.png](assets/STM32F103C8T6引脚定义图.png)\n"
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
