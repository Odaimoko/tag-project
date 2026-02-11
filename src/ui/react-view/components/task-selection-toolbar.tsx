import React from "react";
import {HStack} from "../../pure-react/view-template/h-stack";
import {OdaPmTask} from "../../../data-model/OdaPmTask";
import OdaPmToolPlugin from "../../../main";
import {WorkflowSuggestionModal} from "../../obsidian/workflow-suggestion-modal";
import {PrioritySuggestionModal} from "../../obsidian/priority-suggestion-modal";
import {
    batchChangeWorkflow,
    batchSetPriority,
    notifyBatchOperationResult
} from "../../../utils/task-batch-util";
import {OdaPmDbProvider} from "../../../data-model/OdaPmDb";
import {notify} from "../../../utils/o-notice";
import {devLog} from "../../../utils/env-util";
import {I_OdaPmWorkflow} from "../../../data-model/workflow-def";

interface TaskSelectionToolbarProps {
    selectedTasks: OdaPmTask[];
    selectedCount: number;
    plugin: OdaPmToolPlugin;
    onClearSelection: () => void;
    visible: boolean;
}

export function TaskSelectionToolbar({
    selectedTasks,
    selectedCount,
    plugin,
    onClearSelection,
    visible
}: TaskSelectionToolbarProps) {
    function handleBatchChangeWorkflow() {
        if (selectedTasks.length === 0) return;
        
        try {
            const firstTask = selectedTasks[0];
            new WorkflowSuggestionModal(plugin.app, firstTask.boundTask.path, firstTask, async (workflow: I_OdaPmWorkflow, evt: MouseEvent | KeyboardEvent) => {
                if (!workflow) return;
                
                try {
                    const result = await batchChangeWorkflow(selectedTasks, workflow, plugin.app.vault);
                    notifyBatchOperationResult('Changed workflow', selectedTasks.length, result);
                } catch (error) {
                    devLog('Error in batch change workflow:', error);
                    notify('Failed to change workflow for selected tasks', 3);
                }
            }).open();
        } catch (error) {
            devLog('Error opening workflow suggestion modal:', error);
            notify('Failed to open workflow selection', 3);
        }
    }

    function handleBatchSetPriority() {
        if (selectedTasks.length === 0) return;
        
        try {
            const priorityTags = OdaPmDbProvider.get()?.pmPriorityTags ?? [];
            if (priorityTags.length === 0) {
                notify('No priority tags configured', 3);
                return;
            }
            
            new PrioritySuggestionModal(plugin.app, async (priorityTag: string, evt: MouseEvent | KeyboardEvent) => {
                try {
                    const result = await batchSetPriority(selectedTasks, priorityTag, plugin, priorityTags);
                    notifyBatchOperationResult('Set priority', selectedTasks.length, result);
                } catch (error) {
                    devLog('Error in batch set priority:', error);
                    notify('Failed to set priority for selected tasks', 3);
                }
            }).open();
        } catch (error) {
            devLog('Error opening priority suggestion modal:', error);
            notify('Failed to open priority selection', 3);
        }
    }

    return (
        <div style={{
            overflow: "hidden",
            maxHeight: visible ? "100px" : "0",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(-20px)",
            transition: "opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1), transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
            marginBottom: visible ? "8px" : "0",
        }}>
            <HStack style={{
                justifyContent: "flex-start",
                alignItems: "center",
                padding: "12px 16px",
                backgroundColor: "var(--background-modifier-hover)",
                border: "1px solid var(--interactive-accent)",
                borderRadius: "6px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                pointerEvents: visible ? "auto" : "none",
            }} spacing={12}>
            <label style={{
                fontWeight: "600",
                fontSize: "13px",
                color: "var(--interactive-accent)"
            }}>
                {selectedCount} task{selectedCount > 1 ? 's' : ''} selected
            </label>
            <button 
                onClick={handleBatchChangeWorkflow}
                disabled={selectedCount === 0}
                style={{
                    padding: "6px 12px",
                    fontSize: "12px",
                    backgroundColor: selectedCount > 0 ? "var(--interactive-accent)" : "var(--background-modifier-border)",
                    color: selectedCount > 0 ? "var(--text-on-accent)" : "var(--text-muted)",
                    border: "none",
                    borderRadius: "4px",
                    cursor: selectedCount > 0 ? "pointer" : "not-allowed",
                    fontWeight: "500",
                    transition: "background-color 0.2s ease, transform 0.1s ease",
                    boxShadow: selectedCount > 0 ? "0 1px 3px rgba(0, 0, 0, 0.2)" : "none",
                    opacity: selectedCount > 0 ? 1 : 0.6
                }}
                onMouseEnter={(e) => {
                    if (selectedCount > 0) {
                        e.currentTarget.style.backgroundColor = "var(--interactive-accent-hover)";
                        e.currentTarget.style.transform = "translateY(-1px)";
                    }
                }}
                onMouseLeave={(e) => {
                    if (selectedCount > 0) {
                        e.currentTarget.style.backgroundColor = "var(--interactive-accent)";
                        e.currentTarget.style.transform = "translateY(0)";
                    }
                }}
            >
                Change Workflow
            </button>
            <button 
                onClick={handleBatchSetPriority}
                disabled={selectedCount === 0}
                style={{
                    padding: "6px 12px",
                    fontSize: "12px",
                    backgroundColor: selectedCount > 0 ? "var(--interactive-accent)" : "var(--background-modifier-border)",
                    color: selectedCount > 0 ? "var(--text-on-accent)" : "var(--text-muted)",
                    border: "none",
                    borderRadius: "4px",
                    cursor: selectedCount > 0 ? "pointer" : "not-allowed",
                    fontWeight: "500",
                    transition: "background-color 0.2s ease, transform 0.1s ease",
                    boxShadow: selectedCount > 0 ? "0 1px 3px rgba(0, 0, 0, 0.2)" : "none",
                    opacity: selectedCount > 0 ? 1 : 0.6
                }}
                onMouseEnter={(e) => {
                    if (selectedCount > 0) {
                        e.currentTarget.style.backgroundColor = "var(--interactive-accent-hover)";
                        e.currentTarget.style.transform = "translateY(-1px)";
                    }
                }}
                onMouseLeave={(e) => {
                    if (selectedCount > 0) {
                        e.currentTarget.style.backgroundColor = "var(--interactive-accent)";
                        e.currentTarget.style.transform = "translateY(0)";
                    }
                }}
            >
                Set Priority
            </button>
            <button 
                onClick={onClearSelection}
                style={{
                    padding: "6px 12px",
                    fontSize: "12px",
                    backgroundColor: "var(--background-modifier-border)",
                    color: "var(--text-normal)",
                    border: "1px solid var(--background-modifier-border)",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: "500",
                    transition: "background-color 0.2s ease, border-color 0.2s ease"
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--background-modifier-hover)";
                    e.currentTarget.style.borderColor = "var(--interactive-accent)";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--background-modifier-border)";
                    e.currentTarget.style.borderColor = "var(--background-modifier-border)";
                }}
            >
                Clear Selection
            </button>
            </HStack>
        </div>
    );
}
