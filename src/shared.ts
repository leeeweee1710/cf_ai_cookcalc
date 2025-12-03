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

export type GroceryItem = {
  id: string;
  name: string;
  quantity: string;
  expiryDate?: string;
};

export type Instruction = {
  id: string;
  text: string;
};

export type AgentSharedState = {
  timer: TimerSharedState;
  groceryList: GroceryItem[];
  shoppingList: GroceryItem[];
  instructions: Instruction[];
};

export const createDefaultTimerState = (): TimerSharedState => ({
  status: "idle",
  totalMs: 0,
  remainingMs: 0,
  updatedAt: Date.now()
});

export const createDefaultAgentState = (): AgentSharedState => ({
  timer: createDefaultTimerState(),
  groceryList: [],
  shoppingList: [],
  instructions: []
});