import {SMarkdownPage} from "obsidian-dataview";
import {devLog} from "../utils/env-util";
import {I_OdaPmWorkflow, OdaPmTask} from "./workflow-def";
import {BaseDatabaseObject} from "./BaseDatabaseObject";

const Frontmatter_FolderProject = "tpm_projectroot";
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

function getProjectByName(name: string): OdaPmProject | null {
    if (globalProjectMap.has(name)) {
        return globalProjectMap.get(name) as OdaPmProject;
    }
    return null;
}

export
type ProjectDefinedType = typeof Project_Def_Enum_Array[number]

export class OdaPmProject extends BaseDatabaseObject {
    name: string;
    definedTypes: ProjectDefinedType[];
    pages: SMarkdownPage[];
    workflows: I_OdaPmWorkflow[];
    pmTasks: OdaPmTask[];

    constructor() {
        super();
        this.definedTypes = []
        this.pages = []
        this.workflows = []
        this.pmTasks = []
    }

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

    hasDefinedType(type: ProjectDefinedType) {
        return this.definedTypes.includes(type);
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
        if (keys.includes(Frontmatter_FolderProject)) {
            name = fm[Frontmatter_FolderProject];
            definedType = "folder";
            if (keys.includes(Frontmatter_FileProject)) {
                // TPM-0.2.0-1-5
                // TODO Notify is disturbing in dev mode
                devLog(`Frontmatter in ${page.path} has both folder and file frontmatter. Using ${Frontmatter_FolderProject}.`, 5)
            }

        } else if (keys.includes(Frontmatter_FileProject)) {
            name = fm[Frontmatter_FileProject];
            definedType = "file";
        } else {
            return null;
        }

        const project = this.getOrCreateProject(name)
        project.addDefinedType(definedType);
        project.addPage(page);
        globalProjectMap.set(name, project);
        devLog(`Project ${name} created. Adding page ${page.path}.`)
        return project;
    }

    public static createProjectFromTaskTag(tag: string) {
        const name = tag.replace(Tag_Prefix_Project, "");

        const project = this.getOrCreateProject(name)
        project.addDefinedType('tag_override');
        return project;
    }

    public static createUnclassifiedProject() {
        const project = this.getOrCreateProject(ProjectName_Unclassified)
        project.addDefinedType("system")
        return project;
    }

    private static createProject(name: string) {
        const p = new OdaPmProject();
        p.name = name;
        p.internalKey = ++currentMaxProjectId;
        return p;
    }

    private static getOrCreateProject(name: string) {
        const project = globalProjectMap.has(name) ?
            globalProjectMap.get(name) as OdaPmProject
            : this.createProject(name);

        return project;
    }

}
