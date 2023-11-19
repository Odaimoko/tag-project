import {OdaPmTask} from "./OdaPmTask";
import {OdaPmProject} from "./OdaPmProject";
import {I_OdaPmWorkflow} from "./workflow-def";


export class OdaProjectTree {
    static buildProjectShadowTree(): OdaProjectTree {
        return undefined;
    }

    getProjectByPmTask(pmTask: OdaPmTask): OdaPmProject {
        return undefined;
    }

    getProjectByPmWorkflow(pmWorkflow: I_OdaPmWorkflow): OdaPmProject {
        return undefined;
    }
}
