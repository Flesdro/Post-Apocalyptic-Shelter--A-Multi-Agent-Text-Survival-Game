import type { Ending, RewardRecord, ShelterState } from "./types";
import { getStabilityScore } from "./reward";

export function getEnding(state: ShelterState, rewards: RewardRecord[]): Ending {
  const score = getStabilityScore(state);
  const totalReward = rewards.reduce((sum, record) => sum + record.reward, 0);

  if (state.infectionRisk >= 70) {
    return {
      id: "infection_collapse",
      title: "感染崩溃",
      description: "隔离区在最后一夜失守。幸存者没有死于饥饿，而是死于太晚承认风险。"
    };
  }

  if (state.food <= 15 || state.medicine <= 12) {
    return {
      id: "resource_collapse",
      title: "资源耗尽",
      description: "避难所还站着，但人们已经没有足够食物和药品维持秩序。撤离变成了溃逃。"
    };
  }

  if (state.security >= 75 && state.morale <= 35) {
    return {
      id: "authoritarian_shelter",
      title: "铁腕避难所",
      description: "大门守住了，命令也无人反抗。这里活了下来，但它更像堡垒，不像社区。"
    };
  }

  if (score >= 62 && totalReward > 12) {
    return {
      id: "stable_community",
      title: "稳定社区",
      description: "救援队抵达时，避难所仍有秩序、信任和基本储备。你们不只是活了下来。"
    };
  }

  return {
    id: "uncertain_exodus",
    title: "艰难撤离",
    description: "你们撑到了第七天，但代价沉重。队伍带着剩余物资离开，前路仍不确定。"
  };
}
