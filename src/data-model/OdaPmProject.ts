import {SMarkdownPage} from "obsidian-dataview";
import {devLog} from "../utils/env-util";

const Frontmatter_FolderProject = "tpm_projectroot";
const Frontmatter_FileProject = "tpm_project";
const ProjectName_Unclassified = "Unclassified";

const Project_Def_Enum_Array = [
    "folder", // Project_FolderProject_Frontmatter
    "file", // Project_FileProject_Frontmatter
    "tag_override", // task or wf override
    "system"//unclassified
]

type ProjectDefinedType = typeof Project_Def_Enum_Array[number]

export class OdaPmProject {
    name: string;
    definedType: ProjectDefinedType;
    page: SMarkdownPage | null;

    public static createProjectFromFrontmatter(
        page: SMarkdownPage) {
        if (!page) return null;

        const fm = page["frontmatter"];
        const keys = Object.keys(fm);
        let project = null;
        if (keys.includes(Frontmatter_FolderProject)) {
            project = new OdaPmProject()
            project.name = fm[Frontmatter_FolderProject];
            project.definedType = "folder";
            if (keys.includes(Frontmatter_FileProject)) {
                // TPM-0.2.0-1-5
                // TODO Notify is disturbing in dev mode
                devLog(`Frontmatter in ${page.path} has both folder and file frontmatter. Using ${Frontmatter_FolderProject}.`, 5)
            }

        } else if (keys.includes(Frontmatter_FileProject)) {
            project = new OdaPmProject()
            project.name = fm[Frontmatter_FileProject];
            project.definedType = "file";
        } else {
            return null;
        }

        project.page = page;
        return project;
    }

    public static createUnclassifiedProject() {
        const project = new OdaPmProject()
        project.name = ProjectName_Unclassified;
        project.definedType = "system";
        project.page = null;
        return project;
    }

}
