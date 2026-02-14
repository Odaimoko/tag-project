/**
 * Standalone Obsidian plugin that registers the task property editor render
 * (beautifies `` `{key:value}` `` in the editor and in reading/preview). Does not reuse TagRenderer.
 */

import { Plugin, WorkspaceLeaf } from "obsidian";
import { Prec } from "@codemirror/state";
import { createTaskPropertyRenderExtension, TASK_PROPERTY_CLASS } from "./task-property-render";
import { WorkspaceLeafEditModeWrapper } from "./workspace-leaf-edit-mode-wrapper";

/** In HTML, <code> content is the inner text (no backticks). */
const PROPERTY_CONTENT_PATTERN = /^\{([^}:]+)\s*:\s*([^}]*)\}$/;

function createTaskPropertySpan(key: string, value: string): HTMLElement {
    const span = document.createElement("span");
    span.className = TASK_PROPERTY_CLASS;
    span.setAttribute("data-key", key);
    span.setAttribute("data-value", value);
    const keyEl = document.createElement("span");
    keyEl.className = "tpm-task-property-key";
    keyEl.textContent = key;
    const sep = document.createElement("span");
    sep.className = "tpm-task-property-sep";
    sep.textContent = ": ";
    const valEl = document.createElement("span");
    valEl.className = "tpm-task-property-value";
    valEl.textContent = value;
    span.appendChild(keyEl);
    span.appendChild(sep);
    span.appendChild(valEl);
    return span;
}

export default class TaskPropertyRenderPlugin extends Plugin {
    private currentLeaf = new WorkspaceLeafEditModeWrapper();

    async onload() {
        this.registerEditorExtension(
            Prec.high(createTaskPropertyRenderExtension(() => this.currentLeaf)),
        );
        this.registerEvent(
            this.app.workspace.on("active-leaf-change", (leaf: WorkspaceLeaf) => {
                this.currentLeaf.withLeaf(leaf);
            }),
        );
        // Reading / preview: replace <code>{key:value}</code> with beautified span
        this.registerMarkdownPostProcessor((el: HTMLElement) => {
            el.querySelectorAll("code").forEach((code: HTMLElement) => {
                const text = (code.textContent ?? "").trim();
                const m = text.match(PROPERTY_CONTENT_PATTERN);
                if (!m) return;
                const key = m[1].trim();
                const value = (m[2] ?? "").trim();
                const span = createTaskPropertySpan(key, value);
                code.parentNode?.replaceChild(span, code);
            });
        });
    }
}
