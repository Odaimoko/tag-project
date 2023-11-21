import {I_EvtListener} from "../utils/i_EvtListener";
import {
    factoryTask,
    getWorkflowNameFromRawText,
    getWorkflowTypeTag,
    getWorkflowTypeTags,
    I_OdaPmWorkflow,
    isTaskSingleLine,
    isTaskSummaryValid,
    Tag_Prefix_Step,
    Tag_Prefix_Tag,
    trimTagsFromTask,
    Workflow_Type_Enum_Array
} from "./workflow-def";
import {EventEmitter} from "events";
import {DataviewMetadataChangeEvent, Evt_DbReloaded} from "../typing/dataview-event";
import {getAPI, STask} from "obsidian-dataview";
import {ONotice} from "../utils/o-notice";
import {getSettings} from "../Settings";
import {GenericProvider} from "../utils/GenericProvider";
import {clearGlobalProjectMap, OdaPmProject} from "./OdaPmProject";
import {assertOnDbRefreshed, devLog} from "../utils/env-util";
import {OdaPmTask} from "./OdaPmTask";
import {getOrCreateWorkflow, removeWorkflow} from "./OdaPmWorkflow";
import {OdaProjectTree} from "./OdaProjectTree";

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
    const workflows: I_OdaPmWorkflow[] = []
    const defTags = getWorkflowTypeTags();
    for (const wfType of Workflow_Type_Enum_Array) {
        const defTag = getWorkflowTypeTag(wfType);
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
    const allTasks = dv.pages()["file"]["tasks"];
    return allTasks.where(function (k: STask) {
        for (const defTag of getWorkflowTypeTags()) {
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

function getAllPmTasks(workflows: I_OdaPmWorkflow[]) {
    const workflowTags = workflows.map(function (k: I_OdaPmWorkflow) {
        return k.tag;
    });
    const allTasks = dv.pages()["file"]["tasks"];
    return allTasks.where(function (k: STask) {
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
        }).array()
        ;
}

/**
 * Pass 1: create projects from frontmatter and tasks.
 * Pass 2: link tasks/Wf to projects.
 * @param pmTasks
 */
function getAllProjectsAndLinkTasks(pmTasks: OdaPmTask[]): OdaPmProject[] {
    clearGlobalProjectMap();

    const projects: OdaPmProject[] = [
        OdaPmProject.createUnclassifiedProject()
    ]

    function addProject(project: OdaPmProject) {
        if (!projects.includes(project)) {
            projects.push(project);
        }
    }

    const pages = dv.pages()["file"];
    // File defs

    for (const pg of pages) {
        const project = OdaPmProject.createProjectFromFrontmatter(pg);
        if (project) {
            addProject(project);
        }
    }

    // Task def
    for (const pmTask of pmTasks) {
        const taskTag = pmTask.getProjectTag();
        if (taskTag) {
            const project = OdaPmProject.createProjectFromTaskTag(pmTask, taskTag);
            if (project) {
                addProject(project);
            }
        }
    }

    return projects;
}

export class OdaPmDb implements I_EvtListener {
    inited = false;
    workflows: I_OdaPmWorkflow[];
    workflowTags: string[];
    stepTags: string[];
    emitter: EventEmitter;
    boundReloadWorkflows: () => void;
    pmTasks: OdaPmTask[]
    pmTags: string[];
    // 0.2.0
    pmProjects: OdaPmProject[]
    orphanTasks: OdaPmTask[]

    constructor(emitter: EventEmitter) {
        this.emitter = emitter;
        this.boundReloadWorkflows = this.reloadDb.bind(this)
        this.reloadDb()
    }

    // bind: https://fettblog.eu/this-in-javascript-and-typescript/
    regListener(): void {
        this.emitter.on(DataviewMetadataChangeEvent, this.boundReloadWorkflows)
    }

    rmListener(): void {
        this.emitter.off(DataviewMetadataChangeEvent, this.boundReloadWorkflows)
    }

// region Init
    private reloadDb() {
        this.inited = false;
        this.workflows = getAllWorkflows()
        this.workflowTags = getWorkflowTypeTags()
        this.stepTags = this.initStepTags(this.workflows);

        this.pmTasks = getAllPmTasks(this.workflows)

        this.pmTags = this.initManagedTags(this.pmTasks)

        this.pmProjects = getAllProjectsAndLinkTasks(this.pmTasks)

        this.linkProject(this.pmProjects, this.pmTasks, this.workflows);
        this.orphanTasks = this.initOrphanTasks(this.pmTasks);
        this.emitter.emit(Evt_DbReloaded)
        this.inited = true;
        assertOnDbRefreshed(this);
        devLog("Database Reloaded.")
    }


    /**
     * Pass parameters to indicate dependency relationship.
     * @param workflows
     * @private
     */
    private initStepTags(workflows: I_OdaPmWorkflow[]) {
        // TODO performance. linq is easy, but performance is not good.
        return workflows.flatMap(function (k: I_OdaPmWorkflow) {
            return k.stepsDef.map(m => m.tag);
        }).unique();
    }

    private initManagedTags(pmTasks: OdaPmTask[]) {
        // TODO performance. linq is easy, but performance is not good.
        return (pmTasks.flatMap(k => {
            const validPmTag = k.boundTask.tags.filter((m: string) => m.startsWith(Tag_Prefix_Tag));
            return validPmTag;
        })
            .filter(k => !this.workflowTags.includes(k) && !this.stepTags.includes(k)))
            .unique();
    }

    /**
     * After this step, every task or workflow will link to exactly one project.
     */
    private linkProject(projects: OdaPmProject[], pmTasks: OdaPmTask[], workflows: I_OdaPmWorkflow[]) {
        const projectTree: OdaProjectTree = OdaProjectTree.buildProjectShadowTree(projects);

        for (const pmTask of pmTasks) {
            const linkingProject: OdaPmProject = projectTree.getProjectByPmTask(pmTask);
            linkingProject.linkTask(pmTask);
        }
        for (const pmWorkflow of workflows) {
            const linkingProject: OdaPmProject = projectTree.getProjectByPmWorkflow(pmWorkflow);
            linkingProject.linkWorkflow(pmWorkflow);
        }
    }

    /**
     * An orphan task's project does not match its workflow's, so it will only show in ==All projects==.
     * Should be called after linkProject.
     */
    initOrphanTasks(pmTasks: OdaPmTask[]) {
        return pmTasks.filter(k => {
                // console.log(k.getFirstProject()?.name, k.type.getFirstProject()?.name, k.getFirstProject()?.internalKey, k.type.getFirstProject()?.internalKey, k.getFirstProject() !== k.type.getFirstProject())
                // name is the most consistent comparison. internalKey and reference are fragile. 
                return k.getFirstProject()?.name !== k.type.getFirstProject()?.name; // 
            }
        )
    }

// endregion

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

    getProjectByName(name: string) {
        for (const project of this.pmProjects) {
            if (project.name === name) {
                return project;
            }
        }
        return null;
    }

    getPmTaskBySummary(summary: string) {
        for (const task of this.pmTasks) {
            if (task.summary === summary) {
                return task;
            }
        }
        return null;
    }

    getWorkflowByName(name: string) {
        for (const workflow of this.workflows) {
            if (workflow.name === name) {
                return workflow
            }
        }
        return null
    }


    getFilteredTasks(displayWorkflows: I_OdaPmWorkflow[], rectifiedDisplayTags: string[], rectifiedExcludedTags: string[]): OdaPmTask[] {
        return this.pmTasks.filter(function (k: OdaPmTask) {
            return displayWorkflows.includes(k.type);
        })
            .filter(function (k: OdaPmTask) {
                // No tag chosen: show all tasks
                // Some tags chosen: combination or.
                return rectifiedDisplayTags.length === 0 ? true : k.hasAnyTag(rectifiedDisplayTags);
            }).filter(function (k: OdaPmTask) {
                // No tag chosen: show all tasks
                // Some tags chosen: combination or.
                return rectifiedExcludedTags.length === 0 ? true : !k.hasAnyTag(rectifiedExcludedTags);
            });
    }
}

export const OdaPmDbProvider = new GenericProvider<OdaPmDb>();
