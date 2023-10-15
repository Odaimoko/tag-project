import {STask} from "obsidian-dataview";

export const Tag_Prefix_Step = "#iPm/step/";
const Tag_Prefix_Workflow = "#iPm/workflow/";
export const TaskStatus_checked = "x";
export const TaskStatus_unchecked = " ";

export const Workflow_Type_Enum_Array = [
    "chain",
    "checkbox",
] as const;
export type WorkflowType = typeof Workflow_Type_Enum_Array[number];

const Type_Definition_Tags: string[] = []


function initDefTags() {
    if (Type_Definition_Tags.length == 0) {
        for (const workflow of Workflow_Type_Enum_Array) {
            Type_Definition_Tags.push(Tag_Prefix_Workflow + workflow)
        }
    }
}

export function getDefTags(): string[] {
    initDefTags();
    return Type_Definition_Tags;
}

export function getTypeDefTag(type: WorkflowType): string {
    initDefTags();
    return Type_Definition_Tags[Workflow_Type_Enum_Array.indexOf(type)];
}

const globalStepMap: Map<string, OdaPmStep> = new Map<string, OdaPmStep>();
const globalOdaPmWorkflowMap: Map<string, OdaPmWorkflow> = new Map<string, OdaPmWorkflow>();

/**
 * use global Pm Step library instead of creating new instances
 * @param tag
 */
export function getOrCreateStep(tag: string | undefined): OdaPmStep | null {
    if (!tag) return null;
    if (globalStepMap.has(tag)) {
        return <OdaPmStep>globalStepMap.get(tag);
    }
    const step = new OdaPmStep(tag);
    globalStepMap.set(tag, step);
    return step;
}

export const clearWorkflowCache = () => {
    console.log("Clear Workflow Cache")
    globalOdaPmWorkflowMap.clear();
}

/**
 *
 * @param type
 * @param name
 * @param task
 * @return null if name is null or task is not valid
 * @return OdaPmWorkflow if a workflow is found or created
 */
// TODO temporarily use name as the identifier. Need to use both name and type
export function getOrCreateWorkflow(type: WorkflowType, name: string | null, task: STask = null): OdaPmWorkflow | null {
    if (name === null) return null;

    if (globalOdaPmWorkflowMap.has(name)) {
        // console.log(`Return Existing Workflow ${name}`)
        return <OdaPmWorkflow>globalOdaPmWorkflowMap.get(name);
    }
    if (!isTaskSingleLine(task)) {
        return null;
    }
    // If we cannot find an existing workflow, but a task is not given, we cannot create a new one.
    if (task === null) return null;
    return createWorkflow(task, type, name);
}

export function removeWorkflow(name: string | null) {
    if (name)
        globalOdaPmWorkflowMap.delete(name);
}

function createWorkflow(task: STask, type: WorkflowType, name: string) {
    // All set.
    const workflow = new OdaPmWorkflow(task, type, name);
    // console.log(`Create New Workflow ${name}`)
    globalOdaPmWorkflowMap.set(name, workflow);
    return workflow;
}

export function isTaskSingleLine(task: STask) {
    if (!task.text) return false;
    if (!task.text.includes("\n")) return true;
    const firstOccurrence = task.text.indexOf("\n");
    // check if there are text after the first occurrence
    const hasTextAfterEol = task.text.length <= firstOccurrence + 1;

    return hasTextAfterEol;
}

export function isTaskSummaryValid(task: STask) {
    // Empty names for workflow def and tasks are not allowed
    const summary = trimTagsFromTask(task)
    return summary && summary.length > 0;
}


export function trimTagsFromTask(task: STask): string {
    // remove all tags from text
    let text: string = task.text;
    for (const tag of task.tags) {
        text = text.replace(tag, "")
    }
    return text.trim()
}

