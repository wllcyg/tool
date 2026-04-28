---
name: ui-standard
description: >
  遵循 animal-island-ui 的动森风格 UI 开发规范。包含色彩 Token、组件用法及视觉红线。
---

# UI 开发规范 (Animal Island Style)

## 核心准则
1. **温暖与自然**: 使用大地色系，严禁纯黑 (#000) 文本或冷灰色调。
2. **大圆角 (Pill Shapes)**: 按钮、输入框必须使用 50px 圆角。
3. **3D 立体感**: 交互元素必须具备下压式 3D 阴影（Bottom box-shadow）。
4. **游戏化反馈**: 通过 `Cursor` 提供手指光标，通过 `Typewriter` 提供剧情式文本展示。

## 关键 Token
- **主色 (Teal)**: `#19c8b9`
- **背景 (Parchment)**: `#f8f8f0` (主背景), `rgb(247, 243, 223)` (内容背景)
- **文本 (Brown)**: `#725d42` (正文), `#794f27` (标题)
- **焦点 (Yellow)**: `#ffcc00` (输入框 Focus)

## 组件使用要求
- 必须在 `main.tsx` 引入 `animal-island-ui/style`。
- 应用根节点必须包裹在 `<Cursor>` 中。
- 严禁修改组件的 3D 阴影和基础圆角。
