import {Modal} from "obsidian";
import {createRoot, Root} from "react-dom/client";
import OdaPmToolPlugin from "../../../main";
import React from "react";
import {HelpViewRoot} from "./help-page-view";

export class PmHelpModal extends Modal {
    root: Root | null = null;
    plugin: OdaPmToolPlugin;

    constructor(plugin: OdaPmToolPlugin) {
        super(plugin.app);
        this.plugin = plugin;
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.empty();
        // React
        this.root = createRoot(contentEl); // Override the previous container
        this.root.render(<HelpViewRoot plugin={this.plugin} container={contentEl}/>)
    }

    onClose() {
        this.root?.unmount();
        this.root = null;
    }
}
