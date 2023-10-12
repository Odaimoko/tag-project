import {StrictMode} from "react";
import {ItemView, WorkspaceLeaf} from "obsidian";
import {Root, createRoot} from "react-dom/client";

const ReactView = () => {
    return <h4>Konnichiha, React!</h4>;
};
export const React_Example_View_Id = "react-example-view";

export class ReactExampleView extends ItemView {
    root: Root | null = null;

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType() {
        return React_Example_View_Id;
    }

    getDisplayText() {
        return "Example view";
    }

    async onOpen() {
        this.root = createRoot(this.containerEl.children[1]);
        this.root.render(
            <StrictMode>
                <ReactView/>
            </StrictMode>,
        );
    }

    async onClose() {
        this.root?.unmount();
    }
}