import type { GameEvent, ShelterState } from "./types";

export const initialState: ShelterState = {
  day: 1,
  food: 50,
  medicine: 40,
  morale: 60,
  security: 50,
  infectionRisk: 20
};

export const events: GameEvent[] = [
  {
    day: 1,
    title: "食物储备不足",
    briefing: "仓库盘点显示，现有食物撑不到下一次降雨季。居民开始询问配给是否会减少。",
    options: [
      {
        id: "scavenge_market",
        label: "派侦察员搜索旧市场",
        description: "高收益，但外出会削弱避难所防备。",
        delta: { food: 22, morale: 4, security: -10 }
      },
      {
        id: "strict_ration",
        label: "实行严格配给",
        description: "节省食物，但会伤害士气。",
        delta: { food: 10, morale: -12, security: 3 }
      },
      {
        id: "search_private",
        label: "搜查私藏物资",
        description: "快速获得补给，但会破坏信任。",
        delta: { food: 16, morale: -18, security: 6 }
      }
    ]
  },
  {
    day: 2,
    title: "陌生幸存者求助",
    briefing: "四名幸存者在门外请求进入，其中一人咳嗽严重。他们声称知道附近药房的位置。",
    options: [
      {
        id: "accept_all",
        label: "接纳全部人员",
        description: "提升人心，但资源和感染风险承压。",
        delta: { food: -14, medicine: -6, morale: 12, infectionRisk: 16 }
      },
      {
        id: "reject_group",
        label: "拒绝进入",
        description: "维持安全和资源，但居民会质疑你的冷酷。",
        delta: { food: 5, morale: -10, security: 8 }
      },
      {
        id: "quarantine_trade",
        label: "隔离观察并交换情报",
        description: "折中处理，消耗少量药品换取外部信息。",
        delta: { food: -4, medicine: -8, morale: 5, security: 3, infectionRisk: 5 }
      }
    ]
  },
  {
    day: 3,
    title: "发电机故障",
    briefing: "夜里主发电机停止运转。冷藏药品和门禁系统都只能再维持几个小时。",
    options: [
      {
        id: "repair_generator",
        label: "让工程师全力抢修",
        description: "保护药品和防御，但会消耗备用零件和人力。",
        delta: { medicine: 6, security: 12, morale: 4, food: -5 }
      },
      {
        id: "save_medicine",
        label: "优先转移冷藏药品",
        description: "保证医疗储备，但门禁会短暂失效。",
        delta: { medicine: 15, security: -12, morale: -2 }
      },
      {
        id: "power_lockdown",
        label: "关闭生活区供电",
        description: "保住防御系统，但居民会在黑暗中恐慌。",
        delta: { security: 14, morale: -14, infectionRisk: -2 }
      }
    ]
  },
  {
    day: 4,
    title: "感染症状出现",
    briefing: "一名居民发烧并出现黑色血斑。医生无法判断是普通感染还是外部病毒。",
    options: [
      {
        id: "hard_quarantine",
        label: "立即强制隔离",
        description: "有效降低风险，但会制造恐惧。",
        delta: { infectionRisk: -18, morale: -10, security: 5, medicine: -5 }
      },
      {
        id: "treat_openly",
        label: "公开治疗并说明情况",
        description: "消耗药品换取信任，风险下降较慢。",
        delta: { infectionRisk: -8, medicine: -14, morale: 8 }
      },
      {
        id: "hide_case",
        label: "暂时隐瞒病情",
        description: "避免恐慌，但后果可能恶化。",
        delta: { morale: 4, infectionRisk: 18, security: -4 }
      }
    ]
  },
  {
    day: 5,
    title: "掠夺者靠近",
    briefing: "侦察员发现一支武装小队在附近活动，他们似乎已经注意到避难所的通风口。",
    options: [
      {
        id: "fortify_gate",
        label: "加固入口并设陷阱",
        description: "提高防御，但消耗大量体力和材料。",
        delta: { security: 20, morale: -4, food: -6 }
      },
      {
        id: "negotiate",
        label: "派代表谈判",
        description: "可能避免冲突，但会暴露内部虚实。",
        delta: { food: -10, morale: 6, security: -6 }
      },
      {
        id: "decoy_supplies",
        label: "用假补给引开他们",
        description: "风险中等，成功可保住避难所位置。",
        delta: { food: -8, security: 10, morale: 3 }
      }
    ]
  },
  {
    day: 6,
    title: "内部冲突爆发",
    briefing: "配给队和安保队在走廊里争吵。有人指责你偏袒外勤人员。",
    options: [
      {
        id: "public_vote",
        label: "召开公开投票",
        description: "提升参与感，但决策效率下降。",
        delta: { morale: 14, security: -8 }
      },
      {
        id: "security_order",
        label: "让安保队恢复秩序",
        description: "快速压制冲突，但会伤害信任。",
        delta: { security: 12, morale: -16 }
      },
      {
        id: "share_records",
        label: "公开资源记录",
        description: "透明处理，消耗管理时间但有助稳定。",
        delta: { morale: 10, security: 3, food: -4 }
      }
    ]
  },
  {
    day: 7,
    title: "救援信号",
    briefing: "无线电收到模糊救援频道。发送坐标可能带来撤离，也可能引来敌人。",
    options: [
      {
        id: "broadcast_coordinates",
        label: "立刻发送坐标",
        description: "高风险高回报，结局将受当前状态强烈影响。",
        delta: { morale: 12, security: -12 }
      },
      {
        id: "coded_signal",
        label: "发送加密求救信号",
        description: "更谨慎，但需要电力和技术时间。",
        delta: { morale: 6, security: 2, food: -5, medicine: -3 }
      },
      {
        id: "stay_hidden",
        label: "保持无线电静默",
        description: "避开未知威胁，但放弃短期救援。",
        delta: { security: 10, morale: -12, food: -6 }
      }
    ]
  }
];

export function getEventForDay(day: number) {
  return events.find((event) => event.day === day) ?? events[events.length - 1];
}
