import {I_EvtListener} from "../utils/i_EvtListener";
import {
    factoryTask,
    getDefTags,
    getOrCreateWorkflow,
    getTypeDefTag,
    getWorkflowNameFromRawText,
    I_OdaPmWorkflow,
    isTaskSingleLine,
    isTaskSummaryValid,
    OdaPmTask,
    removeWorkflow,
    Tag_Prefix_Step,
    trimTagsFromTask,
    Workflow_Type_Enum_Array
} from "./workflow_def";
import {EventEmitter} from "events";
import {DataviewMetadataChangeEvent} from "../typing/dataview-event";
import {getAPI, STask} from "obsidian-dataview";
import {ONotice} from "../utils/o-notice";
import {getSettings} from "../Settings";
import {GenericProvider} from "../utils/GenericProvider";

const dv = getAPI(); // We can use dv just like the examples in the docs

export const iPmEvent_WorkflowsReloaded = "iPm:workflows:reload";

function notifyMalformedTask(task: STask, reason: string) {
    // console.log(pmPlugin && pmPlugin.settings.report_malformed_task)
    if (getSettings()?.report_malformed_task)
        new ONotice(`${reason}\nYou can disable this popup in settings.\n\nSee Task in ${task.path}, line ${task.line + 1}:\n\t${task.text}`, 5)
}

function getTaskMultiLineErrMsg() {
    return `Task cannot have multiple lines.`
}

/**
 * Create workflows from one task. Do not process multiple definitions across different tasks.
 * @param task
 */
function createWorkflowsFromTask(task: STask): I_OdaPmWorkflow[] {
    const workflows = []
    const defTags = getDefTags();
    for (const wfType of Workflow_Type_Enum_Array) {
        const defTag = getTypeDefTag(wfType);
        if (task.tags.includes(defTag)) {

            const wfName = getWorkflowNameFromRawText(trimTagsFromTask(task));
            const workflow = getOrCreateWorkflow(wfType, wfName, task);
            if (workflow === null) {
                notifyMalformedTask(task, getTaskMultiLineErrMsg())
                continue;
            }
            workflow.boundTask = task // Override task
            workflow.type = wfType // override 


            // The latter found workflow overrides the former one's steps, but not the STask.
            workflow.clearSteps()
            for (const tag of task.tags) {
                // exclude def tags. we allow both OdaPmWorkflowType on the same task
                if (defTags.includes(tag) || !tag.startsWith(Tag_Prefix_Step)) {
                    continue;
                }
                workflow.addStep(tag)
            }
            if (workflow.stepsDef.length === 0) {
                notifyMalformedTask(task, "A workflow must have at least one step.")
                removeWorkflow(wfName);
                continue;
            }
            workflows.push(workflow)
        }
    }

    return workflows;
}

// Create an OdaPmTask from a STask
function createPmTaskFromTask(workflowTags: string[], workflows: I_OdaPmWorkflow[], task: STask): OdaPmTask | null {
    // A task can have only one data-model
    for (let i = 0; i < workflowTags.length; i++) {
        const defTag = workflowTags[i];
        if (task.tags.includes(defTag)) {
            const workflow = workflows[i];
            if (!isTaskSingleLine(task)) {
                notifyMalformedTask(task, getTaskMultiLineErrMsg())
                continue;
            } else if (!isTaskSummaryValid(task)) {
                notifyMalformedTask(task, `Task summary cannot be empty.`)
                continue;
            }
            const oTask = factoryTask(task, workflow);

            return oTask
        }
    }
    return null;
}

export function getAllWorkflows(): I_OdaPmWorkflow[] {
    return dv.pages()["file"]["tasks"].where(function (k: STask) {
            for (const defTag of getDefTags()) {
                if (k.tags.length === 0) continue;
                if (k.tags.includes(defTag)) {
                    return true;
                }
            }
            return false;
        }
    )
        .flatMap((task: STask) => createWorkflowsFromTask(task))
        .array()
        .unique();
}

export function getAllPmTasks(workflows: I_OdaPmWorkflow[]) {
    const workflowTags = workflows.map(function (k: I_OdaPmWorkflow) {
        return k.tag;
    });
    return dv.pages()["file"]["tasks"].where(function (k: STask) {
            for (const defTag of workflowTags) {
                if (k.tags.includes(defTag)) return true;
            }
            return false;
        }
    )
        .map((task: STask) => {
            return createPmTaskFromTask(workflowTags, workflows, task)
        }).filter(function (k: OdaPmTask | null) {
            return k !== null;
        })
        ;
}

export class OdaPmDb implements I_EvtListener {
    workflows: I_OdaPmWorkflow[];
    emitter: EventEmitter;
    boundReloadWorkflows: () => void;

    constructor(emitter: EventEmitter) {
        this.emitter = emitter;
        this.boundReloadWorkflows = this.reloadWorkflows.bind(this)
        this.reloadWorkflows()
    }

    // bind: https://fettblog.eu/this-in-javascript-and-typescript/
    regListener(): void {
        this.emitter.on(DataviewMetadataChangeEvent, this.boundReloadWorkflows)
    }

    rmListener(): void {
        this.emitter.off(DataviewMetadataChangeEvent, this.boundReloadWorkflows)
    }

    private reloadWorkflows() {
        this.workflows = getAllWorkflows()
        this.emitter.emit(iPmEvent_WorkflowsReloaded)
    }
}

export const OdaPmDbProvider = new GenericProvider<OdaPmDb>();