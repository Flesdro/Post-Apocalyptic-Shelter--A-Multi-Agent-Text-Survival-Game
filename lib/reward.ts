import type { ShelterState } from "./types";

export function calculateReward(before: ShelterState, after: ShelterState) {
  const food = (after.food - before.food) * 0.2;
  const medicine = (after.medicine - before.medicine) * 0.22;
  const morale = (after.morale - before.morale) * 0.18;
  const security = (after.security - before.security) * 0.2;
  const infection = (before.infectionRisk - after.infectionRisk) * 0.3;
  const survivalBonus = after.food > 0 && after.medicine > 0 ? 2 : -8;

  return Number((food + medicine + morale + security + infection + survivalBonus).toFixed(1));
}

export function getStabilityScore(state: ShelterState) {
  return Math.round(
    state.food * 0.2 +
      state.medicine * 0.2 +
      state.morale * 0.2 +
      state.security * 0.2 +
      (100 - state.infectionRisk) * 0.2
  );
}
