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

// const scheduleTask = tool({
//   description: "A tool to schedule a task to be executed at a later time",
//   inputSchema: scheduleSchema,
//   execute: async ({ when, description }) => {
//     // we can now read the agent context from the ALS store
//     const { agent } = getCurrentAgent<Chat>();
//
//     function throwError(msg: string): string {
//       throw new Error(msg);
//     }
//     if (when.type === "no-schedule") {
//       return "Not a valid schedule input";
//     }
//     const input =
//       when.type === "scheduled"
//         ? when.date // scheduled
//         : when.type === "delayed"
//           ? when.delayInSeconds // delayed
//           : when.type === "cron"
//             ? when.cron // cron
//             : throwError("not a valid schedule input");
//     try {
//       agent!.schedule(input!, "executeTask", description);
//     } catch (error) {
//       console.error("error scheduling task", error);
//       return `Error scheduling task: ${error}`;
//     }
//     return `Task scheduled for type "${when.type}" : ${input}`;
//   }
// });

/**
 * Tool to list all scheduled tasks
 * This executes automatically without requiring human confirmation
 */
// const getScheduledTasks = tool({
//   description: "List all tasks that have been scheduled",
//   inputSchema: z.object({}),
//   execute: async () => {
//     const { agent } = getCurrentAgent<Chat>();
//
//     try {
//       const tasks = agent!.getSchedules();
//       if (!tasks || tasks.length === 0) {
//         return "No scheduled tasks found.";
//       }
//       return tasks;
//     } catch (error) {
//       console.error("Error listing scheduled tasks", error);
//       return `Error listing scheduled tasks: ${error}`;
//     }
//   }
// });

/**
 * Tool to cancel a scheduled task by its ID
 * This executes automatically without requiring human confirmation
 */
// const cancelScheduledTask = tool({
//   description: "Cancel a scheduled task using its ID",
//   inputSchema: z.object({
//     taskId: z.string().describe("The ID of the task to cancel")
//   }),
//   execute: async ({ taskId }) => {
//     const { agent } = getCurrentAgent<Chat>();
//     try {
//       await agent!.cancelSchedule(taskId);
//       return `Task ${taskId} has been successfully canceled.`;
//     } catch (error) {
//       console.error("Error canceling scheduled task", error);
//       return `Error canceling task ${taskId}: ${error}`;
//     }
//   }
// });

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
  setTimer
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
