import {SMarkdownPage} from "obsidian-dataview";
import {devLog} from "../utils/env-util";
import {getProjectNameFromTag, I_OdaPmWorkflow} from "./workflow-def";
import {BaseDatabaseObject} from "./BaseDatabaseObject";
import {OdaPmTask} from "./OdaPmTask";
import * as path from "path";
import {I_Nameable} from "./I_Nameable";

const Frontmatter_FolderProject = "tpm_project_root";
const Frontmatter_FileProject = "tpm_project";
export const ProjectName_Unclassified = "Unclassified";
export const Tag_Prefix_Project = "#tpm/project/";
const Project_Def_Enum_Array = [
    "folder", // Project_FolderProject_Frontmatter
    "file", // Project_FileProject_Frontmatter
    "tag_override", // task or wf override
    "system"//unclassified
]
let currentMaxProjectId = 0;
export const globalProjectMap: Map<string, OdaPmProject> = new Map<string, OdaPmProject>();

export function clearGlobalProjectMap() {
    globalProjectMap.clear();
    currentMaxProjectId = 0;
}

export
type ProjectDefinedType = typeof Project_Def_Enum_Array[number]

export class OdaPmProject extends BaseDatabaseObject implements I_Nameable {
    name: string;
    definedTypes: ProjectDefinedType[];
    pages: SMarkdownPage[];
    workflows: I_OdaPmWorkflow[];
    pmTasks: OdaPmTask[];
    defPaths: string[]; // Each project has multiple paths

    constructor() {
        super();
        this.definedTypes = []
        this.pages = []
        this.workflows = []
        this.pmTasks = []
        this.defPaths = [];
    }


    hasDefinedType(type: ProjectDefinedType) {
        return this.definedTypes.includes(type);
    }

// region Factory
    private addDefinedType(type: ProjectDefinedType) {
        if (!this.hasDefinedType(type)) {
            this.definedTypes.push(type);
        }
    }

    private addPage(page: SMarkdownPage) {
        if (!this.pages.includes(page)) {
            this.pages.push(page);
        }
    }

    private addDefPath(obsidianPath: string) {
        // Obsidian path is relative. Add '/' before path to form a tree
        obsidianPath = (obsidianPath.startsWith("/") ? "" : "/") + obsidianPath; // prevent doubling leading '/'
        this.defPaths.push(obsidianPath);
    }

    /**
     *
     * @param page
     * @return null if no new project is created.
     */
    public static createProjectFromFrontmatter(page: SMarkdownPage) {
        if (!page)
            return null;

        const fm = page["frontmatter"];
        const keys = Object.keys(fm);

        let name = null;
        let definedType = null;
        let defPath = null;
        if (keys.includes(Frontmatter_FolderProject)) {
            name = fm[Frontmatter_FolderProject];
            definedType = "folder";
            // If defined by a folder root (TPM-0.2.0-1-1), path = folder's path, not the file's path.
            defPath = path.dirname(page.path);

            if (keys.includes(Frontmatter_FileProject)) {
                // TPM-0.2.0-1-5
                // TODO Notify is disturbing in dev mode
                devLog(`Frontmatter in ${page.path} has both folder and file frontmatter. Using ${Frontmatter_FolderProject}.`, 5)
            }
        } else if (keys.includes(Frontmatter_FileProject)) {
            name = fm[Frontmatter_FileProject];
            definedType = "file";
            // If this project is defined by a file (TPM-0.2.0-1-3), it's path is the same as the file.
            defPath = page.path;
        } else {
            return null;
        }

        const project = this.getOrCreateProject(name)
        project.addDefinedType(definedType);
        project.addPage(page);
        project.addDefPath(defPath)
        globalProjectMap.set(name, project);
        return project;
    }

    public static createProjectFromTaskTag(task: OdaPmTask, tag: string) {
        const name = getProjectNameFromTag(tag);
        const project = this.getOrCreateProject(name)
        project.addDefinedType('tag_override');
        // If defined by a task, path = `path/to/file:{project name}`. 
        project.addDefPath(task.getProjectPath());
        return project;
    }

    public static createProjectFromWorkflowTag(workflow: I_OdaPmWorkflow, tag: string) {
        const name = getProjectNameFromTag(tag);
        const project = this.getOrCreateProject(name)
        project.addDefinedType('tag_override');
        // If defined by a task, path = `path/to/file:{project name}`. 
        project.addDefPath(workflow.getProjectPath());
        return project;
    }

    public static createUnclassifiedProject() {
        const project = this.getOrCreateProject(ProjectName_Unclassified)
        project.addDefinedType("system")
        project.addDefPath("");
        return project;
    }

    private static createNewProject(name: string) {
        const p = new OdaPmProject();
        p.name = name;
        p.internalKey = ++currentMaxProjectId;
        return p;
    }

    private static getOrCreateProject(name: string) {
        let project: OdaPmProject;
        if (globalProjectMap.has(name)) {
            project = globalProjectMap.get(name) as OdaPmProject;
        } else {
            project = this.createNewProject(name);
            globalProjectMap.set(name, project);
        }

        return project;
    }


// endregion


// region Link Task and Workflow
    linkTask(pmTask: OdaPmTask) {
        if (!this.pmTasks.includes(pmTask)) {
            this.pmTasks.push(pmTask);
        }
        pmTask.addProject(this);
    }

    linkWorkflow(pmWorkflow: I_OdaPmWorkflow) {
        if (!this.workflows.includes(pmWorkflow)) {
            this.workflows.push(pmWorkflow);
        }
        pmWorkflow.addProject(this);
    }

// endregion
}
