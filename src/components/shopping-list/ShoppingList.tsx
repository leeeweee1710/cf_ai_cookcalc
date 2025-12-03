import { useState, useCallback } from "react";
import { Button } from "@/components/button/Button";
import { Trash, Plus } from "@phosphor-icons/react";
import type { GroceryItem } from "../../shared";

type ShoppingListProps = {
    items: GroceryItem[];
    onAddItem: (item: Omit<GroceryItem, "id">) => void;
    onRemoveItem: (id: string) => void;
};

export const ShoppingList = ({ items, onAddItem, onRemoveItem }: ShoppingListProps) => {
    const [newItemName, setNewItemName] = useState("");
    const [newItemQuantity, setNewItemQuantity] = useState("");

    const handleAdd = useCallback(() => {
        if (!newItemName.trim() || !newItemQuantity.trim()) return;

        onAddItem({
            name: newItemName,
            quantity: newItemQuantity,
        });

        setNewItemName("");
        setNewItemQuantity("");
    }, [newItemName, newItemQuantity, onAddItem]);

    return (
        <div className="flex flex-col gap-4 flex-1 overflow-hidden h-full">
            <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Item name"
                        className="flex-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white/80 dark:bg-neutral-950/60 px-3 py-2 text-sm font-semibold text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-600"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Qty"
                        className="w-20 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white/80 dark:bg-neutral-950/60 px-3 py-2 text-sm font-semibold text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-600"
                        value={newItemQuantity}
                        onChange={(e) => setNewItemQuantity(e.target.value)}
                    />
                    <Button onClick={handleAdd} disabled={!newItemName || !newItemQuantity} variant="primary" size="sm">
                        <Plus size={16} />
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 border rounded-md border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/30">
                {items.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                        Shopping list is empty.
                    </div>
                ) : (
                    <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
                        {items.map((item) => (
                            <li key={item.id} className="p-3 flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate text-neutral-900 dark:text-neutral-100">{item.name}</p>
                                    <div className="flex gap-2 text-xs text-muted-foreground">
                                        <span>Qty: {item.quantity}</span>
                                        {item.expiryDate && <span>• Expires: {item.expiryDate}</span>}
                                    </div>
                                </div>
                                <button
                                    onClick={() => onRemoveItem(item.id)}
                                    className="text-neutral-400 hover:text-red-500 transition-colors p-1"
                                    aria-label="Remove item"
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
