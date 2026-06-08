# 在地文化展示平台 - 项目规则

## 工作流程

- 对于任何开发任务，必须先制定实施计划，经用户确认后再开始编码。不要直接动手写代码，先出方案。

## 首页轮播图配置

`stage1/resources/config.json` 的 `welcomeImages` 字段控制首页轮播图展示，数组格式，路径相对于 app 根目录：

```json
"welcomeImages": [
  "images/welcome/slide1.png",
  "images/welcome/slide2.png"
]
```

- 图片放置位置：`resources/images/welcome/`（优先生效）或 `static/images/welcome/`
- 不配置或路径全部无效时，回退到默认 `images/welcome/slide1~4.png`，最终兜底为纯色背景
- 建议分辨率 1920×1080，png/jpg，单张 ≤ 2MB
