import {Editor, EditorPosition, MarkdownFileInfo, MarkdownView, Menu, Plugin} from 'obsidian';
import {Icon_ManagePage, ManagePageView, ManagePageViewId} from "./ui/obsidian/manage-page-view";
import {ONotice} from "./utils/o-notice";
import {SettingsProvider, TPM_DEFAULT_SETTINGS, TPMSettings} from "./settings/settings";

import {
    DataviewIndexReadyEvent,
    DataviewMetadataChangeEvent,
    Evt_JumpTask,
    Evt_JumpWorkflow
} from "./typing/dataview-event";
import {EventEmitter} from "events";
import {OdaPmDb, OdaPmDbProvider} from "./data-model/OdaPmDb";
import {getWorkflowNameFromRawText, I_OdaPmWorkflow} from "./data-model/workflow-def";
import {rewriteTask, setProjectTagAtPath} from "./utils/io-util";
import {WorkflowSuggestionModal} from "./ui/obsidian/workflow-suggestion-modal";
import {Icon_HelpPage, PmHelpPageView, PmHelpPageViewId} from "./ui/obsidian/help-page/help-page-view";
import {addBlacklistTag, devLog, devTaggedLog, initPluginEnv, removePluginEnv, setVaultName} from "./utils/env-util";
import {OdaPmTask, setTaskPriority} from "./data-model/OdaPmTask";
import {ProjectSuggestionModal} from "./ui/obsidian/project-suggestion-modal";
import {assertOnPluginInit} from "./test_runtime/assertDatabase";
import TagRenderer from "./ui/obsidian/tag-render/tag-render";
import {TPMSettingsTab} from "./settings/TPMSettingsTab";
import {PrioritySuggestionModal} from "./ui/obsidian/priority-suggestion-modal";
import {addTagText} from "./data-model/tag-text-manipulate";
import {
    matchTasksFromText,
    batchChangeWorkflow,
    batchSetPriority,
    notifyBatchOperationResult
} from "./utils/task-batch-util";

export const PLUGIN_NAME = 'Tag Project';
export const CmdPal_OpenManagePage = `Open Manage Page`; // `Open ${Desc_ManagePage}`
export const CmdPal_SetWorkflowToTask = 'Set workflow';
export const CmdPal_SetProject = 'Set Project';
export const CmdPal_SetPriority = 'Set Priority';
export const CmdPal_JumpToManagePage = `Jump To Manage Page`;

export default class OdaPmToolPlugin extends Plugin {
    settings: TPMSettings;
    private emitter: EventEmitter;
    pmDb: OdaPmDb
    inited: boolean;
    tagRenderer: TagRenderer;

    async onload() {
        addBlacklistTag("TagRender")
        addBlacklistTag("Event")
        addBlacklistTag("Init")
        addBlacklistTag("AssertTest")
        await this.initSettings();

        if (!this.isDataviewPluginEnabled()) {
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
            this.pmDb.stopInitRetryTimer();
            OdaPmDbProvider.remove();
            removePluginEnv();
            this.emitter.removeAllListeners()
        }
    }


    private async initPlugin() {
        initPluginEnv();
        setVaultName(this.app.vault.getName());
        this.emitter = new EventEmitter();
        this.pmDb = new OdaPmDb(this.emitter, this);
        OdaPmDbProvider.add(this.pmDb);
        this.tagRenderer = new TagRenderer(this.app, this.manifest);
        await this.tagRenderer.onload();
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
        this.addCommand({
            id: 'set-priority',
            name: CmdPal_SetPriority,
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.addPriorityToMdTask(editor, view);
            }
        })
        // endregion

