# 织忆（WeaveMemory）

SillyTavern 长期记忆、人物状态与剧情脉络管理插件的前端扩展。负责宿主事件监听、生成前闸门、`setExtensionPrompt()` 注入和 UI。

> v0.1.0 默认 `enabled=false`，不会接管生成。安装后需同时安装 `ST-WeaveMemory-Server`；近期上下文配置已提供原文 / 摘要模式、正则提取和楼数设置。

## Phase 16 主面板

Phase 0～15 已完成。Phase 16 修复已实现并通过前端自动化检查，SillyTavern 浏览器实机验收尚未执行，因此暂不标记 Phase 16 DONE。Phase 17 数据管理未开始；“跟随 SillyTavern”渠道继续延期。

- 魔法棒 Extensions 菜单中的“织忆”打开原有 drawer，也保留右下角入口。菜单尚未创建时使用有界 MutationObserver 延迟挂载，不修改宿主。
- 人物列表显示同步状态与场景相关性；谱 / 迹支持真实 Schema 字段、来源、手动编辑、字段锁定 / 解锁 / 恢复 AI 管理。
- 事包含现在、日历月 / 日视图、剧情线、剧情安排及相关人物 / 剧情线；编辑保留既有条目 ID 和来源。
- 长期记忆支持搜索、人物 / 剧情线 / 日期 / 楼层过滤、完整来源范围与索引状态、禁用 / 启用、按 Batch 重总结、真实召回调试。
- 设置包含独立 AI 渠道、四类模型绑定、状态与总结 Prompt 预设（副本、版本、保存、切换、恢复默认、导入 / 导出、测试），以及基本、近期上下文、长期记忆、检索和 Token 预算参数。语言当前为简体中文。
- 主面板与旧扩展设置共享 settings store。模型列表仅存于 UI 会话缓存；API Key 留空保持，勾选清除才删除。
- 调试显示最近准备注入的长期记忆与谱 / 迹 / 事、预计 Token、状态 / 总结任务耗时、召回耗时、状态链与 SQLite 状态。缺失诊断明确显示“暂无数据”，不展示模型推理过程。准备结果不是浏览器实际注入成功回执。

手动编辑创建同楼新 StateNode、Delta 和 Checkpoint，不覆盖历史节点；恢复 AI 管理只清手动优先级及锁，不清当前值。没有有效状态节点时明确拒绝编辑。源状态或总结 Prompt 已失效的记忆须重新总结，不能直接启用旧版本。

自动化：`typecheck`、`lint`、`build`、`test:external-state`、`test:generation-reason`、`test:phase16-contract`、`test:scope-events` 已通过。contract 测试同时比较 `src/state-schema.ts` 与相邻 `../ST-WeaveMemory-Server/src/state/schema.ts`，开发验收需将两仓库并排检出，避免手抄 Schema 漂移。scope 测试执行真实事件模块，验证跨聊天慢响应不串用楼层、不回退 UI scope，关闭织忆时仍更新面板。

实机待验：菜单及 drawer 开关、聊天切换、渠道 / 密钥 / 四类模型、两类 Prompt、人物手动编辑、日历与剧情、记忆各类过滤 / 启停 / 重总结 / 召回、调试数据以及浏览器 console。完整检查记录见服务端 `docs/phase16-acceptance.md`。

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
