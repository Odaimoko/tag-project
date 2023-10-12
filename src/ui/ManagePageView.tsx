// https://docs.obsidian.md/Plugins/User+interface/Views
import {ItemView, Plugin, WorkspaceLeaf} from "obsidian";
import {ReactManagePage} from "./viewCreator";
import {createRoot, Root} from "react-dom/client";
import {createContext, StrictMode} from "react";
import {EventEmitter} from "events"

export const ManagePageViewId = "iPm-Tool-ManageView";
export const DataviewMetadataChangeEvent = "dataview:metadata-change";

export class ManagePageView extends ItemView {
    root: Root | null = null;
    emitter: EventEmitter;
    plugin: Plugin;


    constructor(leaf: WorkspaceLeaf, plugin: Plugin) {
        super(leaf);
        this.emitter = new EventEmitter();
        this.plugin = plugin;
    }


    getViewType() {
        return ManagePageViewId;
    }

    getDisplayText() {
        return "Project Management";
    }

    async onOpen() {
        console.log("Manage page view opened.")
        this.listenToMetadataChange()
        this.renderPage();
    }

    listenToMetadataChange() {
        // Register event listener will only be cleared in unload, without a way of clearing it manually. 
        // Thus, we cannot pass it directly to a React component. Instead, we use a custom event emitter. 
        this.registerEvent(this.app.metadataCache.on(DataviewMetadataChangeEvent, (...args) => {
            this.emitter.emit(DataviewMetadataChangeEvent, ...args);
        }));
    }

    private renderPage() {

        // TODOQ Why [1]? What is the first child?
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
    }

    async onClose() {
        this.unmountReactRoot();
    }


    private unmountReactRoot() {
        this.root?.unmount();
        this.root = null;
    }
}


export const PluginContext = createContext<Plugin>(null);