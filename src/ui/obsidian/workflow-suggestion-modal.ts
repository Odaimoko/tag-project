import {App, FuzzySuggestModal} from "obsidian";
import {I_OdaPmWorkflow} from "../../data-model/workflow-def";
import {OdaPmDbProvider} from "../../data-model/odaPmDb";

export class WorkflowSuggestionModal extends FuzzySuggestModal<I_OdaPmWorkflow> {
    onChosen: (w: I_OdaPmWorkflow, evt: MouseEvent | KeyboardEvent) => void;

    constructor(app: App, onChosen: (w: I_OdaPmWorkflow, evt: MouseEvent | KeyboardEvent) => void) {
        super(app);
        this.onChosen = onChosen;
    }

    getItems(): I_OdaPmWorkflow[] {
        return OdaPmDbProvider.get()?.workflows ?? [];
    }

    getItemText(w: I_OdaPmWorkflow): string {
        return w.name;
    }

    onChooseItem(w: I_OdaPmWorkflow, evt: MouseEvent | KeyboardEvent) {
        this.onChosen?.(w, evt)
    }
}
