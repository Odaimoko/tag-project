// https://docs.obsidian.md/Plugins/User+interface/Views
import {ItemView, WorkspaceLeaf} from "obsidian";
import {ReactManagePage} from "./view-creator";
import {createRoot, Root} from "react-dom/client";
import {createContext, StrictMode} from "react";
import {EventEmitter} from "events"
import OdaPmToolPlugin from "../main";

import {DataviewIndexReadyEvent, DataviewMetadataChangeEvent} from "../typing/dataview-event";

export const ManagePageViewId = "iPm-Tool-ManageView";

export class ManagePageView extends ItemView {
    root: Root | null = null;
    emitter: EventEmitter;
    plugin: OdaPmToolPlugin;


    constructor(leaf: WorkspaceLeaf, plugin: OdaPmToolPlugin) {
        super(leaf);
        this.emitter = new EventEmitter();
        this.plugin = plugin;
    }


    getViewType() {
        return ManagePageViewId;
    }

    getDisplayText() {
        return "iPM Manage Page";
    }

    async onOpen() {
        // console.log("Manage page view opened.")
        this.listenToMetadataChange()
        // When dataview is ready, we render the page directly.
        // If dataview is not ready, we still render the page, but we listen to the event and re-render when it is ready.
        this.renderPage();
    }

    // Register event listener will only be cleared in unload, without a way of clearing it manually. 
    // Thus, we cannot pass registerEvent function directly to a React component. 
    // Instead, we use a custom event emitter, which allows us to clear the listener with useEffect.
    listenToMetadataChange() {
        // @ts-ignore
        this.registerEvent(this.app.metadataCache.on(DataviewMetadataChangeEvent, (...args) => {
            this.emitter.emit(DataviewMetadataChangeEvent, ...args);
        }));
        // Don't use DataviewIndexReadyEvent, because it is fired when the full index is processed.
        // Otherwise, we may get partial data.
        // @ts-ignore
        this.registerEvent(this.app.metadataCache.on(DataviewIndexReadyEvent, (...args) => {
            // render only when index is ready
            this.emitter.emit(DataviewIndexReadyEvent, ...args);
        }));
    }

    private renderPage() {

        //  Why [1]? What is the first child? [0] is title, 1 is content, 2 is input (Why's there an input?)
        const container = this.containerEl.children[1];
        container.empty();

        // React
        this.root = createRoot(this.containerEl.children[1]); // Override the previous container
        // we call render(), so this is a brand new component tree, no matter it exists or not. States won't be preserved.
        this.root.render(
            <StrictMode>
                <PluginContext.Provider value={this.plugin}>
                    <ReactManagePage eventCenter={this.emitter}/>
                </PluginContext.Provider>
            </StrictMode>,
        );
        // yes we can render, but the clicking the link won't jump to the note
        // MarkdownRenderer.render(this.plugin.app, "# F [[PDD]] [[Manage]] Page", this.containerEl, "PDD", null);
    }

    async onClose() {
        this.unmountReactRoot();
    }


    private unmountReactRoot() {
        this.root?.unmount();
        this.root = null;
    }
}


export const PluginContext = createContext<OdaPmToolPlugin>(undefined as any);