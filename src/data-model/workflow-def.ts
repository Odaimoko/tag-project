import {STask} from "obsidian-dataview";
import {OdaPmTask} from "./OdaPmTask";
import {OdaPmProject, Tag_Prefix_Project} from "./OdaPmProject";
import {INameable} from "../ui/pure-react/props-typing/i-nameable";
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

    // 0.2.0. A task and workflow can only belong to one project. We use array to support future multiple projects.
    // But isInProject defines differently if a task or workflow is in a subproject or parent project.
    // If a workflow is in a project, it is also in all its subprojects (if a setting item is toggled on).
    // If a task is in a project, it is also in all its parent projects.
    projects: OdaPmProject[];
    addProject: (project: OdaPmProject) => void;
    isInProject: (name: string, includeSubprojects?: boolean) => boolean;
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


export interface I_OdaPmWorkflow extends I_OdaPmTaskble, INameable {
    boundTask: STask;
    name: string;
    stepsDef: I_OdaPmStep[];
    type: WorkflowType;
    tag: string;

    clearSteps: () => void
    addStep: (tag: string) => void
    includesStepTag: (tag: string) => boolean

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
