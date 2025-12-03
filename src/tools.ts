/**
 * Tool definitions for the AI chat agent
 * Tools can either require human confirmation or execute automatically
 */
import { tool, type ToolSet } from "ai";
import { z } from "zod/v3";

import type { Chat } from "./server";
import { getCurrentAgent } from "agents";
import { scheduleSchema } from "agents/schedule";
import type { TimerSharedState } from "./shared";

/**
 * Weather information tool that requires human confirmation
 * When invoked, this will present a confirmation dialog to the user
 */
// const getWeatherInformation = tool({
//   description: "show the weather in a given city to the user",
//   inputSchema: z.object({ city: z.string() })
//   // Omitting execute function makes this tool require human confirmation
// });

/**
 * Local time tool that executes automatically
 * Since it includes an execute function, it will run without user confirmation
 * This is suitable for low-risk operations that don't need oversight
 */
// const getLocalTime = tool({
//   description: "get the local time for a specified location",
//   inputSchema: z.object({ location: z.string() }),
//   execute: async ({ location }) => {
//     console.log(`Getting local time for ${location}`);
//     return "10am";
//   }
// });

const addGroceryItems = tool({
  description: "Add one or more items to the grocery/fridge list",
  inputSchema: z.object({
    items: z.array(z.object({
      name: z.string().describe("The name of the item"),
      quantity: z.string().describe("The quantity of the item (e.g. '2', '1kg')"),
      expiryDate: z.string().optional().describe("The expiry date of the item (YYYY-MM-DD)")
    })).describe("List of items to add")
  }),
  execute: async ({ items }) => {
    const { agent } = getCurrentAgent<Chat>();
    const newItems = items.map(item => ({
      id: crypto.randomUUID(),
      name: item.name,
      quantity: item.quantity,
      expiryDate: item.expiryDate
    }));

    const currentState = agent!.state;
    const newList = [...(currentState.groceryList || []), ...newItems];

    agent!.setState({
      ...currentState,
      groceryList: newList
    });

    return `Added ${items.length} items to grocery list: ${newItems.map(i => `${i.name} (${i.quantity})`).join(", ")}`;
  }
});

const listGroceryItems = tool({
  description: "List all items in the grocery/fridge list",
  inputSchema: z.object({}),
  execute: async () => {
    const { agent } = getCurrentAgent<Chat>();
    const list = agent!.state.groceryList || [];

    if (list.length === 0) {
      return "The grocery list is empty.";
    }

    return list.map(item =>
      `- ${item.name} (Qty: ${item.quantity})${item.expiryDate ? ` [Expires: ${item.expiryDate}]` : ''}`
    ).join("\n");
  }
});

const deleteGroceryItem = tool({
  description: "Delete an item from the grocery/fridge list by name",
  inputSchema: z.object({
    name: z.string().describe("The name of the item to delete")
  }),
  execute: async ({ name }) => {
    const { agent } = getCurrentAgent<Chat>();
    const currentState = agent!.state;
    const list = currentState.groceryList || [];

    const index = list.findIndex(item => item.name.toLowerCase() === name.toLowerCase());

    if (index === -1) {
      return `Item "${name}" not found in the grocery list.`;
    }

    const removedItem = list[index];
    const newList = [...list.slice(0, index), ...list.slice(index + 1)];

    agent!.setState({
      ...currentState,
      groceryList: newList
    });

    return `Removed ${removedItem.name} from grocery list.`;
  }
});

const setTimer = tool({
  description: "Set and start a timer for a specific duration in minutes and seconds",
  inputSchema: z.object({
    minutes: z.number().optional().describe("The duration of the timer in minutes"),
    seconds: z.number().optional().describe("The duration of the timer in seconds"),
    label: z.string().optional().describe("Optional label for the timer")
  }),
  execute: async ({ minutes = 0, seconds = 0, label }) => {
    const { agent } = getCurrentAgent<Chat>();
    const totalMs = (minutes * 60 + seconds) * 1000;

    if (totalMs <= 0) {
      return "Please provide a valid duration greater than 0 seconds.";
    }

    const now = Date.now();

    const newTimerState: TimerSharedState = {
      status: "running",
      totalMs,
      remainingMs: totalMs,
      deadline: now + totalMs,
      label: label || "Timer",
      updatedAt: now
    };

    const currentState = agent!.state;
    agent!.setState({
      ...currentState,
      timer: newTimerState
    });

    const timeString = [];
    if (minutes > 0) timeString.push(`${minutes} minutes`);
    if (seconds > 0) timeString.push(`${seconds} seconds`);

    return `Timer set for ${timeString.join(" and ")}.`;
  }
});

