import {STask} from "obsidian-dataview";
import {I_OdaPmStep, I_OdaPmWorkflow, isTaskSingleLine, Tag_Prefix_TaskType, WorkflowType} from "./workflow-def";
import {getOrCreateStep} from "./OdaPmStep";

class OdaPmWorkflow implements I_OdaPmWorkflow {
    boundTask: STask;
    stepsDef: I_OdaPmStep[];
    type: WorkflowType;
    name: string;
    tag: string;

    constructor(task: STask, type: WorkflowType, name: string) {
        this.boundTask = task;
        this.type = type;
        this.stepsDef = [];
        this.name = name;
        this.tag = Tag_Prefix_TaskType + name;
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

const globalWorkflowMap: Map<string, OdaPmWorkflow> = new Map<string, OdaPmWorkflow>();
export const clearWorkflowCache = () => {
    console.log("Clear Workflow Cache")
    globalWorkflowMap.clear();
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

    if (globalWorkflowMap.has(name)) {
        // console.log(`Return Existing Workflow ${name}`)
        return <OdaPmWorkflow>globalWorkflowMap.get(name);
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
        globalWorkflowMap.delete(name);
}

function createWorkflow(task: STask, type: WorkflowType, name: string) {
    // All set.
    const workflow = new OdaPmWorkflow(task, type, name);
    // console.log(`Create New Workflow ${name}`)
    globalWorkflowMap.set(name, workflow);
    return workflow;
}

