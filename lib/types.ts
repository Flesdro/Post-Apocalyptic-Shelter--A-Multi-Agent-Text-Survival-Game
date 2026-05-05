export type ShelterState = {
  day: number;
  food: number;
  medicine: number;
  morale: number;
  security: number;
  infectionRisk: number;
};

export type StateDelta = Partial<Omit<ShelterState, "day">>;

export type GameOption = {
  id: string;
  label: string;
  description: string;
  delta: StateDelta;
};

export type GameEvent = {
  day: number;
  title: string;
  briefing: string;
  options: GameOption[];
};

export type NpcAgent = {
  id: "doctor" | "engineer" | "scout";
  name: string;
  role: string;
  avatar: string;
  priority: keyof Omit<ShelterState, "day">;
};

export type ChatMessage = {
  id: string;
  speaker: "system" | "player" | NpcAgent["id"];
  name: string;
  text: string;
  kind?: "event" | "advice" | "result" | "ending";
};

export type RewardRecord = {
  day: number;
  actionId: string;
  actionLabel: string;
  stateBefore: ShelterState;
  stateAfter: ShelterState;
  reward: number;
};

export type Ending = {
  id: string;
  title: string;
  description: string;
};
