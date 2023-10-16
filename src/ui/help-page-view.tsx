import {App, ItemView, Modal, WorkspaceLeaf} from "obsidian";
import {createRoot, Root} from "react-dom/client";
import React, {StrictMode} from "react";
import {WorkflowTypeLegend} from "./view-creator";
import {DataTable} from "./view-template";
import OdaPmToolPlugin, {CmdPal_JumpToManagePage, CmdPal_SetWorkflowToTask} from "../main";
import {Tag_Prefix_Step, Tag_Prefix_Tag, Tag_Prefix_TaskType, Tag_Prefix_Workflow} from "../data-model/workflow_def";

export const PmHelpPageViewId = "iPm-Tool-HelpView";
export const Desc_ManagePage = "Manage Page";

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

        <BasicTutorial/>

        <AdvancedRules/>
    </>
}
const BasicTutorial = () => {
    return <>
        <h1>iPm</h1>
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
            A chain workflow is defined by a task marked with a tag <HashTagView
            tagWithoutHash={`${Tag_Prefix_Workflow}chain`}/>.
            The order of the
            steps determines the dependency chain.
        </div>
        <TaggedTaskView content={"write_scripts"}
                        tags={[`${Tag_Prefix_Workflow}chain`, `${Tag_Prefix_Step}write`, `${Tag_Prefix_Step}revise`, `${Tag_Prefix_Step}export`]}/>

        <div>
            This defines a chain workflow named <i>write_scripts</i>, where the task is to write scripts, revise, and
            export it to somewhere. You cannot revise before writing, and you cannot export before revising.
        </div>

        <p/>
        <div>
            A checkbox workflow is defined by a task marked with a tag <HashTagView
            tagWithoutHash={`${Tag_Prefix_Workflow}checkbox`}/>. The order of
            the steps does not matter.
        </div>

        <TaggedTaskView content={"card_design"} tags={[
            `${Tag_Prefix_Workflow}checkbox`, `${Tag_Prefix_Step}add_data`, `${Tag_Prefix_Step}effect`, "iPm/step/art"
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
            Once workflows are defined, use <HashTagView tagWithoutHash={`${Tag_Prefix_Step}[work_flow_name]`}/> to mark
            the next
            step, without the square brackets. For example, if we want to mark a task as <i>write_scripts</i>, we can
            mark it as
        </div>
        <TaggedTaskView content={"Write preface"} tags={[`${Tag_Prefix_TaskType}write_scripts`]}/>

        <div>
            This makes the task a <i>managed task</i>, and it will show up in {Desc_ManagePage}.
            You can use the ribbon icon on the leftmost bar, or use the command palette to open {Desc_ManagePage}.
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
        <TaggedTaskView content={"card: warlock, normal attack"} tags={[`${Tag_Prefix_TaskType}card_design`]}/>
        <TaggedTaskView content={"card: warlock, fire magic"} tags={[`${Tag_Prefix_TaskType}card_design`]}/>

        <h2>Use tags to add steps</h2>
        Remember we define some steps for each workflow. Now we finish the writing work for preface. It goes to the
        revise phase. So we mark it as:
        <TaggedTaskView content={"Write preface"}
                        tags={[`${Tag_Prefix_TaskType}write_scripts`, `${Tag_Prefix_Step}write`]}/>
        Since the step tag is already defined, they can be auto completed.
        <p>
            The rules of adding step for each workflow are different. See <LinkView
            text={`Tasks In ${Desc_ManagePage}`}/> section for more
            details.
        </p>
        <label>
            In {Desc_ManagePage}, ticking or unticking a checkbox will add or remove the corresponding tag in the
            markdown
            automatically.
        </label>

        <h2>Use tags to add, well, tags</h2>
        Sometimes you want to give a task some property, but you don't want to make it a workflow step. For example, you
        want to mark the task that is abandoned, or this task has high priority.
        You can use <i>managed tags</i> to do that.
        <p/>
        The managed tags have the prefix <HashTagView tagWithoutHash={Tag_Prefix_Tag}/> so it would not be confused with
        normal tags.
        For example, a managed tag <HashTagView tagWithoutHash={`${Tag_Prefix_Tag}abandoned`}/>.
        Managed tags will show in {Desc_ManagePage} as filters. You can set a tag be included or excluded.
        <p>
            If you want to define a workflow without any steps, it should not be called a workflow. The built-in
            tag should suffice. You can always place a dummy step tag in the workflow definition, though.
        </p>

        <h2>Open {Desc_ManagePage}</h2>
        You can open {Desc_ManagePage} directly using the ribbon icon on the leftmost bar, or use the command palette.
        <p>Apart from this, when your cursor is focusing on a managed task or workflow, you can do the following things
            with context menu or command palette called <i>{CmdPal_JumpToManagePage}</i>:</p>
        <ul>
            <li>If the cursor is at a workflow, you can open {Desc_ManagePage} with only this workflow filtered.
            </li>
            <li>
                If the cursor is at a managed task, you can open {Desc_ManagePage} with only this task shown.
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
        <h1>User Manual</h1>
        <h2>Rules for workflows and tasks</h2>
        A workflow definition or a managed task has to obey the following rules.
        <ul>
            <li>
                A workflow name should be a valid obsidian tag name, since it will be a part of another tag.
            </li>
            <li> A workflow must has at least one step</li>
            <li>Empty names are not allowed for either workflows or tasks.</li>
            <li>
                If multiple workflows have the same name, the latter one will override the previous one.
            </li>
            <li>
                Tasks can have the same name.
            </li>
            <li>If a task has multiple workflows, only the first workflow is recognized.</li>

            <li> The task should occupy only one line. This means a task should not have trailing texts in the next
                line, or having indentation after a non-list item.
            </li>
        </ul>

        You need to put your cursor at a valid task to for the command <i>{CmdPal_JumpToManagePage}</i> work.

        <h2>Task Completion</h2>
        In Obsidian, you may have various symbol to put into the checkbox, such as <InlineCodeView text={"*, /, -, x"}/>,
        etc.
        Any status will be recognized as completion in iPm.
        The behaviour in {Desc_ManagePage} for each workflow is different. We call the task in the markdown page as <i>main
        task</i>, and the steps defined in the workflow as <i>steps</i>.
        <p>
            <b>Checkbox workflow</b>: When all the steps defined are completed.
        </p>
        <ul>
            <li>
                <div style={stepStateStyle}>Main Task: Unticked. Steps: Partially or fully unticked.</div>
                Ticking the main task in {Desc_ManagePage} causes all the steps to be
                ticked, and tags will be automatically added to markdown.
            </li>
            <li>
                <div style={stepStateStyle}>Main Task: Unticked. Steps: Partially or fully unticked.</div>
                Ticking any step will add the according tag to
                markdown, and if all the steps are ticked, the main task will be ticked.
            </li>
            <li>
                <div style={stepStateStyle}>Main Task: Unticked. Steps: Fully ticked.</div>
                Opening {Desc_ManagePage} will tick the main task. This happens if you untick the main task in markdown.
            </li>
            <li>
                <div style={stepStateStyle}>Main Task: Ticked. Steps: Partially or fully unticked.</div>
                Opening {Desc_ManagePage} will tick all the steps. This happens if you tick the main task in markdown.
            </li>
            <li>
                <div style={stepStateStyle}>Main Task: Ticked. Steps: Fully ticked.</div>
                Unticking the main task in {Desc_ManagePage} will cause all the steps to
                be unticked.
            </li>
            <li>
                <div style={stepStateStyle}>Main Task: Ticked. Steps: Fully ticked.</div>
                Unticking any step in {Desc_ManagePage} will cause the main task to be
                unticked.
            </li>
        </ul>

        <b>Chain workflow</b>: When the last step defined is completed.

        <ul>
            <li>
                <div style={stepStateStyle}>Main Task: Unticked. Steps: Any step but the last ticked.</div>
                Ticking the main task in {Desc_ManagePage} causes all but the steps to be
                unticked, and the last one ticked. Tags will be automatically added or removed in markdown.
            </li>
            <li>
                <div style={stepStateStyle}>Main Task: Unticked. Steps: Partially or fully unticked.</div>
                Ticking any step removes other steps and keeps only the ticked one. If the last is ticked, the main task
                will be ticked.
            </li>
            <li>
                <div style={stepStateStyle}>Main Task: Unticked. Steps: Last step ticked.</div>
                Opening {Desc_ManagePage} will tick the main task. This happens if you untick the main task in markdown.
            </li>
            <li>
                <div style={stepStateStyle}>Main Task: Ticked. Steps: Any step but the last ticked.</div>
                Opening {Desc_ManagePage} will untick all but the last step. This happens if you tick the main task in
                markdown.
            </li>
            <li>
                <div style={stepStateStyle}>Main Task: Ticked. Steps: Last step ticked.</div>
                Unticking the main task in {Desc_ManagePage} will cause all the steps to
                be unticked.
            </li>
            <li>
                <div style={stepStateStyle}>Main Task: Ticked. Steps: Last step ticked.</div>
                Ticking any unticked step in {Desc_ManagePage} will cause the main task to be
                unticked.
            </li>
            <li>
                <div style={stepStateStyle}>Main Task: Ticked or Unticked. Steps: Multiple steps ticked.</div>
                Opening {Desc_ManagePage} will keep only the last tag in markdown. This happens if you add a step tag in
                markdown but do not remove the others. This means adding a step tag overrides the previous step no
                matter the relationship in the chain between the step tags.

            </li>
        </ul>
    </>
}

const ExampleManagePage = () => {
    return <label>TODO Example {Desc_ManagePage}</label>
}
const LinkView = ({
                      text, onClick
                  }: {
    text: string, onClick?: () => void
}) => {
    return <a className="internal-link" onClick={onClick}>{text}</a>
}
const TaggedTaskView = ({content, tags}: {
    content: string, tags: string[]
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
const HashTagView = ({tagWithoutHash}: { tagWithoutHash: string }) => {
    tagWithoutHash = tagWithoutHash.startsWith("#") ? tagWithoutHash.substring(1) : tagWithoutHash
    return <>
            <span
                className="cm-formatting cm-formatting-hashtag cm-hashtag cm-hashtag-begin cm-list-1 cm-meta">#</span>
        <span
            className="cm-hashtag cm-hashtag-end cm-list-1 cm-meta ">{tagWithoutHash}</span>
        <label> </label>
    </>
}
