import {App, ItemView, WorkspaceLeaf} from "obsidian";
import {createRoot, Root} from "react-dom/client";
import React, {useState} from "react";
import OdaPmToolPlugin, {PLUGIN_NAME} from "../../../main";
import {PluginContext} from "../manage-page-view";
import {HStack} from "../../pure-react/view-template/h-stack";
import {StrictModeWrapper} from "../../pure-react/view-template/strict-mode-wrapper";
import {HelpPanelSwitcher} from "../../common/link-view";
import {H1} from "../../common/heading";
import {jsxToMarkdown} from "../../../utils/markdown-converter";
import {BasicTutorial, useSharedTlDr} from "./basic-tutorial";
import {UserManual} from "./user-manual";
import {ExampleManagePage} from "./example-manage-page";
import {devLog} from "../../../utils/env-util";
import {ExternalToggleView} from "../../pure-react/view-template/toggle-view";
import {centerChildrenVertStyle, getStickyHeaderStyle} from "../../react-view/style-def";

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
        this.root.render(<HelpViewRoot plugin={this.plugin} container={contentEl}/>);
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

const OutputButton = ({app}: { app: App }) => {
//#ifdef DEVELOPMENT_BUILD
    const quartz_folder = "TagProject";
    const outputBtn = <button onClick={async () => {
        for (const {jsx, title} of QuartzPath) {
            try {
                await app.vault.createFolder(quartz_folder).then(
                    () => {
                        devLog(`create folder ${quartz_folder} success`)
                    }
                )
            } catch {
                devLog(`Folder exists: ${quartz_folder}.`)
            }
            const quartzFilePath = `${quartz_folder}/${title + ".md"}`;
            const html = jsxToMarkdown(jsx);
            // console.log(html)
            await app.vault.adapter.write(quartzFilePath, html).then(
                () => {
                    devLog(`write ${quartzFilePath} success`)
                }
            )
        }
    }}>output
    </button>
    return outputBtn;
//#endif
}
export const HelpPage_Tutorial = "Tutorial";
export const HelpPage_Template = "Template";
export const HelpPage_UserManual = "User Manual";
export const HelpViewTabsNames = [HelpPage_Tutorial, HelpPage_UserManual, HelpPage_Template]

const QuartzPath = [
    {jsx: <BasicTutorial/>, title: HelpPage_Tutorial},
    {jsx: <UserManual/>, title: HelpPage_UserManual},
]
export const HelpViewRoot = ({plugin, container}: {
    plugin: OdaPmToolPlugin,
    container: Element
}) => {
    return <StrictModeWrapper>
        <PluginContext.Provider value={plugin}>
            <CommonHelpViewInModalAndLeaf plugin={plugin} container={container}/>
        </PluginContext.Provider>
    </StrictModeWrapper>
}

const CommonHelpViewInModalAndLeaf = ({plugin, container}: {
    plugin: OdaPmToolPlugin,
    container: Element
}) => {
    const [tab, setTab] = useState(HelpPage_Tutorial);
    const exContainer = container.createEl("div")
    const tldr = useSharedTlDr();
    const {
        isTlDr,
        setIsTlDr,
    } = tldr;
    return <div>
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
        {tab === HelpPage_Tutorial ? <HStack style={{
                alignItems: "center",
                ...(getStickyHeaderStyle()),
                padding: 10
            }} spacing={10}> <ExternalToggleView externalControl={isTlDr} onChange={() => {
                const nextValue = !isTlDr;
                setIsTlDr(nextValue)
            }} content={<label style={{padding: 5}}>{"TL;DR - When you understand the concepts"}</label>}/>
            </HStack>
            : null
        }

        <div>
            {
                tab === HelpPage_Tutorial ? <BasicTutorial tldrProps={tldr} setTab={setTab}/> :
                    tab === HelpPage_UserManual ? <UserManual/> :
                        tab === HelpPage_Template ?
                            <ExampleManagePage app={plugin.app} container={exContainer}/> : <></>
            }
        </div>
    </div>
}


