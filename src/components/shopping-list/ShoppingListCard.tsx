import { useState } from "react";
import { Card } from "@/components/card/Card";
import { ShoppingList } from "./ShoppingList";
import { InstructionsList } from "./InstructionsList";
import type { GroceryItem, Instruction } from "../../shared";
import { clsx } from "clsx";

type ShoppingListCardProps = {
    shoppingList: GroceryItem[];
    instructions: Instruction[];
    onAddShoppingItem: (item: Omit<GroceryItem, "id">) => void;
    onRemoveShoppingItem: (id: string) => void;
    onAddInstruction: (text: string) => void;
    onRemoveInstruction: (id: string) => void;
};

export const ShoppingListCard = ({
    shoppingList,
    instructions,
    onAddShoppingItem,
    onRemoveShoppingItem,
    onAddInstruction,
    onRemoveInstruction,
}: ShoppingListCardProps) => {
    const [activeTab, setActiveTab] = useState<"shopping" | "instructions">("shopping");

    return (
        <Card className="w-full bg-white/80 dark:bg-neutral-900/80 border border-neutral-300 dark:border-neutral-800 backdrop-blur px-0 py-0 shadow overflow-hidden flex flex-col h-full">
            <div className="border-b border-neutral-300 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/80 backdrop-blur flex items-center min-h-[60px]">
                <button
                    className={clsx(
                        "flex-1 h-full px-4 py-3 text-sm font-semibold transition-colors border-b-2",
                        activeTab === "shopping"
                            ? "text-neutral-900 dark:text-neutral-50 border-neutral-900 dark:border-neutral-50"
                            : "text-muted-foreground border-transparent hover:text-neutral-900 dark:hover:text-neutral-200"
                    )}
                    onClick={() => setActiveTab("shopping")}
                >
                    Shopping List
                </button>
                <div className="w-px h-6 bg-neutral-300 dark:bg-neutral-800" />
                <button
                    className={clsx(
                        "flex-1 h-full px-4 py-3 text-sm font-semibold transition-colors border-b-2",
                        activeTab === "instructions"
                            ? "text-neutral-900 dark:text-neutral-50 border-neutral-900 dark:border-neutral-50"
                            : "text-muted-foreground border-transparent hover:text-neutral-900 dark:hover:text-neutral-200"
                    )}
                    onClick={() => setActiveTab("instructions")}
                >
                    Instructions
                </button>
            </div>
            <div className="p-4 flex-1 overflow-hidden">
                {activeTab === "shopping" ? (
                    <ShoppingList
                        items={shoppingList}
                        onAddItem={onAddShoppingItem}
                        onRemoveItem={onRemoveShoppingItem}
                    />
                ) : (
                    <InstructionsList
                        items={instructions}
                        onAddItem={onAddInstruction}
                        onRemoveItem={onRemoveInstruction}
                    />
                )}
            </div>
        </Card>
    );
};
