import type { GameOption, ShelterState } from "./types";

const clamp = (value: number) => Math.max(0, Math.min(100, value));

export function applyOption(state: ShelterState, option: GameOption): ShelterState {
  return {
    day: state.day,
    food: clamp(state.food + (option.delta.food ?? 0)),
    medicine: clamp(state.medicine + (option.delta.medicine ?? 0)),
    morale: clamp(state.morale + (option.delta.morale ?? 0)),
    security: clamp(state.security + (option.delta.security ?? 0)),
    infectionRisk: clamp(state.infectionRisk + (option.delta.infectionRisk ?? 0))
  };
}

export function advanceDay(state: ShelterState): ShelterState {
  return {
    ...state,
    day: state.day + 1
  };
}

export function formatDelta(option: GameOption) {
  const entries = Object.entries(option.delta)
    .filter(([, value]) => value !== undefined && value !== 0)
    .map(([key, value]) => `${key} ${Number(value) > 0 ? "+" : ""}${value}`);

  return entries.join(", ");
}
