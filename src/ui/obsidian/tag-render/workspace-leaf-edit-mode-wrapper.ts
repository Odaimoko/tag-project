import {WorkspaceLeaf} from "obsidian";
import {devLog} from "../../../utils/env-util";

export class WorkspaceLeafEditModeWrapper {
    currentLeaf: WorkspaceLeaf | null = null;

    withLeaf(l: WorkspaceLeaf) {
        this.currentLeaf = l;
    }

    hasLeaf() {
        return this.currentLeaf != null;
    }

    isSource() {
        if (!this.hasLeaf())
            return false;
        const viewState = this.currentLeaf?.getViewState();
        if (!viewState) return false;
        if (!viewState.state) return false;
        const isSource = viewState.state.mode == "source" && viewState.state.source;
        // devLog(`[TagRender] isSource? `, isSource)
        return isSource;
    }

    isPreview() {
        if (!this.hasLeaf())
            return false;
        const viewState = this.currentLeaf?.getViewState();
        if (!viewState) return false;
        if (!viewState.state) return false;
        return viewState.state.mode == "preview";
    }

    isReading() {
        if (!this.hasLeaf())
            return false;
    }
}
