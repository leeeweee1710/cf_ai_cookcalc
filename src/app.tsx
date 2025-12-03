/** biome-ignore-all lint/correctness/useUniqueElementIds: it's alright */
import {
  useEffect,
  useState,
  useRef,
  useCallback
} from "react";
import { useAgent } from "agents/react";
import { isToolUIPart } from "ai";
import { useAgentChat } from "agents/ai-react";
import type { UIMessage } from "@ai-sdk/react";
import type { tools } from "./tools";
import type { TimerSharedState, GroceryItem, Instruction } from "./shared";
import { createDefaultTimerState } from "./shared";

// Component imports
import { Button } from "@/components/button/Button";
import { Card } from "@/components/card/Card";
import { Avatar } from "@/components/avatar/Avatar";
import { Toggle } from "@/components/toggle/Toggle";
import { Textarea } from "@/components/textarea/Textarea";
import { MemoizedMarkdown } from "@/components/memoized-markdown";
import { ToolInvocationCard } from "@/components/tool-invocation-card/ToolInvocationCard";
import { IngredientsCalculator } from "@/components/ingredients-calculator/IngredientsCalculator";
import { FridgeTracker } from "@/components/fridge-tracker/FridgeTracker";
import { ShoppingListCard } from "@/components/shopping-list/ShoppingListCard";

// Icon imports
import {
  Bug,
  Moon,
  Robot,
  Sun,
  Trash,
  PaperPlaneTilt,
  Stop,
  Microphone,
  MicrophoneSlash
} from "@phosphor-icons/react";

// List of tools that require human confirmation
// NOTE: this should match the tools that don't have execute functions in tools.ts
const toolsRequiringConfirmation: (keyof typeof tools)[] = [
  // "getWeatherInformation"
];

type SpeechRecognitionAlternativeLike = {
  transcript: string;
  confidence: number;
};

