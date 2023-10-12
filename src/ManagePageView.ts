import {ButtonComponent, ItemView, MarkdownView, Plugin, WorkspaceLeaf} from "obsidian";
import {getAPI, Literal, STask} from "obsidian-dataview";
import {
    getDefTags,
    getTypeDefTag, I_OdaPmStep,
    OdaPmTask,
    OdaPmWorkflow,
    trimTagsFromTask,
    Workflow_Type_Enum_Array
} from "./workflow/workflow_chain";
// https://docs.obsidian.md/Plugins/User+interface/Views
export const ManagePageViewId = "iPm-Tool-ManageView";

const dv = getAPI(); // We can use dv just like the examples in the docs

function createWorkflowFromTask(task: STask): OdaPmWorkflow[] {
    const workflows = []
    const defTags = getDefTags();
    for (const wfType of Workflow_Type_Enum_Array) {
        const defTag = getTypeDefTag(wfType);
        if (task.tags.includes(defTag)) {
            const workflow: OdaPmWorkflow = new OdaPmWorkflow(wfType, trimTagsFromTask(task));

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
function createPmTaskFromTask(taskDefTags: string[], taskDefs: OdaPmWorkflow[], task: STask): OdaPmTask | null {
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
    const workflows =
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
    const definitionDiv = container.createEl("div", {text: "Task Types"});
    const bodyDiv = definitionDiv.createEl("body");
    const torender = workflows.map((wf: OdaPmWorkflow): Literal => {
        return wf.name;
    })
    dv.list(torender, bodyDiv, plugin);
    // all task def tags
    const task_def_tags = workflows.map(function (k: OdaPmWorkflow) {
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
                return createPmTaskFromTask(task_def_tags, workflows, task)
            })
    ;
    // leaf is Editor tab
    const workspace = plugin.app.workspace;
    const markdownLeaves = workspace.getLeavesOfType("markdown");
    const leaf = markdownLeaves[0] // 某一个 Tab
    // console.log(markdownLeaves) // use "markdown" instead of MarkdownView，holy...!
    const editor = (leaf.view as MarkdownView).editor;
    const buttonComp = new ButtonComponent(definitionDiv)
    buttonComp.setButtonText("Jump to the first markdown file's line 25")
    buttonComp.onClick(
        () => {
            editor.focus()
            editor.setCursor(25)

        }
    )


    // draw tables
    for (const workflow of workflows) {
        // find all tasks with this type
        const tasksWithThisType = tasks_with_workflow.filter(function (k: OdaPmTask) {
            return k.type === workflow;
        })

        const taskRows = tasksWithThisType.map(function (k: OdaPmTask) {
            return k.toTableRow();
        });
        // console.log(`${workflow.name} has ${taskRows.length} tasks`)
        // TODO use the best practice to create multiple divs
        const tableDiv = container.createEl(`body-${workflow.name}`);
        // const buttonComp = new ButtonComponent(tableDiv)
        // buttonComp.setButtonText("Log Link")
        // buttonComp.onClick(
        //     () => {
        //         console.log(tasksWithThisType[0].boundTask.link) // TODO Is this dataview Link? Yep. But we cannot click it. WHY?
        //     }
        // )
        const stepNames = workflow.stepsDef.map(function (k: I_OdaPmStep) {
            return k.name;
        });
        dv.table(
            [workflow.name, ...stepNames], taskRows, tableDiv, plugin);

    }
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

