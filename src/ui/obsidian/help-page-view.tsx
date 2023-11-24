import {App, ItemView, Modal, WorkspaceLeaf} from "obsidian";
import {createRoot, Root} from "react-dom/client";
import React, {JSX, useContext, useState} from "react";
import {I_Stylable, ObsidianIconView} from "../react-view/view-template/icon-view";
import OdaPmToolPlugin, {
    CmdPal_JumpToManagePage,
    CmdPal_OpenManagePage,
    CmdPal_SetWorkflowToTask,
    PLUGIN_NAME
} from "../../main";
import {Tag_Prefix_Step, Tag_Prefix_Tag, Tag_Prefix_TaskType, Tag_Prefix_Workflow} from "../../data-model/workflow-def";
import {Icon_ManagePage, PluginContext} from "./manage-page-view";
import {getTemplateHtml, ManagePageForTemplate, templateMd} from "../tpm-template-md";
import {IRenderable} from "../common/i-renderable";
import {setSettingsValueAndSave} from "../../Settings";
import {HStack} from "../react-view/view-template/h-stack";
import {StrictModeWrapper} from "../react-view/view-template/strict-mode-wrapper";
import {DataTable} from "../react-view/view-template/data-table";
import {WorkflowTypeLegend} from "../react-view/workflow-filter";
import {Frontmatter_FileProject, Frontmatter_FolderProject, Tag_Prefix_Project} from "../../data-model/OdaPmProject";
import {FileNavView} from "../common/file-nav-view";

export const PmHelpPageViewId = "tpm-help-view";
export const Desc_ManagePage = "Manage Page";
export const Icon_HelpPage = "info";

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
        return `${PLUGIN_NAME} Help Page`;
    }

    getIcon(): string {
        return Icon_HelpPage;
    }

    async onOpen() {
        this.renderPage();
    }


    private renderPage() {

        const contentEl = this.containerEl.children[1];
        contentEl.empty();

        // React
        this.root = createRoot(this.containerEl.children[1]); // Override the previous container
        this.root.render(<CommonHelpViewInModalAndLeaf plugin={this.plugin} container={contentEl}/>);
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
    plugin: OdaPmToolPlugin;

    constructor(plugin: OdaPmToolPlugin) {
        super(plugin.app);
        this.plugin = plugin;
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.empty();
        // React
        this.root = createRoot(contentEl); // Override the previous container
        this.root.render(<CommonHelpViewInModalAndLeaf plugin={this.plugin} container={contentEl}/>)
    }

    onClose() {
        this.root?.unmount();
        this.root = null;
    }
}

const centerChildrenVertStyle = {display: "flex", justifyContent: "center"}
const HelpPage_Template = "Template";
const HelpViewTabsNames = ["Tutorial", "User manual", HelpPage_Template]
const CommonHelpViewInModalAndLeaf = ({plugin, container}: {
    plugin: OdaPmToolPlugin,
    container: Element
}) => {
    const [tab, setTab] = useState(HelpViewTabsNames[0]);
    const exContainer = container.createEl("div")
    return <StrictModeWrapper>
        <PluginContext.Provider value={plugin}>
            <div>
                <div style={centerChildrenVertStyle}>
                    <h1 style={{}}>{PLUGIN_NAME}: Help Page</h1>
                </div>
                <div style={centerChildrenVertStyle}>
                    <HStack spacing={30}>
                        {HelpViewTabsNames.map((name, index) => {
                            return <button key={name} onClick={() => setTab(name)}>{name}</button>
                        })}
                    </HStack>
                </div>
                <div>
                    {
                        tab === HelpViewTabsNames[0] ? <BasicTutorial/> :
                            tab === HelpViewTabsNames[1] ? <UserManual/> :
                                tab === HelpViewTabsNames[2] ?
                                    <ExampleManagePage app={plugin.app} container={exContainer}/> : <></>
                    }
                </div>
            </div>
        </PluginContext.Provider>
    </StrictModeWrapper>
}

