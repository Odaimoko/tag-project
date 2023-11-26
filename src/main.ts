import {Editor, EditorPosition, MarkdownFileInfo, MarkdownView, Plugin} from 'obsidian';
import {Icon_ManagePage, ManagePageView, ManagePageViewId} from "./ui/obsidian/manage-page-view";
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
import {addTagText, getWorkflowNameFromRawText, I_OdaPmWorkflow} from "./data-model/workflow-def";
import {rewriteTask, setProjectTagAtPath} from "./utils/io-util";
import {WorkflowSuggestionModal} from "./ui/obsidian/workflow-suggestion-modal";
import {Icon_HelpPage, PmHelpPageView, PmHelpPageViewId} from "./ui/obsidian/help-page/help-page-view";
import {devLog, initPluginEnv, removePluginEnv, setVaultName} from "./utils/env-util";
import {OdaPmTask} from "./data-model/OdaPmTask";
import {ProjectSuggestionModal} from "./ui/obsidian/project-suggestion-modal";
import {assertOnPluginInit} from "./test_runtime/assertDatabase";

export const PLUGIN_NAME = 'Tag Project';
export const CmdPal_OpenManagePage = `Open Manage Page`; // `Open ${Desc_ManagePage}`
export const CmdPal_SetWorkflowToTask = 'Set workflow';
export const CmdPal_SetProject = 'Set Project';
export const CmdPal_JumpToManagePage = `Jump To Manage Page`;

export default class OdaPmToolPlugin extends Plugin {
    settings: TPMSettings;
    private emitter: EventEmitter;
    pmDb: OdaPmDb
    inited: boolean

    async onload() {
        await this.initSettings();

        if (!this.hasDataviewPlugin()) {
            new ONotice("Dataview plugin is not enabled.");

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
            removePluginEnv();
            this.emitter.removeAllListeners()
        }
    }


    private async initPlugin() {
        initPluginEnv();
        setVaultName(this.app.vault.getName());
        this.emitter = new EventEmitter();
        this.pmDb = new OdaPmDb(this.emitter);
        OdaPmDbProvider.add(this.pmDb);

        this.regPluginListener()

        this.initCommands();


        this.initView();

        this.inited = true;
        // TODO Decouple
        assertOnPluginInit(this);
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

        this.addCommand({
            id: 'open-manage-page',
            name: CmdPal_OpenManagePage,
            callback: () => {
                this.activateManagePageView()
            }
        });
        this.addCommand({
            id: 'jump-manage-page',
            name: CmdPal_JumpToManagePage,
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.jumpToTaskOrWorkflow(editor, view);
            }
        });
        this.addCommand({
            id: 'set-workflow',
            name: CmdPal_SetWorkflowToTask,
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.addWorkflowToMdTask(editor, view);
            }
        });
        this.addCommand({
            id: 'set-project',
            name: CmdPal_SetProject,
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.addProjectToMdTask(editor, view);
            }
        });
        // endregion

        this.registerEvent(
            this.app.workspace.on("editor-menu", (menu, editor, view) => {
                menu.addItem((item) => {
                    item
                        .setTitle(CmdPal_JumpToManagePage)
                        .setIcon(Icon_ManagePage)
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
                        .setIcon(Icon_ManagePage)
                        .onClick(async () => {
                            this.addWorkflowToMdTask(editor, view);
                        });

                });
            })
        )
        this.registerEvent(
            this.app.workspace.on("editor-menu", (menu, editor, view) => {
                menu.addItem((item) => {
                    item
                        .setTitle(CmdPal_SetProject)
                        .setIcon(Icon_ManagePage)
                        .onClick(async () => {
                            this.addProjectToMdTask(editor, view);
                        });

                });
            })
        )
    }

    private checkValidMdTask(filePath: string, cursor: EditorPosition) {
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
        // console.log(taskCache)
        // we only process if it's a md task
        if (!taskCache) {
            // console.log(pageCache)
            // console.log(pageCache?.listItems?.map(k => k.position.start))
            // new ONotice("It's not a markdown task.\nTry remove indentations or texts directly following on the next line (you can use list to describe details).\nOnly the task that is part of a list are recognized (or the task itself is a list itself). ")
            new ONotice("Not a markdown task.")
            return false;
        }
        return true;
    }

    private addWorkflowToMdTask(editor: Editor, view: MarkdownView | MarkdownFileInfo) {
        const filePath = view.file?.path;
        if (!filePath) {
            new ONotice("Not a markdown file.")
            return; // no file
        }
        const cursor = editor.getCursor();
        if (!this.checkValidMdTask(filePath, cursor)) return;

        // console.log(`line: ${editor.getLine(cursor.line)}`)
        const workflow = this.pmDb.getWorkflow(filePath, cursor.line);
        if (workflow) {
            new ONotice("This is a workflow definition, not a task.")
            return; // skip if the task is a workflow def
        }

        const pmTask = this.pmDb.getPmTask(filePath, cursor.line);
        // choose workflow
        new WorkflowSuggestionModal(this.app, filePath, pmTask, (workflow, evt) => {
            if (!workflow) {
                return;
            }
            const targetTag = workflow.tag;
            if (pmTask) {
                // replace the existent workflow tag
                const sTask = pmTask.boundTask;
                const srcTag = pmTask.type.tag;
                const desiredText = `${sTask.text.replace(srcTag, targetTag)}`;
                // console.log(desiredText)
                rewriteTask(this.app.vault, sTask, sTask.status, desiredText)
                return;
            } else {
                const lineText = editor.getLine(cursor.line);
                const desiredText = addTagText(lineText, targetTag);
                editor.setLine(cursor.line, desiredText)
            }
        }).open();
    }

    private addProjectToMdTask(editor: Editor, view: MarkdownView | MarkdownFileInfo) {
        const filePath = view.file?.path;
        if (!filePath) {
            new ONotice("Not a markdown file.")
            return; // no file
        }
        const cursor = editor.getCursor();
        if (!this.checkValidMdTask(filePath, cursor)) return;

        new ProjectSuggestionModal(this.app, (prj, evt) => {
            if (!prj) {
                return;
            }
            const sanityCheckProject = getWorkflowNameFromRawText(prj.name);
            if (prj.name !== sanityCheckProject) {
                new ONotice(`Project name is not a valid Tag.\n - [${prj.name}]`)
                return;
            }
            setProjectTagAtPath.call(this, prj, filePath, cursor);
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
        devLog(viewTypeId)

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
