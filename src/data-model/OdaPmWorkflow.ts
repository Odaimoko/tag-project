import {STask} from "obsidian-dataview";
import {
    getProjectPathFromSTask,
    getProjectTagFromSTask,
    I_OdaPmStep,
    I_OdaPmWorkflow,
    isTaskSingleLine,
    Tag_Prefix_TaskType,
    WorkflowType
} from "./workflow-def";
import {getOrCreateStep} from "./OdaPmStep";
import {OdaPmProject, ProjectName_Unclassified} from "./OdaPmProject";
import {getSettings} from "../settings/settings";
import {I_GetTaskSource, TaskSource} from "./TaskSource";

class OdaPmWorkflow implements I_OdaPmWorkflow, I_GetTaskSource {
    boundTask: STask;
    stepsDef: I_OdaPmStep[];
    type: WorkflowType;
    name: string;
    tag: string;
    // 0.2.0
    projects: OdaPmProject[];
    /** 来源信息：文件、路径、行号 */
    source: TaskSource;

    constructor(task: STask, type: WorkflowType, name: string) {
        this.boundTask = task;
        this.type = type;
        this.stepsDef = [];
        this.name = name;
        this.tag = Tag_Prefix_TaskType + name;
        this.projects = [];
        this.source = TaskSource.fromSTask(task);
    }

    getSource(): TaskSource | null {
        return this.source;
    }

    addStep(tag: string) {
        const step = getOrCreateStep(tag);
        if (step === null) return;
        this.stepsDef.push(step);
    }

    includesStepTag(tag: string): boolean {
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

    addProject(project: OdaPmProject) {
        // TODO Performance
        if (!this.isInProject(project.name)) {
            this.projects.push(project);
        }
    }

    /**
     * A workflow is in a project if it is in the againstPrjName itself
     * or in any of againstPrjName's parent projects.
     * @param againstPrjName
     * @param includeSubprojects
     */
    isInProject(againstPrjName: string, includeSubprojects = true): boolean {
        // TODO performance
        // - isInParentProject: A workflow in main project -> in sub: if includeSubprojects, else false
        // - workflow in sub -> not in main
        // devLog(`[Workflow] ${this.name} in ${againstPrjName}? =====`)
        const inProject = this.projects.filter(myPrj => {

            const isInUnclassified = getSettings()?.unclassified_workflows_available_to_all_projects
                && myPrj.name === ProjectName_Unclassified

            const isInParentProject = includeSubprojects && myPrj.isParentProjectOf(againstPrjName);
            const isNameEqual = myPrj.name === againstPrjName;
            // devLog(`[Workflow] ${this.name} in ${againstPrjName}? myPrj ${myPrj.name} isNameEqual ${isNameEqual} isInParentProject ${isInParentProject} isInUnclassified ${isInUnclassified}`)
            return isNameEqual || isInParentProject || isInUnclassified;
        }).length > 0;
        // devLog(`[Workflow] ${this.name} in  final ${inProject}: ${againstPrjName}?`)
        return inProject;
    }


    getProjectPath(): string {
        return getProjectPathFromSTask(this.boundTask);
    }

    getFirstProject(): OdaPmProject | null {
        return this.projects.length > 0 ? this.projects[0] : null;
    }

    getFirstProjectName(): string {
        const prj = this.getFirstProject();
        if (prj === null) return ProjectName_Unclassified;
        return prj.name;
    }

    getProjectTag(): string | null {
        return getProjectTagFromSTask(this.boundTask);
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

