// https://docs.obsidian.md/Plugins/User+interface/Views
import {ItemView, WorkspaceLeaf} from "obsidian";
import {ReactManagePage} from "../react-view/react-manage-page";
import {createRoot, Root} from "react-dom/client";
import React, {createContext} from "react";
import OdaPmToolPlugin, {PLUGIN_NAME} from "../../main";
import {ClickableIconView} from "../pure-react/view-template/icon-view";
import {HStack} from "../pure-react/view-template/h-stack";
import {StrictModeWrapper} from "../pure-react/view-template/strict-mode-wrapper";
import {PmHelpModal} from "./help-page/pm-help-modal";

export const Icon_ManagePage = "book-open-check";

export const ManagePageViewId = "tpm-manage-page";

export class ManagePageView extends ItemView {
    root: Root | null = null;
    titleRoot: Root | null = null;
    plugin: OdaPmToolPlugin;

    constructor(leaf: WorkspaceLeaf, plugin: OdaPmToolPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return ManagePageViewId;
    }

    getDisplayText() {
        return `${PLUGIN_NAME} Manage Page`;
    }

    getIcon(): string {
        return Icon_ManagePage;

    }

    async onOpen() {
        // console.log("Manage page view opened.")
        // When dataview is ready, we render the page directly.
        // If dataview is not ready, we still render the page, but we listen to the event and re-render when it is ready.
        this.renderPage();
    }


    private renderPage() {

        //  Why [1]? What is the first child? [0] is title, 1 is content, 2 is input (Why's there an input?)
        const container = this.containerEl.children[1];
        container.empty();
        // React
        this.root = createRoot(this.containerEl.children[1]); // Override the previous container
        // we call render(), so this is a brand new component tree, no matter it exists or not. States won't be preserved.
        this.root.render(
            <StrictModeWrapper>
                <div style={{display: "flex", justifyContent: "center", marginBottom: -20}}>
                    <HStack spacing={10} style={{alignItems: "center"}}>
                        <h1>{this.getDisplayText()}</h1>
                        <ClickableIconView onIconClicked={() => new PmHelpModal(this.plugin).open()}
                                           iconName={"help-circle"}/>
                        <h1>v{this.plugin.manifest.version}</h1>
                    </HStack>
                </div>
                <ContainerContext.Provider value={container}>
                    <PluginContext.Provider value={this.plugin}>
                        <ReactManagePage eventCenter={this.emitter()}/>
                    </PluginContext.Provider>
                </ContainerContext.Provider>
            </StrictModeWrapper>,
        );
        // yes we can render, but the clicking the link won't jump to the note
        // MarkdownRenderer.render(this.plugin.app, "# F [[PDD]] [[Manage]] Page", this.containerEl, "PDD", null);
        const titleEl = this.containerEl.children[0]

        titleEl.empty()

    }

    async onClose() {
        this.unmountReactRoot();
    }


    private unmountReactRoot() {
        this.root?.unmount();
        this.root = null;
        this.titleRoot?.unmount()
        this.titleRoot = null
    }

    emitter() {
        return this.plugin.getEmitter()
    }
}


export const ContainerContext = createContext<Element>(undefined as any);
export const PluginContext = createContext<OdaPmToolPlugin>(undefined as any);