        this.registerEvent(
            this.app.workspace.on("editor-menu", (menu, editor, view) => {
                const items: { title: string; icon: string; onClick: () => void }[] = [
                    { title: CmdPal_JumpToManagePage, icon: Icon_ManagePage, onClick: () => this.jumpToTaskOrWorkflow(editor, view) },
                    { title: CmdPal_SetWorkflowToTask, icon: Icon_ManagePage, onClick: () => this.addWorkflowToMdTask(editor, view) },
                    { title: CmdPal_SetProject, icon: Icon_ManagePage, onClick: () => this.addProjectToMdTask(editor, view) },
                    { title: CmdPal_SetPriority, icon: Icon_ManagePage, onClick: () => this.addPriorityToMdTask(editor, view) },
                ];
                items.forEach(({ title, icon, onClick }) => {
                    menu.addItem((item) => item.setTitle(title).setIcon(icon).onClick(onClick));
                });

                // Add batch operations for selected text
                this.addBatchOperationsToMenu(menu, editor, view);
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

    private withValidMdTask(
        view: MarkdownView | MarkdownFileInfo,
        editor: Editor,
        fn: (filePath: string, cursor: EditorPosition) => void
    ): void {
        const filePath = view.file?.path;
        if (!filePath) {
            new ONotice("Not a markdown file.");
            return;
        }
        const cursor = editor.getCursor();
        if (!this.checkValidMdTask(filePath, cursor)) return;
        fn(filePath, cursor);
    }

    private addWorkflowToMdTask(editor: Editor, view: MarkdownView | MarkdownFileInfo) {
        this.withValidMdTask(view, editor, (filePath, cursor) => {
            const workflow = this.pmDb.getWorkflow(filePath, cursor.line);
            if (workflow) {
                new ONotice("This is a workflow definition, not a task.")
                return; // skip if the task is a workflow def
            }

            const pmTask = this.pmDb.getPmTask(filePath, cursor.line);
            new WorkflowSuggestionModal(this.app, filePath, pmTask, (workflow, evt) => {
                if (!workflow) {
                    return;
                }
                const targetTag = workflow.tag;
                if (pmTask) {
                    // replace the existing workflow tag
                    const sTask = pmTask.boundTask;
                    const srcTag = pmTask.type.tag;
                    const desiredText = `${sTask.text.replace(srcTag, targetTag)}`;
                    rewriteTask(this.app.vault, sTask, sTask.status, desiredText)
                    return;
                } else {
                    const lineText = editor.getLine(cursor.line);
                    const desiredText = addTagText(lineText, targetTag);
                    editor.setLine(cursor.line, desiredText)
                }
            }).open();
        });
    }

    private addProjectToMdTask(editor: Editor, view: MarkdownView | MarkdownFileInfo) {
        this.withValidMdTask(view, editor, (filePath, cursor) => {
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
        });
    }

    private addPriorityToMdTask(editor: Editor, view: MarkdownView | MarkdownFileInfo) {
        this.withValidMdTask(view, editor, (filePath, cursor) => {
            const workflow = this.pmDb.getWorkflow(filePath, cursor.line);
            if (workflow) {
                new ONotice("This is a workflow definition, not a task.")
                return; // skip if the task is a workflow def
            }
            const pmTask = this.pmDb.getPmTask(filePath, cursor.line);

            if (!pmTask) {
                new ONotice("Not a managed task.")
                return;
            }

            new PrioritySuggestionModal(this.app, (priorityTag, evt) => {
                const targetTag = priorityTag;
                setTaskPriority(pmTask.boundTask, this, this.pmDb.pmPriorityTags, targetTag)
            }).open();
        });
    }

    /**
     * Add batch operations to context menu based on selected text
     * @param menu The context menu
     * @param editor The editor instance
     * @param view The markdown view
     */
    private addBatchOperationsToMenu(menu: Menu, editor: Editor, view: MarkdownView | MarkdownFileInfo) {
        const selectedText = editor.getSelection()?.trim();
        if (!selectedText || selectedText.length < 3) {
            return;
        }

        // Get all tasks from database
        const allTasks = this.pmDb.pmTasks;
        if (!allTasks || allTasks.length === 0) {
            return;
        }

        // Match tasks from selected text
        const matchedTasks = matchTasksFromText(selectedText, allTasks);
        if (matchedTasks.length === 0) {
            return;
        }

        // Add separator
        menu.addSeparator();

        // Add batch operation menu items
        menu.addItem((item) => {
            item.setTitle(`Batch: Change Workflow (${matchedTasks.length} task${matchedTasks.length > 1 ? 's' : ''})`)
                .setIcon(Icon_ManagePage)
                .onClick(() => {
                    this.handleBatchChangeWorkflow(matchedTasks);
                });
        });

        menu.addItem((item) => {
            item.setTitle(`Batch: Set Priority (${matchedTasks.length} task${matchedTasks.length > 1 ? 's' : ''})`)
                .setIcon(Icon_ManagePage)
                .onClick(() => {
                    this.handleBatchSetPriority(matchedTasks);
                });
        });
    }

    /**
     * Handle batch change workflow for matched tasks
     * @param tasks Tasks to change workflow for
     */
    private handleBatchChangeWorkflow(tasks: OdaPmTask[]) {
        if (tasks.length === 0) return;

        const firstTask = tasks[0];
        new WorkflowSuggestionModal(this.app, firstTask.boundTask.path, firstTask, async (workflow, evt) => {
            if (!workflow) return;

            const result = await batchChangeWorkflow(tasks, workflow, this.app.vault);
            notifyBatchOperationResult('Changed workflow', tasks.length, result);
        }).open();
    }

    /**
     * Handle batch set priority for matched tasks
     * @param tasks Tasks to set priority for
     */
    private handleBatchSetPriority(tasks: OdaPmTask[]) {
        if (tasks.length === 0) return;

        const priorityTags = this.pmDb.pmPriorityTags ?? [];
        if (priorityTags.length === 0) {
            new ONotice('No priority tags configured');
            return;
        }

        new PrioritySuggestionModal(this.app, async (priorityTag, evt) => {
            const result = await batchSetPriority(tasks, priorityTag, this, priorityTags);
            notifyBatchOperationResult('Set priority', tasks.length, result);
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

    isDataviewPluginEnabled() {
        return this.app.plugins?.enabledPlugins?.has("dataview"); // enabledPlugins is extended by obsidian-ex.d.ts
    }

    isDataviewPluginInitialized() {
        return this.app.plugins.plugins.dataview?.api?.index?.initialized;
    }

    regPluginListener() {
        this.listenToMetadataChange();
        this.pmDb.regListener()
    }

    // Register event listener will only be cleared in unload, without a way of clearing it manually. 
    // Thus, we cannot pass registerEvent function directly to a React component. 
    // Instead, we use a custom event emitter, which allows us to clear the listener with useEffect.
    listenToMetadataChange() {
        this.registerEvent(this.app.metadataCache.on("resolved", (...args) => {
            devTaggedLog("Event", `resolved:`, args)
        }));
        // @ts-ignore
        this.registerEvent(this.app.metadataCache.on(DataviewMetadataChangeEvent, (...args) => {
            this.emitter.emit(DataviewMetadataChangeEvent, ...args);
        }));
        // Don't use DataviewIndexReadyEvent, because it is fired when the full index is processed.
        // Otherwise, we may get partial data.
        // @ts-ignore
        this.registerEvent(this.app.metadataCache.on(DataviewIndexReadyEvent, (...args) => {
            // render only when index is ready
            devTaggedLog("Event", `DataviewIndexReadyEvent: ${DataviewIndexReadyEvent} Triggered. args:`, args)
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