type SpeechRecognitionResultLike = {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternativeLike;
  [index: number]: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionResultListLike = {
  readonly length: number;
  item(index: number): SpeechRecognitionResultLike;
  [index: number]: SpeechRecognitionResultLike;
};

type SpeechRecognitionEventLike = Event & {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLike;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type WindowWithSpeechRecognition = Window & {
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
  SpeechRecognition?: SpeechRecognitionConstructor;
};

const getSpeechRecognitionConstructor = (): SpeechRecognitionConstructor | null => {
  if (typeof window === "undefined") {
    return null;
  }
  const scopedWindow = window as WindowWithSpeechRecognition;
  return scopedWindow.SpeechRecognition || scopedWindow.webkitSpeechRecognition || null;
};

const PRESET_TIMERS = [
  { label: "Rice", minutes: 10 },
  { label: "Pasta", minutes: 12 }
] as const;

const ID_PARAM = "id";
const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz";
const ID_LENGTH = 6;

const createRandomId = () => {
  let id = "";
  for (let i = 0; i < ID_LENGTH; i += 1) {
    const index = Math.floor(Math.random() * ID_ALPHABET.length);
    id += ID_ALPHABET[index];
  }
  return id;
};

const ensureAgentId = () => {
  if (typeof window === "undefined") {
    return createRandomId();
  }

  const url = new URL(window.location.href);
  let id = url.searchParams.get(ID_PARAM);

  if (!id) {
    id = createRandomId();
    url.searchParams.set(ID_PARAM, id);
    window.history.replaceState(null, "", url.toString());
  }

  return id;
};

const getTimerDisplayMs = (timer: TimerSharedState) =>
  timer.status === "running" && timer.deadline
    ? Math.max(0, timer.deadline - Date.now())
    : timer.remainingMs;

const formatCountdown = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
};

export default function Chat() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    // Check localStorage first, default to dark if not found
    const savedTheme = localStorage.getItem("theme");
    return (savedTheme as "dark" | "light") || "dark";
  });
  const [agentId] = useState<string>(() => ensureAgentId());
  const [showDebug, setShowDebug] = useState(false);
  const [timerState, setTimerState] = useState<TimerSharedState>(() =>
    createDefaultTimerState()
  );
  const [groceryList, setGroceryList] = useState<GroceryItem[]>([]);
  const [shoppingList, setShoppingList] = useState<GroceryItem[]>([]);
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [displayMs, setDisplayMs] = useState(timerState.remainingMs);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  useEffect(() => {
    // Apply theme class on mount and when theme changes
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }

    // Save theme preference to localStorage
    localStorage.setItem("theme", theme);
  }, [theme]);


  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  };

  useEffect(() => {
    setIsSpeechSupported(Boolean(getSpeechRecognitionConstructor()));
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  const agent = useAgent<any>({
    agent: "chat",
    name: agentId,
    onStateUpdate: (incomingState) => {
      if (incomingState && "timer" in incomingState && incomingState.timer) {
        const timerFromState = incomingState.timer;
        setTimerState(timerFromState);
        setDisplayMs(getTimerDisplayMs(timerFromState));
      }

      if (
        incomingState &&
        "groceryList" in incomingState &&
        incomingState.groceryList
      ) {
        setGroceryList(incomingState.groceryList);
      }

      if (
        incomingState &&
        "shoppingList" in incomingState &&
        incomingState.shoppingList
      ) {
        setShoppingList(incomingState.shoppingList);
      }

      if (
        incomingState &&
        "instructions" in incomingState &&
        incomingState.instructions
      ) {
        setInstructions(incomingState.instructions);
      }
    }
  });

  const [agentInput, setAgentInput] = useState("");
  const handleAgentInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setAgentInput(e.target.value);
  };

  const appendToAgentInput = useCallback((text: string) => {
    setAgentInput((prev) => {
      const trimmed = text.trim();
      if (!trimmed) return prev;
      if (!prev) {
        return trimmed;
      }
      return `${prev.trimEnd()} ${trimmed}`;
    });
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const handleVoiceInputToggle = useCallback(() => {
    if (!isSpeechSupported) {
      return;
    }

    if (isListening) {
      stopListening();
      return;
    }

    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionCtor) {
      setSpeechError("Voice recognition is not available in this browser.");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";

    recognition.onresult = (event) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        appendToAgentInput(finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event);
      setSpeechError("Voice input encountered an issue. Please try again.");
      stopListening();
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.start();
    setSpeechError(null);
    setIsListening(true);
  }, [appendToAgentInput, isListening, isSpeechSupported, stopListening]);

  const handleAgentSubmit = async (
    e: React.FormEvent,
    extraData: Record<string, unknown> = {}
  ) => {
    e.preventDefault();
    if (!agentInput.trim()) return;

    const message = agentInput;
    setAgentInput("");

    // Send message to agent
    await sendMessage(
      {
        role: "user",
        parts: [{ type: "text", text: message }]
      },
      {
        body: extraData
      }
    );
  };

  const handleAddGroceryItem = useCallback(
    (item: Omit<GroceryItem, "id">) => {
      const newItem: GroceryItem = { ...item, id: crypto.randomUUID() };
      setGroceryList((prev) => {
        const newList = [...prev, newItem];
        agent.setState({ groceryList: newList });
        return newList;
      });
    },
    [agent]
  );

  const handleRemoveGroceryItem = useCallback(
    (id: string) => {
      setGroceryList((prev) => {
        const newList = prev.filter((item) => item.id !== id);
        agent.setState({ groceryList: newList });
        return newList;
      });
    },
    [agent]
  );

  const handleAddShoppingItem = useCallback(
    (item: Omit<GroceryItem, "id">) => {
      const newItem: GroceryItem = { ...item, id: crypto.randomUUID() };
      setShoppingList((prev) => {
        const newList = [...prev, newItem];
        agent.setState({ shoppingList: newList });
        return newList;
      });
    },
    [agent]
  );

  const handleRemoveShoppingItem = useCallback(
    (id: string) => {
      setShoppingList((prev) => {
        const newList = prev.filter((item) => item.id !== id);
        agent.setState({ shoppingList: newList });
        return newList;
      });
    },
    [agent]
  );

  const handleAddInstruction = useCallback(
    (text: string) => {
      const newInstruction: Instruction = { id: crypto.randomUUID(), text };
      setInstructions((prev) => {
        const newList = [...prev, newInstruction];
        agent.setState({ instructions: newList });
        return newList;
      });
    },
    [agent]
  );

  const handleRemoveInstruction = useCallback(
    (id: string) => {
      setInstructions((prev) => {
        const newList = prev.filter((item) => item.id !== id);
        agent.setState({ instructions: newList });
        return newList;
      });
    },
    [agent]
  );

  const syncTimerState = useCallback(
    (updater: (prev: TimerSharedState) => TimerSharedState) => {
      setTimerState((prev) => {
        const next = updater(prev);
        const normalized: TimerSharedState = {
          ...next,
          updatedAt: Date.now()
        };
        setDisplayMs(getTimerDisplayMs(normalized));
        agent.setState({ timer: normalized });
        return normalized;
      });
    },
    [agent]
  );

  const {
    messages: agentMessages,
    addToolResult,
    clearHistory,
    status,
    sendMessage,
    stop
  } = useAgentChat<unknown, UIMessage<{ createdAt: string }>>({
    agent
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    agentMessages.length > 0 && scrollToBottom();
  }, [agentMessages, scrollToBottom]);

  const pendingToolCallConfirmation = agentMessages.some((m: UIMessage) =>
    m.parts?.some(
      (part) =>
        isToolUIPart(part) &&
        part.state === "input-available" &&
        // Manual check inside the component
        toolsRequiringConfirmation.includes(
          part.type.replace("tool-", "") as keyof typeof tools
        )
    )
  );

  useEffect(() => {
    if (timerState.status !== "running" || !timerState.deadline) {
      return;
    }
    const activeDeadline = timerState.deadline;
    const tick = () => {
      const msLeft = Math.max(0, activeDeadline - Date.now());
      setDisplayMs(msLeft);
      if (msLeft <= 0) {
        syncTimerState((prev) => ({
          ...prev,
          status: "finished",
          remainingMs: 0,
          deadline: undefined
        }));
      }
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => {
      window.clearInterval(interval);
    };
  }, [timerState.status, timerState.deadline, syncTimerState]);

  const handlePresetSelect = useCallback(
    (minutes: number, label: string) => {
      const totalMs = minutes * 60 * 1000;
      if (totalMs <= 0) return;
      syncTimerState(() => ({
        ...createDefaultTimerState(),
        status: "paused",
        totalMs,
        remainingMs: totalMs,
        label
      }));
    },
    [syncTimerState]
  );

  const handleStart = useCallback(() => {
    syncTimerState((prev) => {
      if (prev.status === "running") return prev;
      const baseline =
        prev.remainingMs > 0 ? prev.remainingMs : Math.max(prev.totalMs, 0);
      if (baseline <= 0) {
        return prev.totalMs === 0 ? createDefaultTimerState() : prev;
      }
      return {
        ...prev,
        status: "running",
        remainingMs: baseline,
        deadline: Date.now() + baseline
      };
    });
  }, [syncTimerState]);

  const handlePause = useCallback(() => {
    syncTimerState((prev) => {
      if (prev.status !== "running") return prev;
      const remaining = prev.deadline
        ? Math.max(0, prev.deadline - Date.now())
        : prev.remainingMs;
      return {
        ...prev,
        status: "paused",
        remainingMs: remaining,
        deadline: undefined
      };
    });
  }, [syncTimerState]);

  const handleReset = useCallback(() => {
    syncTimerState((prev) => {
      if (prev.totalMs === 0) {
        return createDefaultTimerState();
      }
      return {
        ...prev,
        status: "paused",
        remainingMs: prev.totalMs,
        deadline: undefined
      };
    });
  }, [syncTimerState]);

  const handleClear = useCallback(() => {
    syncTimerState(() => createDefaultTimerState());
  }, [syncTimerState]);

  const handleAddTime = useCallback(
    (msToAdd: number) => {
      syncTimerState((prev) => {
        // If the timer is fresh (totalMs === 0), treat it as setting a new timer
        if (prev.totalMs === 0) {
          if (msToAdd <= 0) return prev;
          return {
            ...createDefaultTimerState(),
            status: "paused",
            totalMs: msToAdd,
            remainingMs: msToAdd,
            label: "Custom"
          };
        }

        const newRemaining = prev.remainingMs + msToAdd;
        const newTotal = prev.totalMs + msToAdd;

        if (newRemaining <= 0) {
          return createDefaultTimerState();
        }

        // If running, extend deadline
        if (prev.status === "running") {
          return {
            ...prev,
            totalMs: newTotal > 0 ? newTotal : 0,
            remainingMs: newRemaining,
            deadline: (prev.deadline || Date.now()) + msToAdd
          };
        }

        // If paused or finished, go to paused
        return {
          ...prev,
          status: "paused",
          totalMs: newTotal > 0 ? newTotal : 0,
          remainingMs: newRemaining,
          deadline: undefined
        };
      });
    },
    [syncTimerState]
  );

  const formattedTimer = formatCountdown(displayMs);
  const canStart =
    timerState.status !== "running" &&
    (timerState.remainingMs > 0 || timerState.totalMs > 0);
  const canPause = timerState.status === "running";
  const canReset =
    timerState.totalMs > 0 || timerState.status === "finished";
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="app-shell min-h-dvh lg:h-dvh w-full p-4 flex justify-center items-stretch bg-fixed overflow-y-auto">
      {/* <HasOpenAIKey /> */}
      <div className="app-content w-full max-w-[90rem] flex-1 lg:h-full mx-auto flex flex-col gap-4 lg:grid lg:grid-cols-4 lg:[grid-template-rows:minmax(0,1fr)_minmax(0,1fr)] lg:items-stretch lg:overflow-hidden">
        <div className="panel panel-ingredients order-1 flex flex-col min-h-0 lg:h-full overflow-hidden">
          <div className="lg:flex-1 lg:min-h-0">
            <IngredientsCalculator />
          </div>
        </div>

        <div className="panel panel-fridge order-2 flex flex-col min-h-0 lg:h-full overflow-hidden">
          <div className="lg:flex-1 lg:min-h-0">
            <FridgeTracker
              items={groceryList}
              onAddItem={handleAddGroceryItem}
              onRemoveItem={handleRemoveGroceryItem}
              onUpdateItem={(item) => {
                setGroceryList((prev) => {
                  const newList = prev.map((i) => (i.id === item.id ? item : i));
                  agent.setState({ groceryList: newList });
                  return newList;
                });
              }}
            />
          </div>
        </div>

        <div className="panel panel-shopping order-3 flex flex-col min-h-0 lg:h-full overflow-hidden">
          <div className="lg:flex-1 lg:min-h-0">
            <ShoppingListCard
              shoppingList={shoppingList}
              instructions={instructions}
              onAddShoppingItem={handleAddShoppingItem}
              onRemoveShoppingItem={handleRemoveShoppingItem}
              onUpdateShoppingItem={(item) => {
                setShoppingList((prev) => {
                  const newList = prev.map((i) => (i.id === item.id ? item : i));
                  agent.setState({ shoppingList: newList });
                  return newList;
                });
              }}
              onAddInstruction={handleAddInstruction}
              onRemoveInstruction={handleRemoveInstruction}
              onMarkAsBought={(item) => {
                // Add to fridge
                handleAddGroceryItem(item);
                // Remove from shopping list
                handleRemoveShoppingItem(item.id);
              }}
            />
          </div>
        </div>

        <div className="panel panel-timer order-4 flex flex-col min-h-0 lg:h-full overflow-hidden">
          <div className="lg:flex-1 lg:min-h-0">
            <Card className="w-full bg-white/80 dark:bg-neutral-900/80 border border-neutral-300 dark:border-neutral-800 backdrop-blur px-0 py-0 shadow overflow-hidden flex flex-col lg:h-full">
              <div className="px-4 py-3 border-b border-neutral-300 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/80 backdrop-blur flex items-center min-h-[60px]">
                <h2 className="font-semibold text-base">Timer</h2>
              </div>
              <div className="p-4 flex flex-col gap-4 flex-1 overflow-y-auto">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    {/* <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Shared Cooking Timer
                      </p>
                      <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                        {timerStatusLabel}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Linked to ID{" "}
                        <span className="font-mono text-sm">{agentId}</span>
                      </p>
                    </div> */}
                    <div className="text-4xl sm:text-5xl font-mono text-neutral-900 dark:text-neutral-50">
                      {formattedTimer}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      size="md"
                      disabled={!canStart}
                      onClick={handleStart}
                    >
                      Start
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      disabled={!canPause}
                      onClick={handlePause}
                    >
                      Pause
                    </Button>
                    <Button
                      variant="ghost"
                      size="md"
                      disabled={!canReset}
                      onClick={handleReset}
                    >
                      Reset
                    </Button>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Common Times
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {PRESET_TIMERS.map((preset) => (
                        <Button
                          key={preset.label}
                          size="md"
                          variant={
                            timerState.label === preset.label &&
                              timerState.totalMs > 0
                              ? "primary"
                              : "tertiary"
                          }
                          onClick={() =>
                            handlePresetSelect(preset.minutes, preset.label)
                          }
                        >
                          {preset.label} ({preset.minutes} min)
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Add Time
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Button
                        size="md"
                        variant="tertiary"
                        onClick={() => handleAddTime(30 * 60 * 1000)}
                      >
                        +30 min
                      </Button>
                      <Button
                        size="md"
                        variant="tertiary"
                        onClick={() => handleAddTime(5 * 60 * 1000)}
                      >
                        +5 min
                      </Button>
                      <Button
                        size="md"
                        variant="tertiary"
                        onClick={() => handleAddTime(1 * 60 * 1000)}
                      >
                        +1 min
                      </Button>
                      <Button
                        size="md"
                        variant="tertiary"
                        onClick={() => handleAddTime(30 * 1000)}
                      >
                        +30 sec
                      </Button>
                      <Button
                        size="md"
                        variant="tertiary"
                        onClick={() => handleAddTime(-30 * 60 * 1000)}
                      >
                        -30 min
                      </Button>
                      <Button
                        size="md"
                        variant="tertiary"
                        onClick={() => handleAddTime(-5 * 60 * 1000)}
                      >
                        -5 min
                      </Button>
                      <Button
                        size="md"
                        variant="tertiary"
                        onClick={() => handleAddTime(-1 * 60 * 1000)}
                      >
                        -1 min
                      </Button>
                      <Button
                        size="md"
                        variant="tertiary"
                        onClick={() => handleAddTime(-30 * 1000)}
                      >
                        -30 sec
                      </Button>
                      <Button
                        size="md"
                        variant="ghost"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        onClick={handleClear}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>

                  {timerState.status === "finished" && (
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Timer complete! Reset or select another time to restart.
                    </p>
                  )}
                  {timerState.totalMs === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Pick a preset or enter a custom time to begin.
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>

        <Card className="chat-panel order-5 h-[600px] lg:h-full lg:flex-1 min-h-0 w-full mx-auto flex flex-col shadow-xl rounded-xl overflow-hidden border border-neutral-300 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur p-0">
          <div className="px-4 py-3 border-b border-neutral-300 dark:border-neutral-800 flex items-center gap-3 sticky top-0 z-10 bg-white/90 dark:bg-neutral-900/80 backdrop-blur">
            {/* <div className="flex items-center justify-center h-8 w-8">
              <svg
                width="28px"
                height="28px"
                className="text-[#F48120]"
                data-icon="agents"
              >
                <title>Cloudflare Agents</title>
                <symbol id="ai:local:agents" viewBox="0 0 80 79">
                  <path
                    fill="currentColor"
                    d="M69.3 39.7c-3.1 0-5.8 2.1-6.7 5H48.3V34h4.6l4.5-2.5c1.1.8 2.5 1.2 3.9 1.2 3.8 0 7-3.1 7-7s-3.1-7-7-7-7 3.1-7 7c0 .9.2 1.8.5 2.6L51.9 30h-3.5V18.8h-.1c-1.3-1-2.9-1.6-4.5-1.9h-.2c-1.9-.3-3.9-.1-5.8.6-.4.1-.8.3-1.2.5h-.1c-.1.1-.2.1-.3.2-1.7 1-3 2.4-4 4 0 .1-.1.2-.1.2l-.3.6c0 .1-.1.1-.1.2v.1h-.6c-2.9 0-5.7 1.2-7.7 3.2-2.1 2-3.2 4.8-3.2 7.7 0 .7.1 1.4.2 2.1-1.3.9-2.4 2.1-3.2 3.5s-1.2 2.9-1.4 4.5c-.1 1.6.1 3.2.7 4.7s1.5 2.9 2.6 4c-.8 1.8-1.2 3.7-1.1 5.6 0 1.9.5 3.8 1.4 5.6s2.1 3.2 3.6 4.4c1.3 1 2.7 1.7 4.3 2.2v-.1q2.25.75 4.8.6h.1c0 .1.1.1.1.1.9 1.7 2.3 3 4 4 .1.1.2.1.3.2h.1c.4.2.8.4 1.2.5 1.4.6 3 .8 4.5.7.4 0 .8-.1 1.3-.1h.1c1.6-.3 3.1-.9 4.5-1.9V62.9h3.5l3.1 1.7c-.3.8-.5 1.7-.5 2.6 0 3.8 3.1 7 7 7s7-3.1 7-7-3.1-7-7-7c-1.5 0-2.8.5-3.9 1.2l-4.6-2.5h-4.6V48.7h14.3c.9 2.9 3.5 5 6.7 5 3.8 0 7-3.1 7-7s-3.1-7-7-7m-7.9-16.9c1.6 0 3 1.3 3 3s-1.3 3-3 3-3-1.3-3-3 1.4-3 3-3m0 41.4c1.6 0 3 1.3 3 3s-1.3 3-3 3-3-1.3-3-3 1.4-3 3-3M44.3 72c-.4.2-.7.3-1.1.3-.2 0-.4.1-.5.1h-.2c-.9.1-1.7 0-2.6-.3-1-.3-1.9-.9-2.7-1.7-.7-.8-1.3-1.7-1.6-2.7l-.3-1.5v-.7q0-.75.3-1.5c.1-.2.1-.4.2-.7s.3-.6.5-.9c0-.1.1-.1.1-.2.1-.1.1-.2.2-.3s.1-.2.2-.3c0 0 0-.1.1-.1l.6-.6-2.7-3.5c-1.3 1.1-2.3 2.4-2.9 3.9-.2.4-.4.9-.5 1.3v.1c-.1.2-.1.4-.1.6-.3 1.1-.4 2.3-.3 3.4-.3 0-.7 0-1-.1-2.2-.4-4.2-1.5-5.5-3.2-1.4-1.7-2-3.9-1.8-6.1q.15-1.2.6-2.4l.3-.6c.1-.2.2-.4.3-.5 0 0 0-.1.1-.1.4-.7.9-1.3 1.5-1.9 1.6-1.5 3.8-2.3 6-2.3q1.05 0 2.1.3v-4.5c-.7-.1-1.4-.2-2.1-.2-1.8 0-3.5.4-5.2 1.1-.7.3-1.3.6-1.9 1s-1.1.8-1.7 1.3c-.3.2-.5.5-.8.8-.6-.8-1-1.6-1.3-2.6-.2-1-.2-2 0-2.9.2-1 .6-1.9 1.3-2.6.6-.8 1.4-1.4 2.3-1.8l1.8-.9-.7-1.9c-.4-1-.5-2.1-.4-3.1s.5-2.1 1.1-2.9q.9-1.35 2.4-2.1c.9-.5 2-.8 3-.7.5 0 1 .1 1.5.2 1 .2 1.8.7 2.6 1.3s1.4 1.4 1.8 2.3l4.1-1.5c-.9-2-2.3-3.7-4.2-4.9q-.6-.3-.9-.6c.4-.7 1-1.4 1.6-1.9.8-.7 1.8-1.1 2.9-1.3.9-.2 1.7-.1 2.6 0 .4.1.7.2 1.1.3V72zm25-22.3c-1.6 0-3-1.3-3-3 0-1.6 1.3-3 3-3s3 1.3 3 3c0 1.6-1.3 3-3 3"
                  />
                </symbol>
                <use href="#ai:local:agents" />
              </svg>
            </div> */}

            <div className="flex-1">
              <h2 className="font-semibold text-base">Chat to Cook</h2>
            </div>

            <div className="flex items-center gap-2 mr-2">
              <Bug size={16} />
              <Toggle
                toggled={showDebug}
                aria-label="Toggle debug mode"
                onClick={() => setShowDebug((prev) => !prev)}
              />
            </div>

            <Button
              variant="ghost"
              size="md"
              shape="square"
              className="rounded-full h-9 w-9"
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </Button>

            <Button
              variant="ghost"
              size="md"
              shape="square"
              className="rounded-full h-9 w-9"
              onClick={clearHistory}
            >
              <Trash size={20} />
            </Button>
          </div>

          {/* Messages */}
          <div className="messages-container flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4 bg-white/70 dark:bg-neutral-950/30">
            {agentMessages.length === 0 && (
              <div className="flex items-center justify-center py-10">
                <Card className="p-6 max-w-md mx-auto bg-neutral-100 dark:bg-neutral-900">
                  <div className="text-center space-y-4">
                    <div className="bg-[#F48120]/10 text-[#F48120] rounded-full p-3 inline-flex">
                      <Robot size={24} />
                    </div>
                    <h3 className="font-semibold text-lg">Welcome to AI Chat to Cook</h3>
                    <p className="text-muted-foreground text-sm">
                      Start a conversation with your AI assistant. Try:
                    </p>
                    <ul className="text-sm text-left space-y-2">
                      <li className="flex items-center gap-2">
                        <span className="text-[#F48120]">•</span>
                        <span>Setting a timer for 12 minutes and 30 seconds</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-[#F48120]">•</span>
                        <span>Adding items to the grocery tracker</span>
                      </li>
                    </ul>
                  </div>
                </Card>
              </div>
            )}

            {agentMessages.map((m, index) => {
              const isUser = m.role === "user";
              const showAvatar =
                index === 0 || agentMessages[index - 1]?.role !== m.role;

              return (
                <div key={m.id}>
                  {showDebug && (
                    <pre className="text-xs text-muted-foreground overflow-scroll">
                      {JSON.stringify(m, null, 2)}
                    </pre>
                  )}
                  <div
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`flex gap-2 max-w-[85%] ${isUser ? "flex-row-reverse" : "flex-row"
                        }`}
                    >
                      {showAvatar && !isUser ? (
                        <Avatar username={"AI"} className="flex-shrink-0" />
                      ) : (
                        !isUser && <div className="w-8" />
                      )}

                      <div>
                        <div>
                          {m.parts?.map((part, i) => {
                            if (part.type === "text") {
                              return (
                                // biome-ignore lint/suspicious/noArrayIndexKey: immutable index
                                <div key={i}>
                                  {(() => {
                                    const content = part.text.replace(
                                      /^scheduled message: /,
                                      ""
                                    );

                                    if (!content.trim()) {
                                      return null;
                                    }

                                    return (
                                      <>
                                        <Card
                                          className={`p-3 rounded-md bg-neutral-100 dark:bg-neutral-900 ${isUser
                                            ? "rounded-br-none"
                                            : "rounded-bl-none border-assistant-border"
                                            } ${part.text.startsWith("scheduled message")
                                              ? "border-accent/50"
                                              : ""
                                            } relative`}
                                        >
                                          {part.text.startsWith(
                                            "scheduled message"
                                          ) && (
                                              <span className="absolute -top-3 -left-2 text-base">
                                                🕒
                                              </span>
                                            )}
                                          <MemoizedMarkdown
                                            id={`${m.id}-${i}`}
                                            content={content}
                                          />
                                        </Card>
                                        <p
                                          className={`text-xs text-muted-foreground mt-1 ${isUser ? "text-right" : "text-left"
                                            }`}
                                        >
                                          {formatTime(
                                            m.metadata?.createdAt
                                              ? new Date(m.metadata.createdAt)
                                              : new Date()
                                          )}
                                        </p>
                                      </>
                                    );
                                  })()}
                                </div>
                              );
                            }

                            if (isToolUIPart(part) && m.role === "assistant") {
                              const toolCallId = part.toolCallId;
                              const toolName = part.type.replace("tool-", "");
                              const needsConfirmation =
                                toolsRequiringConfirmation.includes(
                                  toolName as keyof typeof tools
                                );

                              return (
                                <ToolInvocationCard
                                  // biome-ignore lint/suspicious/noArrayIndexKey: using index is safe here as the array is static
                                  key={`${toolCallId}-${i}`}
                                  toolUIPart={part}
                                  toolCallId={toolCallId}
                                  needsConfirmation={needsConfirmation}
                                  onSubmit={({ toolCallId, result }) => {
                                    addToolResult({
                                      tool: part.type.replace("tool-", ""),
                                      toolCallId,
                                      output: result
                                    });
                                  }}
                                  addToolResult={(toolCallId, result) => {
                                    addToolResult({
                                      tool: part.type.replace("tool-", ""),
                                      toolCallId,
                                      output: result
                                    });
                                  }}
                                />
                              );
                            }
                            return null;
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAgentSubmit(e, {
                annotations: {
                  hello: "world"
                }
              });
            }}
            className="px-4 py-3 bg-neutral-50/80 dark:bg-neutral-900/80 border-t border-neutral-300 dark:border-neutral-800"
          >
            <div className="flex items-center gap-2">
              <div className="flex-1 flex flex-col">
                <div className="relative">
                  <Textarea
                    disabled={pendingToolCallConfirmation}
                    placeholder={
                      pendingToolCallConfirmation
                        ? "Please respond to the tool confirmation above..."
                        : "Send a message..."
                    }
                    className="flex w-full border border-neutral-200 dark:border-neutral-700 px-3 py-2 ring-offset-background placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 dark:focus-visible:ring-neutral-700 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm min-h-[96px] max-h-[40vh] resize-none rounded-2xl !text-base pb-10 dark:bg-neutral-900 overflow-y-auto"
                    value={agentInput}
                    onChange={(e) => {
                      handleAgentInputChange(e);
                    }}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        !e.shiftKey &&
                        !e.nativeEvent.isComposing
                      ) {
                        e.preventDefault();
                        handleAgentSubmit(e as unknown as React.FormEvent);
                      }
                    }}
                    rows={4}
                  />
                  <div className="absolute bottom-0 right-0 p-2 w-fit flex flex-row justify-end gap-2">
                    <button
                      type="button"
                      onClick={handleVoiceInputToggle}
                      disabled={!isSpeechSupported || pendingToolCallConfirmation}
                      className="inline-flex items-center cursor-pointer justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary/80 text-primary-foreground hover:bg-primary rounded-full p-1.5 h-fit border border-neutral-200 dark:border-neutral-800"
                      aria-pressed={isListening}
                      aria-label={
                        !isSpeechSupported
                          ? "Voice input not supported in this browser"
                          : isListening
                            ? "Stop voice input"
                            : "Start voice input"
                      }
                    >
                      {isListening ? <MicrophoneSlash size={16} /> : <Microphone size={16} />}
                    </button>
                    {status === "submitted" || status === "streaming" ? (
                      <button
                        type="button"
                        onClick={stop}
                        className="inline-flex items-center cursor-pointer justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full p-1.5 h-fit border border-neutral-200 dark:border-neutral-800"
                        aria-label="Stop generation"
                      >
                        <Stop size={16} />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className="inline-flex items-center cursor-pointer justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full p-1.5 h-fit border border-neutral-200 dark:border-neutral-800"
                        disabled={pendingToolCallConfirmation || !agentInput.trim()}
                        aria-label="Send message"
                      >
                        <PaperPlaneTilt size={16} />
                      </button>
                    )}
                  </div>
                </div>
                {speechError && (
                  <p className="text-xs text-red-500 mt-2">{speechError}</p>
                )}
              </div>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

