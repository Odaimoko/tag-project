/**
 * Editor render for task property syntax `` `{key:value}` ``.
 * Beautifies matching inline code with a dedicated CSS class.
 */

import { livePreviewState } from "obsidian";
import { EditorSelection, RangeSetBuilder } from "@codemirror/state";
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
export const TASK_PROPERTY_TOOLTIP = "Use arrow keys to move here or click to show raw text";

const TOOLTIP_DELAY_MS = 200;

/** Attach a short-delay tooltip; hide when mouse leaves the element or the tooltip. */
export function attachShortDelayTooltip(el: HTMLElement, text: string, delayMs: number = TOOLTIP_DELAY_MS): void {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let tipEl: HTMLElement | null = null;

    function hide() {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        if (tipEl?.parentNode) {
            tipEl.parentNode.removeChild(tipEl);
            tipEl = null;
        }
    }

    el.addEventListener("mouseenter", () => {
        timer = setTimeout(() => {
            timer = null;
            tipEl = document.createElement("div");
            tipEl.className = "tpm-task-property-tooltip";
            tipEl.textContent = text;
            document.body.appendChild(tipEl);
            const rect = el.getBoundingClientRect();
            tipEl.style.left = `${rect.left}px`;
            tipEl.style.top = `${rect.top - 4}px`;
            tipEl.style.transform = "translateY(-100%)";
            tipEl.addEventListener("mouseleave", hide);
        }, delayMs);
    });
    el.addEventListener("mouseleave", (e: MouseEvent) => {
        const related = e.relatedTarget as Node | null;
        if (tipEl && related && tipEl.contains(related)) return;
        hide();
    });
    el.addEventListener("click", hide);
}

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
        span.style.cursor = "pointer";
        attachShortDelayTooltip(span, TASK_PROPERTY_TOOLTIP);
        const keyEl = document.createElement("span");
        keyEl.className = "tpm-task-property-key";
        keyEl.textContent = this.key;
        const sep = document.createElement("span");
        sep.className = "tpm-task-property-sep";
        sep.textContent = ": ";
        const valEl = document.createElement("span");
        valEl.className = "tpm-task-property-value";
        valEl.textContent = this.value;
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

/** True if selection overlaps [start, end). */
function selectionOverlapsRange(
    selection: readonly { from: number; to: number }[],
    start: number,
    end: number,
): boolean {
    for (const range of selection) {
        if (start < range.to && range.from < end) return true;
    }
    return false;
}

class TaskPropertyRenderEditorPlugin implements PluginValue {
    decorations: DecorationSet;
    private getLeaf: () => WorkspaceLeafEditModeWrapper | null;
    private view: EditorView;
    /** Ranges that should not be beautified (click = show raw). When cursor leaves, remove so beautify restores. */
    private skipRangeMap = new Map<number, number>(); // start -> end
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
        if (update.docChanged) this.skipRangeMap.clear();
        // When selection or viewport changes, restore beautify for ranges the cursor no longer overlaps.
        if (update.selectionSet || update.viewportChanged) {
            const sel = update.view.state.selection.ranges;
            const toDelete: number[] = [];
            for (const [start, end] of this.skipRangeMap) {
                if (!selectionOverlapsRange(sel, start, end)) toDelete.push(start);
            }
            if (toDelete.length > 0) {
                toDelete.forEach((start) => this.skipRangeMap.delete(start));
                this.needRebuildForUnbeautify = true; // force rebuild so restored ranges get decorations again
            }
        }
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
                if (this.skipRangeMap.has(start)) continue;
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
                                self.view.dispatch({ selection: EditorSelection.cursor(start) });
                                self.view.focus();
                                self.skipRangeMap.set(start, end);
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
