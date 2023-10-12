// https://docs.obsidian.md/Plugins/User+interface/Views
import {ItemView, Plugin, WorkspaceLeaf} from "obsidian";
import {ReactManagePage} from "./viewCreator";
import {createRoot, Root} from "react-dom/client";
import {StrictMode} from "react";

export const ManagePageViewId = "iPm-Tool-ManageView";

export class ManagePageView extends ItemView {
    root: Root | null = null;

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
        // TODOQ Why [1]? What is the first child?
        const container = this.containerEl.children[1];

        container.empty();
        // container.createEl("h2", {text: this.getDisplayText()});
        // viewCreator(container, this.plugin)

        // React
        this.root = createRoot(this.containerEl.children[1]); // Override the previous container
        this.root.render(
            <StrictMode>
                <h2>Button</h2>
                <button onClick={() => console.log("Cool with you")}>Holy Crap!</button>
                <ReactManagePage/>
            </StrictMode>,
        );
    }


    async onClose() {
        this.root?.unmount();
    }

}

