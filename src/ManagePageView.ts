import {Plugin} from "obsidian";
import {ItemView, WorkspaceLeaf} from "obsidian";
// https://docs.obsidian.md/Plugins/User+interface/Views
export const ManagePageViewId = "iPm-Tool-ManageView";
import {getAPI} from "obsidian-dataview";

const dv = getAPI(); // We can use dv just like the examples in the docs
function createDvEl(container: Element, plugin: Plugin) {

    // Replace .file.tasks with index access

    dv.list(dv.pages()["file"]["tasks"], container, plugin)
}

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
        container.createEl("h4", {text: this.getDisplayText()});
        createDvEl(container, this.plugin)
    }

    async onClose() {
        // Nothing to clean up.
    }
}

