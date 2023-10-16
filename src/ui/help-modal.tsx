import {App, Modal} from "obsidian";
import {createRoot, Root} from "react-dom/client";
import React, {StrictMode} from "react";
import {WorkflowTypeLegend} from "./view-creator";
import {DataTable} from "./view-template";
import {CmdPal_SetWorkflowToTask} from "../main";

export class HelpModal extends Modal {
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
            <PmHelpView/>
        </StrictMode>)
    }

    onClose() {
        this.root?.unmount();
        this.root = null;
    }
}

export const PmHelpView = () => {
    return <>
        <h1>iPm Help Page</h1>
        <ExampleManagePage></ExampleManagePage>
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
            A chain workflow is marked by a tag <HashTagView tagWithoutHash={"iPm/workflow/chain"}/>. The order of the
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
            A checkbox workflow is marked by a tag <HashTagView tagWithoutHash={"iPm/workflow/checkbox"}/>. The order of
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
            This makes the task an <i>iPm-managed task</i>, and it will show up in the iPm manage page. You can use the
            ribbon icon on the leftmost, or use the command palette to open the manage page.
        </div>
        <div>
            If you set the workflow for the very first time, it's tag is not available for auto-completion.
            Instead of manually inputting the tag, you can also use context menu or command palette
            (<i>{CmdPal_SetWorkflowToTask}</i>) to do it. With a hotkey bound, this is as fast as auto-completion.
        </div>
        <div>After that you can use auto-completion.
            But using the command palette is preferred, since it can replace an existing workflow tag with the new one.
            You don't have to do it yourself.
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
            text={"Task completion rule"}/> section for more
            details.
        </p>
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

        <h1>Task Rules</h1>
        <h2>Naming rules (WIP)</h2>
        You need to put your cursor at a valid task to make it work.
        No special characters for workflow name, because it has to be a part of a tag.
        See <a className="internal-link">Naming rules</a> section for more details. (Cannot jump, sorry)
        <h2>Task completion rule (WIP)</h2>
        Any status will be recognized as checked.
    </>
}

const ExampleManagePage = () => {
    return <label>TODO Example Manage Page</label>
}
const LinkView = ({text, onClick}: { text: string, onClick?: () => void }) => {
    return <a className="internal-link" onClick={onClick}>{text}</a>
}
const TaggedTaskView = ({content, tags}: { content: string, tags: string[] }) => {
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
    return <>
            <span
                className="cm-formatting cm-formatting-hashtag cm-hashtag cm-hashtag-begin cm-list-1 cm-meta">#</span>
        <span
            className="cm-hashtag cm-hashtag-end cm-list-1 cm-meta ">{tagWithoutHash}</span>
        <label> </label>
    </>
}
