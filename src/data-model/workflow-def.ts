import {STask} from "obsidian-dataview";
import {OdaPmTask} from "./OdaPmTask";

export const Tag_Prefix_Step = "#tpm/step/";
export const Tag_Prefix_Workflow = "#tpm/workflow_type/";
export const Tag_Prefix_Tag = "#tpm/tag/";
export const TaskStatus_checked = "x";
export const TaskStatus_unchecked = " ";
export const Tag_Prefix_TaskType = "#tpm/workflow/";

export const Workflow_Type_Enum_Array = [
    "chain",
    "checkbox",
] as const;
export type WorkflowType = typeof Workflow_Type_Enum_Array[number];

const Type_Definition_Tags: string[] = []


function initWorkflowTypeTags() {
    if (Type_Definition_Tags.length == 0) {
        for (const workflow of Workflow_Type_Enum_Array) {
            Type_Definition_Tags.push(Tag_Prefix_Workflow + workflow)
        }
    }
}

export function getWorkflowTypeTags(): string[] {
    initWorkflowTypeTags();
    return Type_Definition_Tags;
}

export function getWorkflowTypeTag(type: WorkflowType): string {
    initWorkflowTypeTags();
    return Type_Definition_Tags[Workflow_Type_Enum_Array.indexOf(type)];
}

export function isTaskSummaryValid(task: STask) {
    // Empty names for workflow def and tasks are not allowed
    const summary = trimTagsFromTask(task)
    return summary && summary.length > 0;
}

export function matchTags(text: string) {
    const tags = text.match(POTENTIAL_FULLTAG_MATCHER)
    return tags;
}

export function trimTagsFromTask(task: STask): string {
    // remove all tags from text
    let text: string = task.text;
    // dataview's tag matching may contain false positive. for example [[#Render]] will be recognized as a tag
    const tags = matchTags(task.text);
    if (!tags) return text.trim();
    for (const tag of tags) {
        text = text.replace(tag, "")
    }
    return text.trim()
}

// https://github.com/blacksmithgu/obsidian-dataview/blob/322217ad563defbc213f6731c9cd5a5f5a7e3638/src/data-import/common.ts#L5
// Forbid @ since obsidian does not allow it

const POTENTIAL_TAG_MATCHER = /[^+@\s,;.:!&*?'"`()\[\]{}]+/giu;
// With hashtag and spaces before
const POTENTIAL_FULLTAG_MATCHER = /\s+#[^+@\s,;.:!&*?'"`()\[\]{}]+/giu;

/**
 * Only take the first word
 * @param text workflow name without tags
 */
export function getWorkflowNameFromRawText(text: string) {
    const found = text.match(POTENTIAL_TAG_MATCHER)
    return found ? found[0] : null;
}

// Unit Test
// console.log(getWorkflowNameFromRawText("带你飞 带你飞2  \n vads ads f \t li"))

export interface I_OdaPmStep {
    tag: string;
    name: string;
    toObject: () => object
}


export interface I_OdaPmWorkflow {
    boundTask: STask;
    name: string;
    stepsDef: I_OdaPmStep[];
    type: WorkflowType;
    tag: string;
    clearSteps: () => void
    addStep: (tag: string) => void
    includesStep: (tag: string) => boolean
    isInProject: (name: string) => boolean;
}

/**
 * Dont check.
 */
export function factoryTask(task: STask, type: I_OdaPmWorkflow) {
    return new OdaPmTask(type, task)
}


// region StepTag Manipulate
/**
 * add a tag at the end of the line. the tag will be followed by a space
 * @param text
 * @param stepTag
 */
export function addTagText(text: string, stepTag: string) {
    // With the rule that a task cannot cross multiple lines, we can safely assume that the last char is \n if there is a \n.
    const hasTrailingEol = text.indexOf("\n") == text.length - 1
    // We believe dataview gives the correct result. In the latter case there will be no step.tag in the original text if includes is false.
    return `${text.trimEnd()} ${stepTag} ` + (hasTrailingEol ? "\n" : "");
}

// TODO wont remove the space before or after the tag
export function removeTagText(text: string, stepTag: string) {
    return text.replace(stepTag, "");
}


// endregion


export function isTaskSingleLine(task: STask) {
    if (!task.text) return false;
    if (!task.text.includes("\n")) return true;
    const firstOccurrence = task.text.indexOf("\n");
    // check if there are text after the first occurrence
    const hasTextAfterEol = task.text.length <= firstOccurrence + 1;

    return hasTextAfterEol;
}
