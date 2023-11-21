import {App, FuzzySuggestModal} from "obsidian";
import {OdaPmDbProvider} from "../../data-model/odaPmDb";
import {OdaPmProject} from "../../data-model/OdaPmProject";

export class ProjectSuggestionModal extends FuzzySuggestModal<OdaPmProject> {
    onChosen: (w: OdaPmProject, evt: MouseEvent | KeyboardEvent) => void;

    constructor(app: App, onChosen: (w: OdaPmProject, evt: MouseEvent | KeyboardEvent) => void) {
        super(app);
        this.onChosen = onChosen;
    }

    getItems(): OdaPmProject[] {
        return OdaPmDbProvider.get()?.pmProjects ?? [];
    }

    getItemText(w: OdaPmProject): string {
        return w.name;
    }

    onChooseItem(w: OdaPmProject, evt: MouseEvent | KeyboardEvent) {
        this.onChosen?.(w, evt)
    }
}
