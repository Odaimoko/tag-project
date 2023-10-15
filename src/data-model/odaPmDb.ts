import {I_EvtListener} from "../utils/i_EvtListener";
import {
    factoryTask,
    getOrCreateWorkflow,
    getTypeDefTag,
    getWorkflowNameFromRawText,
    getWorkflowTags,
    I_OdaPmWorkflow,
    isTaskSingleLine,
    isTaskSummaryValid,
    OdaPmTask,
    removeWorkflow,
    Tag_Prefix_Step,
    Tag_Prefix_Tag,
    trimTagsFromTask,
    Workflow_Type_Enum_Array
} from "./workflow_def";
import {EventEmitter} from "events";
import {DataviewMetadataChangeEvent, iPm_DbReloaded} from "../typing/dataview-event";
import {DataArray, getAPI, STask} from "obsidian-dataview";
import {ONotice} from "../utils/o-notice";
import {getSettings} from "../Settings";
import {GenericProvider} from "../utils/GenericProvider";

const dv = getAPI(); // We can use dv just like the examples in the docs

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
    const defTags = getWorkflowTags();
    for (const wfType of Workflow_Type_Enum_Array) {
        const defTag = getTypeDefTag(wfType);
        if (task.tags.includes(defTag)) {

            const wfName = getWorkflowNameFromRawText(trimTagsFromTask(task));
            const workflow = getOrCreateWorkflow(wfType, wfName, task);
            if (workflow === null) {
                notifyMalformedTask(task, getTaskMultiLineErrMsg())
                continue;
            }
            // The latter found workflow overrides the former one.
            workflow.boundTask = task // Override task
            workflow.type = wfType // override 

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

function getAllWorkflows(): I_OdaPmWorkflow[] {
    return dv.pages()["file"]["tasks"].where(function (k: STask) {
        for (const defTag of getWorkflowTags()) {
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

function getAllPmTasks(workflows: I_OdaPmWorkflow[]): DataArray<OdaPmTask> {
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
    workflowTags: string[];
    stepTags: string[];
    emitter: EventEmitter;
    boundReloadWorkflows: () => void;
    pmTasks: OdaPmTask[]
    pmTags: string[];

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
        this.workflowTags = getWorkflowTags()
        // TODO performance. linq is easy, but performance is not good.
        this.stepTags = this.workflows.flatMap(function (k: I_OdaPmWorkflow) {
            return k.stepsDef.map(m => m.tag);
        }).unique();

        this.pmTasks = getAllPmTasks(this.workflows)

        // TODO performance. linq is easy, but performance is not good.
        this.pmTags = (this.pmTasks.flatMap(k => {
            const validPmTag = k.boundTask.tags.filter((m: string) => m.startsWith(Tag_Prefix_Tag));
            return validPmTag;
        })
            .filter(k => !this.workflowTags.includes(k) && !this.stepTags.includes(k)) as DataArray)
            .array().unique()

        this.emitter.emit(iPm_DbReloaded)
    }

    getWorkflow(filePath: string, line: number) {
        for (const wf of this.workflows) {
            if (wf.boundTask.path === filePath && wf.boundTask.line === line) {
                return wf;
            }
        }
        return null;
    }

    getPmTask(filePath: string, line: number) {
        for (const task of this.pmTasks) {
            if (task.boundTask.path === filePath && task.boundTask.line === line) {
                return task;
            }
        }
        return null;
    }
}

export const OdaPmDbProvider = new GenericProvider<OdaPmDb>();