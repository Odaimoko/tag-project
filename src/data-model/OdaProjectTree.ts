import {OdaPmTask} from "./OdaPmTask";
import {OdaPmProject} from "./OdaPmProject";
import {I_OdaPmWorkflow} from "./workflow-def";
import * as path from "path";
import {ONotice} from "../utils/o-notice";


/**
 * The root is /.
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
            for (const path of project.defPaths) {
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
        return getProjectByTaskPath(this.projectDict, pmWorkflow.getProjectPath());
    }
}
