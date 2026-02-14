/**
 * Standalone Obsidian plugin that registers the task property editor render
 * (beautifies `` `{key:value}` `` in the editor and in reading/preview). Does not reuse TagRenderer.
 */

import { Plugin, WorkspaceLeaf } from "obsidian";
import { Prec } from "@codemirror/state";
import {
    attachShortDelayTooltip,
    createTaskPropertyRenderExtension,
    TASK_PROPERTY_CLASS,
    TASK_PROPERTY_TOOLTIP,
} from "./task-property-render";
import { WorkspaceLeafEditModeWrapper } from "./workspace-leaf-edit-mode-wrapper";

/** In HTML, <code> content is the inner text (no backticks). */
const PROPERTY_CONTENT_PATTERN = /^\{([^}:]+)\s*:\s*([^}]*)\}$/;

/**
 * Register the Reading/Preview view post processor on the given plugin.
 * Must be called with the root plugin (the one Obsidian loads) so that the
 * processor runs when rendering markdown in Reading view.
 */
export function registerTaskPropertyReadingViewPostProcessor(plugin: Plugin): void {
    plugin.registerMarkdownPostProcessor((el: HTMLElement) => {
        const onUnbeautifyThis = (spanEl: HTMLElement) => {
            const key = spanEl.getAttribute("data-key") ?? "";
            const value = spanEl.getAttribute("data-value") ?? "";
            const code = document.createElement("code");
            code.textContent = `{${key}:${value}}`;
            spanEl.parentNode?.replaceChild(code, spanEl);
        };
        el.querySelectorAll("code").forEach((code: HTMLElement) => {
            const text = (code.textContent ?? "").trim();
            const m = text.match(PROPERTY_CONTENT_PATTERN);
            if (!m) return;
            const key = m[1].trim();
            const value = (m[2] ?? "").trim();
            const span = createTaskPropertySpan(key, value, onUnbeautifyThis, {
                readingView: true,
            });
            code.parentNode?.replaceChild(span, code);
        });
    });
}

function createTaskPropertySpan(
    key: string,
    value: string,
    onUnbeautifyThis: (spanEl: HTMLElement) => void,
    options?: { readingView?: boolean },
): HTMLElement {
    const readingView = options?.readingView === true;
    const span = document.createElement("span");
    span.className = TASK_PROPERTY_CLASS;
    span.setAttribute("data-key", key);
    span.setAttribute("data-value", value);
    span.style.cursor = readingView ? "default" : "pointer";
    attachShortDelayTooltip(span, TASK_PROPERTY_TOOLTIP);
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
    span.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!readingView) {
            onUnbeautifyThis(span);
        }
    });
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
        // Reading/Preview post processor is registered on the root plugin in main.ts
        // via registerTaskPropertyReadingViewPostProcessor(rootPlugin).
    }
}
