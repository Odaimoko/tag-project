/**
 * Sub-plugin: task property syntax render in editor and in Reading/Preview.
 *
 * - Editor (Live Preview): beautifies `` `{key:value}` `` via a CodeMirror
 *   ViewPlugin and widget; click on a span to show raw text for that one only.
 * - Reading / Preview: handled by the root plugin via registerTaskPropertyReadingViewPostProcessor
 *   (see main.ts). That processor is registered on the root plugin so Obsidian actually runs it.
 *
 * This class is instantiated and onload() is called by the root plugin; it is not
 * loaded as a separate plugin by Obsidian. Editor extensions and events are
 * registered here; the markdown post-processor for Reading view is registered
 * on the root plugin in main.ts.
 */

import { Plugin, WorkspaceLeaf } from "obsidian";
import { Prec } from "@codemirror/state";
import { createTaskPropertyRenderExtension } from "./task-property-render";
import { WorkspaceLeafEditModeWrapper } from "./workspace-leaf-edit-mode-wrapper";

// Re-export so main.ts can register the Reading view processor on the root plugin.
export { registerTaskPropertyReadingViewPostProcessor } from "./task-property-reading-view";

export default class TaskPropertyRenderPlugin extends Plugin {
    /** Tracks the current leaf and its edit/source mode for the editor extension. */
    private currentLeaf = new WorkspaceLeafEditModeWrapper();

    async onload(): Promise<void> {
        // Editor: beautify `` `{key:value}` `` in Live Preview; high priority so it runs early.
        this.registerEditorExtension(
            Prec.high(createTaskPropertyRenderExtension(() => this.currentLeaf)),
        );

        // Keep current leaf in sync when the user switches tabs.
        this.registerEvent(
            this.app.workspace.on("active-leaf-change", (leaf: WorkspaceLeaf) => {
                this.currentLeaf.withLeaf(leaf);
            }),
        );

        // Reading/Preview: post-processor is registered on the root plugin in main.ts
        // via registerTaskPropertyReadingViewPostProcessor(this).
    }
}
