import {useEffect, useRef, useState} from "react";

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
    const setIsSelectionMode = externalSelectionMode !== undefined
        ? (onSelectionModeChange ? (val: boolean) => onSelectionModeChange(val) : () => {})
        : setInternalSelectionMode;

    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

    // Use refs to store latest callback functions to avoid dependency issues
    const onSelectionChangeRef = useRef(onSelectionChange);
    const onSelectionModeChangeRef = useRef(onSelectionModeChange);
    
    // Update refs when callbacks change
    useEffect(() => {
        onSelectionChangeRef.current = onSelectionChange;
        onSelectionModeChangeRef.current = onSelectionModeChange;
    }, [onSelectionChange, onSelectionModeChange]);

    // Handle ESC key to exit selection mode
    useEffect(() => {
        if (!enableSelectionMode || !isSelectionMode) return;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsSelectionMode(false);
                setSelectedRows(new Set());
                onSelectionModeChangeRef.current?.(false);
                onSelectionChangeRef.current?.([]);
                event.preventDefault();
                event.stopPropagation();
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("keydown", handleEscape);
        };
    }, [enableSelectionMode, isSelectionMode, setIsSelectionMode]);

    // Notify parent when selection mode changes
    useEffect(() => {
        onSelectionModeChangeRef.current?.(isSelectionMode);
    }, [isSelectionMode]);

    // Notify parent when selection changes
    useEffect(() => {
        if (isSelectionMode) {
            const selectedIndices = Array.from(selectedRows);
            onSelectionChangeRef.current?.(selectedIndices);
        }
    }, [selectedRows, isSelectionMode]);

    // Toggle row selection
    const toggleRowSelection = (rowIndex: number) => {
        setSelectedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(rowIndex)) {
                newSet.delete(rowIndex);
            } else {
                newSet.add(rowIndex);
            }
            return newSet;
        });
    };

    return {
        isSelectionMode,
        setIsSelectionMode,
        selectedRows,
        setSelectedRows,
        toggleRowSelection
    };
}
