import {App, Editor, MarkdownView, Modal, Notice, Plugin} from 'obsidian';
import {ManagePageView, ManagePageViewId} from "./ui/manage-page-view";
import {ONotice} from "./utils/o-notice";
import {IPM_DEFAULT_SETTINGS, IPmSettings, IPmSettingsTab} from "./Settings";

import {DataviewIndexReadyEvent} from "./typing/dataview-event";

export const PLUGIN_NAME = 'iPm';


export default class OdaPmToolPlugin extends Plugin {
    settings: IPmSettings;

    async onload() {
        if (!this.hasDataviewPlugin()) {
            new ONotice("Dataview plugin is not enabled. Please enable it to use this plugin.");

            this.registerEvent(this.app.metadataCache.on(DataviewIndexReadyEvent, () => {
                this.initPlugin()
            }));
            return;
        }

        await this.initPlugin();
    }

    private async initPlugin() {

        await this.initSettings();

        // region Ribbon integration
        // This creates an icon in the left ribbon.
        const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
            // Called when the user clicks the icon.
            new Notice('This is a notice!');
        });
        // Perform additional things with the ribbon
        ribbonIconEl.addClass('my-plugin-ribbon-class');
        // Oda: This adds a text to the ribbon icon
        // ribbonIconEl.createEl('span', {text: 'Ribbon Text'});
        //endregion


        // region Status Bar integration
        // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
        const statusBarItemEl = this.addStatusBarItem();
        statusBarItemEl.setText('Status Bar Text');
        // endregion
        this.initCommands();


        // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
        // Using this function will automatically remove the event listener when this plugin is disabled.
        this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
            // console.log('click', evt);
        });

        // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
        this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

        this.initView();
        this.addRibbonIcon("arrow-big-left", "Print leaf types", () => {
            this.app.workspace.iterateAllLeaves((leaf) => {
                console.log(leaf.getViewState().type);
            });
        });
    }

    // region Settings Tab integration
    private async initSettings() {
        await this.loadSettings();
        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new IPmSettingsTab(
            this.app,
            this));
    }

    // endregion   

    private initCommands() {
        // region Command Palette integration
        // This adds a simple command that can be triggered anywhere
        this.addCommand({
            id: 'open-sample-modal-simple',
            name: 'Open sample modal (simple)',
            callback: () => {
                new SampleModal(this.app).open();
            }
        });
        // This adds an editor command that can perform some operation on the current editor instance
        this.addCommand({
            id: 'sample-editor-command',
            name: 'Sample editor command',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                console.log(editor.getSelection());
                editor.replaceSelection('Sample Editor Command');
            }
        });
        // This adds a complex command that can check whether the current state of the app allows execution of the command
        this.addCommand({
            id: 'open-sample-modal-complex',
            name: 'Open sample modal (complex)',
            checkCallback: (checking: boolean) => {
                // Conditions to check
                const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (markdownView) {
                    // If checking is true, we're simply "checking" if the command can be run.
                    // If checking is false, then we want to actually perform the operation.
                    if (!checking) {
                        new SampleModal(this.app).open();
                    }

                    // This command will only show up in Command Palette when the check function returns true
                    return true;
                }
            }
        });
        // endregion
    }

    hasDataviewPlugin() {
        return this.app.plugins.enabledPlugins.has("dataview");
    }

    // region Example View integration
    private initView() {
        this.registerView(
            ManagePageViewId,
            (leaf) => new ManagePageView(leaf, this)
        );

        this.addRibbonIcon("bell-plus", "Show Pm Window", () => {
            this.activateView(ManagePageViewId);
        });

    }

    // Supports only one leaf.
    async activateView(viewTypeId: string) {

        // Remove existing views.
        const workspace = this.app.workspace;
        const leaves = workspace.getLeavesOfType(ManagePageViewId);
        // Close all but one view.
        while (leaves.length > 1) {
            leaves[0].detach()
            leaves.remove(leaves[0])
        }
        // Create if none exists.
        if (leaves.length === 0) {
            await workspace.getRightLeaf(false).setViewState({
                type: viewTypeId,
                active: false,
            });
        }

        workspace.revealLeaf(
            workspace.getLeavesOfType(viewTypeId)[0]
        );
    }

    // endregion
    onunload() {
        // console.log('unloading plugin')
    }

    async loadSettings() {
        // Shallow copy
        this.settings = Object.assign({}, IPM_DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class SampleModal extends Modal {
    constructor(app: App) {
        super(app);
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.setText('Woah!');
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}

