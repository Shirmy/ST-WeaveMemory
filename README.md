# 织忆（WeaveMemory）

SillyTavern 长期记忆、人物状态与剧情脉络管理插件的前端扩展。负责宿主事件监听、生成前闸门、`setExtensionPrompt()` 注入和 UI。

> v0.1.0 是开发骨架：默认 `enabled=false`，不会接管生成。安装后需同时安装 `ST-WeaveMemory-Server`，后续版本再开放完整设置页。

## 与后端的边界

- 前端：监听聊天 / swipe / 编辑 / 删除 / 生成事件；最终 Prompt 注入。
- 后端：状态链、状态增量、Checkpoint、长期记忆、召回、Token 预算、数据迁移。
- API：`/api/plugins/weavememory/*`

## 开发

```bash
npm install
npm run typecheck
npm run build
```

## 在线更新

`manifest.json` 已启用 `auto_update`，`homePage` 指向本仓库。