// https://github.com/blacksmithgu/obsidian-dataview/blob/322217ad563defbc213f6731c9cd5a5f5a7e3638/src/data-import/common.ts#L5
// Forbid @ since obsidian does not allow it
const POTENTIAL_TAG_MATCHER = /[^@\s,;.:!?'"`()\[\]{}]+/giu;

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

class OdaPmStep implements I_OdaPmStep {
    tag: string;
    name: string;


    constructor(tag: string) {
        this.tag = tag;
        this.name = tag.replace(Tag_Prefix_Step, "");
    }

    toObject() {
        return {
            // tag: this.tag,
            name: this.name,
        }
    }
}


export interface I_OdaPmWorkflow {
    boundTask: STask;
    name: string;
    stepsDef: OdaPmStep[];
    type: WorkflowType;
    tag: string;
    clearSteps: () => void
    addStep: (tag: string) => void
    includesStep: (tag: string) => boolean
}

class OdaPmWorkflow implements I_OdaPmWorkflow {
    boundTask: STask;
    stepsDef: OdaPmStep[];
    type: WorkflowType;
    name: string;
    tag: string;

    constructor(task: STask, type: WorkflowType, name: string) {
        this.boundTask = task;
        this.type = type;
        this.stepsDef = [];
        this.name = name;
        this.tag = "#iPm/task_type/" + name;
    }

    addStep(tag: string) {
        const step = getOrCreateStep(tag);
        if (step === null) return;
        this.stepsDef.push(step);
    }

    includesStep(tag: string): boolean {
        // TODO performance
        return this.stepsDef.map(k => k.tag).includes(tag);
    }

    // dataview won't render class. so we need to convert to object
    toObject() {
        return {
            type: this.type,
            steps: this.stepsDef.map(k => k.toObject()),
            name: this.name,
        }
    }

    clearSteps(): void {
        this.stepsDef = []
    }
}

/**
 * Dont check.
 */
export function factoryTask(task: STask, type: I_OdaPmWorkflow) {
    return new OdaPmTask(type, task)
}

export class OdaPmTask {
    boundTask: STask;
    // without any step and typeDef tags
    summary: string;
    // raw
    text: string;
    type: I_OdaPmWorkflow;
    // One for chain. Many for checkbox
    currentSteps: I_OdaPmStep[];

    constructor(type: I_OdaPmWorkflow, task: STask) {
        this.boundTask = task;
        this.text = task.text;
        this.type = type;
        this.summary = trimTagsFromTask(task)
        this.currentSteps = [];
        for (const tag of task.tags) {
            if (type.includesStep(tag)) {
                const step = getOrCreateStep(tag);
                if (step !== null)
                    this.currentSteps.push(step)
            }
        }
    }

    toObject() {
        return {
            summary: this.summary,
            text: this.text,
            type: this.type,
            currentSteps: this.currentSteps.map(k => k.toObject()),
        }
    }

    isMdCompleted() {
        return this.boundTask.checked;
    }

    stepCompleted(): boolean {
        switch (this.type.type) {
            case "chain": {
                const tagStep = getOrCreateStep(this.type.stepsDef.last()?.tag);
                if (tagStep === null) return false;
                return this.currentSteps.includes(tagStep)
            }
            case "checkbox":
                return this.allStepsCompleted()
        }
    }

    getLastStep(): I_OdaPmStep | undefined {
        return this.currentSteps.last();
    }

    /**
     *  Users may add step tags in md, we find the furthest step in the chain.
     */
    private getFurthestStep() {
        for (let i = this.type.stepsDef.length - 1; i >= 0; i--) {
            if (this.currentSteps.includes(this.type.stepsDef[i]))
                return this.type.stepsDef[i];
        }
        return null;
    }

    private allStepsCompleted(): boolean {
        return this.currentSteps.length == this.type.stepsDef.length
    }

    lackOnlyOneStep(stepTag: string | undefined): boolean {
        if (!stepTag) return false;
        switch (this.type.type) {
            case "chain":
                // This is the last step, ofc we lack this.
                return this.type.stepsDef.last()?.tag === stepTag
            case "checkbox": {
                const hasTag = this.currentSteps.filter(k => k.tag == stepTag).length > 0;
                return this.currentSteps.length == this.type.stepsDef.length - 1 && !hasTag
            }
        }
    }

    addStepTag(stepTag: string): string {
        const text = this.boundTask.text;
        return addTagText(text, stepTag);
    }

    removeStepTag(stepTag: string) {
        return removeTagText(this.boundTask.text, stepTag);
    }

    removeAllStepTags() {
        let oriText = this.text;
        for (const step of this.type.stepsDef) {
            if (this.currentSteps.includes(step)) {
                oriText = removeTagText(oriText, step.tag)
            }
        }
        return oriText;
    }

    private addAllStepTags(oriText: string) {
        for (const step of this.type.stepsDef) {
            if (this.currentSteps.includes(step)) {
                continue;
            }
            oriText = addTagText(oriText, step.tag)
        }
        return oriText;
    }

    private keepLastStepTag() {
        const lastStep = this.type.stepsDef.last();
        return this.keepOneStepTag(lastStep?.tag);
    }

    completeStepTag() {
        switch (this.type.type) {
            case "chain":
                return this.keepLastStepTag();
            case "checkbox":
                return this.addAllStepTags(this.text);
        }
    }

    keepOneStepTag(stepTag: string | undefined) {
        const cleanText = this.removeAllStepTags();
        if (stepTag === undefined) return cleanText;
        return addTagText(cleanText, stepTag)
    }

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