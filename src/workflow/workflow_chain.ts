import {STask} from "obsidian-dataview";

const Tag_Prefix_Step = "#iPm/step/";
const Tag_Prefix_Workflow = "#iPm/workflow/";

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

export interface I_OdaPmStep {
    tag: string;
    name: string;
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

const globalStepMap: Map<string, OdaPmStep> = new Map<string, OdaPmStep>();

/**
 * use global Pm Step library instead of creating new instances
 * @param tag
 */
export function getOrCreateStep(tag: string): OdaPmStep {
    if (globalStepMap.has(tag)) {
        return <OdaPmStep>globalStepMap.get(tag);
    }
    const step = new OdaPmStep(tag);
    globalStepMap.set(tag, step);
    return step;
}

export class OdaPmWorkflow {

    name: string;
    stepsDef: OdaPmStep[];
    type: WorkflowType;
    tag: string;

    constructor(type: WorkflowType, name: string) {

        this.type = type;
        this.stepsDef = [];
        this.name = name;
        this.tag = "#iPm/task_type/" + name;
    }

    addStep(tag: string) {
        this.stepsDef.push(getOrCreateStep(tag));
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

    // For checkbox
    toTableRow(currentSteps: OdaPmStep[]) {
        return [...this.stepsDef.map(k => {
            // TODO performance
            return currentSteps.map(m => m.tag).includes(k.tag) ? "✅" : "❌"
        })]
    }
}

export class OdaPmTask {
    boundTask: STask;
    // without any step and typeDef tags
    summary: string;
    // raw
    text: string;
    type: OdaPmWorkflow;
    // One for chain. Many for checkbox
    currentSteps: OdaPmStep[];

    constructor(type: OdaPmWorkflow, task: STask) {
        this.boundTask = task;
        this.text = task.text;
        this.type = type;
        this.summary = trimTagsFromTask(task)
        this.currentSteps = [];
        for (const tag of task.tags) {
            if (type.includesStep(tag)) {
                this.currentSteps.push(getOrCreateStep(tag))
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

    // For checkbox 
    toTableRow() {
        // TODO this link is not clickable
        return [`${this.summary}`, ...this.type.toTableRow(this.currentSteps)]
    }
}

export function trimTagsFromTask(task: STask): string {
    // remove all tags from text
    let text: string = task.text;
    for (const tag of task.tags) {
        text = text.replace(tag, "")
    }
    return text.trim()
}