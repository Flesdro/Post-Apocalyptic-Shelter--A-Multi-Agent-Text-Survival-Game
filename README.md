# 末世避难所群聊式文字生存游戏 MVP

这是一个用于 Intelligent Software Agents / Agent 项目的最小可行版本。玩家扮演末世避难所负责人，通过手机群聊 UI 与多个 NPC Agent 沟通，并在每天的危机事件中做出决策。系统根据玩家行动更新避难所状态、记录 reward，并在第 7 天给出不同结局。

## 项目目标

本项目的核心目标是验证一个完整的 Human-Agent Interaction 闭环：

```text
玩家接收危机事件
→ NPC Agent 给出建议
→ 玩家选择行动
→ Simulation Engine 更新状态
→ Reward Evaluator 计算反馈
→ 系统推进到下一天或结局
```

MVP 版本重点展示：

- 群聊式交互界面
- 多 NPC Agent 建议与反馈
- 避难所状态模拟
- 基于决策的 reward 记录
- 状态驱动的多结局
- 可解释的 MDP / Reinforcement Learning 建模

## 技术栈

```text
Framework: Next.js
Language: TypeScript
UI: React + CSS
State: React local state
Simulation: TypeScript rule engine
Storage: 暂无持久化，MVP 使用前端内存状态
```

当前版本没有接入 LLM API 或数据库，目的是先保证游戏核心机制可以稳定运行。后续可以在现有结构上加入 OpenAI API、SQLite/PostgreSQL、LangGraph 或更正式的 RL 训练模块。

## 游戏设定

玩家管理一个名为“避难所 07”的末世避难所。游戏持续 7 天，每天发生一个危机事件。玩家需要在资源、安全、士气和感染风险之间做权衡。

当前 NPC Agent：

| Agent | 职责 | 关注点 |
| --- | --- | --- |
| 林医生 | 医疗与感染控制 | 药品、感染风险 |
| 周工程师 | 设施与防御 | 安全、防御 |
| 陈侦察员 | 外勤与资源 | 食物、探索 |

## 状态变量

游戏状态由以下变量构成：

```ts
type ShelterState = {
  day: number;
  food: number;
  medicine: number;
  morale: number;
  security: number;
  infectionRisk: number;
};
```

初始状态：

```ts
{
  day: 1,
  food: 50,
  medicine: 40,
  morale: 60,
  security: 50,
  infectionRisk: 20
}
```

所有状态值控制在 `0-100` 之间。

## 每日流程

每一天的游戏流程如下：

1. 系统发布当天危机事件。
2. 三个 NPC Agent 根据当前状态和事件给出建议。
3. 玩家从三个行动选项中选择一个。
4. Simulation Engine 根据行动修改避难所状态。
5. Reward Evaluator 计算本次决策的 reward。
6. NPC Agent 对结果做出反馈。
7. 系统进入下一天。
8. 第 7 天结束后，根据最终状态生成结局。

## Reward 设计

当前 reward 由状态变化加权计算：

```ts
reward =
  foodChange * 0.2 +
  medicineChange * 0.22 +
  moraleChange * 0.18 +
  securityChange * 0.2 +
  infectionRiskReduction * 0.3 +
  survivalBonus
```

设计意图：

- 食物、药品、士气、安全上升会增加 reward。
- 感染风险下降会增加 reward。
- 食物和药品没有归零时获得生存奖励。
- 资源崩溃会受到惩罚。

这个 reward 不代表单次选择的道德正确性，而是用于衡量该选择对避难所短期稳定性的影响。

## Reinforcement Learning 建模

本 MVP 可以被描述为一个 Markov Decision Process：

```text
State:
当前避难所状态，包括 food, medicine, morale, security, infectionRisk

Action:
玩家在每日事件中选择的行动

Transition:
由 simulation.ts 中的规则引擎决定状态变化

Reward:
由 reward.ts 根据状态变化计算

Episode:
一次 7 天游戏流程

Terminal State:
第 7 天后的最终结局
```

在 MVP 中，玩家相当于 policy 的执行者。系统记录每一步的 reward，使玩家可以通过多轮游玩学习更优策略。后续可以加入 Q-learning、multi-armed bandit 或 NPC policy learning，让系统本身也根据历史结果调整建议和事件概率。

## 当前结局

游戏第 7 天后会进入以下结局之一：

| 结局 | 条件倾向 |
| --- | --- |
| 稳定社区 | 综合稳定性高，累计 reward 较好 |
| 铁腕避难所 | 安全很高，但士气很低 |
| 感染崩溃 | 感染风险过高 |
| 资源耗尽 | 食物或药品过低 |
| 艰难撤离 | 撑到最后，但整体状态一般 |

## 项目结构

```text
app/
  layout.tsx       Next.js 页面布局
  page.tsx         主游戏界面与交互逻辑
  globals.css      全局样式

lib/
  types.ts         核心类型定义
  events.ts        7 天危机事件与选项
  agents.ts        NPC Agent 建议与反馈逻辑
  simulation.ts    状态转移规则
  reward.ts        reward 与 stability score 计算
  endings.ts       结局判断
```

## 运行方式

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

默认访问：

```text
http://localhost:3000
```

类型检查：

```bash
npm run typecheck
```

生产构建：

```bash
npm run build
```

## 后续扩展方向

可以按以下顺序扩展：

1. 接入 LLM，让 NPC Agent 的回复从规则文本升级为动态生成。
2. 加入数据库，保存 game session、messages、states、actions 和 rewards。
3. 加入 NPC trust / loyalty，让玩家历史行为影响 NPC 态度。
4. 加入事件概率系统，使剧情不再完全固定。
5. 加入简单 Q-table 或 bandit model，让系统根据历史 reward 调整推荐策略。
6. 将规则引擎拆成后端 API，便于做实验记录和评估。
7. 增加多轮实验统计，用图表展示不同玩家策略的 reward 分布。

## MVP 边界

当前版本刻意不包含：

- 真实多人在线
- 复杂背包系统
- 大型剧情树
- 地图探索
- 数据库持久化
- Deep RL 训练
- LLM API 调用

这些功能可以作为后续迭代，但不是验证核心 Agent 项目所必需的内容。