const addShoppingListItems = tool({
  description: "Add one or more items to the shopping list",
  inputSchema: z.object({
    items: z.array(z.object({
      name: z.string().describe("The name of the item"),
      quantity: z.string().describe("The quantity of the item (e.g. '2', '1kg')"),
      expiryDate: z.string().optional().describe("The expiry date of the item (YYYY-MM-DD)")
    })).describe("List of items to add")
  }),
  execute: async ({ items }) => {
    const { agent } = getCurrentAgent<Chat>();
    const newItems = items.map(item => ({
      id: crypto.randomUUID(),
      name: item.name,
      quantity: item.quantity,
      expiryDate: item.expiryDate
    }));

    const currentState = agent!.state;
    const newList = [...(currentState.shoppingList || []), ...newItems];

    agent!.setState({
      ...currentState,
      shoppingList: newList
    });

    return `Added ${items.length} items to shopping list: ${newItems.map(i => `${i.name} (${i.quantity})`).join(", ")}`;
  }
});

const listShoppingListItems = tool({
  description: "List all items in the shopping list",
  inputSchema: z.object({}),
  execute: async () => {
    const { agent } = getCurrentAgent<Chat>();
    const list = agent!.state.shoppingList || [];

    if (list.length === 0) {
      return "The shopping list is empty.";
    }

    return list.map(item =>
      `- ${item.name} (Qty: ${item.quantity})${item.expiryDate ? ` [Expires: ${item.expiryDate}]` : ''}`
    ).join("\n");
  }
});

const deleteShoppingListItem = tool({
  description: "Delete an item from the shopping list by name",
  inputSchema: z.object({
    name: z.string().describe("The name of the item to delete")
  }),
  execute: async ({ name }) => {
    const { agent } = getCurrentAgent<Chat>();
    const currentState = agent!.state;
    const list = currentState.shoppingList || [];

    const index = list.findIndex(item => item.name.toLowerCase() === name.toLowerCase());

    if (index === -1) {
      return `Item "${name}" not found in the shopping list.`;
    }

    const removedItem = list[index];
    const newList = [...list.slice(0, index), ...list.slice(index + 1)];

    agent!.setState({
      ...currentState,
      shoppingList: newList
    });

    return `Removed ${removedItem.name} from shopping list.`;
  }
});

const addInstruction = tool({
  description: "Add one or more instructions",
  inputSchema: z.object({
    instructions: z.array(z.string()).describe("List of instruction texts")
  }),
  execute: async ({ instructions }) => {
    const { agent } = getCurrentAgent<Chat>();
    const newInstructions = instructions.map(text => ({
      id: crypto.randomUUID(),
      text
    }));

    const currentState = agent!.state;
    const newList = [...(currentState.instructions || []), ...newInstructions];

    agent!.setState({
      ...currentState,
      instructions: newList
    });

    return `Added ${instructions.length} instructions.`;
  }
});

const listInstructions = tool({
  description: "List all instructions",
  inputSchema: z.object({}),
  execute: async () => {
    const { agent } = getCurrentAgent<Chat>();
    const list = agent!.state.instructions || [];

    if (list.length === 0) {
      return "There are no instructions.";
    }

    return list.map((item, index) =>
      `${index + 1}. ${item.text}`
    ).join("\n");
  }
});

const deleteInstruction = tool({
  description: "Delete an instruction by index (1-based)",
  inputSchema: z.object({
    index: z.number().describe("The 1-based index of the instruction to delete")
  }),
  execute: async ({ index }) => {
    const { agent } = getCurrentAgent<Chat>();
    const currentState = agent!.state;
    const list = currentState.instructions || [];

    if (index < 1 || index > list.length) {
      return `Invalid index. Please provide a number between 1 and ${list.length}.`;
    }

    const removedItem = list[index - 1];
    const newList = [...list.slice(0, index - 1), ...list.slice(index)];

    agent!.setState({
      ...currentState,
      instructions: newList
    });

    return `Removed instruction: "${removedItem.text}"`;
  }
});

/**
 * Export all available tools
 * These will be provided to the AI model to describe available capabilities
 */
export const tools = {
  // getWeatherInformation,
  // getLocalTime,
  // scheduleTask,
  // getScheduledTasks,
  // cancelScheduledTask,
  addGroceryItems,
  listGroceryItems,
  deleteGroceryItem,
  setTimer,
  addShoppingListItems,
  listShoppingListItems,
  deleteShoppingListItem,
  addInstruction,
  listInstructions,
  deleteInstruction
} satisfies ToolSet;

/**
 * Implementation of confirmation-required tools
 * This object contains the actual logic for tools that need human approval
 * Each function here corresponds to a tool above that doesn't have an execute function
 */
export const executions = {
  // getWeatherInformation: async ({ city }: { city: string }) => {
  //   console.log(`Getting weather information for ${city}`);
  //   return `The weather in ${city} is sunny`;
  // }
};
