// 博客文章数据（由 sync.js 自动生成）
const POSTS = [
  {
    "id": "代码",
    "title": "无刷电机驱动代码",
    "date": "2026-09-15",
    "tags": [
      "项目集",
      "项目经历",
      "无刷电机驱动bldc"
    ],
    "summary": "好，我把这套系统从头到尾完整讲一遍，分七个部分。 --- 一句话：用 MCU 制造\"旋转磁场\"，拽着无刷电机转子转起来。 无刷电机（BLDC）定子上有三相绕组（U/V/W，星型连接），转子是永磁体。转子自己不会动，要让电机转，必须让定子绕组轮流通电，产生一个跟着转子走的旋转磁场，磁力拽着永磁转子转。...",
    "content": "# 无刷电机驱动代码\n\n好，我把这套系统从头到尾完整讲一遍，分七个部分。\n\n---\n\n# 一、这套系统到底在干什么\n\n一句话：**用 MCU 制造\"旋转磁场\"，拽着无刷电机转子转起来。**\n\n无刷电机（BLDC）定子上有三相绕组（U/V/W，星型连接），转子是永磁体。转子自己不会动，要让电机转，必须让定子绕组轮流通电，产生一个**跟着转子走的旋转磁场**，磁力拽着永磁转子转。\n\n难点：电机和外部没有换向器（不像有刷电机靠碳刷机械换向），所以**换相由 MCU 软件完成**——这就是这套代码的核心。\n\n---\n\n# 二、为什么是\"六步换相\"\n\n三相绕组只有 3 个线头，怎么制造旋转磁场？答案是**每个时刻只让两相通电，第三相悬空**：\n\n```\n每步电流路径：\n某相上桥导通 → 该相绕组 → 星型中点 → 另一相绕组 → 另一相下桥 → GND\n```\n\n| 步 | 电流方向 | 合成磁场方向 |\n|----|---------|------------|\n| 0 | U→V（U上桥进、V下桥出）| 指向某个方向 |\n| 1 | U→W | 磁场旋转 60° |\n| 2 | V→W | 再转 60° |\n| 3 | V→U | ... |\n| 4 | W→U | ... |\n| 5 | W→V | ... |\n\n6 步磁场正好转 360° 电角度，然后回到第 0 步循环。磁场旋转 → 永磁转子跟着转。**这就是六步换相。**\n\n`bldc.c` 里的换相表就是这 6 种状态：\n\n```c\nstatic const StepConfig step_table[6] = {\n  {1, 2},   /* 步0: CH1 PWM(上U), CH2N ON(下V) */\n  {1, 3},   /* 步1: CH1 PWM, CH3N ON */\n  {2, 3},   /* 步2: CH2 PWM, CH3N ON */\n  {2, 1},   /* 步3: CH2 PWM, CH1N ON */\n  {3, 1},   /* 步4: CH3 PWM, CH1N ON */\n  {3, 2},   /* 步5: CH3 PWM, CH2N ON */\n};\n```\n\n每项 = `{哪个相的上桥做 PWM（电流进的相）, 哪个相的下桥常通（电流出的相）}`，第三相（剩下的）悬空。\n\n---\n\n# 三、硬件拓扑：三相半桥\n\n```\n      母线电压 VM（如 12/24V）\n        │\n     ┌──┴──┐ ┌──┴──┐ ┌──┴──┐\n  上桥│U+   │ │V+   │ │W+   │    ← 栅极由 PA8/PA9/PA10 (CH1/2/3) 驱动\n     └──┬──┘ └──┬──┘ └──┬──┘\n        │U      │V      │W     ← 输出接电机三相绕组\n     ┌──┴──┐ ┌──┴──┐ ┌──┴──┐\n  下桥│U-   │ │V-   │ │W-   │    ← 栅极由 PB13/14/15 (CH1N/2N/3N) 驱动\n     └──┬──┘ └──┬──┘ └──┬──┘\n        └───────┴───────┴──GND\n```\n\n- **上桥** = TIM1 的主输出 `CHx`（PA8/9/10）\n- **下桥** = TIM1 的互补输出 `CHxN`（PB13/14/15）\n- 上下桥**互补**——本来就不该同时导通（会直通短路），所以 MCU 端配了**死区时间**做最后保险\n\n---\n\n# 四、硬件初始化配置\n\n## 1. 时钟：HSI → 64MHz（`main.c` 的 `SystemClock_Config`）\n\n因为你的板子没焊外部晶振（HSE），改用内部 HSI：\n\n```\nHSI 16MHz → ÷1(PLLM) → ×16(PLLN)=256MHz → ÷4(PLLR) = 64MHz SYSCLK\n```\n\nHSI 是芯片内部的 RC 振荡器，精度约 ±1%，带电机绰绰有余。\n\n## 2. 时基：SysTick（`HAL_Init`）\n\n`HAL_Init()` 配置 SysTick 每 1ms 中断一次 → 产生 `HAL_GetTick()` 全局毫秒计数。`Motor_Run` 靠它计时换相。\n\n## 3. TIM1 定时器（`tim.c` 的 `MX_TIM1_Init`）\n\n关键参数：\n\n```c\nhtim1.Init.Prescaler = 0;      // 预分频 1 → 计数时钟 = 64MHz\nhtim1.Init.Period    = 1599;   // 自动重装值 ARR\n```\n\n**为什么 PWM 是 40kHz？**\n```\nPWM频率 = 时钟 / (ARR+1) = 64MHz / 1600 = 40kHz\n```\n40kHz 听不到（超声频段），电机运行安静。\n\n**占空比怎么算？** TIM1 工作在 **PWM 模式 1**：\n```\nCNT(0~1599) 与 CCR 比较：CNT < CCR → 输出高电平\n占空比 = CCR / (ARR+1) = CCR / 1600\n```\n`motor_duty = 400` → 400/1600 = **25% 占空比**。\n\n三个通道 CH1/2/3 都配成 PWM 互补输出 + `DeadTime = 30`（≈0.47µs，防上下桥同开直通）。\n\n---\n\n# 五、核心代码逐段精讲\n\n## `Motor_Init()` —— 备好\"武器\"，先不开火\n\n```c\nvoid Motor_Init(void)\n{\n  __HAL_TIM_ENABLE(&htim1);     // ① CEN=1，计数器开始跑\n  __HAL_TIM_MOE_ENABLE(&htim1); // ② MOE=1，允许输出（高级定时器总开关）\n  // ③ 关闭全部 6 路输出，CCR 清零\n  TIM1->CCER &= ~(...CC1E|CC1NE|CC2E|CC2NE|CC3E|CC3NE);\n  TIM1->CCR1 = TIM1->CCR2 = TIM1->CCR3 = 0;\n}\n```\n\n① **`CEN`**（CR1 的 bit0）= 定时器计数器的开关。不开它，计数器不走，没有 PWM。\n② **`MOE`**（BDTR 的 bit15）= 高级定时器(TIM1/8)特有的\"输出总闸\"。MOE=0 时所有输出被强制关断。这是 STM32 防意外的机制。\n③ 先全关，等换相时再按需打开。\n\n## 寄存器速记（理解后面代码的关键）\n\n**`TIM1->CCER`** = 6 路输出的\"使能开关\"，一位管一路：\n\n| 位 | bit0 | bit2 | bit4 | bit6 | bit8 | bit10 |\n|----|------|------|------|------|------|-------|\n| 含义 | CC1E | CC1NE | CC2E | CC2NE | CC3E | CC3NE |\n| 控制 | 上U | 下U | 上V | 下V | 上W | 下W |\n\n**`TIM1->CCR1/2/3`** = 每相的占空比比较值（0~1600）。\n\n## `Motor_Step()` —— 每步的\"重排开关\"（全篇核心）\n\n```c\nstatic void Motor_Step(uint8_t step)\n{\n  if (step > 5) return;\n  const StepConfig *cfg = &step_table[step];\n\n  /* ① 先全关：清 CCER 全部 6 个使能位，避免上一步残留导致直通 */\n  TIM1->CCER &= ~(CC1E|CC1NE|CC2E|CC2NE|CC3E|CC3NE);\n\n  /* ② 三相 CCR 归零 */\n  TIM1->CCR1 = TIM1->CCR2 = TIM1->CCR3 = 0;\n\n  /* ③ PWM 相（电流进的相）：CCR=duty，只开 CCxE（上桥斩波）*/\n  case 1: TIM1->CCR1 = motor_duty; TIM1->CCER |= CC1E; break; ...\n  /* ④ 常通相（电流出的相）：CCR=0，CCxE+CCxNE 一起开 */\n  case 2: TIM1->CCER |= (CC2E | CC2NE); break; ...\n}\n```\n\n**第 ③ 步**：PWM 相设好占空比（如 CCR1=400 = 25%），只打开它的主输出 `CC1E`。于是 PA8 上 40kHz 方波斩波 → U 相上桥\"间歇导通\"，控制电流大小。\n\n**第 ④ 步**：常通相不 PWM，只要\"下桥一直通\"。做法是把它的 `CC2E|CC2NE` 都打开，但 **CCR2=0**：\n```\nCCR2=0 → 计数 CNT(0~1599) 永远 >= 0 → 比较结果恒为\"低\"\n  → 主输出 CC2E = 恒低（上桥 V 关断）✓\n  → 互补 CC2NE = 恒高（下桥 V 常通）✓\n```\n\n**为什么 CCxE 和 CCxNE 要一起开？** 这是我们实测发现的关键：这颗芯片的互补输出 `CCxN` **只有在 `CCxE`（主输出）也同时使能时才会输出**，只开 `CCxNE` 它不工作（之前的 0V 就是这原因）。\n\n**为什么 CCR=0 不会让上下桥直通？** CCR=0 → 主输出恒低（上桥关）、互补恒高（下桥开）——恰好一开一关，安全。\n\n## `Motor_SetDuty()` —— 调速\n\n改占空比其实随时可以：`motor_duty = 400`（25%）。占空比越大，绕组平均电压越高，转矩越大。0~1599 限幅。\n\n## `Motor_Run()` —— 换相节拍器\n\n```c\nwhile (1) {\n  if (HAL_GetTick() - last_tick >= step_delay) {  // 到点没?\n    last_tick = HAL_GetTick();\n    Motor_Step(step);            // 执行当前步\n    step = (step+1) % 6;         // 步数+1，到6回0\n    run_count++;\n    if (run_count == 50)  step_delay = 50;   // 起步50步后加速\n    if (run_count == 100) step_delay = 20;   // 再50步后更快\n  }\n}\n```\n\n- `step_delay` = 每两步的间隔（起步 100ms → 50ms → 20ms），**这是加速曲线**\n- `HAL_GetTick()` 是毫秒时间戳（注意用差值判断，防溢出）\n\n**转速怎么算？** 6 步 = 360° 电角度 = 1 个电周期：\n```\n起步：电周期 = 6×100ms = 600ms → 1.67圈/秒 → ~100 RPM（1对极）\n稳态：电周期 = 6×20ms = 120ms  → 8.33圈/秒 → ~500 RPM（1对极）\n```\n实际机械转速 ÷ 极对数 p。\n\n---\n\n# 六、整体运行流程（时间线）\n\n```\nmain()\n │\n ├─ HAL_Init()          → SysTick 1ms 时基\n ├─ SystemClock_Config() → HSI → 64MHz\n ├─ MX_GPIO_Init()       → GPIO 时钟\n ├─ MX_TIM1_Init()       → TIM1 PWM 配置 + 引脚复用\n ├─ Motor_Init()         → 计数器跑起来、MOE 开、6路全关（安全待机）\n ├─ HAL_Delay(100)       → 稳定 100ms\n ├─ Motor_SetDuty(400)   → 占空比 25%\n └─ Motor_Run()          → 无限换相循环（永不返回）\n      └─ 每 100ms/50ms/20ms 执行 Motor_Step(0~5 循环)\n```\n\n每一步实际打到 MOSFET 上的信号：\n\n| step | U相上桥 | U相下桥 | V相上桥 | V相下桥 | W相上桥 | W相下桥 |\n|------|--------|--------|--------|--------|--------|--------|\n| 0 | **PWM** | 关 | 关 | **通** | 关 | 关 |\n| 1 | **PWM** | 关 | 关 | 关 | 关 | **通** |\n| 2 | 关 | 关 | **PWM** | 关 | 关 | **通** |\n| 3 | 关 | **通** | **PWM** | 关 | 关 | 关 |\n| 4 | 关 | **通** | 关 | 关 | **PWM** | 关 |\n| 5 | 关 | 关 | 关 | **通** | **PWM** | 关 |\n\n每步都是\"1 个上桥 PWM + 1 个下桥常通 + 4 路关断\"，旋转磁场就这样形成。\n\n---\n\n# 七、两个关键设计决策（为什么踩那么多坑）\n\n**1. 为什么直接操作寄存器、不用 HAL 的 Start/Stop？**\n- HAL 每次 `Stop` 都会顺手禁用 `MOE` 并停掉计数器——而换相只是重排输出，定时器必须一直跑\n- HAL 的 Start 有\"状态机\"（READY/BUSY），状态不对就**静默返回失败**，你根本不知道（下桥全 0 就是它害的）\n- 换相本质是\"原子地重排一组位\"，直接写 `CCER`/`CCR` 最快最可靠\n\n**2. 为什么系统时钟用 HSI？** 板子没焊外部晶振，HSE 起振超时 → 程序卡死在 `Error_Handler`。HSI 内部自带，改了配置就能跑。\n\n---\n\n# 八、这套代码的局限（下一步方向）\n\n当前是**开环**驱动：\n- 不知道转子实际位置，靠固定时序硬换相\n- 空载/轻载没问题；**重载或急加速可能\"失步\"**（转子跟不上磁场，表现为抖动/堵转/发热）\n- 无位置检测（没有霍尔传感器，也不采反电动势）\n\n真正的 BLDC 商用方案是**无感闭环**：电机转起来后，通过检测\"悬空相的反电动势过零点\"推算转子位置，再精确同步换相——效率和稳定性高得多，代码也复杂一个量级。需要的话，等你开环跑通了，我可以带你往这个方向升级。\n\n---\n\n想深入哪一块？比如：寄存器级的手算推导、死区时间的意义、或者下一步加反电动势检测的思路？"
  },
  {
    "id": "原理",
    "title": "无刷电机驱动原理",
    "date": "2026-09-15",
    "tags": [
      "项目集",
      "项目经历",
      "无刷电机驱动bldc"
    ],
    "summary": "底层原理极其简单，却很难造出精品！无刷直流电机的工作原理哔哩哔哩bilibili",
    "content": "# 无刷电机驱动原理\n\n[底层原理极其简单，却很难造出精品！无刷直流电机的工作原理_哔哩哔哩_bilibili](https://www.bilibili.com/video/BV1dc41137Gx/?spm_id_from=333.337.search-card.all.click&vd_source=c971f89446e968f7fa6510b7d31590d6)\n\n"
  },
  {
    "id": "实物",
    "title": "实物测试波形",
    "date": "2026-09-15",
    "tags": [
      "项目集",
      "项目经历",
      "无刷电机驱动bldc"
    ],
    "summary": "<video src=\"assets/电机驱动视频.mp4\" controls preload=\"metadata\"></video>",
    "content": "# 实物测试波形\n\n# 1.芯片w相上桥输出\n\n![芯片v相上桥输出.jpg](assets/芯片v相上桥输出.jpg)\n\n# 2.芯片v相上桥输出\n\n![芯片w相上桥输出.jpg](assets/芯片w相上桥输出.jpg)\n\n\n# 3.芯片u相上桥输出\n![芯片u相上桥输出.jpg](assets/芯片u相上桥输出.jpg)\n\n\n# 4.芯片u相下桥输出\n\n\n![芯片u相下桥输出.jpg](assets/芯片u相下桥输出.jpg)\n\n\n# 5.芯片v相下桥输出\n\n\n![芯片v相下桥输出.jpg](assets/芯片v相下桥输出.jpg)\n\n\n# 6.芯片w相下桥输出\n\n![芯片w相下桥输出.jpg](assets/芯片w相下桥输出.jpg)\n\n\n# 7.u相eg2132高输入\n \n![u相eg2132高输入.jpg](assets/u相eg2132高输入.jpg)\n\n\n\n# 8.u相eg2132低输入\n![u相eg2132低输入.jpg](assets/u相eg2132低输入.jpg)\n\n# 9.v相eg2132高输入\n![v相eg2132高输入.jpg](assets/v相eg2132高输入.jpg)\n\n# 10 .v相eg2132低输入\n![v相eg2132低输入.jpg](assets/v相eg2132低输入.jpg)\n\n# 11.实物demo\n\n\n![实物焊接.jpg](assets/实物焊接.jpg)\n\n# 12.电机驱动视频\n\n\n<video src=\"assets/电机驱动视频.mp4\" controls preload=\"metadata\"></video>"
  },
  {
    "id": "pcb",
    "title": "PCB 设计",
    "date": "2026-09-15",
    "tags": [
      "项目集",
      "项目经历",
      "无刷电机驱动bldc",
      "硬件电路"
    ],
    "summary": "整个项目电路板子采取4层设计，顶层走主要器件，内层1完整gnd，提供完整地平面回路，内层2走电源线，走大功率线，防止影响信号线的转输，底层放置少量器件进行布局。",
    "content": "# PCB 设计\n\n![pcb1.png](assets/pcb1.png)\n\n\n![pcb2.png](assets/pcb2.png)\n![pcb3.png](assets/pcb3.png)\n\n![pcb4.png](assets/pcb4.png)\n\n整个项目电路板子采取4层设计，顶层走主要器件，内层1完整gnd，提供完整地平面回路，内层2走电源线，走大功率线，防止影响信号线的转输，底层放置少量器件进行布局。"
  },
  {
    "id": "主控",
    "title": "主控电路",
    "date": "2026-09-15",
    "tags": [
      "项目集",
      "项目经历",
      "无刷电机驱动bldc",
      "硬件电路"
    ],
    "summary": "电路： 1.采用 stm32g030c8t6主控芯片进行控制，设计相应的外围电路，来满足芯片控制要求，然后对应所需要的要求进行引脚引出及标注，来进行控制。 2.芯片供电：用电容进行滤波，保证电源干净。 3.复位电路：采取按键复位，防止芯片突然死机，无法正常工作，可以采取按键重新开始工作使用。 4.时...",
    "content": "# 主控电路\n\n电路：\n![主控.png](assets/主控.png)\n\n1.采用 **stm32g030c8t6**主控芯片进行控制，设计相应的外围电路，来满足芯片控制要求，然后对应所需要的要求进行引脚引出及标注，来进行控制。\n2.芯片供电：用电容进行滤波，保证电源干净。\n3.复位电路：采取按键复位，防止芯片突然死机，无法正常工作，可以采取按键重新开始工作使用。\n4.时钟电路：参考芯片手册进行相应的时钟配置，芯片有内部时钟和外部时钟，这里加上外部时钟，可以提供更高的时钟精度，方便后续代码编写。\n5.控制电路：使用定时器一的3个互补通道，也就是6个定时器通道，其中分为3组，两辆一组相互互补，以此来实现六步换相。\n6.测量电路：adc测量使用滑动电阻器进行分压，最后主控通过adc进行采样进行测试，来确定电池的电压变化和容量。\n"
  },
  {
    "id": "检测",
    "title": "检测电路",
    "date": "2026-09-15",
    "tags": [
      "项目集",
      "项目经历",
      "无刷电机驱动bldc",
      "硬件电路"
    ],
    "summary": "电路如图 通过运算放大器将电流进行放大，然后一个rc滤波，最后给单片机adc读取数据，此外加一个三级管进行硬件限流，保护电路。",
    "content": "# 检测电路\n\n![检测.png](assets/检测.png)电路如图\n通过运算放大器将电流进行放大，然后一个rc滤波，最后给单片机adc读取数据，此外加一个三级管进行硬件限流，保护电路。"
  },
  {
    "id": "电源",
    "title": "电源电路",
    "date": "2026-09-15",
    "tags": [
      "项目集",
      "项目经历",
      "无刷电机驱动bldc",
      "硬件电路"
    ],
    "summary": "电路如图： 采用XL1509DCDC降压芯片将外部电池输入24v降到12v，再通过线性ldo芯片LM7805,将12v电压降到5v，最后通过AM1117将5v降到3.3v，给芯片正常使用。",
    "content": "# 电源电路\n\n电路如图：\n![电源.png](assets/电源.png)\n\n\n\n采用**XL1509**DCDC降压芯片将外部电池输入24v降到12v，再通过线性ldo芯片**LM7805**,将12v电压降到5v，最后通过**AM1117**将5v降到3.3v，给芯片正常使用。"
  },
  {
    "id": "驱动",
    "title": "驱动电路",
    "date": "2026-09-15",
    "tags": [
      "项目集",
      "项目经历",
      "无刷电机驱动bldc",
      "硬件电路"
    ],
    "summary": "驱动电路如下 1.先将单片机的输出引脚引出来，接一个100欧，保证输出的波形完整性，然后接一个下拉电阻，防止误触发。 2.霍尔传感器接口，进行接电机的反馈，方便闭环控制 3.mos驱动电路：使用eg2132芯片驱动2个半桥，根据EG2132芯片数据手册V1.0芯片手册进行设计电路。 4.反动势零点检...",
    "content": "# 驱动电路\n\n驱动电路如下\n![驱动.png](assets/驱动.png)\n\n\n1.先将单片机的输出引脚引出来，接一个100欧，保证输出的波形完整性，然后接一个下拉电阻，防止误触发。\n2.霍尔传感器接口，进行接电机的反馈，方便闭环控制\n3.mos驱动电路：使用eg2132芯片驱动2个半桥，根据[EG2132芯片数据手册V1.0](https://atta.szlcsc.com/upload/public/pdf/source/20200107/C480660_1BAA691BD691BEF65957581630E475F6.pdf)芯片手册进行设计电路。\n4.反动势零点检测:电机转动时，会产生电压电势，这个现象就叫反电动势，然后我们可以通过，反电动势来进行测量到电机的位置，以此来实现电机闭环的控制。\n5.三相逆变电路：mos驱动芯片放大的信号，接一个200欧电阻限流，mos并联一个10k欧，进行电压的偏置和泄放。"
  },
  {
    "id": "问题",
    "title": "调试问题记录",
    "date": "2026-09-15",
    "tags": [
      "项目集",
      "项目经历",
      "无刷电机驱动bldc"
    ],
    "summary": "2026/9/4 1.先是写好了开环的六步换相代码，正常烧录后，芯片能正常输出，接上电机，电机维持在一个特定位置，无法扭动，会有阻力。 推测是mos管驱动电路出现问题，无法进行换相 2.测试mos驱动电路，每相单独测试 U相：单片机引脚输出给一高一低，可以正常输出，mos驱动芯片供电在12-14v左...",
    "content": "\n\n# 调试问题记录\n\n2026/9/4\n\n1.先是写好了开环的六步换相代码，正常烧录后，芯片能正常输出，接上电机，电机维持在一个特定位置，无法扭动，会有阻力。\n\n**推测是mos管驱动电路出现问题，无法进行换相**\n\n2.测试mos驱动电路，每相单独测试\nU相：单片机引脚输出给一高一低，可以正常输出，mos驱动芯片供电在12-14v左右，正常符合供电要求，输入给mos芯片也正常，但输出没有电压。\n\n**推测u相的mos驱动芯片有问题**\n\nV相：单片机引脚输出给一高一低，可以正常输出，mos驱动芯片供电在12-14v左右，正常符合供电要求，输入给mos芯片也正常，只有8号引脚有电压在12v左右，另外2个输出引脚没有电压，自举电容是有12-14电压的，跟8号引脚的电压变化是一致的，然后mos芯片对地是和电源地导通的。之后测量三相端uvw对地和对24v的导通进行测试，发现u对地导通。测v相的电压为0\n\n**推测u相下桥mos坏了还有可能v相的mos也有问题**\n\nW相：单片机引脚输出给一高一低，可以正常输出，mos驱动芯片供电在12-14v左右，正常符合供电要求，输入给mos芯片也正常，都有输出，但lo引脚输出只有8v，自举电容12-14的电压。W相电压是8v左右\n\n**推测w相可能是对的，**\n\n\n## 不是\"打开时间不够\"，而是\"自举电容撑不住恒导通\"\n\n上桥 MOS 维持导通，靠的是**自举电容里存的电荷**。而在我的测试里：\n\n- 上桥是 **100% 恒导通**（CCR=1600 > ARR=1599，一直开着）\n- 恒导通期间自举电容**只放电、不充电**（没有下桥导通/续流给它补电）\n- 电荷逐渐被消耗 → 栅压从 12V 慢慢往下掉\n- 栅压掉到 MOS 阈值附近 → 上桥从\"完全打开\"变成\"半导通\"\n- 输出就从 24V 掉到 **8.5V**\n\n**所以 8.5V 不是 W 相坏了，是我的测试方法（恒导通）在自举驱动下必然出现的结果。** 你的判断\"时间有限制导致电压拉不起来\"本质上就是这个道理——自举电容的电荷量有限，维持不了长时间恒导通。\n\n## 这修正了对 W 相的判断\n\n| 相 | 实测 | 真实状态 |\n|----|------|---------|\n| **W 相** | 8.5V | ✅ **很可能是好的**！只是自举在恒导通下耗尽了 |\n| V 相 | 0V | ❌ 真的坏（连部分导通都没有）|\n| U 相 | 下桥对地导通 | ❌ 下桥 MOS 击穿 |\n\n## 真实工作时不会有这个问题\n\n电机正常跑的时候，上桥是 **40kHz PWM 斩波**，每个周期下桥导通/续流都会给自举电容**补一次电**，电荷一直有，上桥能稳定完全导通。**恒导通只是我为了让你用万用表好读数才这么设的，反而暴露了自举的维持极限。**\n\n## 结论\n\n所以现在硬件上**确定的坏件**是：\n1. **U 相下桥 MOS 击穿**（必须换）\n2. **V 相无输出**（EG2132 或上桥 MOS 坏了，要查/换）\n\nW 相暂时看是好的。\n\n另外这也侧面印证了之前的判断——**自举电容容量大概率偏小**（正常 1µF 的话，恒导通维持能力会强不少，不至于掉这么快）。换件时建议顺手把三路自举电容都加大到 **1~2.2µF / 50V**。\n\n\n\n\n2026/9/5\n\n更换v相的mos驱动芯片，烧录单独测试v相的代码，发现v相的电压还是一直为0，而且v相的mos驱动芯片的电压供电正常输入，单片机也是正常输入，但还是没有电压输出，但自举电容的电压蹦到了22v左右跟昨天的不一样了，而且w相竟然也有电压输出，芯片输出了2v，最后还是有8v的电压\n\n\n**推测w相出现漏电现象，三相的mos都有点问题，可能芯片也有点问题**\n\n继续把三相的mos拆了，去测u相与地的导通，发现还是导通的，后面检查板子，发现板子的阻焊层被刮坏了，与u相的焊盘连上了，导致u相对地导通了， 而且发现有一段电源降压出现了问题，24没有转电压到12v，导致供电给mos驱动芯片eg2132的电压是24v，不符合供电要求，而且w相还是会出现电压，但我的芯片没有给电压，在代码里，这需要解决\n\n**方案先把那一段的电源芯片换掉，看看新的电源芯片，能否正常使用，**\n\n2026/9/6\n\n换了芯片后，电源确实变正常了，输出了12v，然后换上mos驱动芯片，w相还是有电压，但在没有换上mos的情况下，w相没有电压的，而且w相出现了电压，当w相出现电压时，mos驱动芯片的供电电压也不对了，从12v变到24v，说明之前换的芯片又坏了，这个w相的电压必须解决。\n\n2026/9/8\n\n继续进行测试，这次没有给芯片写程序，直接烧录空的代码，w相还是莫名奇妙有电压，最后查出是测试方法不对，必须给mos驱动芯片相应的输入电平，不然当悬空的时候，这个驱动输出情况是随机变动的，比如当都是悬空的时候w相有电压，v相是没有的。\n\n**方案：重新将其他芯片换新，mos管换新，重新烧录写好的程序，准备带六步换相程序进行测试，看输出都电压变化**\n\n2026/9/9\n\n接着昨天的继续来，烧录程序后进行测试，拿示波器去测uvw三相的电压，先不要带电机，保证安全，测试结果，u相没有电压，wv相有输出的正弦波形，对u相这一路继续进行排查，先检测芯片是否正常输出，检测结果正常，然后是mos驱动芯片输入也有，就是不输出，也没有自举电压，考虑到这里，对照电路一个一个测试，最后发现自举二极管可能有问题，分别测了三路的自举二极管，发现u相的二极管出现问题，最后更换二极管，更换完之后继续测试u相是否有电压，测试完发现有电压，而且跟v相变化一样。测试结果证明硬件功能基本跑通，可以直接接电机。\n\n\n2026/9/10\n\n\n接上电机，电机不动，会有些许抖动，可以用手旋转电机，推测占空比不够，继续改程序将占控比给大，不出意外，电机正常旋转电机驱动。\n"
  },
  {
    "id": "stm32f103c8t6主控板",
    "title": "2025年全国大学生电子设计大赛E题 —— 简易自行瞄准装置",
    "date": "2026-09-12",
    "tags": [
      "项目集",
      "项目经历",
      "2025年电赛E题简易自行瞄准装置",
      "PCB",
      "硬件设计"
    ],
    "summary": "本作品为 2025 年全国大学生电子设计大赛 E 题「简易自行瞄准装置」的主控板硬件设计。以 STM32F103C8T6 为核心，采用 XL4005 DCDC 与 AMS1117-3.3 LDO 搭建两级电源方案，独立完成原理图设计、PCB 布局、打样焊接与实物调试，并取得赛事奖项。 电源部分：由于...",
    "content": "\n# 2025年全国大学生电子设计大赛E题 —— 简易自行瞄准装置\n\n本作品为 2025 年全国大学生电子设计大赛 E 题「简易自行瞄准装置」的主控板硬件设计。以 **STM32F103C8T6** 为核心，采用 **XL4005** DCDC 与 **AMS1117-3.3** LDO 搭建两级电源方案，独立完成原理图设计、PCB 布局、打样焊接与实物调试，并取得赛事奖项。\n\n## 1. 原理图\n![1.电路图.png](assets/1.电路图.png)\n![4.电路图.png](assets/4.电路图.png)\n![3.电路图.png](assets/3.电路图.png)\n\n\n![2.电路图.png](assets/2.电路图.png)\n![5.电路图.png](assets/5.电路图.png)\n\n**电源部分**：由于使用的是12v的锂电池，考虑到电源管理，所以我采用了**XL4005**dcdc降压芯片以此来实现12v电压到5v的电压转换，通过反馈电阻的计算来实现输出电压的变化。然后通过线性降压芯片**AMS-1117-3.3** ldo芯片将5v降电压降到3.3v给电压供电，使单片机正常工作。\n\n**单片机部分**：使用**stm32f103c8t6**芯片的核心板。\n\n**外设部分**：引出单片机主控的控制引脚去进行控制外设传感器。\n\n\n## 2. PCB 部分\n\n![6.pcb1.png](assets/6.pcb1.png)\n\n![7.pcb2.png](assets/7.pcb2.png)\n\n进行pcb布局，主要需要注意的是dcdc电源的布局，保证电源的稳定输出可以。\n\n## 3. 实物图\n\n\n![8.实物图.jpg](assets/8.实物图.jpg)\n\n\n## 4. 获奖证明\n\n![9.获奖证明.jpg](assets/9.获奖证明.jpg)"
  },
  {
    "id": "项目简历-简要版",
    "title": "无刷电机驱动（BLDC）项目",
    "date": "2026-09-11",
    "tags": [
      "项目集",
      "项目经历",
      "无刷电机驱动bldc"
    ],
    "summary": "独立完成基于 STM32G030C8T6 的三相无刷电机驱动板\"硬件 + 软件\"设计。以高级定时器 TIM1 三组互补通道输出 40kHz PWM，经 EG2132 栅极驱动控制三相 MOSFET 半桥，软件实现六步换相（120° 导通）生成旋转磁场，完成电机开环驱动与调速，最终稳定旋转。 硬件设计...",
    "content": "# 无刷电机驱动（BLDC）项目\n\n## 项目简介\n\n独立完成基于 **STM32G030C8T6** 的三相无刷电机驱动板\"硬件 + 软件\"设计。以高级定时器 **TIM1 三组互补通道输出 40kHz PWM**，经 **EG2132** 栅极驱动控制**三相 MOSFET 半桥**，软件实现**六步换相（120° 导通）**生成旋转磁场，完成电机**开环驱动与调速**，最终稳定旋转。\n\n## 核心工作\n\n**硬件设计**\n\n以 STM32G030C8T6 为主控搭建最小系统，完成供电滤波、按键复位、时钟配置与引脚功能规划；电源采用多级降压方案，由 24V 经 XL1509 降至 12V、LM7805 降至 5V、AMS1117 稳压 3.3V，逐级滤波保证供电质量；栅极驱动选用 EG2132 ×3 自举电路，栅极串 100Ω 电阻保证波形完整、加下拉电阻防误触发，MOS 栅极并 10kΩ 电阻做偏置与电荷泄放；功率级为三相 MOSFET 半桥逆变，输出接电机 U/V/W 绕组；同时预留霍尔接口与反电动势过零检测电路，并用 ADC 分压采样电池电压估算容量。\n\n**软件开发**\n\n软件基于寄存器级编程实现：时钟采用内部 HSI 16MHz 经 PLL ×16 倍频至 64MHz，在板卡无外部晶振的情况下保证系统可运行；利用 TIM1 三组互补通道输出 40kHz PWM（ARR = 1599），并配置约 0.47µs 死区防止上下桥直通；核心的六步换相通过换相表 `step_table[6]` 与直接操作 `CCER`/`CCR` 寄存器，原子重排 6 路输出，实现\"1 路上桥 PWM + 1 路下桥常通 + 4 路关断\"的完整换相时序；调速由 `Motor_SetDuty()` 实时设定 0~1599 占空比，并设计 150 → 80 → 40ms 三级加速曲线实现平稳起步。\n\n**调试排障**\n\n调试阶段通过逐相静态测试与示波器波形验证定位故障：分析并澄清了自举驱动在恒导通测试下\"只放电不充电\"导致的栅压衰减（24V → 8V），确认真实 PWM 工作中不存在该问题；发现互补输出 `CCxN` 必须与主输出 `CCxE` 同时使能才工作，据此修正换相逻辑；硬件上定位并更换了击穿的 MOSFET、损坏的自举二极管、超压烧毁的电源芯片，并排查了 PCB 阻焊层短路；最终针对电机只抖不转的失步现象，判定为转矩不足，将占空比由 37% 逐步提升至 80% 并放缓起步，成功驱动电机稳定旋转。\n\n## 项目成果\n\n三相输出波形正常，电机稳定旋转并可调速，并沉淀了《原理》《代码》《问题》《硬件电路》等完整技术文档。\n"
  },
  {
    "id": "项目简历",
    "title": "无刷电机驱动（BLDC）项目简历",
    "date": "2026-09-11",
    "tags": [
      "项目集",
      "项目经历",
      "无刷电机驱动bldc"
    ],
    "summary": "| 项目 | 内容 | |------|------| | 项目名称 | 三相无刷直流电机（BLDC）开环驱动系统 | | 项目周期 | 2025 — 2026 | | 项目角色 | 硬件设计 + 嵌入式软件开发（独立完成） | | 开发平台 | STM32G030C8T6 + EG2132 栅极驱...",
    "content": "# 无刷电机驱动（BLDC）项目简历\n\n## 一、项目信息\n\n| 项目 | 内容 |\n|------|------|\n| 项目名称 | 三相无刷直流电机（BLDC）开环驱动系统 |\n| 项目周期 | 2025 — 2026 |\n| 项目角色 | 硬件设计 + 嵌入式软件开发（独立完成） |\n| 开发平台 | STM32G030C8T6 + EG2132 栅极驱动 + 三相 MOSFET 逆变 |\n| 关键词 | BLDC、六步换相、互补 PWM、死区控制、自举驱动、EG2132、TIM1 |\n\n---\n\n## 二、项目简介\n\n自研三相无刷直流电机（BLDC）驱动板，独立完成**硬件电路设计 + 嵌入式软件**全流程开发。\n\n系统以 **STM32G030C8T6** 为控制核心，使用高级定时器 **TIM1 的 3 组互补通道（共 6 路）**输出 **40kHz PWM**，经 **EG2132** 栅极驱动芯片放大后驱动**三相 MOSFET 半桥逆变电路**；软件采用**六步换相（120° 导通）**生成旋转磁场，实现对无刷电机的**开环驱动与占空比调速**。\n\n项目从零搭建、历经多轮硬件故障排查，最终**成功驱动电机稳定旋转**，并完整沉淀了原理、代码、硬件、调试问题四类文档。\n\n---\n\n## 三、系统架构\n\n### 3.1 硬件组成\n\n| 模块 | 方案 | 说明 |\n|------|------|------|\n| 主控 | STM32G030C8T6 | 系统控制核心，完成 PWM 生成与换相时序 |\n| 电源 | 24V → XL1509 → 12V → LM7805 → 5V → AMS1117 → 3.3V | 多级降压、逐级滤波，保证供电干净 |\n| 栅极驱动 | EG2132 ×3 | 每片驱动一相上下桥，含自举电路 |\n| 逆变电路 | 三相 MOSFET 半桥 | 输出接电机 U/V/W 三相绕组（星型） |\n| 信号调理 | 栅极串 100Ω + 下拉电阻 | 保证波形完整、防止误触发 |\n| 偏置泄放 | MOSFET 栅极并 10kΩ | 电压偏置与电荷泄放 |\n| 测量 | ADC + 滑动变阻器分压 | 采样电池电压，估算电量 |\n| 预留接口 | 霍尔传感器、反电动势过零检测 | 为后续闭环控制预留 |\n\n电路参考图：![主控.png](assets/主控.png)、![电源.png](assets/电源.png)、![驱动.png](assets/驱动.png)\n\n### 3.2 三相半桥拓扑\n\n```\n       母线电压 VM（24V）\n         │\n    ┌────┴────┐ ┌────┴────┐ ┌────┴────┐\n 上桥│ U+      │ │ V+      │ │ W+      │  ← TIM1_CH1/2/3（PA8/9/10）\n    └────┬────┘ └────┬────┘ └────┬────┘\n         │U          │V          │W       ← 接电机三相绕组\n    ┌────┴────┐ ┌────┴────┐ ┌────┴────┐\n 下桥│ U-      │ │ V-      │ │ W-      │  ← TIM1_CH1N/2N/3N（PB13/14/15）\n    └────┬────┘ └────┬────┘ └────┬────┘\n         └───────────┴───────────┴── GND\n```\n\n- **上桥** = TIM1 主输出 `CHx`（PA8 / PA9 / PA10）\n- **下桥** = TIM1 互补输出 `CHxN`（PB13 / PB14 / PB15）\n- 上下桥互锁，并配置**死区时间**（≈0.47µs）防止直通短路\n\n---\n\n## 四、核心技术与实现\n\n### 4.1 六步换相（120° 导通）\n\n每个时刻只让两相通电、第三相悬空，6 步磁场正好旋转 360° 电角度，形成旋转磁场拖动永磁转子：\n\n| 步 | 电流方向 | 合成磁场 |\n|----|---------|---------|\n| 0 | U → V | 基准方向 |\n| 1 | U → W | 旋转 60° |\n| 2 | V → W | 旋转 120° |\n| 3 | V → U | 旋转 180° |\n| 4 | W → U | 旋转 240° |\n| 5 | W → V | 旋转 300° |\n\n对应代码中的换相表 `step_table[6]`（每项 = `{做 PWM 的上桥相, 常通的下桥相}`）：\n\n```c\nstatic const StepConfig step_table[6] = {\n  {1, 2},   /* 步0: CH1 PWM(上U), CH2N ON(下V) */\n  {1, 3},   /* 步1: CH1 PWM, CH3N ON */\n  {2, 3},   /* 步2: CH2 PWM, CH3N ON */\n  {2, 1},   /* 步3: CH2 PWM, CH1N ON */\n  {3, 1},   /* 步4: CH3 PWM, CH1N ON */\n  {3, 2},   /* 步5: CH3 PWM, CH2N ON */\n};\n```\n\n### 4.2 PWM 与调速\n\n- 计数时钟 = 64MHz，`ARR = 1599`\n- **PWM 频率 = 64MHz / 1600 = 40kHz**（超声频段，运行安静）\n- **占空比 = CCR / 1600**，通过 `Motor_SetDuty()` 实时调速\n- 换相中：**PWM 相**（电流进）做斩波调压，**常通相**（电流出）下桥恒通，第三相悬空\n\n### 4.3 软件流程\n\n```\nmain()\n ├─ HAL_Init()            → SysTick 1ms 时基\n ├─ SystemClock_Config()  → HSI 16MHz → 64MHz\n ├─ MX_GPIO_Init()        → GPIO 时钟\n ├─ MX_TIM1_Init()        → TIM1 互补 PWM 配置 + 引脚复用\n ├─ Motor_Init()          → 计数器启动、MOE 使能、6 路输出全关（安全待机）\n ├─ Motor_SetDuty(x)      → 设定占空比\n └─ Motor_Run()           → 六步换相循环（含三级加速曲线，永不返回）\n```\n\n关键函数：\n\n| 函数 | 作用 |\n|------|------|\n| `Motor_Init()` | 启动 TIM1 + 使能 MOE + 全关输出 |\n| `Motor_Step(step)` | 按换相表原子重排 `CCER` / `CCR`，完成一步换相 |\n| `Motor_SetDuty(duty)` | 设置占空比（0~1599） |\n| `Motor_Run()` | 换相节拍循环，起步 150ms/步 → 逐步加速 |\n\n### 4.4 关键设计决策\n\n- **直接操作寄存器换相**：避开 HAL `Start/Stop` 的\"状态机静默失败\"和\"停机时顺手关 MOE\"问题，保证换相原子、可靠。\n- **时钟改用内部 HSI**：板卡未焊外部晶振，HSE 起振超时会卡死在 `Error_Handler`；HSI（内部 RC，±1% 精度）对电机驱动足够。\n\n---\n\n## 五、技术难点与解决（项目亮点）\n\n**1. 自举驱动 + 恒导通测试陷阱**\n用万用表静态测试时，上桥恒导通导致自举电容\"只放电不充电\"，栅压衰减 → 输出从 24V 掉到约 8V，一度误判 W 相损坏。最终定位为**测试方法问题**：真实工作时 40kHz PWM 每个周期都会给自举电容补电，上桥可稳定全导通；并据此建议将自举电容加大到 1~2.2µF/50V。\n\n**2. 下桥（互补输出）无信号**\n实测发现该芯片的互补输出 `CCxN` **必须与主输出 `CCxE` 同时使能**才会输出，只开 `CCxNE` 不工作；结合 `CCR=0` 使主输出恒低、互补恒高，实现\"上桥关、下桥常通\"且无直通风险。\n\n**3. 硬件故障系统性排查**\n通过\"逐相单测\"定位并解决了多个硬件问题：\n- MOSFET 击穿（U 相下桥对地导通）\n- **自举二极管损坏**（U 相无自举电压、无输出，更换后恢复正常）\n- 电源降压芯片损坏导致 EG2132 供电从 12V 升到 24V、超出耐压而烧毁\n- PCB 阻焊层刮伤导致焊盘对地短路\n\n**4. 开环启动失步**\n电机接上后只抖不转 → 判定为**转矩不足**，通过提高占空比（37% → 69% → 80%）并放缓起步节奏，成功让电机稳定旋转。\n\n---\n\n## 六、项目成果\n\n- 驱动板硬件设计、焊接、调试全部完成，**三相输出波形正常**（示波器验证）\n- 实现**六步换相开环驱动**，电机**稳定旋转并可调速**\n- 掌握互补 PWM + 死区 + 自举驱动的完整设计链路\n- 形成《原理》《代码》《问题》《硬件电路》四类完整技术文档\n\n---\n\n## 七、能力体现\n\n| 方向 | 体现 |\n|------|------|\n| 硬件设计 | 多级电源、三相半桥、栅极驱动、自举电路、PCB 焊接调试 |\n| 嵌入式软件 | STM32 寄存器级编程、高级定时器互补 PWM、死区、换相算法 |\n| 调试能力 | 示波器/万用表系统排查，逐相定位，软硬件联合排障 |\n| 工程素养 | 问题记录与文档沉淀，形成完整可复现的技术资料 |\n\n---\n\n## 八、后续升级方向\n\n- **无感闭环**：检测悬空相反电动势过零点，精确同步换相（提升效率与稳定性）\n- **霍尔闭环**：利用预留霍尔接口实现位置闭环控制\n- **电流采样 + 保护**：过流、堵转、欠压保护\n- **上位机调参**：实时调速与参数监控\n"
  },
  {
    "id": "驱动马达代码",
    "title": "驱动马达代码",
    "date": "2026-07-24",
    "tags": [
      "项目集",
      "实习经历",
      "基于步态相位检测与空间触觉同步干扰的智能长袜系统",
      "驱动",
      "驱动马达"
    ],
    "summary": "基于ESP32 LEDC PWM的8路马达触觉反馈驱动方案。采用两层架构：底层PWM驱动控制马达转速，上层空间触觉模式算法实现方向感知。",
    "content": "## 触觉反馈驱动系统\n\n### 整体架构\n采用两层分离设计：**底层（PWM驱动层）** 负责控制马达转速，**上层（触觉模式层）** 负责编排振动序列。\n\n### 技术要点\n- 基于ESP32 LEDC硬件PWM，8路独立通道\n- 8位精度（0~255）平滑调速\n- 按小腿肌肉解剖位置布局8个振动马达\n- 多种触觉模式：上扫、下扫、内外扫、脉冲、环绕、定点\n\n### 应用场景\n用于可穿戴设备中提供方向感知和触觉反馈。"
  },
  {
    "id": "足部压力传感器代码",
    "title": "足部压力传感器代码",
    "date": "2026-07-22",
    "tags": [
      "项目集",
      "实习经历",
      "基于步态相位检测与空间触觉同步干扰的智能长袜系统",
      "传感",
      "足部压力传感器"
    ],
    "summary": "基于BLE低功耗蓝牙的足底18点压力数据采集方案。采用GATT协议Notify方式实时接收，协议解析状态机确保数据帧完整性。",
    "content": "## 足底压力数据采集系统\n\n### 整体架构\n分两层：**BLE通信层** → **数据分析层**\n\n### 技术要点\n- 基于BLE 4.0低功耗蓝牙，GATT协议Notify方式实时接收\n- 18点足底压力传感器阵列，50~100Hz采样率\n- 协议解析状态机：帧头检测→缓冲区存储→校验验证→数据就绪\n- 断线自动重连机制\n\n### 数据分析\n- 总压力计算与脚离地检测\n- 脚掌姿态判断（前掌/后跟/内偏/外偏）\n- 步态相位分析（摆动相、着地、站立、蹬离）"
  },
  {
    "id": "mpu6050代码",
    "title": "mpu6050代码",
    "date": "2026-07-21",
    "tags": [
      "项目集",
      "实习经历",
      "基于步态相位检测与空间触觉同步干扰的智能长袜系统",
      "传感",
      "mpu6050"
    ],
    "summary": "基于MPU6050六轴姿态感知模块，采用互补滤波算法融合陀螺仪与加速度计数据，实时解算姿态角度，实现步态相位判断。",
    "content": "## 姿态感知模块\n\n### 整体架构\n分三层：**硬件通信层** → **数据解算层** → **应用分析层**\n\n### 技术要点\n- MPU6050通过硬件I2C与ESP32通信\n- 陀螺仪校准：静止采样取平均消除零偏\n- 互补滤波融合：陀螺仪积分 + 加速度计修正\n- Yaw角带死区和衰减处理，抑制漂移\n\n### 应用分析\n基于角速度阈值判断摆腿状态，结合足底压力数据实现完整步态还原。"
  },
  {
    "id": "电子硬件系统",
    "title": "1.足部压力传感器选型",
    "date": "2026-07-19",
    "tags": [
      "项目集",
      "实习经历",
      "基于步态相位检测与空间触觉同步干扰的智能长袜系统",
      "硬件",
      "硬件选型"
    ],
    "summary": "智能长袜系统硬件方案：集成足底压力传感器、六轴姿态传感器、线性振动马达、ESP32主控及电源管理模块，实现步态感知与触觉反馈闭环控制。",
    "content": "## 系统硬件方案\n\n### 系统概述\n面向步态康复训练的智能可穿戴设备，通过多传感器融合实现步态相位识别，并基于空间触觉同步干扰技术提供实时反馈。\n\n### 核心模块\n- **足底压力传感器阵列**：柔性薄膜电阻式，18点阵列扫描\n- **六轴姿态传感器（MPU6050）**：MEMS技术，I²C接口\n- **线性振动马达（ERM）**：PWM驱动，多通道独立控制\n- **主控芯片（ESP32-S3）**：双核处理器，集成BLE/Wi-Fi\n- **电源系统**：锂电池供电 + DCDC降压模块\n\n### 技术亮点\n- 多传感器数据融合实现精确步态相位识别\n- 空间触觉反馈：按解剖位置排列的马达阵列\n- 低功耗设计：ULP协处理器支持深度睡眠采样"
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
