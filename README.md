# 织忆（WeaveMemory）

SillyTavern 长期记忆、人物状态与剧情脉络管理插件的前端扩展。负责宿主事件监听、生成前闸门、`setExtensionPrompt()` 注入和 UI。

> v0.1.0 默认 `enabled=false`，不会接管生成。安装后需同时安装 `ST-WeaveMemory-Server`；近期上下文配置已提供原文 / 摘要模式、正则提取和楼数设置。

## 与后端的边界

- 前端：监听聊天 / swipe / 编辑 / 删除 / 生成事件；最终 Prompt 注入。
- 后端：状态链、状态增量、Checkpoint、长期记忆、召回、Token 预算、数据迁移。
- API：`/api/plugins/weavememory/*`

## Phase 9 近期上下文

生成前准备会按配置读取最近 AI 楼：原文模式直接使用正文；摘要模式使用本地正则提取，匹配失败时保留该楼正文作为兜底，不额外调用 AI。设置位于 SillyTavern 扩展设置中的“织忆 · 近期上下文”。

## 开发

```bash
npm install
npm run typecheck
npm run build
```

## 在线更新

`manifest.json` 已启用 `auto_update`，`homePage` 指向本仓库。
