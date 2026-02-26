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
import {DataviewMetadataChangeEvent, Evt_DbReloaded, Evt_ReqDbReload} from "../typing/dataview-event";
import {getAPI, STask} from "obsidian-dataview";
import {ONotice} from "../utils/o-notice";
import {getSettings} from "../settings/settings";
import {GenericProvider} from "../utils/GenericProvider";
import {clearGlobalProjectMap, OdaPmProject, ProjectName_Unclassified} from "./OdaPmProject";
import {devTaggedLog, devTime, devTimeEnd} from "../utils/env-util";
import {OdaPmTask} from "./OdaPmTask";
import {getOrCreateWorkflow, removeWorkflow} from "./OdaPmWorkflow";
import {OdaProjectTree} from "./OdaProjectTree";
import {assertDatabase} from "../test_runtime";
import {ModuleId_Unclassified, OdaPmModule} from "./OdaPmModule";
import OdaPmToolPlugin from "../main";

import {RateLimiter} from "../utils/RateLimiter";

const dv = getAPI(); // We can use dv just like the examples in the docs

function notifyMalformedTask(task: STask, reason: string) {
    // console.log(pmPlugin && pmPlugin.settings.report_malformed_task)
    if (getSettings()?.report_malformed_task)
        // new ONotice(`${reason}\nYou can disable this popup in settings.\n\nSee Task in ${task.path}, line ${task.line + 1}:\n\t${task.text}`, 5)
        new ONotice(`${reason}\nYou can disable this popup in settings.\n\nSee Task in ${task.path}, line ${task.line + 1}`, 5)
}

function getTaskMultiLineErrMsg() {
    return `Task cannot have multiple lines.`
}

function getAllFiles() {
    return dv.pages()["file"];
}

