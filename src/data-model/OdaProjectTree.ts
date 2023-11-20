import {OdaPmTask} from "./OdaPmTask";
import {OdaPmProject} from "./OdaPmProject";
import {I_OdaPmWorkflow} from "./workflow-def";
import * as path from "path";


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
