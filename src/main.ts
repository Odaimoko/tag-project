import {App, Editor, MarkdownFileInfo, MarkdownView, Modal, Notice, Plugin} from 'obsidian';
import {Icon_ManagePage, ManagePageView, ManagePageViewId} from "./ui/manage-page-view";
import {ONotice} from "./utils/o-notice";
import {SettingsProvider, TPM_DEFAULT_SETTINGS, TPMSettings, TPMSettingsTab} from "./Settings";

import {
    DataviewIndexReadyEvent,
    DataviewMetadataChangeEvent,
    Evt_JumpTask,
    Evt_JumpWorkflow
} from "./typing/dataview-event";
import {EventEmitter} from "events";
import {OdaPmDb, OdaPmDbProvider} from "./data-model/odaPmDb";
import {addTagText, I_OdaPmWorkflow, OdaPmTask} from "./data-model/workflow_def";
import {rewriteTask} from "./utils/io_util";
import {WorkflowSuggestionModal} from "./ui/WorkflowSuggestionModal";
import {Desc_ManagePage, Icon_HelpPage, PmHelpPageView, PmHelpPageViewId} from "./ui/help-page-view";

export const PLUGIN_NAME = 'Tag Project';
export const CmdPal_OpenManagePage = `Open ${Desc_ManagePage}`;
export const CmdPal_SetWorkflowToTask = 'Set workflow';
export const CmdPal_JumpToManagePage = `To ${Desc_ManagePage}`;
export default class OdaPmToolPlugin extends Plugin {
    settings: TPMSettings;
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