function getAllTasks() {
    return getAllFiles()["tasks"];
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


function getAllWorkflows(allTasks: any = undefined): I_OdaPmWorkflow[] {

    devTime("Event", `[Timed] getAllWorkflows dv.pages()["file"]["tasks"]`)
    allTasks = allTasks ?? getAllTasks();
    devTimeEnd("Event", `[Timed] getAllWorkflows dv.pages()["file"]["tasks"]`)
    devTime("Event", `[Timed] getAllWorkflows allTasks.where`)
    const unique = allTasks.where(function (k: STask) {
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
    devTimeEnd("Event", `[Timed] getAllWorkflows allTasks.where`)
    return unique;
}

function getAllPmTasks(workflows: I_OdaPmWorkflow[], allTasks: any = undefined) {
    const workflowTags = workflows.map(function (k: I_OdaPmWorkflow) {
        return k.tag;
    });
    devTime("Event", `[Timed] getAllPmTasks dv.pages()["file"]["tasks"]`)
    allTasks = allTasks ?? getAllTasks();
    devTimeEnd("Event", `[Timed] getAllPmTasks dv.pages()["file"]["tasks"]`)
    devTime("Event", `[Timed] getAllPmTasks taskArray`)
    const taskArray = allTasks.where(function (k: STask) {
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
    devTimeEnd("Event", `[Timed] getAllPmTasks taskArray`)
    return taskArray
        ;
}

/**
 * Pass 1: create projects from frontmatter and tasks.
 * Pass 2: link tasks/Wf to projects.
 */
function getAllProjectsAndLinkTasks(pmTasks: OdaPmTask[], workflows: I_OdaPmWorkflow[], allFiles: any = undefined): OdaPmProject[] {
    clearGlobalProjectMap();

    const projects: OdaPmProject[] = [
        OdaPmProject.createUnclassifiedProject()
    ]

    function addProject(project: OdaPmProject) {
        if (!projects.includes(project)) {
            projects.push(project);
        }
    }

    allFiles = allFiles ?? dv.pages()["file"];
    // File defs

    devTime("Event", "[Timed] addProject Frontmatter")
    for (const pg of allFiles) {
        const project = OdaPmProject.createProjectFromFrontmatter(pg);
        if (project) {
            addProject(project);
        }
    }
    devTimeEnd("Event", "[Timed] addProject Frontmatter")
    // Task def
    devTime("Event", "[Timed] addProject FromTaskable")
    for (const pmTask of pmTasks) {
        const taskTag = pmTask.getProjectTag();
        if (taskTag) {
            const project = OdaPmProject.createProjectFromTaskable(pmTask, taskTag);
            if (project) {
                addProject(project);
            }
        }
    }
    for (const workflow of workflows) {
        const taskTag = workflow.getProjectTag();
        if (taskTag) {
            const project = OdaPmProject.createProjectFromTaskable(workflow, taskTag);
            if (project) {
                addProject(project);
            }
        }
    }
    devTimeEnd("Event", "[Timed] addProject FromTaskable")

    return projects;
}

export class OdaPmDb implements I_EvtListener {
    workflows: I_OdaPmWorkflow[];
    workflowTags: string[];
    stepTags: string[];
    emitter: EventEmitter;
    boundReloadWorkflows: () => void;
    pmTasks: OdaPmTask[]
    pmTags: string[];
    // 0.2.0
    pmProjects: OdaPmProject[]
    projectTree: OdaProjectTree;
    orphanTasks: OdaPmTask[]
    // 0.3.0 
    pmModules: Record<string, OdaPmModule>
    // 0.5.0
    pmPriorityTags: string[]
    private plugin: OdaPmToolPlugin;
// region rate limit
    // refresh db at least once 3 seconds
    rateLimiter: RateLimiter = new RateLimiter(3, 1 / 3, 3)

// endregion
    /** Whether reloadDb has completed successfully at least once (handles ratelimit / dataview not ready) */
    private dbInitialized = false;
    private initRetryTimer: ReturnType<typeof setInterval> | null = null;
    private static readonly INIT_RETRY_INTERVAL_MS = 1000;

    constructor(emitter: EventEmitter, plugin: OdaPmToolPlugin) {
        this.emitter = emitter;
        this.plugin = plugin;
        this.boundReloadWorkflows = this.reloadDb.bind(this)
        this.reloadDb();
        this.startInitRetryTimer();
    }

    /** Every 1s check if database is initialized; retry if not (handles ratelimit causing initial failure) */
    private startInitRetryTimer() {
        if (this.initRetryTimer != null) return;
        this.initRetryTimer = setInterval(() => {
            if (!this.dbInitialized) {
                this.reloadDb();
            }
        }, OdaPmDb.INIT_RETRY_INTERVAL_MS);
    }

    /** Stop the init-retry timer (call after successful init or on plugin unload) */
    stopInitRetryTimer() {
        if (this.initRetryTimer != null) {
            clearInterval(this.initRetryTimer);
            this.initRetryTimer = null;
        }
    }

    // bind: https://fettblog.eu/this-in-javascript-and-typescript/
    regListener(): void {
        this.emitter.on(DataviewMetadataChangeEvent, this.boundReloadWorkflows)
        this.emitter.on(Evt_ReqDbReload, this.boundReloadWorkflows)

    }

    rmListener(): void {
        this.emitter.off(DataviewMetadataChangeEvent, this.boundReloadWorkflows)
        this.emitter.off(Evt_ReqDbReload, this.boundReloadWorkflows)
    }

// region Init
    private reloadDb() {
        if (!this.plugin.isDataviewPluginInitialized()) {
            devTaggedLog("Event", "dataviewReady is false. reloadDb canceled.")
            return;
        }
        if (!this.rateLimiter.addRequest("rate")) {

            devTaggedLog("Event", `reloadDb canceled because rateLimiter is not ready`);
            return;
        }

        devTime("Event", "[Timed] reloadDb")
        // cache for faster calc
        devTime("Event", "[Timed] getAllFiles")
        const allFiles = getAllFiles();
        devTimeEnd("Event", `[Timed] getAllFiles`)
        devTime("Event", "[Timed] allTasks")
        const allTasks = allFiles["tasks"];
        devTimeEnd("Event", `[Timed] allTasks`)

        devTime("Event", `[Timed] getAllWorkflows`)
        this.workflows = getAllWorkflows(allTasks)
        devTimeEnd("Event", `[Timed] getAllWorkflows`)
        devTime("Event", `[Timed] getWorkflowTypeTags`)
        this.workflowTags = getWorkflowTypeTags()
        devTimeEnd("Event", `[Timed] getWorkflowTypeTags`)
        this.stepTags = this.initStepTags(this.workflows);

        devTime("Event", `[Timed] getAllPmTasks`)
        this.pmTasks = getAllPmTasks(this.workflows, allTasks)
        devTimeEnd("Event", `[Timed] getAllPmTasks`)
        devTime("Event", `[Timed] initModulesFromTasks`)
        this.pmModules = this.initModulesFromTasks(this.pmTasks)
        devTimeEnd("Event", `[Timed] initModulesFromTasks`)
        devTime("Event", `[Timed] initManagedTags`)
        this.pmTags = this.initManagedTags(this.pmTasks)
        devTimeEnd("Event", `[Timed] initManagedTags`)
        devTime("Event", `[Timed] initPriorityTags`)
        this.pmPriorityTags = this.initPriorityTags()
        devTimeEnd("Event", `[Timed] initPriorityTags`)
        devTime("Event", `[Timed] getAllProjectsAndLinkTasks`)
        this.pmProjects = getAllProjectsAndLinkTasks(this.pmTasks, this.workflows, allFiles);
        devTimeEnd("Event", `[Timed] getAllProjectsAndLinkTasks`)

        devTime("Event", `[Timed] linkProject`)
        this.linkProject(this.pmProjects, this.pmTasks, this.workflows);
        devTimeEnd("Event", `[Timed] linkProject`)
        devTime("Event", `[Timed] orphanTasks`)
        this.orphanTasks = this.initOrphanTasks(this.pmTasks);
        devTimeEnd("Event", `[Timed] orphanTasks`)
        this.dbInitialized = true;
        this.stopInitRetryTimer();
        this.emit(Evt_DbReloaded)
        assertDatabase(this);
        devTimeEnd("Event", "[Timed] reloadDb")
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
        const tags = (pmTasks.flatMap(k => {
            const validPmTag = k.getAllTags().filter((m: string) => m.startsWith(Tag_Prefix_Tag));
            return validPmTag;
        })
            .filter(k => !this.workflowTags.includes(k) && !this.stepTags.includes(k)))
            .unique();
        tags.sort();
        return tags;
    }

    /**
     * After this step, every task or workflow will link to exactly one project.
     */
    private linkProject(projects: OdaPmProject[], pmTasks: OdaPmTask[], workflows: I_OdaPmWorkflow[]) {
        this.projectTree = OdaProjectTree.buildProjectShadowTree(projects);

        for (const pmTask of pmTasks) {
            const linkingProject: OdaPmProject = this.projectTree.getProjectByPmTask(pmTask);
            linkingProject.linkTask(pmTask);
        }
        for (const pmWorkflow of workflows) {
            const linkingProject: OdaPmProject = this.projectTree.getProjectByPmWorkflow(pmWorkflow);
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
                const wfPrjName = k.type.getFirstProject()?.name ?? "";
                // A task can use its parents' workflows.
                // A workflow in unclassified project can be used in any Project. 
                return !(
                    k.isInProject(wfPrjName, true)
                    || k.type.isInProject(ProjectName_Unclassified)
                );
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

    getProjectByPath(path: string) {
        return this.projectTree.getProjectByPath(path);
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

    private initModulesFromTasks(pmTasks: OdaPmTask[]) {
        const modules: Record<string, OdaPmModule> = {}
        modules[ModuleId_Unclassified] = new OdaPmModule(ModuleId_Unclassified);
        modules[ModuleId_Unclassified].name = "Unclassified"
        for (const pmTask of pmTasks) {
            const module = pmTask.getModuleId();
            if (!modules[module]) {
                modules[module] = new OdaPmModule(module);
            }
            modules[module].tasks.push(pmTask);
        }
        return modules;
    }

    public getTaskModule(pmTask: OdaPmTask) {
        return this.pmModules[pmTask.getModuleId()];
    }

    //region Emit
    public emit(evt: string) {
        this.emitter.emit(evt);
    }

    // endregion
    private initPriorityTags() {
        const tags = this.plugin.settings.priority_tags.map(k => `${Tag_Prefix_Tag}${k}`);
        devTaggedLog("Init", `Priority Tags`, tags)
        return tags;
    }
}

export const OdaPmDbProvider = new GenericProvider<OdaPmDb>();
