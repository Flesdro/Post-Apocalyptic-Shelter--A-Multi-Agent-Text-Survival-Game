import type { GameEvent, GameOption, NpcAgent, ShelterState } from "./types";

export const agents: NpcAgent[] = [
  {
    id: "doctor",
    name: "林医生",
    role: "医疗与感染控制",
    avatar: "林",
    priority: "medicine"
  },
  {
    id: "engineer",
    name: "周工程师",
    role: "设施与防御",
    avatar: "周",
    priority: "security"
  },
  {
    id: "scout",
    name: "陈侦察员",
    role: "外勤与资源",
    avatar: "陈",
    priority: "food"
  }
];

export function getNpcAdvice(agent: NpcAgent, state: ShelterState, event: GameEvent) {
  const bestOption = event.options.reduce((best, option) => {
    const score = scoreOptionForAgent(agent, state, option);
    return score > best.score ? { option, score } : best;
  }, { option: event.options[0], score: Number.NEGATIVE_INFINITY });

  const pressure = getPressureLine(agent, state);

  return `${pressure}我建议「${bestOption.option.label}」。${bestOption.option.description}`;
}

export function getNpcReaction(agent: NpcAgent, before: ShelterState, after: ShelterState, option: GameOption) {
  const priorityBefore = before[agent.priority];
  const priorityAfter = after[agent.priority];
  const priorityDelta = priorityAfter - priorityBefore;
  const infectionImproved = after.infectionRisk < before.infectionRisk;

  if (agent.id === "doctor" && infectionImproved) {
    return `这个决定降低了感染压力。我会继续观察被隔离人员。`;
  }

  if (priorityDelta > 0) {
    return `「${option.label}」让我的负责领域好转了。今天至少争取到一点空间。`;
  }

  if (priorityDelta < 0) {
    return `我担心「${option.label}」会留下后患。明天需要补救。`;
  }

  return `结果还算可控，但状态没有明显改善。我们不能连续两天原地踏步。`;
}

function scoreOptionForAgent(agent: NpcAgent, state: ShelterState, option: GameOption) {
  const delta = option.delta;
  const priorityGain = delta[agent.priority] ?? 0;
  const infectionPenalty = delta.infectionRisk ?? 0;
  const moraleGain = delta.morale ?? 0;

  if (agent.id === "doctor") {
    return (delta.medicine ?? 0) * 1.1 - infectionPenalty * 1.5 + moraleGain * 0.2;
  }

  if (agent.id === "engineer") {
    return (delta.security ?? 0) * 1.2 + moraleGain * 0.15 - infectionPenalty * 0.4;
  }

  return priorityGain * 1.2 + moraleGain * 0.2 + (state.security > 35 ? 4 : -6);
}

function getPressureLine(agent: NpcAgent, state: ShelterState) {
  if (agent.id === "doctor" && state.infectionRisk > 45) {
    return "感染数字已经很难看了，";
  }

  if (agent.id === "engineer" && state.security < 40) {
    return "我们的防线撑不了太久，";
  }

  if (agent.id === "scout" && state.food < 35) {
    return "食物不够会先拖垮所有人，";
  }

  return "";
}