        this.inited = true;
    }

    // region Settings Tab integration
    private async initSettings() {
        await this.loadSettings();
        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new TPMSettingsTab(
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
        this.addCommand({
            id: 'tpm:open-manage-page',
            name: CmdPal_OpenManagePage,
            callback: () => {
                this.activateManagePageView()
            }
        });
        this.addCommand({
            id: 'tpm:jump-manage-page',
            name: CmdPal_JumpToManagePage,
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.jumpToTaskOrWorkflow(editor, view);
            }
        });
        this.addCommand({
            id: 'tpm:set-workflow',
            name: CmdPal_SetWorkflowToTask,
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.addWorkflowToMdTask(editor, view);
            }
        });
        // endregion

        this.registerEvent(
            this.app.workspace.on("editor-menu", (menu, editor, view) => {
                menu.addItem((item) => {
                    item
                        .setTitle(CmdPal_JumpToManagePage)
                        .setIcon("document")
                        .onClick(async () => {
                            this.jumpToTaskOrWorkflow(editor, view);
                            // console.log(leaf.view)
                            // console.log(this.pmDb.pmTasks.filter(k => k.summary == "Open a md task in Manage Page"))
                        });

                });
            })
        )

        this.registerEvent(
            this.app.workspace.on("editor-menu", (menu, editor, view) => {
                menu.addItem((item) => {
                    item
                        .setTitle(CmdPal_SetWorkflowToTask)
                        .setIcon("document")
                        .onClick(async () => {
                            this.addWorkflowToMdTask(editor, view);

                        });

                });
            })
        )

    }

    private addWorkflowToMdTask(editor: Editor, view: MarkdownView | MarkdownFileInfo) {
        const cursor = editor.getCursor();
        const filePath = view.file?.path;
        if (!filePath) {
            new ONotice("No markdown file.")
            return; // no file
        }
        // console.log(`line: ${editor.getLine(cursor.line)}`)
        const pageCache = this.app.metadataCache.getCache(filePath);
        /* A task object is like this. A list object is similar but without "task" field.
        {
            "position": {
                "start": {
                    "line": 168,
                    "col": 0,
                    "offset": 9076
                },
                "end": {
                    "line": 168,
                    "col": 92,
                    "offset": 9168
                }
            },
            "parent": -167,
            "task": "x"
        }
        * */
        const taskCache = pageCache?.listItems?.find(k => k.position.start.line == cursor.line && k.task);
        // we only process if it's a md task
        if (!taskCache) {
            // console.log(pageCache)
            // console.log(pageCache?.listItems?.map(k => k.position.start))
            new ONotice("It's not a markdown task.\nTry remove indentations or texts directly following on the next line (you can use list to describe details).\nOnly the task that is part of a list are recognized (or the task itself is a list itself). ")
            return;
        }
        // console.log(taskCache)
        const workflow = this.pmDb.getWorkflow(filePath, cursor.line);
        if (workflow) {
            new ONotice("This is a workflow definition, not a task.")
            return; // skip if the task is a workflow def
        }

        // choose workflow
        new WorkflowSuggestionModal(this.app, (workflow, evt) => {
            const pmTask = this.pmDb.getPmTask(filePath, cursor.line);
            if (!workflow) {
                return;
            }
            if (pmTask) {
                // replace the existent workflow tag
                const desiredText = `${pmTask.boundTask.text.replace(pmTask.type.tag, workflow.tag)}`;
                // console.log(desiredText)
                rewriteTask(this.app.vault, pmTask.boundTask, pmTask.boundTask.status, desiredText)
                return;
            } else {
                const desiredText = addTagText(editor.getLine(cursor.line), workflow.tag);
                editor.setLine(cursor.line, desiredText)
            }
        }).open();
    }

    /**
     * View for editor, fileinfo for file navigation.
     * @param editor
     * @param view
     * @private
     */
    private jumpToTaskOrWorkflow(editor: Editor, view: MarkdownView | MarkdownFileInfo) {
        const cursor = editor.getCursor();
        const filePath = view.file?.path;
        if (!filePath) return; // no file

        // use line and file as the identifier
        // if it's a workflow, open the page and select only the workflow
        // if it's a task, open the page, select the workflow, and set searchText to the task summary

        const workflow = this.pmDb.getWorkflow(filePath, cursor.line);
        if (workflow) {
            this.jumpToWorkflowPage(workflow);
            return;
        }
        const pmTask = this.pmDb.getPmTask(filePath, cursor.line);
        if (pmTask) {
            this.jumpToTaskPage(pmTask);
            return;
        }
        new ONotice(`Not a task or workflow.\n${filePath}:${cursor.line}`)
    }

    private jumpToTaskPage(pmTask: OdaPmTask) {
        this.activateManagePageView().then((leaf) => {
            this.emitter.emit(Evt_JumpTask, pmTask)
        })
    }

    private jumpToWorkflowPage(workflow: I_OdaPmWorkflow) {
        this.activateManagePageView()
            .then((leaf) => {
                this.emitter.emit(Evt_JumpWorkflow, workflow)
            });
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

        this.registerView(
            PmHelpPageViewId,
            (leaf) => new PmHelpPageView(leaf, this,)
        );

        this.addRibbonIcon(Icon_HelpPage, `${PLUGIN_NAME} Help Page`, (event) => {
            this.activateView(PmHelpPageViewId)
        });
        this.addRibbonIcon(Icon_ManagePage, `${PLUGIN_NAME} Manage Page`, () => {
            this.activateManagePageView()
        });
    }

    async activateManagePageView() {
        return this.activateView(ManagePageViewId)
    }

    // Supports only one leaf.
    async activateView(viewTypeId: string) {

        // Remove existing views.
        const workspace = this.app.workspace;
        const leaves = workspace.getLeavesOfType(viewTypeId);
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
        console.log(viewTypeId)

        const leafView = workspace.getLeavesOfType(viewTypeId)[0];
        workspace.revealLeaf(
            leafView
        );
        return leafView
    }

    // endregion
    async loadSettings() {
        // Shallow copy
        this.settings = Object.assign({}, TPM_DEFAULT_SETTINGS, await this.loadData());
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

