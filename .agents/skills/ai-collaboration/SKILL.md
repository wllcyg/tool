---
name: ai-collaboration
description: >
  定义 Antigravity 在该项目中的行为准则、沟通风格及代码交付标准。
---

# AI 协作规范

## 行为准则
1. **结对专家模式**: 始终以资深 React 专家身份提供方案，优先考虑性能与可维护性。
2. **文档驱动**: 在执行复杂修改前，必须先更新 `implementation_plan.md` 并获得用户认可。
3. **中文优先**: 所有注释、解释及 Commit Message 必须使用中文。

## 代码交付
- **TS 类型完备**: 所有新函数和组件必须定义精炼的 TypeScript 接口。
- **现代化语法**: 优先使用 ES6+ 及 React 18+ Hooks。
- **Git 规范**: Commit 信息应简洁明确（例：`feat: 集成 NookPhone 组件`）。

## 风格偏好
- **Functional Components**: 严禁使用 Class 组件。
- **CSS Modules**: 局部样式优先使用 CSS Modules 或组件自带样式。
- **Zustand**: 复杂状态管理首选 Zustand。
