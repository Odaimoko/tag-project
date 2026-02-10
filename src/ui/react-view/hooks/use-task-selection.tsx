import {useCallback, useMemo, useState} from "react";
import {OdaPmTask} from "../../../data-model/OdaPmTask";

/**
 * Hook to manage task selection using UUIDs (persists across sorting)
 */
export function useTaskSelection(displayedTasks: OdaPmTask[]) {
    // Store selected task UUIDs (not indices, to persist across sorting)
    const [selectedTaskUuids, setSelectedTaskUuids] = useState<string[]>([]);
    
    // Compute selected row indices from UUIDs
    const selectedRowIndices = useMemo(() => {
        if (selectedTaskUuids.length === 0) {
            return [];
        }
        
        // Create a map of UUID to index for quick lookup
        const uuidToIndexMap = new Map<string, number>();
        displayedTasks.forEach((task, index) => {
            uuidToIndexMap.set(task.uuid, index);
        });
        
        // Convert UUIDs to indices
        return selectedTaskUuids
            .map(uuid => uuidToIndexMap.get(uuid))
            .filter((index): index is number => index !== undefined)
            .sort((a, b) => a - b); // Sort indices for consistency
    }, [displayedTasks, selectedTaskUuids]);
    
    // Get selected tasks from UUIDs
    const getSelectedTasks = useCallback((): OdaPmTask[] => {
        if (selectedTaskUuids.length === 0) return [];
        
        // Create a map of UUID to task for quick lookup
        const uuidToTaskMap = new Map<string, OdaPmTask>();
        displayedTasks.forEach((task) => {
            uuidToTaskMap.set(task.uuid, task);
        });
        
        // Convert UUIDs to tasks
        return selectedTaskUuids
            .map(uuid => uuidToTaskMap.get(uuid))
            .filter((task): task is OdaPmTask => task !== undefined);
    }, [displayedTasks, selectedTaskUuids]);
    
    // Handle selection change from DataTable - convert row indices to UUIDs
    const handleSelectionChange = useCallback((selectedRowIndicesFromTable: number[]) => {
        // Convert row indices to UUIDs and store them
        const selectedUuids = selectedRowIndicesFromTable
            .map(index => displayedTasks[index]?.uuid)
            .filter((uuid): uuid is string => uuid !== undefined);
        setSelectedTaskUuids(selectedUuids);
    }, [displayedTasks]);
    
    // Clear selection
    const clearSelection = useCallback(() => {
        setSelectedTaskUuids([]);
    }, []);
    
    return {
        selectedTaskUuids,
        selectedRowIndices,
        getSelectedTasks,
        handleSelectionChange,
        clearSelection,
    };
}
