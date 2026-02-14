/**
 * MIT License
 *
 * Copyright (c) 2022 Darren Kuro
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * https://github.com/darrenkuro/obsidian-basetag/blob/master/LICENSE
 */

import {livePreviewState, Plugin, WorkspaceLeaf} from "obsidian";
import {syntaxTree} from "@codemirror/language";
import {EditorSelection, RangeSetBuilder} from "@codemirror/state";
import {
    Decoration,
    DecorationSet,
    EditorView,
    PluginValue,
    ViewPlugin,
    ViewUpdate,
    WidgetType,
} from "@codemirror/view";
import {
    Tag_Prefix_Step,
    Tag_Prefix_Tag,
    Tag_Prefix_TaskType,
    Tag_Prefix_Workflow
} from "../../../data-model/workflow-def";
import {Tag_Prefix_Project} from "../../../data-model/OdaPmProject";
import {devLog, devTaggedLog} from "../../../utils/env-util";
import {WorkspaceLeafEditModeWrapper} from "./workspace-leaf-edit-mode-wrapper";


const tag_class = "basename-tag";
const currentLeaf: WorkspaceLeafEditModeWrapper = new WorkspaceLeafEditModeWrapper();

/** Get the current vault name. */
const getVaultName = () => window.app.vault.getName();

/** Options for createTagNode: first click can switch to edit + unbeautify instead of opening search. */
interface CreateTagNodeOptions {
    /** Called on click (Reading/Preview): switch to edit and unhide original; no search. */
    onFirstClick?: () => void;
    /** Called on click (Editor widget): unbeautify and focus; no search. */
    onWidgetClick?: () => void;
}

/** Create a custom tag node from text content (can include #). */
const createTagNode = (
    tag: string | null,
    readingMode: boolean,
    options?: CreateTagNodeOptions,
): HTMLAnchorElement => {
    const tagNode = document.createElement("a");
    if (!tag) return tagNode;

    tagNode.className = `tag ${tag_class}`;
    tagNode.target = "_blank";
    tagNode.rel = "noopener";
    tagNode.href = readingMode ? `${tag}` : `#${tag}`;

    const vaultStr = encodeURIComponent(getVaultName());
    const queryStr = `tag:${encodeURIComponent(tag)}`;
    tagNode.dataset.uri = `obsidian://search?vault=${vaultStr}&query=${queryStr}`;

    tagNode.textContent = tag.slice(tag.lastIndexOf("/") + 1).replace("#", "");

    if (options?.onFirstClick) {
        const fn = options.onFirstClick;
        tagNode.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            fn();
        };
    } else if (options?.onWidgetClick) {
        const fn = options.onWidgetClick;
        tagNode.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            fn();
        };
    } else {
        tagNode.onclick = () => window.open(tagNode.dataset.uri);
    }

    return tagNode;
};

/** Switches the leaf to source (edit) mode so the user can edit the note. */
function setLeafToSourceMode(leaf: WorkspaceLeaf): void {
    const vs = leaf.getViewState();
    const state = vs?.state as { mode?: string } | undefined;
    if (!state || state.mode === "source") return;
    leaf.setViewState({
        ...vs,
        state: { ...(vs as { state: Record<string, unknown> }).state, mode: "source", source: true },
    });
}

/** Widget for a single tag in the editor; click = switch to edit + unbeautify (no search). */
class TagWidget extends WidgetType {
    constructor(
        private tag: string,
        private readingMode: boolean,
        private from: number,
        private to: number,
        private onUnbeautify: () => void,
    ) {
        super();
    }

    toDOM(_view: EditorView): HTMLElement {
        return createTagNode(this.tag, this.readingMode, { onWidgetClick: () => this.onUnbeautify() });
    }
}

