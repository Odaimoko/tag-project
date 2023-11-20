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
    static buildProjectShadowTree(): OdaProjectTree | null {
        return null;
    }

    getProjectByPmTask(pmTask: OdaPmTask): OdaPmProject | null {
        return null;
    }

    getProjectByPmWorkflow(pmWorkflow: I_OdaPmWorkflow): OdaPmProject | null {
        return null;
    }
}
