import {App, ItemView, Modal, WorkspaceLeaf} from "obsidian";
import {createRoot, Root} from "react-dom/client";
import React, {StrictMode} from "react";
import {WorkflowTypeLegend} from "./view-creator";
import {DataTable} from "./view-template";
import OdaPmToolPlugin, {CmdPal_JumpToManagePage, CmdPal_SetWorkflowToTask} from "../main";

export const PmHelpPageViewId = "iPm-Tool-HelpView";

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
        return "iPM Help Page";
    }

    getIcon(): string {
        return "info";
    }

    async onOpen() {
        this.renderPage();
    }


    private renderPage() {

        const container = this.containerEl.children[1];
        container.empty();
        // React
        this.root = createRoot(this.containerEl.children[1]); // Override the previous container
        this.root.render(
            <StrictMode>
                <PmHelpContentView/>
            </StrictMode>,
        );

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

    constructor(app: App) {
        super(app);
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.empty();
        // React
        this.root = createRoot(contentEl); // Override the previous container
        this.root.render(<StrictMode>
            <PmHelpContentView/>
        </StrictMode>)
    }

    onClose() {
        this.root?.unmount();
        this.root = null;
    }
}

export const PmHelpContentView = () => {
    return <>
        <h1>iPm Help Page</h1>
        <ExampleManagePage></ExampleManagePage>

        {/*<BasicTutorial/>*/}

        <AdvancedRules/>
    </>
}
const BasicTutorial = () => {
    return <>
        <h2>Workflow Types</h2>
        A task can be categorized in one of the following two workflows
        <DataTable tableTitle={"Workflow types"} headers={["Type", "Description"]} rows={
            [[<WorkflowTypeLegend type={"chain"}/>, <>
                <div>A workflow chain, where the latter steps depend on the previous step.
                </div>
                <div>Only when the last step is
                    completed, we deem the main task completed.
                </div>
            </>
            ],
                [<WorkflowTypeLegend type={"checkbox"}/>,
                    <>
                        <div>A checkbox task, where all steps are independent.</div>
                        <div>When all the steps are done, the main task is recognized
                            completed, whatever the order is.
                        </div>
                    </>]]
        }
                   tableStyle={{borderCollapse: "collapse",}}
                   thStyle={{border: "solid", borderWidth: 1}}
                   cellStyle={{padding: 10, border: "solid", borderWidth: 1}}
        />
        <h2>Use tags to define workflows</h2>
        <div>
            A chain workflow is defined by a task marked with a tag <HashTagView tagWithoutHash={"iPm/workflow/chain"}/>.
            The order of the
            steps determines the dependency chain.
        </div>
        <TaggedTaskView content={"write_scripts"}
                        tags={["iPm/workflow/chain", "iPm/step/write", "iPm/step/revise", "iPm/step/export"]}/>

        <div>
            This defines a chain workflow named <i>write_scripts</i>, where the task is to write scripts, revise, and
            export it to somewhere. You cannot revise before writing, and you cannot export before revising.
        </div>

        <p/>
        <div>
            A checkbox workflow is defined by a task marked with a tag <HashTagView
            tagWithoutHash={"iPm/workflow/checkbox"}/>. The order of
            the steps does not matter.
        </div>

        <TaggedTaskView content={"card_design"} tags={[
            "iPm/workflow/checkbox", "iPm/step/add_data", "iPm/step/effect", "iPm/step/art"
        ]}/>
        <div>
            This defines a checkbox workflow named <i>card_design</i>, used when you want to design a new card for your
            trading card game.
            You need to add the data to the card database, design the effect, and draw the art. You can add the card
            data before drawing the art, and vice versa.
        </div>
        <p/>
        <h2>Use tags to define tasks</h2>
        <label>Suppose we have a task to write the preface of the game. We may have a task like this.</label>

        <TaggedTaskView content={"Write preface"} tags={[]}/>

        <div>
            Once workflows are defined, use <HashTagView tagWithoutHash={"iPm/step/[work_flow_name]"}/> to mark the next
            step, without the square brackets. For example, if we want to mark a task as <i>write_scripts</i>, we can
            mark it as
        </div>
        <TaggedTaskView content={"Write preface"} tags={["iPm/workflow/write_scripts"]}/>

        <div>
            This makes the task an <i>iPm-managed task</i>, and it will show up in the iPm manage page.
            You can use the ribbon icon on the leftmost bar, or use the command palette to open the manage page.
        </div>
        <div>
            If you set the workflow for the very first time, it's tag is not available for auto-completion.
            Instead of manually inputting the tag, you can also use context menu or command palette
            (<i>{CmdPal_SetWorkflowToTask}</i>) to do it. With a hotkey bound, this is as fast as auto-completion.
        </div>
        <div>After that you can use auto-completion.
            But using the command palette is preferred, since it can replace an existing workflow tag with the new one.
            You don't have to remove the older one yourself.
        </div>
        <p>
            You can choose whichever way is more convenient for you. Markdown is a
            text file after all.
        </p>
        Here are more examples of the <i>card_design</i> task.
        <TaggedTaskView content={"card: warlock, normal attack"} tags={["iPm/workflow/card_design"]}/>
        <TaggedTaskView content={"card: warlock, fire magic"} tags={["iPm/workflow/card_design"]}/>

        <h2>Use tags to add steps</h2>
        Remember we define some steps for each workflow. Now we finish the writing work for preface. It goes to the
        revise phase. So we mark it as:
        <TaggedTaskView content={"Write preface"} tags={["iPm/workflow/write_scripts", "iPm/step/write"]}/>
        Since the step tag is already defined, they can be auto completed.
        <p>
            The rules of adding step for each workflow are different. See <LinkView
            text={"Tasks In Manage Page"}/> section for more
            details.
        </p>
        <label>
            In Manage Page, ticking or unticking a checkbox will add or remove the corresponding tag in the markdown
            automatically.
        </label>
        <h2>Use tags to add well, tags</h2>
        Sometimes you want to give a task some property, but you don't want to make it a workflow step. For example, you
        want to mark the task that is abandoned, or this task is a high priority task.
        You can use managed tags to do that.
        <p/>
        The managed tags have the prefix <HashTagView tagWithoutHash={"iPm/tag/"}/> so it would not be confused with
        normal tags.
        For example, a managed tag <HashTagView tagWithoutHash={"iPm/tag/abandoned"}/>.
        Managed tags will show in the manage page as filters.
        <p>
            If you want to define a workflow without any steps, well, it should not be called a workflow. The built-in
            tag should suffice. You can always place a dummy step tag in the workflow definition, though.
        </p>
        <h2>Open Manage Page</h2>
        You can open Manage Page directly using the ribbon icon on the leftmost bar, or use the command palette to open
        the manage page.
        <p>Apart from this, when your cursor is focusing on a managed task or workflow, you can do the following things
            with context menu or command palette called <i>{CmdPal_JumpToManagePage}</i>:</p>
        <ul>
            <li>If the cursor is at a workflow, you can open Manage Page with only this workflow filtered.
            </li>
            <li>
                If the cursor is at a managed task, you can open Manage Page with only this task shown.
            </li>
        </ul>
    </>
}
const InlineCodeView = ({text}: { text: string }) => {
    return <label className="cm-inline-code" spellCheck="false">{text}</label>
}
const AdvancedRules = () => {
    const stepStateStyle = {fontWeight: "bold"};

    return <>
        <h1>Task Rules</h1>
        <h2>Naming (WIP)</h2>
        You need to put your cursor at a valid task to make it work. A valid task is a task
        <ul>
            <li>
                has only one line. This means a task should not have trailing texts in the next line.
            </li>
        </ul>
        No special characters for workflow name, because it has to be a part of a tag.
        See <a className="internal-link">Naming rules</a> section for more details. (Cannot jump, sorry)
        <h2>Task assigning (WIP</h2>
        <ul>
            <li>A task with multiple workflows: only recognize the first workflow.</li>
        </ul>
        <h2>Tasks In Manage Page (WIP)</h2>
        In Obsidian, you may have various symbol to put into the checkbox, such as <InlineCodeView text={"*, /, -, x"}/>,
        etc.
        Any status will be recognized as completion in iPm.
        The behaviour in Manage Page for each workflow is different. We call the task in the markdown page as <i>main
        task</i>, and the steps defined in the workflow as <i>steps</i>.
        <p>
            <b>Checkbox workflow</b>: When all the steps defined are completed.
        </p>
        <ul>
            <li>
                <div style={stepStateStyle}>Main Task: Unticked. Steps: Partially or fully unticked.</div>
                Ticking the main task in Manage Page causes all the steps to be
                ticked, and tags will be automatically added to markdown.
            </li>
            <li>
                <div style={stepStateStyle}>Main Task: Unticked. Steps: Partially or fully unticked.</div>
                Ticking any step will add the according tag to
                markdown, and if all the steps are ticked, the main task will be ticked.
            </li>
            <li>
                <div style={stepStateStyle}>Main Task: Unticked. Steps: Fully ticked.</div>
                Opening Manage Page will tick the main task. This happens if you untick the main task in markdown.
            </li>
            <li>
                <div style={stepStateStyle}>Main Task: Ticked. Steps: Partially or fully unticked.</div>
                Opening Manage Page will tick all the steps. This happens if you tick the main task in markdown.
            </li>
            <li>
                <div style={stepStateStyle}>Main Task: Ticked. Steps: Fully ticked.</div>
                Unticking the main task in Manage Page will cause all the steps to
                be unticked.
            </li>
            <li>
                <div style={stepStateStyle}>Main Task: Ticked. Steps: Fully ticked.</div>
                Unticking any step in Manage Page will cause the main task to be
                unticked.
            </li>
        </ul>

        <b>Chain workflow</b>: When the last step defined is completed.

        <ul>
            <li>
                <div style={stepStateStyle}>Main Task: Unticked. Steps: Any step but the last ticked.</div>
                Ticking the main task in Manage Page causes all but the steps to be
                unticked, and the last one ticked. Tags will be automatically added or removed in markdown.
            </li>
            <li>
                <div style={stepStateStyle}>Main Task: Unticked. Steps: Partially or fully unticked.</div>
                Ticking any step removes other steps and keeps only the ticked one. If the last is ticked, the main task
                will be ticked.
            </li>
            <li>
                <div style={stepStateStyle}>Main Task: Unticked. Steps: Last step ticked.</div>
                Opening Manage Page will tick the main task. This happens if you untick the main task in markdown.
            </li>
            <li>
                <div style={stepStateStyle}>Main Task: Ticked. Steps: Any step but the last ticked.</div>
                Opening Manage Page will untick all but the last step. This happens if you tick the main task in
                markdown.
            </li>
            <li>
                <div style={stepStateStyle}>Main Task: Ticked. Steps: Last step ticked.</div>
                Unticking the main task in Manage Page will cause all the steps to
                be unticked.
            </li>
            <li>
                <div style={stepStateStyle}>Main Task: Ticked. Steps: Last step ticked.</div>
                Ticking any unticked step in Manage Page will cause the main task to be
                unticked.
            </li>
            <li>
                <div style={stepStateStyle}>Main Task: Ticked or Unticked. Steps: Multiple steps ticked.</div>
                Opening Manage Page will keep only the last tag in markdown. This happens if you add a step tag in
                markdown but do not remove the others. This means adding a step tag overrides the previous step no
                matter the relationship in the chain between the step tags.

            </li>
        </ul>
    </>
}

const ExampleManagePage = () => {
    return <label>TODO Example Manage Page</label>
}
const LinkView = ({
                      text, onClick
                  }: {
    text: string, onClick?: () => void
}) => {
    return <a className="internal-link" onClick={onClick}>{text}</a>
}
const TaggedTaskView = ({
                            content, tags
                        }: {
    content: string, tags
        :
        string[]
}) => {
    const checkBoxExampleStyle = {marginTop: 10, marginBottom: 10,}
    return <div style={checkBoxExampleStyle}>
        <input type={"checkbox"}/>
        <label>{content} </label>
        {
            tags.map(tag => <HashTagView key={tag} tagWithoutHash={tag}/>)
        }
    </div>
}
const HashTagView = ({
                         tagWithoutHash
                     }: {
    tagWithoutHash: string
}) => {
    return <>
            <span
                className="cm-formatting cm-formatting-hashtag cm-hashtag cm-hashtag-begin cm-list-1 cm-meta">#</span>
        <span
            className="cm-hashtag cm-hashtag-end cm-list-1 cm-meta ">{tagWithoutHash}</span>
        <label> </label>
    </>
}