// the only external function, otherwise this plugin is self-contained
function shouldTagBeAbbr(tag: string) {
    const lowerTag = tag.toLowerCase();
    return lowerTag.startsWith(Tag_Prefix_Tag)
        || lowerTag.startsWith(Tag_Prefix_Project)
        || lowerTag.startsWith(Tag_Prefix_Workflow)
        || lowerTag.startsWith(Tag_Prefix_Step)
        || lowerTag.startsWith(Tag_Prefix_TaskType);
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

class TagRenderEditorPlugin implements PluginValue {
    decorations: DecorationSet;
    private view: EditorView;
    /** Ranges that should not be beautified (click = show raw). Cleared when cursor leaves. */
    private skipRangeMap = new Map<number, number>();
    private needRebuildForUnbeautify = false;

    constructor(view: EditorView) {
        this.view = view;
        this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate): void {
        if (update.docChanged) this.skipRangeMap.clear();
        if (update.selectionSet || update.viewportChanged) {
            const sel = update.view.state.selection.ranges;
            const toDelete: number[] = [];
            for (const [start] of this.skipRangeMap) {
                const end = this.skipRangeMap.get(start)!;
                if (!selectionOverlapsRange(sel, start, end)) toDelete.push(start);
            }
            if (toDelete.length > 0) {
                toDelete.forEach((start) => this.skipRangeMap.delete(start));
                this.needRebuildForUnbeautify = true;
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
        } else if (update.selectionSet || update.viewportChanged) {
            this.decorations = this.buildDecorations(update.view);
        }
    }

    /**
     * Won't be triggered when Edit mode changes.
     * @param view
     * @private
     */
    private buildDecorations(view: EditorView): DecorationSet {
        const builder = new RangeSetBuilder<Decoration>();

        // console.log(view.visibleRanges) // a subset that is drawn.
        devTaggedLog("TagRender", `buildDecorations viewState`, currentLeaf?.currentLeaf?.getViewState())
        if (!currentLeaf) return builder.finish();
        if (currentLeaf.isSource()) return builder.finish();

        for (const {from, to} of view.visibleRanges) {
            let curHashtagStart = -1; // uninitialized
            let status = 0; // 0 unstarted, 1 started.
            let tag = "";
            syntaxTree(view.state).iterate({
                from,
                to,
                enter: (node) => {

                    // accumulate the full hash tag between hashtag-begin and hashtag-end
                    if (node.name.contains("hashtag")) {

                        // inside some tag `#x/y/_z` 

                        // Do not render if falls under selection (cursor) range.
                        const extendedFrom = node.from - 1;
                        const extendedTo = node.to + 1;

                        for (const range of view.state.selection.ranges) {
                            if (extendedFrom <= range.to && range.from < extendedTo) {
                                curHashtagStart = -1;
                                status = 0;
                                tag = "";
                                return;
                            }
                        }

                        const text = view.state.sliceDoc(node.from, node.to);
                        switch (status) {
                            case 0:
                                // not started
                                if (node.name.contains("hashtag-begin")) {
                                    // without `cm-` prefix, split by `_`
                                    curHashtagStart = node.from;
                                    tag = "" + text;
                                    // devLog("[Hashtag] begin", text, node.name.split("_"))
                                    status = 1;
                                }
                                break;
                            case 1:
                                // Handle tags in the text region.
                                if (node.name.contains("hashtag-end")) {
                                    if (curHashtagStart == -1)
                                        return;
                                    tag += text;
                                    status = 0;
                                    if (shouldTagBeAbbr(tag)) {
                                        const from = curHashtagStart;
                                        const to = node.to;
                                        if (!this.skipRangeMap.has(from)) {
                                            const self = this;
                                            builder.add(
                                                from,
                                                to,
                                                Decoration.replace({
                                                    widget: new TagWidget(tag, false, from, to, () => {
                                                        self.skipRangeMap.set(from, to);
                                                        self.needRebuildForUnbeautify = true;
                                                        if (currentLeaf?.currentLeaf && !currentLeaf.isSource())
                                                            setLeafToSourceMode(currentLeaf.currentLeaf);
                                                        self.view.dispatch({ selection: EditorSelection.cursor(from) });
                                                        self.view.focus();
                                                        self.view.dispatch({});
                                                    }),
                                                }),
                                            );
                                        }
                                    }
                                } else {
                                    tag += text;
                                }
                                break;
                        }

                    }

                    // Handle tags in frontmatter.
                    // if (node.name === "hmd-frontmatter") {
                    //     // Do not render if falls under selection (cursor) range.
                    //     const extendedFrom = node.from;
                    //     const extendedTo = node.to + 1;
                    //
                    //     for (const range of view.state.selection.ranges) {
                    //         if (extendedFrom <= range.to && range.from < extendedTo) {
                    //             return;
                    //         }
                    //     }
                    //
                    //     let frontmatterName = "";
                    //     let currentNode = node.node;
                    //
                    //     // Go up the nodes to find the name for frontmatter, max 20.
                    //     for (let i = 0; i < 20; i++) {
                    //         currentNode = currentNode.prevSibling ?? node.node;
                    //         if (currentNode?.name.contains("atom")) {
                    //             frontmatterName = view.state.sliceDoc(
                    //                 currentNode.from,
                    //                 currentNode.to,
                    //             );
                    //             break;
                    //         }
                    //     }
                    //
                    //     // Ignore if it's not frontmatter for tags.
                    //     if (
                    //         frontmatterName.toLowerCase() !== "tags" &&
                    //         frontmatterName.toLowerCase() !== "tag"
                    //     )
                    //         return;
                    //
                    //     const contentNode = node.node;
                    //     const content = view.state.sliceDoc(
                    //         contentNode.from,
                    //         contentNode.to,
                    //     );
                    //     const tagsArray = content.split(" ").filter((tag) => tag !== "");
                    //
                    //     // Loop through the array of tags.
                    //     let currentIndex = contentNode.from;
                    //     for (let i = 0; i < tagsArray.length; i++) {
                    //         builder.add(
                    //             currentIndex,
                    //             currentIndex + tagsArray[i].length,
                    //             Decoration.replace({
                    //                 widget: new TagWidget(tagsArray[i], false),
                    //             }),
                    //         );
                    //
                    //         // Length and the space char.
                    //         currentIndex += tagsArray[i].length + 1;
                    //     }
                    // }
                },
            });
        }

        return builder.finish();
    }
}


// Rerender Property by changing the text directly
const rerenderProperty = () => {
    devTaggedLog("TagRender", `rerenderProperty`)
    document
        .querySelectorAll(
            `[data-property-key="tags"] .multi-select-pill-content span:not(.${tag_class})`,
        )
        .forEach((node: HTMLSpanElement) => {
            const text = node.textContent ?? "";
            node.textContent = text.slice(text.lastIndexOf("/") + 1);
            node.className = tag_class;
            node.dataset.tag = text;
        });
}

export default class TagRenderer extends Plugin {

    async onload() {

        this.registerEditorExtension(
            ViewPlugin.fromClass(TagRenderEditorPlugin, {
                decorations: function (value) {
                    const useDeco = currentLeaf && !currentLeaf.isSource();
                    devTaggedLog("TagRender", `registerEditorExtension useDeco `, useDeco);
                    return useDeco
                        ? value.decorations
                        : new RangeSetBuilder<Decoration>().finish();
                }
            }),
        );

        this.registerMarkdownPostProcessor((el: HTMLElement) => {
            el.querySelectorAll(`a.tag:not(.${tag_class})`).forEach(
                (node: HTMLAnchorElement) => {
                    const original = node;
                    const tagNode = createTagNode(node.textContent, true, {
                        onFirstClick: () => {
                            const leaf = this.app.workspace.activeLeaf;
                            if (leaf) setLeafToSourceMode(leaf);
                            original.style.display = "";
                            tagNode.remove();
                        },
                    });
                    node.removeAttribute("class");
                    node.style.display = "none";
                    node.parentNode?.insertBefore(tagNode, node);
                },
            );
        });

        // Rerender property by changing the text directly
        // Rerender when: 
        // (1) Preview/Source/Reading Mode Toggled 
        //      - [ ] Files without front matter will not be rerendered when (1) toggled.
        // (2) Leaf changed / File opened 
        // (3) TODO Vault Opened. Leaf may not be registered yet.


        // "layout-change": triggered when switch preview/source/live-preview mode
        this.registerEvent(
            this.app.workspace.on("layout-change", function () {
                devTaggedLog("TagRender", `layout-change`)
                return rerenderProperty();
            })
        );

        this.registerEvent(
            this.app.workspace.on("file-open", function (e) {
                devTaggedLog("TagRender", `file-open `, e)
                return rerenderProperty();
            })
        );

        // "active-leaf-change": open note, navigate to note -> will check whether
        // the view mode needs to be set; default view mode setting is ignored.
        this.registerEvent(
            this.app.workspace.on(
                "active-leaf-change",
                (leaf: WorkspaceLeaf) => {
                    currentLeaf.withLeaf(leaf);
                    return rerenderProperty();
                }
            )
        );
    }

}
 
