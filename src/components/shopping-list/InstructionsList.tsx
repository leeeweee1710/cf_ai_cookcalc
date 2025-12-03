import { useState, useCallback } from "react";
import { Button } from "@/components/button/Button";
import { Trash, Plus } from "@phosphor-icons/react";
import type { Instruction } from "../../shared";

type InstructionsListProps = {
    items: Instruction[];
    onAddItem: (text: string) => void;
    onRemoveItem: (id: string) => void;
};

export const InstructionsList = ({ items, onAddItem, onRemoveItem }: InstructionsListProps) => {
    const [newInstruction, setNewInstruction] = useState("");

    const handleAdd = useCallback(() => {
        if (!newInstruction.trim()) return;

        onAddItem(newInstruction);
        setNewInstruction("");
    }, [newInstruction, onAddItem]);

    return (
        <div className="flex flex-col gap-4 flex-1 overflow-hidden h-full">
            <div className="flex gap-2">
                <input
                    type="text"
                    placeholder="Add instruction..."
                    className="flex-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white/80 dark:bg-neutral-950/60 px-3 py-2 text-sm font-semibold text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-600"
                    value={newInstruction}
                    onChange={(e) => setNewInstruction(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleAdd();
                        }
                    }}
                />
                <Button onClick={handleAdd} disabled={!newInstruction.trim()} variant="primary" size="sm">
                    <Plus size={16} />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 border rounded-md border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/30">
                {items.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                        No instructions added.
                    </div>
                ) : (
                    <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
                        {items.map((item, index) => (
                            <li key={item.id} className="p-3 flex items-start justify-between gap-3">
                                <div className="flex gap-3 min-w-0">
                                    <span className="font-mono text-muted-foreground">{index + 1}.</span>
                                    <p className="text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap">{item.text}</p>
                                </div>
                                <button
                                    onClick={() => onRemoveItem(item.id)}
                                    className="text-neutral-400 hover:text-red-500 transition-colors p-1 shrink-0"
                                    aria-label="Remove instruction"
                                >
                                    <Trash size={16} />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};
