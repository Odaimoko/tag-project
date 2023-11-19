import {SMarkdownPage} from "obsidian-dataview";
import {devLog} from "../utils/env-util";

const Frontmatter_FolderProject = "tpm_projectroot";
const Frontmatter_FileProject = "tpm_project";
const ProjectName_Unclassified = "Unclassified";
export const Tag_Prefix_Project = "#tpm/project/";

const Project_Def_Enum_Array = [
    "folder", // Project_FolderProject_Frontmatter
    "file", // Project_FileProject_Frontmatter
    "tag_override", // task or wf override
    "system"//unclassified
]
export const globalProjectMap: Map<string, OdaPmProject> = new Map<string, OdaPmProject>();

function getProjectByName(name: string): OdaPmProject | null {
    if (globalProjectMap.has(name)) {
        return globalProjectMap.get(name) as OdaPmProject;
    }
    return null;
}

type ProjectDefinedType = typeof Project_Def_Enum_Array[number]

export class OdaPmProject {
    name: string;
    definedTypes: ProjectDefinedType[];
    pages: SMarkdownPage[];

    constructor() {
        this.definedTypes = []
        this.pages = []
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

        if (globalProjectMap.has(name)) {
            const existingProject = globalProjectMap.get(name) as OdaPmProject;
            existingProject.addDefinedType(definedType);
            existingProject.addPage(page);
            devLog(`Project ${name} already exists. Adding page ${page.path}.`)
            return existingProject;
        }
        const project = new OdaPmProject()
        project.addDefinedType(definedType);
        project.addPage(page);
        project.name = name;
        globalProjectMap.set(name, project);
        devLog(`Project ${name} created. Adding page ${page.path}.`)
        return project;
    }

    public static createProjectFromTaskTag(tag: string) {
        const project = new OdaPmProject()
        project.name = tag.replace(Tag_Prefix_Project, "");
        project.addDefinedType('tag_override');
        return project;
    }

    public static createUnclassifiedProject() {
        const project = new OdaPmProject()
        project.name = ProjectName_Unclassified;
        project.addDefinedType("system")
        return project;
    }

}