const BasicTutorial = () => {
    const plugin = useContext(PluginContext);
    const [isTlDr, setIsTlDr] = useState(plugin.settings.help_page_tutorial_tldr as boolean);
    // hidden when tldr mode is on.
    const blockTldrOmitStyle: React.CSSProperties = {display: isTlDr ? "none" : "block"} //  visibility:"hidden" will still take space. So we use display instead
    const blockTldrShowStyle: React.CSSProperties = {display: isTlDr ? "block" : "none"}
    const inlineTldrOmitStyle: React.CSSProperties = {display: isTlDr ? "none" : "inline"}

    return <>
        <HStack style={{alignItems: "center"}} spacing={10}>
            <h1>Tutorial</h1>
            <ExternalToggleView externalControl={isTlDr} onChange={() => {
                const nextValue = !isTlDr;
                setIsTlDr(nextValue)
                setSettingsValueAndSave(plugin, "help_page_tutorial_tldr", nextValue)
            }} content={<label style={{padding: 5}}>{"TL;DR - Use when you understand the concepts"}</label>}/>
        </HStack>

        <h2 style={blockTldrOmitStyle}>
            {PLUGIN_NAME} is?
        </h2>

        <p style={blockTldrOmitStyle}>
            A project management plugin for Obsidian.
            In {PLUGIN_NAME}, everything is defined by markdown tags.

            You can quickly add, navigate, and manage task progress anywhere in markdown.
        </p>
        <p style={blockTldrOmitStyle}>
            Almost all the operations can be done via context menu or command palette. Once you set a hotkey for the
            command palette, you can manage your tasks in high efficiency.
        </p>


        <h2>Open {Desc_ManagePage}</h2>
        <p style={blockTldrOmitStyle}>
            You can open {Desc_ManagePage} directly using the ribbon icon (<ObsidianIconView
            iconName={Icon_ManagePage}/>) on the leftmost bar, or use the command palette
            (<i>{CmdPal_OpenManagePage}</i>).
        </p>
        <p style={blockTldrOmitStyle}>
            When you first install {PLUGIN_NAME}, there will be no tasks or workflows. Don't worry, we're gonna go
            through
            the basics in the following sections. You will build a beautiful {Desc_ManagePage} in no time.

            You can also use the template to get started.
            Check {HelpPage_Template} tab for more details.
        </p>
        <p style={blockTldrShowStyle}>
            Open {Desc_ManagePage} via

        </p>
        <ul style={blockTldrShowStyle}>
            <li>
                the ribbon icon (<ObsidianIconView iconName={Icon_ManagePage}/>) on the leftmost bar,
            </li>
            <li>
                the command (<i>{CmdPal_OpenManagePage}</i>).

            </li>
        </ul>


        <h2>A workflow is?</h2>
        <p style={blockTldrOmitStyle}>
            When you are working on a task, you may break it down into several steps. Sometimes, these steps are
            independent, while sometimes they have to be done in a certain order.
            Therefore, we have two kinds of workflows.


        </p>

        <div style={centerChildrenVertStyle}>
            <DataTable tableTitle={"Workflow types"} headers={["Type", "Description"]} rows={
                [[<WorkflowTypeLegend type={"chain"}/>, <>
                    <div>A chain workflow, where the latter steps depend on the previous one.
                    </div>
                    <div> The main task is completed only when the last step is completed.
                    </div>
                </>
                ],
                    [<WorkflowTypeLegend type={"checkbox"}/>,
                        <>
                            <div>A checkbox workflow, where all steps are independent.</div>
                            <div>The main task is completed when all the steps are done, whatever the order is.
                            </div>
                        </>]]
            }
                       tableStyle={{borderCollapse: "collapse",}}
                       thStyle={{border: "solid", borderWidth: 1}}
                       cellStyle={{padding: 10, border: "solid", borderWidth: 1}}
            />

        </div>

        <h3>Use tags to define workflows</h3>
        <div>
            A <b>chain</b> workflow is defined by a task marked with <HashTagView
            tagWithoutHash={`${Tag_Prefix_Workflow}chain`}/>.<span style={inlineTldrOmitStyle}> The steps in the workflow is defined by tags with
            prefix <HashTagView tagWithoutHash={Tag_Prefix_Step}/>.
            The order of the
            steps determines the dependency chain.</span>
        </div>
        <TaggedTaskView content={"write_scripts"}
                        tags={[`${Tag_Prefix_Workflow}chain`, `${Tag_Prefix_Step}write`, `${Tag_Prefix_Step}revise`, `${Tag_Prefix_Step}export`]}/>

        <p style={blockTldrOmitStyle}>
            This defines a chain workflow named <i>write_scripts</i>, where the task is to write scripts, revise, and
            export it to somewhere. You cannot revise before writing, and you cannot export before revising.
        </p>


        <p>
            A <b>checkbox</b> workflow is defined by a task marked with <HashTagView
            tagWithoutHash={`${Tag_Prefix_Workflow}checkbox`}/>.<span style={inlineTldrOmitStyle}> The order of
            the steps does not matter.</span>
        </p>

        <TaggedTaskView content={"card_design"} tags={[
            `${Tag_Prefix_Workflow}checkbox`, `${Tag_Prefix_Step}data`, `${Tag_Prefix_Step}effect`, `${Tag_Prefix_Step}art`
        ]}/>
        <div style={blockTldrOmitStyle}>
            This defines a checkbox workflow named <i>card_design</i>, used when you want to design a new card for your
            trading card game.
            You need to add the data to the card database, design the effects, and draw some images. You can add the
            card
            data before drawing the art, and vice versa.
        </div>
        <p/>
        <h2>Use tags to define managed tasks</h2>
        <label style={blockTldrOmitStyle}>
            A normal markdown task is not managed in {PLUGIN_NAME}. You can use workflow tags to define a managed task.
            Suppose we have a task to write the preface of the book. We may have a task
            like
            this.</label>
        <div style={blockTldrOmitStyle}>
            <TaggedTaskView content={"Write preface"} tags={[]}/>
        </div>
        <div style={blockTldrOmitStyle}>
            Once workflows are defined, use <HashTagView tagWithoutHash={`${Tag_Prefix_Step}[work_flow_name]`}/> to mark
            a task, without the square brackets. For example, if we want to mark a task as <i>write_scripts</i>, we can
            mark it as
        </div>
        <TaggedTaskView content={"Write preface"} tags={[`${Tag_Prefix_TaskType}write_scripts`]}/>

        <p style={blockTldrOmitStyle}>
            This makes the task a <i>managed task</i>, and it will show up in {Desc_ManagePage}.
            You can use the ribbon icon on the leftmost bar (<ObsidianIconView iconName={Icon_ManagePage}/>), or use the
            command palette (<i>{CmdPal_OpenManagePage}</i>) to open it.
        </p>

        <p style={blockTldrOmitStyle}>
            Here are more examples of the <i>card_design</i> task.
        </p>
        <TaggedTaskView content={"card: warlock, normal attack"} tags={[`${Tag_Prefix_TaskType}card_design`]}/>
        <TaggedTaskView content={"card: warlock, fire magic"} tags={[`${Tag_Prefix_TaskType}card_design`]}/>

        <h3>Use tags to add steps</h3>
        <div style={blockTldrOmitStyle}>
            Remember we define some steps for each workflow. Now we finish the writing work for preface. It goes to the
            revise phase. So we mark it as:
        </div>
        <TaggedTaskView content={"Write preface"}
                        tags={[`${Tag_Prefix_TaskType}write_scripts`, `${Tag_Prefix_Step}write`]}/>


        <p>
            In {Desc_ManagePage}, ticking or unticking a checkbox will add or remove the corresponding tag in markdown
            automatically.
            <span
                style={inlineTldrOmitStyle}> See <i>{`Tasks Completion`}</i> section under <i>{HelpViewTabsNames[1]}</i> tab for more
            details.</span>
        </p>

        <h2>
            A project is?
        </h2>
        <p>
            A project is a collection of workflows and tasks. You can use project to group related workflows and tasks,
            manage project version, so that you have a nice and clean {Desc_ManagePage}.
        </p>

        <h3 style={blockTldrShowStyle}>Define a project</h3>
        A project can be defined by
        <ul style={blockTldrShowStyle}>
            <li> a <b>project tag</b> (a tag with prefix <HashTagView tagWithoutHash={Tag_Prefix_Project}/>)</li>
            <li><label>obsidian file <LinkView text={"property"}
                                               onClick={() => open("https://help.obsidian.md/Editing+and+formatting/Properties")}/><label> </label>
                <InlineCodeView text={Frontmatter_FolderProject}/></label></li>
            <li> obsidian file <LinkView text={"property"}
                                         onClick={() => open("https://help.obsidian.md/Editing+and+formatting/Properties")}/><label> </label>
                <InlineCodeView text={Frontmatter_FileProject}/></li>
        </ul>

        <h3>Group your workflows and tasks</h3>
        <p>
            You can set a folder as a project root, and all the workflows and tasks under this folder will be grouped
            into this project. To do this, you can use the obsidian file <LinkView text={"property"}/> <InlineCodeView
            text={Frontmatter_FolderProject}/>.
        </p>
        <MarkdownFrontMatterView keyString={Frontmatter_FolderProject} valueString={"MyProject"}/>
        <p>
            Add this property to any markdown file directly in this folder, and set the value to your project name.
            The folder hierarchy may look like this.
        </p>
        <FileNavView pathHierarchy={[
            {
                name: "Example: MyProject - Root", isFolder: true, children: [
                    {name: "MyProject 1 (Contains property `tpm_project_root: MyProject`)", isFolder: false},
                    {name: "MyProject 2 (Tasks in this file will be in [MyProject])", isFolder: false},
                ]
            },
        ]}/>
        <p>
            You can also set a file as a project with <LinkView text={"property"}/> <InlineCodeView
            text={Frontmatter_FileProject}/>. It will override the folder project. For example, tasks in the fodler <i>My
            Project
            3</i> will be in the project <i>Another Project</i>.
            <FileNavView pathHierarchy={[
                {
                    name: "Example: MyProject - Root", isFolder: true, children: [
                        {name: "MyProject 1 (Contains property `tpm_project_root: MyProject`)", isFolder: false},
                        {name: "MyProject 2 (Tasks in this file will be in [MyProject])", isFolder: false},
                        {name: "MyProject 3 (Contains property `tpm_project: Another Project`)", isFolder: false},
                    ]
                },
            ]}/>
        </p>

        <p>
            More granular control can be achieved by using <b>project tags</b>. You can add a project tag to a workflow
            or a task, and it will be grouped into that project.

        </p>

        <TaggedTaskView content={"Write preface"}
                        tags={[`${Tag_Prefix_TaskType}write_scripts`, `${Tag_Prefix_Step}write`, `${Tag_Prefix_Project}MyProject`]}/>
        <p>
            For project tags to work, your project name should form a valid tag. For example, <i>My Project</i> is not a
            valid tag, but <i>MyProject</i> is.
        </p>


        <h3>Sub projects</h3>

        
        <h3>Project, workflow and tasks' Relationships</h3>

        <h2>Best Practices</h2>
        <p style={blockTldrOmitStyle}>Since the step tag is already defined, they can be auto completed.
            Note that adding a step tag represents we have done the step. It is more natural for me and the meaning
            stays
            the same with checkbox workflow. If you want to make a step representing the work you are doing, you can add
            a <b><i>done</i></b> step at the end of each chain workflow.
        </p>


        <p style={blockTldrOmitStyle}>
            If you set the workflow for the very first time, it's tag is not available for auto-completion. Instead of
            manually typing the workflow tag, you can also use context menu or command palette
            (<i>{CmdPal_SetWorkflowToTask}</i>) to do it. With a hotkey bound, this is as fast as auto-completion.
        </p>
        <div style={blockTldrShowStyle}>
            Add a workflow tag to a task via:
            <ul>
                <li>
                    (Preferred) context menu or command palette
                    (<i>{CmdPal_SetWorkflowToTask}</i>)
                </li>
                <li>
                    Manually typing the workflow tag
                </li>
            </ul>

        </div>
        <p style={blockTldrOmitStyle}>After typing the first workflow tag, you can use auto-completion.
            But using the command palette is preferred, since it can replace an existing workflow tag with the new one.
            You don't have to remove the old one yourself.
        </p>
        <p style={blockTldrOmitStyle}>
            You can choose whichever way is more convenient for you. Markdown is a
            text file after all.
        </p>


        <h2>Use tags to add, well, tags</h2>
        <p style={blockTldrOmitStyle}>
            Sometimes you want to give a task a property, but you don't want to make it a workflow step. For example,
            you
            want to mark the task abandoned, or this task has high priority, or you want to group tasks into
            different projects.
            You can use <i>managed tags</i> to do that.
        </p>
        <p style={blockTldrOmitStyle}>
            The managed tags have the prefix <HashTagView tagWithoutHash={Tag_Prefix_Tag}/> so it would not be confused
            with
            normal tags, such as <HashTagView tagWithoutHash={`${Tag_Prefix_Tag}abandoned`}/>.
        </p>
        <p style={blockTldrShowStyle}>
            The managed tags have the prefix <HashTagView tagWithoutHash={Tag_Prefix_Tag}/>, such as <HashTagView
            tagWithoutHash={`${Tag_Prefix_Tag}abandoned`}/>.
        </p>
        <TaggedTaskView content={"card: warlock, fire magic"}
                        tags={[`${Tag_Prefix_TaskType}card_design`, `${Tag_Prefix_TaskType}abandoned`]}/>
        <p style={blockTldrOmitStyle}>
            Managed tags will show in {Desc_ManagePage} as filters, while normal tags won't. You can set a tag be
            included
            or excluded in the search on {Desc_ManagePage}.</p>
        <p style={blockTldrOmitStyle}>
            If you want to define a workflow without any steps, it should not be called a workflow. The built-in
            tag should suffice. If you want to manage that task in {PLUGIN_NAME}, you can always place a dummy step tag
            in the workflow definition.
        </p>


        <h2>Commands and Context Menu</h2>
        <p style={blockTldrOmitStyle}>Apart from this, when your cursor is at a task or workflow, you
            can do the following things
            with context menu or command palette (<i>{CmdPal_JumpToManagePage}</i>):
        </p>
        <ul style={blockTldrOmitStyle}>
            <li>If the cursor is at a workflow, you can open {Desc_ManagePage} with only this workflow filtered.
            </li>
            <li>
                If the cursor is at a managed task, you can open {Desc_ManagePage} with only this task shown.
            </li>
        </ul>
        <p style={blockTldrShowStyle}>
            Jump to workflow or task:
        </p>
        <ul style={blockTldrShowStyle}>
            <li>
                when the cursor is at a workflow or a managed task
            </li>
            <li>
                with context menu or command palette (<i>{CmdPal_JumpToManagePage}</i>)
            </li>
        </ul>

        <h2>A {Desc_ManagePage} Example</h2>
        <p>
            You can find the source markdown in the <i>{HelpViewTabsNames[2]}</i> tab.
        </p>
        <ManagePageForTemplate/>
    </>
}
const InlineCodeView = ({text}: {
    text: string
}) => {
    return <span style={{
        color: "var(--code-normal)",
        backgroundColor: "var(--code-background)",
        fontSize: "var(--code-size)",
        fontFamily: "var(--font-monospace)",
        verticalAlign: "baseline",
        borderRadius: "var(--code-radius)",
        padding: "0.25em",
    }} spellCheck="false">{text}</span>
}
const UserManual = () => {
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
        Any status will be recognized as completion in {PLUGIN_NAME}.
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
const templateTargetFilePath = "TagProject_Template.md";

const ExampleManagePage = ({app, container}: {
    app: App,
    container: Element
}) => {
    const [templateView, setTemplateView] = useState<JSX.Element>();
    container.empty()
    if (!templateView)
        getTemplateHtml(app, container).then((v) => {
            setTemplateView(v)
        })
    return <>
        <p style={centerChildrenVertStyle}>
            This is a template for {PLUGIN_NAME}. You can use it as a starting point.
        </p>
        <p style={centerChildrenVertStyle}>
            This can be created with one click in the plugin.
        </p>
        <p style={centerChildrenVertStyle}>
            <button onClick={() => {
                if (templateView) {
                    // fs.writeFileSync("TagProject_Template.md", templateMd)
                    app.vault.adapter.write(templateTargetFilePath, templateMd)
                }
            }}>Create this template at <label style={{padding: 3, fontStyle: "italic"}}>{templateTargetFilePath}</label>
            </button>
        </p>
        <p>
            A {Desc_ManagePage} showcase
        </p>
        <ManagePageForTemplate/>
        <p>
            The source markdown
        </p>
        {templateView}
    </>
}
const LinkView = ({text, onClick}: {
    text: string,
    onClick?: () => void
}) => {
    return <a className="internal-link" onClick={onClick}>{text}</a>
}
const TaggedTaskView = ({content, tags}: {
    content: string,
    tags: string[]
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
const HashTagView = ({tagWithoutHash}: {
    tagWithoutHash: string
}) => {
    tagWithoutHash = tagWithoutHash.startsWith("#") ? tagWithoutHash.substring(1) : tagWithoutHash
    return <>
            <span
                className="cm-formatting cm-formatting-hashtag cm-hashtag cm-hashtag-begin cm-list-1 cm-meta">#</span>
        <span
            className="cm-hashtag cm-hashtag-end cm-list-1 cm-meta ">{tagWithoutHash}</span>
        <label> </label>
    </>
}
const ToggleView = ({
                        content, onChange, onLabelClicked, initialState = false, style,
                    }: {
    content?: string | JSX.Element,
    onChange?: (nextChecked: boolean) => void,
    onLabelClicked?: () => void,
    initialState?: boolean,
} & I_Stylable) => {
    const [isChecked, setIsChecked] = useState(initialState);
    const handleCheckboxChange = () => {
        const nextToggle = !isChecked;
        setIsChecked(nextToggle);
        onChange?.(nextToggle);
    };
    return <ExternalToggleView externalControl={isChecked} content={content} onChange={handleCheckboxChange}
                               onLabelClicked={onLabelClicked} style={style}
    />
}
const ExternalToggleView = ({externalControl, onChange, onLabelClicked, content, style}:
                                {
                                    externalControl: boolean,
                                    onChange: () => void,
                                    onLabelClicked?: () => void,
                                    content?: IRenderable,

                                } & I_Stylable) => {
    const className = externalControl ? "checkbox-container  is-enabled" : "checkbox-container";
    return <><span style={style} className={className} onClick={onChange}><input type="checkbox"/>
    </span><span
        onClick={onLabelClicked}>{content}</span>
    </>
}
const MarkdownFrontMatterView = (props: {
    keyString?: string,
    valueString?: string,
}) => {
    return <div className="metadata-property" data-property-key="tpm_project" data-property-type="text">
        <div className="metadata-property-key">
            <span className="metadata-property-icon" aria-disabled="false">
                <svg
                    xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="svg-icon lucide-text">
                    <path d="M17 6.1H3"></path><path d="M21 12.1H3"></path><path
                    d="M15.1 18H3"></path>
                </svg>
            </span>
            <input className="metadata-property-key-input" type="text" value={props.keyString}/>
        </div>
        <div className="metadata-property-value">
            <div className="metadata-input-longtext mod-truncate" placeholder="Empty" contentEditable="false"
            >{props.valueString}</div>
        </div>

    </div>
}

