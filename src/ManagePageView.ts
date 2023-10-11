import {ItemView, Plugin, WorkspaceLeaf} from "obsidian";
import {getAPI, Literal, STask} from "obsidian-dataview";
import {
    getDefTags,
    getTypeDefTag, OdaPmStep,
    OdaPmTask,
    OdaPmWorkflowType,
    trimTagsFromTask,
    Workflow_Type_Enum_Array
} from "./workflow/workflow_chain";
// https://docs.obsidian.md/Plugins/User+interface/Views
export const ManagePageViewId = "iPm-Tool-ManageView";

const dv = getAPI(); // We can use dv just like the examples in the docs

function createWorkflowFromTask(task: STask): OdaPmWorkflowType[] {
    const workflows = []
    const defTags = getDefTags();
    for (const wfType of Workflow_Type_Enum_Array) {
        const defTag = getTypeDefTag(wfType);
        if (task.tags.includes(defTag)) {
            const workflow: OdaPmWorkflowType = new OdaPmWorkflowType(wfType, trimTagsFromTask(task));
            // TODO name cannot have space and special chars, it must form a valid tag

            for (const tag of task.tags) {
                // exclude def tags. we allow both OdaPmWorkflowType on the same task
                if (defTags.includes(tag)) {
                    continue;
                }
                workflow.addStep(tag)
            }
            workflows.push(workflow)
        }
    }

    return workflows;
}

// Create an OdaPmTask from a STask
function createPmTaskFromTask(taskDefTags: string[], taskDefs: OdaPmWorkflowType[], task: STask): OdaPmTask | null {
    // A task can have only one workflow
    for (let i = 0; i < taskDefTags.length; i++) {
        const defTag = taskDefTags[i];
        if (task.tags.includes(defTag)) {
            const workflow = taskDefs[i];
            return new OdaPmTask(workflow, task)
        }
    }
    return null;
}

function createDvEl(container: Element, plugin: Plugin) {

    // const f = await dv.pages() // DataArray<SMarkdownPage[]>, 
    // DataArray supports some linq expressions
    // SMarkdownPage is a page. STask is a task. SListItemBase is a list item.
    // Replace .file.tasks with index access
    const taskTypeDefs =
        dv.pages()["file"]["tasks"].where(function (k: STask) {
                for (const defTag of getDefTags()) {
                    if (k.tags.includes(defTag)) return true;
                }
                return false;
            }
        )
            .flatMap((task: STask) => createWorkflowFromTask(task))
    ;

    // Vis
    const defitionstDiv = container.createEl("div", {text: "Task Types"});
    let bodyDiv = defitionstDiv.createEl("body");
    const torender = taskTypeDefs.map((wf: OdaPmWorkflowType): Literal => {
        return wf;
    })
    dv.list(torender, bodyDiv, plugin);
    // all task def tags
    const task_def_tags = taskTypeDefs.map(function (k: OdaPmWorkflowType) {
        return k.tag;
    });
    // all tasks that has a workflow
    const tasks_with_workflow = dv.pages()["file"]["tasks"].where(function (k: STask) {
                for (const defTag of task_def_tags) {
                    if (k.tags.includes(defTag)) return true;
                }
                return false;
            }
        )
            .map((task: STask) => {
                return createPmTaskFromTask(task_def_tags, taskTypeDefs, task)
            })
    ;
    // draw tables
    for (const taskTypeDef of taskTypeDefs) {
        // find all tasks with this type
        const tasksWithThisType = tasks_with_workflow.filter(function (k: OdaPmTask) {
            return k.type === taskTypeDef;
        }).map(function (k: OdaPmTask) {
            return k.toTableRow();
        });

        bodyDiv = defitionstDiv.createEl("body");

        dv.table(
            [taskTypeDef.name, ...taskTypeDef.stepsDef.map(function (k: OdaPmStep) {
                return k.name;
            })],
            tasksWithThisType, bodyDiv, plugin);
    }
    // TODO make links and tasks actually work in this page
}

export class ManagePageView extends ItemView {

    plugin: Plugin;

    constructor(leaf: WorkspaceLeaf, plugin: Plugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return ManagePageViewId;
    }

    getDisplayText() {
        return "Project Management";
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.createEl("h2", {text: this.getDisplayText()});
        createDvEl(container, this.plugin)
    }

    async onClose() {
        // Nothing to clean up.
    }
}

