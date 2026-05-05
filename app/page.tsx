"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { agents, getNpcAdvice, getNpcReaction } from "@/lib/agents";
import { getEnding } from "@/lib/endings";
import { getEventForDay, initialState } from "@/lib/events";
import { calculateReward, getStabilityScore } from "@/lib/reward";
import { advanceDay, applyOption, formatDelta } from "@/lib/simulation";
import type { ChatMessage, GameEvent, GameOption, NpcReply, RewardRecord, ShelterState } from "@/lib/types";

const statLabels: Array<[keyof Omit<ShelterState, "day">, string, boolean]> = [
  ["food", "食物", false],
  ["medicine", "药品", false],
  ["morale", "士气", false],
  ["security", "安全", false],
  ["infectionRisk", "感染风险", true]
];

function createInitialMessages() {
  const firstEvent = getEventForDay(1);
  return [
    {
      id: "system-1",
      speaker: "system",
      name: "系统",
      text: `Day 1: ${firstEvent.title}。${firstEvent.briefing}`,
      kind: "event"
    }
  ] satisfies ChatMessage[];
}

export default function Home() {
  const [state, setState] = useState<ShelterState>(initialState);
  const [messages, setMessages] = useState<ChatMessage[]>(createInitialMessages);
  const [rewards, setRewards] = useState<RewardRecord[]>([]);
  const [finished, setFinished] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const initialAdviceLoaded = useRef(false);

  const currentEvent = getEventForDay(state.day);
  const ending = useMemo(() => (finished ? getEnding(state, rewards) : null), [finished, rewards, state]);
  const stability = getStabilityScore(state);

  useEffect(() => {
    if (initialAdviceLoaded.current) {
      return;
    }

    initialAdviceLoaded.current = true;
    void appendAdviceMessages(initialState, getEventForDay(1), "initial");
  }, []);

  async function chooseOption(option: GameOption) {
    if (finished || isGenerating) {
      return;
    }

    setIsGenerating(true);

    const before = state;
    const after = applyOption(before, option);
    const reward = calculateReward(before, after);
    const rewardRecord: RewardRecord = {
      day: before.day,
      actionId: option.id,
      actionLabel: option.label,
      stateBefore: before,
      stateAfter: after,
      reward
    };

    const resultMessages: ChatMessage[] = [
      {
        id: `player-${before.day}-${option.id}`,
        speaker: "player",
        name: "你",
        text: option.label
      },
      {
        id: `result-${before.day}`,
        speaker: "system",
        name: "系统",
        text: `结果：${option.description} 状态变化：${formatDelta(option)}。本日 reward: ${reward > 0 ? "+" : ""}${reward}`,
        kind: "result"
      }
    ];

    const nextRewards = [...rewards, rewardRecord];
    setMessages((current) => [...current, ...resultMessages]);

    const reactionMessages = await requestNpcMessages({
      phase: "reaction",
      state: after,
      event: currentEvent,
      previousState: before,
      playerAction: option,
      reward,
      idPrefix: `reaction-${before.day}`,
      kind: "result",
      fallback: agents.map((agent) => ({
        agentId: agent.id,
        text: getNpcReaction(agent, before, after, option)
      }))
    });

    if (before.day >= 7) {
      const finalEnding = getEnding(after, nextRewards);
      setMessages((current) => [
        ...current,
        ...reactionMessages,
        {
          id: `ending-${finalEnding.id}`,
          speaker: "system",
          name: "系统",
          text: `${finalEnding.title}：${finalEnding.description}`,
          kind: "ending"
        }
      ]);
      setState(after);
      setRewards(nextRewards);
      setFinished(true);
      setIsGenerating(false);
      return;
    }

    const nextState = advanceDay(after);
    const nextEvent = getEventForDay(nextState.day);
    const nextDayMessages: ChatMessage[] = [
      {
        id: `event-${nextState.day}`,
        speaker: "system",
        name: "系统",
        text: `Day ${nextState.day}: ${nextEvent.title}。${nextEvent.briefing}`,
        kind: "event"
      }
    ];

    setMessages((current) => [...current, ...reactionMessages, ...nextDayMessages]);
    setState(nextState);
    setRewards(nextRewards);
    await appendAdviceMessages(nextState, nextEvent, `day-${nextState.day}`);
    setIsGenerating(false);
  }

  function resetGame() {
    setState(initialState);
    setMessages(createInitialMessages());
    setRewards([]);
    setFinished(false);
    setIsGenerating(false);
    void appendAdviceMessages(initialState, getEventForDay(1), `reset-${Date.now()}`);
  }

  async function appendAdviceMessages(nextState: ShelterState, event: GameEvent, idPrefix: string) {
    setIsGenerating(true);

    const adviceMessages = await requestNpcMessages({
      phase: "advice",
      state: nextState,
      event,
      idPrefix: `advice-${idPrefix}`,
      kind: "advice",
      fallback: agents.map((agent) => ({
        agentId: agent.id,
        text: getNpcAdvice(agent, nextState, event)
      }))
    });

    setMessages((current) => [...current, ...adviceMessages]);
    setIsGenerating(false);
  }

  return (
    <main className="app-shell">
      <section className="phone" aria-label="避难所群聊">
        <header className="chat-header">
          <h1>避难所 07 群聊</h1>
          <p>Day {state.day > 7 ? 7 : state.day} / 7 · {isGenerating ? "Agent 正在输入..." : "三名 Agent 正在等待你的决策"}</p>
        </header>

        <div className="messages">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </div>

        <div className="action-panel">
          {finished ? (
            <button className="reset-button" onClick={resetGame}>
              重新开始
            </button>
          ) : (
            currentEvent.options.map((option) => (
              <button className="action-button" key={option.id} onClick={() => chooseOption(option)} disabled={isGenerating}>
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </button>
            ))
          )}
        </div>
      </section>

      <aside className="dashboard" aria-label="避难所状态面板">
        <h2>状态面板</h2>

        <div className="dashboard-grid">
          <section className="panel">
            <h3>环境状态 · Stability {stability}</h3>
            {statLabels.map(([key, label, inverse]) => (
              <div className="stat" key={key}>
                <div className="stat-label">
                  <span>{label}</span>
                  <strong>{state[key]}</strong>
                </div>
                <div className={`bar ${inverse ? "danger" : ""}`}>
                  <span style={{ width: `${state[key]}%` }} />
                </div>
              </div>
            ))}
          </section>

          <section className="panel">
            <h3>NPC / Agent</h3>
            {agents.map((agent) => (
              <div className="reward-item" key={agent.id}>
                <strong>{agent.name}</strong>
                <span>{agent.role}</span>
              </div>
            ))}
          </section>

          <section className="panel">
            <h3>Reward Log</h3>
            <div className="reward-list">
              {rewards.length === 0 ? (
                <div className="reward-item">
                  <span>暂无决策记录</span>
                  <strong>0</strong>
                </div>
              ) : (
                rewards.map((record) => (
                  <div className="reward-item" key={`${record.day}-${record.actionId}`}>
                    <span>
                      Day {record.day}: {record.actionLabel}
                    </span>
                    <strong>{record.reward > 0 ? `+${record.reward}` : record.reward}</strong>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className={`panel ${ending ? "ending" : ""}`}>
            <h3>{ending ? "最终结局" : "MDP Formulation"}</h3>
            {ending ? (
              <p>
                <strong>{ending.title}</strong>
                <br />
                {ending.description}
              </p>
            ) : (
              <p>
                State = shelter metrics. Action = player choice. Transition = rule engine. Reward = survival and
                stability score.
              </p>
            )}
          </section>
        </div>
      </aside>
    </main>
  );
}

async function requestNpcMessages({
  phase,
  state,
  event,
  previousState,
  playerAction,
  reward,
  idPrefix,
  kind,
  fallback
}: {
  phase: "advice" | "reaction";
  state: ShelterState;
  event: GameEvent;
  previousState?: ShelterState;
  playerAction?: GameOption;
  reward?: number;
  idPrefix: string;
  kind: "advice" | "result";
  fallback: NpcReply[];
}) {
  try {
    const response = await fetch("/api/npc-replies", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        phase,
        agents,
        state,
        event,
        previousState,
        playerAction,
        reward
      })
    });

    if (!response.ok) {
      throw new Error("NPC reply request failed");
    }

    const data = (await response.json()) as { replies?: NpcReply[] };
    return repliesToMessages(data.replies?.length ? data.replies : fallback, idPrefix, kind);
  } catch {
    return repliesToMessages(fallback, idPrefix, kind);
  }
}

function repliesToMessages(replies: NpcReply[], idPrefix: string, kind: "advice" | "result") {
  return agents.map((agent) => {
    const reply = replies.find((item) => item.agentId === agent.id);

    return {
      id: `${idPrefix}-${agent.id}`,
      speaker: agent.id,
      name: agent.name,
      text: reply?.text || "我需要更多信息，但现在必须立刻决策。",
      kind
    } satisfies ChatMessage;
  });
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.speaker === "system") {
    return (
      <div className="system-message">
        <span className="speaker">{message.name}</span>
        <p>{message.text}</p>
      </div>
    );
  }

  if (message.speaker === "player") {
    return (
      <div className="message-row player">
        <div className="bubble">
          <span className="speaker">{message.name}</span>
          <p>{message.text}</p>
        </div>
      </div>
    );
  }

  const agent = agents.find((item) => item.id === message.speaker);

  return (
    <div className="message-row">
      <div className="avatar">{agent?.avatar ?? "A"}</div>
      <div className="bubble">
        <span className="speaker">{message.name}</span>
        <p>{message.text}</p>
      </div>
    </div>
  );
}
