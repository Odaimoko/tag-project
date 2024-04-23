import {App, FuzzySuggestModal} from "obsidian";
import {getProjectPathFromFilePath, I_OdaPmWorkflow} from "../../data-model/workflow-def";
import {OdaPmDbProvider} from "../../data-model/OdaPmDb";
import {OdaPmTask} from "../../data-model/OdaPmTask";
import {devLog} from "../../utils/env-util";
import {ProjectName_Unclassified} from "../../data-model/OdaPmProject";

export class WorkflowSuggestionModal extends FuzzySuggestModal<I_OdaPmWorkflow> {
    onChosen: (w: I_OdaPmWorkflow, evt: MouseEvent | KeyboardEvent) => void;
    path: string;
    pmTask: OdaPmTask | null;

    constructor(app: App, path: string, pmTask: OdaPmTask | null, onChosen: (w: I_OdaPmWorkflow, evt: MouseEvent | KeyboardEvent) => void) {
        super(app);
        this.onChosen = onChosen;
        this.path = path;
        this.pmTask = pmTask;
    }

    getItems(): I_OdaPmWorkflow[] {
        // Show only workflows that are matched the task's project
        const prjName: string = (this.pmTask ?
                this.pmTask.getFirstProjectName()
                : OdaPmDbProvider.get()?.getProjectByPath(getProjectPathFromFilePath(this.path))?.name
        ) ?? ProjectName_Unclassified;
        devLog("Choosing workflow in project: " + prjName)
        return OdaPmDbProvider.get()?.workflows.filter(k => k.isInProject(prjName)) ?? [];
    }

    getItemText(w: I_OdaPmWorkflow): string {
        return w.name;
    }

    onChooseItem(w: I_OdaPmWorkflow, evt: MouseEvent | KeyboardEvent) {
        this.onChosen?.(w, evt)
    }
}
