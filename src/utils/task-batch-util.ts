import {OdaPmTask} from "../data-model/OdaPmTask";
import {I_OdaPmWorkflow} from "../data-model/workflow-def";
import {rewriteTask} from "./io-util";
import {setTaskPriority} from "../data-model/OdaPmTask";
import {Vault} from "obsidian";
import {Plugin} from "obsidian";
import {devLog} from "./env-util";
import {notify} from "./o-notice";

/**
 * Match tasks based on selected text
 * @param selectedText The text selected by user
 * @param tasks The list of tasks to match against
 * @returns Array of matched tasks
 */
export function matchTasksFromText(selectedText: string, tasks: OdaPmTask[]): OdaPmTask[] {
    if (!selectedText || selectedText.length < 3) {
        return [];
    }

    const matchedTasks: OdaPmTask[] = [];
    const selectedLower = selectedText.toLowerCase();

    for (const task of tasks) {
        const taskSummaryLower = task.summary.toLowerCase();

        // Exact match or substring match
        if (selectedLower === taskSummaryLower ||
            selectedLower.includes(taskSummaryLower) ||
            taskSummaryLower.includes(selectedLower)) {
            matchedTasks.push(task);
            continue;
        }

        // Word-based matching: if selected text contains significant words from task summary
        const selectedWords = selectedLower.split(/\s+/).filter(w => w.length > 2);
        const taskWords = taskSummaryLower.split(/\s+/).filter(w => w.length > 2);

        if (selectedWords.length > 0) {
            // Count how many selected words appear in task summary
            const matchingWords = selectedWords.filter(sw =>
                taskWords.some(tw => tw.includes(sw) || sw.includes(tw))
            );

            // If at least 50% of significant words match, consider it a match
            const matchRatio = matchingWords.length / selectedWords.length;
            if (matchRatio >= 0.5 && matchingWords.length >= 1) {
                matchedTasks.push(task);
            }
        }
    }

    return matchedTasks;
}

/**
 * Batch change workflow for multiple tasks
 * @param tasks Tasks to change workflow for
 * @param workflow The target workflow
 * @param vault Vault instance
 * @returns Promise resolving to operation result
 */
export async function batchChangeWorkflow(
    tasks: OdaPmTask[],
    workflow: I_OdaPmWorkflow,
    vault: Vault
): Promise<{ successCount: number; errorCount: number }> {
    if (tasks.length === 0) {
        return { successCount: 0, errorCount: 0 };
    }

    const targetTag = workflow.tag;
    let successCount = 0;
    let errorCount = 0;

    // Process tasks sequentially to avoid race conditions
    for (const task of tasks) {
        try {
            const sTask = task.boundTask;
            const srcTag = task.type.tag;
            const desiredText = `${sTask.text.replace(srcTag, targetTag)}`;
            await rewriteTask(vault, sTask, sTask.status, desiredText);
            successCount++;
        } catch (err) {
            devLog('Failed to change workflow for task:', task.summary, err);
            errorCount++;
        }
    }

    return { successCount, errorCount };
}

/**
 * Batch set priority for multiple tasks
 * @param tasks Tasks to set priority for
 * @param priorityTag The target priority tag
 * @param plugin Plugin instance
 * @param priorityTags All available priority tags
 * @returns Promise resolving to operation result
 */
export async function batchSetPriority(
    tasks: OdaPmTask[],
    priorityTag: string,
    plugin: Plugin,
    priorityTags: string[]
): Promise<{ successCount: number; errorCount: number }> {
    if (tasks.length === 0) {
        return { successCount: 0, errorCount: 0 };
    }

    let successCount = 0;
    let errorCount = 0;

    // Process tasks sequentially to avoid race conditions
    for (const task of tasks) {
        try {
            await setTaskPriority(task.boundTask, plugin, priorityTags, priorityTag);
            successCount++;
        } catch (err) {
            devLog('Failed to set priority for task:', task.summary, err);
            errorCount++;
        }
    }

    return { successCount, errorCount };
}

/**
 * Show notification for batch operation result
 * @param operationName Name of the operation (e.g., "Changed workflow", "Set priority")
 * @param totalCount Total number of tasks
 * @param result Operation result with success and error counts
 */
export function notifyBatchOperationResult(
    operationName: string,
    totalCount: number,
    result: { successCount: number; errorCount: number }
): void {
    if (result.errorCount > 0) {
        notify(`${operationName} for ${result.successCount}/${totalCount} task(s). ${result.errorCount} failed.`, 4);
    } else {
        notify(`${operationName} for ${result.successCount}/${totalCount} task(s)`, 3);
    }
}
