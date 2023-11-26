import {App, ItemView, Modal, WorkspaceLeaf} from "obsidian";
import {createRoot, Root} from "react-dom/client";
import React, {useState} from "react";
import OdaPmToolPlugin, {PLUGIN_NAME} from "../../../main";
import {PluginContext} from "../manage-page-view";
import {templateMd} from "../../tpm-template-md";
import {HStack} from "../../react-view/view-template/h-stack";
import {StrictModeWrapper} from "../../react-view/view-template/strict-mode-wrapper";
import {HelpPanelSwitcher} from "../../common/link-view";
import {H1} from "../../common/heading";
import {jsxToMarkdown} from "../../../utils/markdown-converter";
import {BasicTutorial} from "./basic-tutorial";
import {UserManual} from "./user-manual";
import {ExampleManagePage, templateTargetFilePath} from "./example-manage-page";

export const PmHelpPageViewId = "tpm-help-view";
export const Desc_ManagePage = "Manage Page";
export const Icon_HelpPage = "info";

export class PmHelpPageView extends ItemView {
    root: Root | null = null;
    plugin: OdaPmToolPlugin;

    constructor(leaf: WorkspaceLeaf, plugin: OdaPmToolPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return PmHelpPageViewId;
    }

    getDisplayText() {
        return `${PLUGIN_NAME} Help Page`;
    }

    getIcon(): string {
        return Icon_HelpPage;
    }

    async onOpen() {
        this.renderPage();
    }


    private renderPage() {

        const contentEl = this.containerEl.children[1];
        contentEl.empty();

        // React
        this.root = createRoot(this.containerEl.children[1]); // Override the previous container
        this.root.render(<CommonHelpViewInModalAndLeaf plugin={this.plugin} container={contentEl}/>);
    }

    async onClose() {
        this.unmountReactRoot();
    }


    private unmountReactRoot() {
        this.root?.unmount();
        this.root = null;
    }

    emitter() {
        return this.plugin.getEmitter()
    }
}

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
        this.root.render(<CommonHelpViewInModalAndLeaf plugin={this.plugin} container={contentEl}/>)
    }

    onClose() {
        this.root?.unmount();
        this.root = null;
    }
}

const OutputButton = ({app}: { app: App }) => {
//#ifdef DEVELOPMENT_BUILD
    const outputBtn = <button onClick={() => {
        const html = jsxToMarkdown(<BasicTutorial/>);
        // fs.writeFileSync("TagProject_Template.md", templateMd)
        app.vault.adapter.write(templateTargetFilePath, templateMd)
        console.log(html);
    }}>output
    </button>
    console.log("DEVBu")
    return outputBtn;
//#endif
}
export const centerChildrenVertStyle = {display: "flex", justifyContent: "center"}
export const HelpPage_Template = "Template";
export const HelpViewTabsNames = ["Tutorial", "User manual", HelpPage_Template]

const QuartzPath = [
    {jsx: <BasicTutorial/>, title: "Tutorial"},
    {jsx: <UserManual/>, title: "User Manual"},
]

const CommonHelpViewInModalAndLeaf = ({plugin, container}: {
    plugin: OdaPmToolPlugin,
    container: Element
}) => {
    const [tab, setTab] = useState(HelpViewTabsNames[0]);
    const exContainer = container.createEl("div")
    return <StrictModeWrapper>
        <PluginContext.Provider value={plugin}>
            <div>
                <div style={centerChildrenVertStyle}>
                    <H1 style={{}}>{PLUGIN_NAME}: Help Page</H1>
                    <OutputButton app={plugin.app}/>
                </div>
                <div style={centerChildrenVertStyle}>
                    <HStack spacing={30}>
                        {HelpViewTabsNames.map((name, index) => {
                            return <span key={name}>
                                <HelpPanelSwitcher currentPanelName={tab} panelName={name} setPanelName={setTab}/>
                            </span>;
                        })}
                    </HStack>
                </div>
                <div>
                    {
                        tab === HelpViewTabsNames[0] ? <BasicTutorial setTab={setTab}/> :
                            tab === HelpViewTabsNames[1] ? <UserManual/> :
                                tab === HelpViewTabsNames[2] ?
                                    <ExampleManagePage app={plugin.app} container={exContainer}/> : <></>
                    }
                </div>
            </div>
        </PluginContext.Provider>
    </StrictModeWrapper>
}


