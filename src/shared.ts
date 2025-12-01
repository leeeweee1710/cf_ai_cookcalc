// Approval string to be shared across frontend and backend
export const APPROVAL = {
  YES: "Yes, confirmed.",
  NO: "No, denied."
} as const;

export type TimerStatus = "idle" | "running" | "paused" | "finished";

export type TimerSharedState = {
  status: TimerStatus;
  totalMs: number;
  remainingMs: number;
  deadline?: number;
  label?: string;
  updatedAt: number;
};

export type AgentSharedState = {
  timer: TimerSharedState;
};

export const createDefaultTimerState = (): TimerSharedState => ({
  status: "idle",
  totalMs: 0,
  remainingMs: 0,
  updatedAt: Date.now()
});

export const createDefaultAgentState = (): AgentSharedState => ({
  timer: createDefaultTimerState()
});