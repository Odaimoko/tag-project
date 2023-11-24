import {OdaPmTask} from "./OdaPmTask";
import {OdaPmProject} from "./OdaPmProject";
import {I_OdaPmWorkflow} from "./workflow-def";
import * as path from "path";
import {ONotice} from "../utils/o-notice";


/**
 * The root is /.
 * This checks if the task or workflow represented by @taskPath is under a certain project. 
 * @param projectDict Path to OdaPmProject
 * @param taskPath
 */
export function getProjectByTaskPath<T>(projectDict: Record<string, T>, taskPath: string) {
    // This is checking implementation: if a task has no project defined with it or in its file, 
    //      it will find projects in its parent directory.
    while (!projectDict.hasOwnProperty(taskPath)) {
        taskPath = path.dirname(taskPath);
    }
    return projectDict[taskPath]
}

export class OdaProjectTree {
    // Path to Project
    projectDict: Record<string, OdaPmProject> = {};

    static buildProjectShadowTree(projects: OdaPmProject[]): OdaProjectTree {
        const tree = new OdaProjectTree();
        for (const project of projects) {
            for (const {path} of project.projectDefinitions) {
                if (tree.projectDict.hasOwnProperty(path)) {
                    // TPM-0.2.0-1-7-3
                    const collidedProject = tree.projectDict[path];
                    if (collidedProject.hasDefinedType("folder")
                        && project.hasDefinedType("folder")
                    ) {
                        new ONotice(`Multiple project roots found in ${path}\n - ${project.name}\n - ${collidedProject.name}`)
                    }
                }
                tree.projectDict[path] = project
            }
        }
        return tree;
    }

    getProjectByPmTask(pmTask: OdaPmTask): OdaPmProject {
        return getProjectByTaskPath(this.projectDict, pmTask.getProjectPath());
    }

    getProjectByPmWorkflow(pmWorkflow: I_OdaPmWorkflow): OdaPmProject {
        // console.log(pmWorkflow.name, pmWorkflow.getProjectPath(), this.projectDict, getProjectByTaskPath(this.projectDict, pmWorkflow.getProjectPath()))
        return getProjectByTaskPath(this.projectDict, pmWorkflow.getProjectPath());
    }

    getProjectByName(name: string) {
        if (this.projectDict.hasOwnProperty(name)) {
            return this.projectDict[name];
        }
        return null;
    }

    /**
     * Path does not have to be a key of a project.
     *
     * @param path Must start with `/`
     */
    getProjectByPath(path: string) {
        return getProjectByTaskPath(this.projectDict, path)
    }
}
