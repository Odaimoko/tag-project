import {STask} from "obsidian-dataview";
import {OdaPmProject, Tag_Prefix_Project} from "./OdaPmProject";
import {
    addTagText,
    getProjectPathFromSTask,
    getProjectTagFromSTask,
    I_OdaPmProjectTask,
    I_OdaPmStep,
    I_OdaPmWorkflow,
    removeTagText,
    trimTagsFromTask
} from "./workflow-def";
import {BaseDatabaseObject} from "./BaseDatabaseObject";
import {getOrCreateStep} from "./OdaPmStep";
import {setProjectTagToTask} from "../utils/io-util";

export class OdaPmTask extends BaseDatabaseObject implements I_OdaPmProjectTask {
    boundTask: STask;
    // without any step and typeDef tags
    summary: string;
    // raw
    text: string;
    type: I_OdaPmWorkflow;
    // One for chain. Many for checkbox
    currentSteps: I_OdaPmStep[];
    // 0.2.0
    projects: OdaPmProject[];

    constructor(type: I_OdaPmWorkflow, task: STask) {
        super();
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
        this.projects = []
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

    hasStepName(stepName: string) {
        // TODO Performance
        return this.currentSteps.filter(k => k.name == stepName).length > 0;
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

    /**
     * Union > 0
     * @param displayTags
     */
    hasAnyTag(displayTags: string[]) {
        for (const tag of this.boundTask.tags) {
            if (displayTags.includes(tag)) {
                return true;
            }
        }
        return false;
    }

    // region Project

    getProjectTag(): string | null {
        return getProjectTagFromSTask(this.boundTask);
    }

    assignToWorkflowProject() {
        const workflowProjectName = this.type.getFirstProject()?.name;
        
        const prjTag = `${Tag_Prefix_Project}${workflowProjectName}`;
        setProjectTagToTask(this, prjTag);
    }

    // region Interface


    addProject(project: OdaPmProject) {
        // TODO performance
        if (!this.projects.includes(project)) {
            this.projects.push(project);
        }
    }


    isInProject(name: string, includeSubProjects = true): boolean {
        // TODO performance
        // - A task in a sub project is linked to a list of hierarchical projects.
        // - A task in main project will not appear in the sub project.
        // if the given project's name is the prefix of this task's  name, then it is in the project
        return this.projects.filter(k =>
            k.name === name || (includeSubProjects && k.name.startsWith(name)))
            .length > 0;
    }

    getProjectPath(): string {
        return getProjectPathFromSTask(this.boundTask, true);
    }


    getFirstProject = (): OdaPmProject | null => {
        if (this.projects.length == 0) return null;
        return this.projects[0];
    }


    // endregion
    // endregion

    // debug
    getProjectNames(): string[] {
        return this.projects.map(k => k.name);
    }
}
