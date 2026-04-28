---
name: milvus-integration
description: >
  定义与 Milvus 向量数据库及 milvus-service 后端进行交互的规范。
---

# Milvus 集成规范

## 架构原则
1. **适配器模式**: UI 组件不直接依赖 Milvus SDK，应通过抽象的 Vector Store 接口交互。
2. **异步处理**: 所有向量搜索和数据同步操作必须使用 Async/Await，并提供 Loading 状态（使用 Button 的 `loading` 属性）。

## 接口契约
- 后端服务地址默认从 `.env` 中的 `VITE_API_URL` 获取。
- 数据转换逻辑应集中在 `src/services` 或专用 hooks 中。

## 安全与性能
- 避免在前端直接暴露数据库凭据。
- 搜索结果应通过 `Card` 组件进行展示，支持多种动森配色以区分内容类别。
