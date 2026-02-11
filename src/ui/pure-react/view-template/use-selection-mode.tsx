import { useCallback, useEffect, useRef, useState } from "react";

interface UseSelectionModeParams {
    enableSelectionMode: boolean;
    externalSelectionMode?: boolean;
    onSelectionChange?: (selectedRowIndices: number[]) => void;
    onSelectionModeChange?: (isSelectionMode: boolean) => void;
}

interface UseSelectionModeReturn {
    isSelectionMode: boolean;
    setIsSelectionMode: (val: boolean) => void;
    selectedRows: Set<number>;
    setSelectedRows: React.Dispatch<React.SetStateAction<Set<number>>>;
    toggleRowSelection: (rowIndex: number) => void;
    clearSelection: () => void;
}

/**
 * Custom hook for managing selection mode in data tables
 * 
 * Handles:
 * - Internal/external selection mode state management
 * - ESC key handling to exit selection mode
 * - Selection change callbacks
 * - Selection mode change callbacks
 */
export function useSelectionMode({
    enableSelectionMode,
    externalSelectionMode,
    onSelectionChange,
    onSelectionModeChange
}: UseSelectionModeParams): UseSelectionModeReturn {
    // Selection mode state - use external if provided, otherwise internal
    const [internalSelectionMode, setInternalSelectionMode] = useState(false);
    const isSelectionMode = externalSelectionMode !== undefined ? externalSelectionMode : internalSelectionMode;

    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

    // Stable setIsSelectionMode function - call callback directly
    const setIsSelectionMode = useCallback((val: boolean) => {
        if (!val) {
            // When exiting selection mode, clear selection array
            setSelectedRows(new Set());
            onSelectionChange?.([]);
        }
        if (externalSelectionMode !== undefined) {
            // External control - call the callback directly
            onSelectionModeChange?.(val);
        } else {
            // Internal control - update internal state and notify
            setInternalSelectionMode(val);
            onSelectionModeChange?.(val);
        }
    }, [externalSelectionMode, onSelectionModeChange, onSelectionChange]);

    // Handle ESC key to exit selection mode (keep useEffect for DOM event listener)
    useEffect(() => {
        if (!enableSelectionMode || !isSelectionMode) return;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsSelectionMode(false);
                setSelectedRows(new Set());
                onSelectionModeChange?.(false);
                onSelectionChange?.([]);
                event.preventDefault();
                event.stopPropagation();
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("keydown", handleEscape);
        };
    }, [enableSelectionMode, isSelectionMode, setIsSelectionMode, onSelectionModeChange, onSelectionChange]);

    // Toggle row selection - notify parent directly
    const toggleRowSelection = useCallback((rowIndex: number) => {
        setSelectedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(rowIndex)) {
                newSet.delete(rowIndex);
            } else {
                newSet.add(rowIndex);
            }
            // Notify parent immediately
            if (isSelectionMode) {
                const selectedIndices = Array.from(newSet);
                onSelectionChange?.(selectedIndices);
            }
            return newSet;
        });
    }, [isSelectionMode, onSelectionChange]);

    // Clear all selections - notify parent directly
    const clearSelection = useCallback(() => {
        setSelectedRows(new Set());
        onSelectionChange?.([]);
    }, [onSelectionChange]);

    return {
        isSelectionMode,
        setIsSelectionMode,
        selectedRows,
        setSelectedRows,
        toggleRowSelection,
        clearSelection
    };
}
