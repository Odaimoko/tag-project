import {Plugin} from "obsidian";
import {ItemView, WorkspaceLeaf} from "obsidian";
// https://docs.obsidian.md/Plugins/User+interface/Views
export const VIEW_TYPE_EXAMPLE = "example-view";

export class ExampleView extends ItemView {
    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType() {
        return VIEW_TYPE_EXAMPLE;
    }

    getDisplayText() {
        return "Example view";
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.createEl("h4", {text: "Example view"});
    }

    async onClose() {
        // Nothing to clean up.
    }
}


export default class ExamplePlugin extends Plugin {
    async onload() {
        this.registerView(
            VIEW_TYPE_EXAMPLE,
            (leaf) => new ExampleView(leaf)
        );

        this.addRibbonIcon("bell-plus", "Activate view", () => {
            this.activateView();
        });
    }

    async onunload() {
    }

    async activateView() {
        // Remove existing views.
        this.app.workspace.detachLeavesOfType(VIEW_TYPE_EXAMPLE);

        console.log(this.app.vault)
        await this.app.workspace.getRightLeaf(false).setViewState({
            type: VIEW_TYPE_EXAMPLE,
            active: true,
        });

        this.app.workspace.revealLeaf(
            this.app.workspace.getLeavesOfType(VIEW_TYPE_EXAMPLE)[0]
        );
    }
}