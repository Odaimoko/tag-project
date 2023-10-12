// https://docs.obsidian.md/Plugins/User+interface/Views
import {ItemView, Plugin, WorkspaceLeaf} from "obsidian";
import {viewCreator} from "./viewCreator";

export const ManagePageViewId = "iPm-Tool-ManageView";

export class ManagePageView extends ItemView {

    plugin: Plugin;

    constructor(leaf: WorkspaceLeaf, plugin: Plugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return ManagePageViewId;
    }

    getDisplayText() {
        return "Project Management";
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.createEl("h2", {text: this.getDisplayText()});
        viewCreator(container, this.plugin)
    }

    async onClose() {
        // Nothing to clean up.
    }
}
