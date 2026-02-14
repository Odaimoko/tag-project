/**
 * Editor render for task property syntax `` `{key:value}` ``.
 * Beautifies matching inline code with a dedicated CSS class.
 */

import { livePreviewState } from "obsidian";
import { RangeSetBuilder } from "@codemirror/state";
import {
    Decoration,
    DecorationSet,
    EditorView,
    PluginValue,
    ViewPlugin,
    ViewUpdate,
    WidgetType,
} from "@codemirror/view";
import type { WorkspaceLeafEditModeWrapper } from "./workspace-leaf-edit-mode-wrapper";

/** CSS class for beautified task property spans (e.g. `{key:value}`). */
export const TASK_PROPERTY_CLASS = "tpm-task-property";

/** Matches `` `{key:value}` ``: backtick, `{`, key, optional spaces, `:`, optional spaces, value, `}`, backtick. */
const PROPERTY_PATTERN = /\`\{([^}:]+)\s*:\s*([^}]*)\}\`/g;

/** Shown on hover; used in both editor widget and reading-view span. */
export const TASK_PROPERTY_TOOLTIP = "可以键盘方向键移动上去或点击此处显示原文";

function* matchAllInText(text: string): Generator<{ index: number; length: number; key: string; value: string }> {
    PROPERTY_PATTERN.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = PROPERTY_PATTERN.exec(text)) !== null) {
        yield {
            index: m.index,
            length: m[0].length,
            key: m[1].trim(),
            value: (m[2] ?? "").trim(),
        };
    }
}

class TaskPropertyWidget extends WidgetType {
    constructor(
        private key: string,
        private value: string,
        private from: number,
        private onUnbeautifyThis: () => void,
    ) {
        super();
    }

    toDOM(view: EditorView): HTMLElement {
        const span = document.createElement("span");
        span.className = TASK_PROPERTY_CLASS;
        span.setAttribute("data-key", this.key);
        span.setAttribute("data-value", this.value);
        span.setAttribute("title", TASK_PROPERTY_TOOLTIP);
        span.setAttribute("aria-label", TASK_PROPERTY_TOOLTIP);
        span.style.cursor = "pointer";
        const keyEl = document.createElement("span");
        keyEl.className = "tpm-task-property-key";
        keyEl.textContent = this.key;
        keyEl.setAttribute("title", TASK_PROPERTY_TOOLTIP);
        const sep = document.createElement("span");
        sep.className = "tpm-task-property-sep";
        sep.textContent = ": ";
        sep.setAttribute("title", TASK_PROPERTY_TOOLTIP);
        const valEl = document.createElement("span");
        valEl.className = "tpm-task-property-value";
        valEl.textContent = this.value;
        valEl.setAttribute("title", TASK_PROPERTY_TOOLTIP);
        span.appendChild(keyEl);
        span.appendChild(sep);
        span.appendChild(valEl);
        span.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.onUnbeautifyThis();
        });
        return span;
    }
}

class TaskPropertyRenderEditorPlugin implements PluginValue {
    decorations: DecorationSet;
    private getLeaf: () => WorkspaceLeafEditModeWrapper | null;
    private view: EditorView;
    /** Ranges (by start position) that should not be beautified; click adds here, doc change clears. */
    private skipFromSet = new Set<number>();
    /** Set by widget click callback so next update() rebuilds decorations. */
    private needRebuildForUnbeautify = false;

    constructor(
        view: EditorView,
        getLeaf: () => WorkspaceLeafEditModeWrapper | null,
    ) {
        this.view = view;
        this.getLeaf = getLeaf;
        this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate): void {
        if (update.docChanged) this.skipFromSet.clear();
        // After click "unbeautify this one", rebuild first so only that range is skipped; avoid map() with empty transaction clearing all.
        if (this.needRebuildForUnbeautify) {
            this.needRebuildForUnbeautify = false;
            this.decorations = this.buildDecorations(update.view);
        } else if (
            update.view.composing ||
            update.view.plugin(livePreviewState)?.mousedown
        ) {
            this.decorations = this.decorations.map(update.changes);
        } else if (
            update.selectionSet ||
            update.viewportChanged ||
            update.docChanged
        ) {
            this.decorations = this.buildDecorations(update.view);
        }
    }

    private buildDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();
        const leaf = this.getLeaf();
        if (!leaf?.currentLeaf || leaf.isSource()) return builder.finish();

        for (const { from, to } of view.visibleRanges) {
            const slice = view.state.sliceDoc(from, to);
            for (const match of matchAllInText(slice)) {
                const start = from + match.index;
                const end = start + match.length;
                if (this.skipFromSet.has(start)) continue;
                let inSelection = false;
                for (const range of view.state.selection.ranges) {
                    if (start < range.to && range.from < end) {
                        inSelection = true;
                        break;
                    }
                }
                if (inSelection) continue;
                const self = this;
                builder.add(
                    start,
                    end,
                    Decoration.replace({
                        widget: new TaskPropertyWidget(
                            match.key,
                            match.value,
                            start,
                            () => {
                                self.skipFromSet.add(start);
                                self.needRebuildForUnbeautify = true;
                                self.view.dispatch({});
                            },
                        ),
                    }),
                );
            }
        }
        return builder.finish();
    }
}

/**
 * Returns a ViewPlugin extension that beautifies `` `{key:value}` `` in the editor.
 * Uses the same leaf/source check as tag-render so it only runs in live preview.
 * Click on a beautified span: only that one stops being beautified (shows raw text); others unchanged.
 */
export function createTaskPropertyRenderExtension(
    getLeaf: () => WorkspaceLeafEditModeWrapper | null,
) {
    return ViewPlugin.fromClass(
        class extends TaskPropertyRenderEditorPlugin {
            constructor(view: EditorView) {
                super(view, getLeaf);
            }
        },
        {
            decorations: (value) => {
                const leaf = getLeaf();
                const useDeco = leaf && !leaf.isSource();
                return useDeco
                    ? value.decorations
                    : new RangeSetBuilder<Decoration>().finish();
            },
        },
    );
}
