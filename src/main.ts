import {App, Editor, MarkdownView, Menu, Modal, Notice, Plugin} from 'obsidian';
import {ManagePageView, ManagePageViewId} from "./ui/manage-page-view";
import {ONotice} from "./utils/o-notice";
import {IPM_DEFAULT_SETTINGS, IPmSettings, IPmSettingsTab, SettingsProvider} from "./Settings";

import {DataviewIndexReadyEvent, DataviewMetadataChangeEvent} from "./typing/dataview-event";
import {EventEmitter} from "events";
import {OdaPmDb, OdaPmDbProvider} from "./data-model/odaPmDb";

export const PLUGIN_NAME = 'iPm';

export default class OdaPmToolPlugin extends Plugin {
    settings: IPmSettings;
    private emitter: EventEmitter;
    pmDb: OdaPmDb
    inited: boolean

    async onload() {
        await this.initSettings();

        if (!this.hasDataviewPlugin()) {
            new ONotice("Dataview plugin is not enabled. Please enable it to use this plugin.");

            this.registerEvent(this.app.metadataCache.on(DataviewIndexReadyEvent, () => {
                this.initPlugin()
            }));
            return;
        }

        await this.initPlugin();
    }

    onunload() {
        // console.log('unloading plugin')
        SettingsProvider.remove();
        if (this.inited) {
            OdaPmDbProvider.remove();
            this.emitter.removeAllListeners()
        }
    }


    private async initPlugin() {
        this.emitter = new EventEmitter();
        this.pmDb = new OdaPmDb(this.emitter);
        OdaPmDbProvider.add(this.pmDb);
        // console.log("add OdaPmDbProvider")
        this.regPluginListener()

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

        this.registerEvent(
            this.app.workspace.on("file-menu", (menu, file) => {
                menu.addItem((item) => {
                    item
                        .setTitle("Print filemenu path 👈")
                        .setIcon("document")
                        .onClick(async () => {
                            new Notice(file.path);
                        });
                });
            })
        );

        this.registerEvent(
            this.app.workspace.on("editor-menu", (menu, editor, view) => {
                menu.addItem((item) => {
                    item
                        .setTitle("Print editor path 👈")
                        .setIcon("document")
                        .onClick(async () => {
                            new Notice(view.file.path);
                        });
                    console.log(editor.getCursor());
                });
            })
        )
        this.addRibbonIcon("dice", "Open menu", (event) => {
            const menu = new Menu();

            menu.addItem((item) =>
                item
                    .setTitle("Copy")
                    .setIcon("documents")
                    .onClick(() => {
                        new Notice("Copied");
                    })
            );

            menu.addItem((item) =>
                item
                    .setTitle("Paste")
                    .setIcon("paste")
                    .onClick(() => {
                        new Notice("Pasted");
                    })
            );

            menu.showAtMouseEvent(event);
        });
        this.inited = true;
    }

    // region Settings Tab integration
    private async initSettings() {
        await this.loadSettings();
        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new IPmSettingsTab(
            this.app,
            this));
        SettingsProvider.add(this.settings); // it's a reference which does not change and will be updated automatically.
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

    regPluginListener() {
        this.listenToMetadataChange();
        this.pmDb.regListener()
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

    // region Example View integration
    private initView() {
        this.registerView(
            ManagePageViewId,
            (leaf) => new ManagePageView(leaf, this,)
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
    async loadSettings() {
        // Shallow copy
        this.settings = Object.assign({}, IPM_DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    getEmitter() {
        return this.emitter;
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

