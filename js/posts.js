// 博客文章数据（由 sync.js 自动生成）
const POSTS = [
  {
    "id": "驱动马达代码",
    "title": "驱动马达代码",
    "date": "2026-07-24",
    "tags": [
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
