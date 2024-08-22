import {App, FuzzySuggestModal} from "obsidian";
import {OdaPmDbProvider} from "../../data-model/OdaPmDb";

import {PriorityLabels} from "../../settings/PriorityTagsEditView";

export class PrioritySuggestionModal extends FuzzySuggestModal<string> {
    onChosen: (w: string, evt: MouseEvent | KeyboardEvent) => void;

    constructor(app: App, onChosen: (w: string, evt: MouseEvent | KeyboardEvent) => void) {
        super(app);
        this.onChosen = onChosen;
    }

    getItems(): string[] {
        return OdaPmDbProvider.get()?.pmPriorityTags ?? [];
    }

    getItemText(w: string): string {
        return PriorityLabels[this.getItems().indexOf(w)];
    }

    onChooseItem(w: string, evt: MouseEvent | KeyboardEvent) {
        this.onChosen?.(w, evt)
    }
}
