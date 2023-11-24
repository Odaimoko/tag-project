import {STask} from "obsidian-dataview";
import {OdaPmTask} from "./OdaPmTask";
import {OdaPmProject, Tag_Prefix_Project} from "./OdaPmProject";
import {I_Nameable} from "./I_Nameable";
import {matchTags, POTENTIAL_TAG_MATCHER} from "./markdown-parse";

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

/**
 * Only take the first word
 * @param text workflow name without tags
 */
export function getWorkflowNameFromRawText(text: string) {
    const found = text.match(POTENTIAL_TAG_MATCHER)
    return found ? found[0] : null;
}

export interface I_OdaPmBoundTask {
    boundTask: STask;
}

export interface I_OdaPmProjectTask {

    // 0.2.0
    projects: OdaPmProject[];
    addProject: (project: OdaPmProject) => void;
    isInProject: (name: string, includeSubProjects?: boolean) => boolean;
    /**
     * Called when no project is added. Returns the path of the markdown path.
     */
    getProjectPath: () => string;
    getFirstProject: () => OdaPmProject | null;
    getFirstProjectName: () => string;
}

export type I_OdaPmTaskble = I_OdaPmBoundTask & I_OdaPmProjectTask;
// Unit Test
// console.log(getWorkflowNameFromRawText("带你飞 带你飞2  \n vads ads f \t li"))

export interface I_OdaPmStep {
    tag: string;
    name: string;
    toObject: () => object
}


export interface I_OdaPmWorkflow extends I_OdaPmTaskble, I_Nameable {
    boundTask: STask;
    name: string;
    stepsDef: I_OdaPmStep[];
    type: WorkflowType;
    tag: string;

    clearSteps: () => void
    addStep: (tag: string) => void
    includesStep: (tag: string) => boolean

    /**
     * If this task has a project tag, return the project tag. Otherwise return null.
     */
    getProjectTag(): string | null;
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
 * @param tag
 */
export function addTagText(text: string, tag: string) {
    // With the rule that a task cannot cross multiple lines, we can safely assume that the last char is \n if there is a \n.
    const hasTrailingEol = text.indexOf("\n") == text.length - 1
    // We believe dataview gives the correct result. In the latter case there will be no step.tag in the original text if includes is false.
    const textCleanAtRight = text.trimEnd();
    // Obisidian's block reference only allows alphanumeric and -. Block identifiers need to be at the end of the line, without trailing spaces.
    // https://help.obsidian.md/Linking+notes+and+files/Internal+links#Link+to+a+block+in+a+note
    const blockRefMatch = textCleanAtRight.match(/ \^[a-zA-Z0-9-]+/);
    if (blockRefMatch) {
        return `${textCleanAtRight.replace(blockRefMatch[0], "")} ${tag} ${blockRefMatch[0]}` + (hasTrailingEol ? "\n" : "");
    } else
        return `${textCleanAtRight} ${tag} ${hasTrailingEol ? "\n" : ""}`;
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

function getTagsFromSTask(task: STask): string[] {
    return matchTags(task.text);
}

// region Project 
/**
 * The first project tag in the task will be returned.
 * @param task
 */
export function getProjectTagFromSTask(task: STask) {
    for (const tag of getTagsFromSTask(task)) {
        if (tag.startsWith(Tag_Prefix_Project)) {
            return tag;
        }
    }
    return null;
}

export function getProjectNameFromTag(tag: string) {
    const name = tag.replace(Tag_Prefix_Project, "");
    return name;
}

/**
 * Must contain a leading '/'
 * @param filePath
 */
export function getProjectPathFromFilePath(filePath: string) {// Obsidian path is relative.
    // Remove . at the beginning. 
    // Add '/' before path to form a tree
    filePath = filePath.startsWith(".") ? filePath.substring(1) : filePath
    filePath = (filePath.startsWith("/") ? "" : "/") + filePath; // prevent doubling leading '/'
    return filePath
}

// - A task's path is
// 1. If it defines a project, the project name is appended.
// 2. If not, the task's path is the same as the file's.
export function getProjectPathFromSTask(task: STask) {
    const prjTag = getProjectTagFromSTask(task);
    if (prjTag !== null) {
        // If defined by a task, path = `/path/to/file:{project name}`. 
        return `${getProjectPathFromFilePath(task.path)}:${getProjectNameFromTag(prjTag)}`;
    } else
        return getProjectPathFromFilePath(task.path);
}

// endregion
