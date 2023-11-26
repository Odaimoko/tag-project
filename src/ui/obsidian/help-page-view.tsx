import {App, ItemView, Modal, WorkspaceLeaf} from "obsidian";
import {createRoot, Root} from "react-dom/client";
import React, {JSX, useState} from "react";
import {ObsidianIconView} from "../react-view/view-template/icon-view";
import OdaPmToolPlugin, {
    CmdPal_JumpToManagePage,
    CmdPal_OpenManagePage,
    CmdPal_SetProject,
    CmdPal_SetWorkflowToTask,
    PLUGIN_NAME
} from "../../main";
import {Tag_Prefix_Step, Tag_Prefix_Tag, Tag_Prefix_TaskType, Tag_Prefix_Workflow} from "../../data-model/workflow-def";
import {Icon_ManagePage, PluginContext} from "./manage-page-view";
import {getTemplateHtml, ManagePageForTemplate, templateMd} from "../tpm-template-md";
import {usePluginSettings} from "../../Settings";
import {HStack} from "../react-view/view-template/h-stack";
import {StrictModeWrapper} from "../react-view/view-template/strict-mode-wrapper";
import {DataTable} from "../react-view/view-template/data-table";
import {WorkflowTypeLegend} from "../react-view/workflow-filter";
import {
    Frontmatter_FileProject,
    Frontmatter_FolderProject,
    ProjectName_Unclassified,
    Tag_Prefix_Project
} from "../../data-model/OdaPmProject";
import {FileNavView} from "../common/file-nav-view";
import {ExternalToggleView} from "../react-view/view-template/toggle-view";
import {ProjectFilterName_All} from "../react-view/project-filter";
import {OrphanTaskButtonAndPanel} from "../react-view/fix-orphan-tasks";
import {HelpPanelSwitcher, LinkView} from "../common/link-view";
import {TaggedTaskView} from "../common/tagged-task-view";
import {HashTagView} from "../common/hash-tag-view";
import {MarkdownFrontMatterView} from "../common/markdown-front-matter-view";
import {InlineCodeView} from "../common/inline-code-view";
import {H1, H2, H3, P} from "../common/heading";
import {getStickyHeaderStyle, varBackgroundPrimary} from "../react-view/style-def";
import {jsxToMarkdown} from "../../utils/markdown-converter";

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

const OutputButton = () => {
//#ifdef DEVELOPMENT_BUILD
    const outputBtn = <button onClick={() => {
        const html = jsxToMarkdown(<BasicTutorial/>);
        console.log(html);
    }}>output
    </button>
    console.log("DEVBu")
    return outputBtn;
//#endif
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
                    <H1 style={{}}>{PLUGIN_NAME}: Help Page</H1>
                    <OutputButton/>
                </div>
                <div style={centerChildrenVertStyle}>
                    <HStack spacing={30}>
                        {HelpViewTabsNames.map((name, index) => {
                            return <span key={name}>
                                <HelpPanelSwitcher currentPanelName={tab} panelName={name} setPanelName={setTab}/>
                            </span>;
                        })}
                    </HStack>
                </div>
                <div>
                    {
                        tab === HelpViewTabsNames[0] ? <BasicTutorial setTab={setTab}/> :
                            tab === HelpViewTabsNames[1] ? <UserManual/> :
                                tab === HelpViewTabsNames[2] ?
                                    <ExampleManagePage app={plugin.app} container={exContainer}/> : <></>
                    }
                </div>
            </div>
        </PluginContext.Provider>
    </StrictModeWrapper>
}

function useSharedTlDr() {
    const [isTlDr, setIsTlDr] = usePluginSettings("help_page_tutorial_tldr")
    // hidden when tldr mode is on.
    const blockTldrOmitStyle: React.CSSProperties = {display: isTlDr ? "none" : "block"} //  visibility:"hidden" will still take space. So we use display instead
    const blockTldrShowStyle: React.CSSProperties = {display: isTlDr ? "block" : "none"}
    const inlineTldrOmitStyle: React.CSSProperties = {display: isTlDr ? "none" : "inline"}
    const inlineTldrShowStyle: React.CSSProperties = {display: isTlDr ? "inline" : "none"}
    return {isTlDr, setIsTlDr, blockTldrOmitStyle, blockTldrShowStyle, inlineTldrOmitStyle, inlineTldrShowStyle};
}

const BasicTutorial = (props: {
    setTab?: (tab: string) => void
}) => {
    const {
        isTlDr,
        setIsTlDr,
        blockTldrOmitStyle,
        blockTldrShowStyle,
        inlineTldrOmitStyle,
        inlineTldrShowStyle
    } = useSharedTlDr();

    return <>
        <HStack style={{
            alignItems: "center",
            background: varBackgroundPrimary,
            ...getStickyHeaderStyle()
        }} spacing={10}>
            <H1 style={{}}>Tutorial</H1>
            <ExternalToggleView externalControl={isTlDr} onChange={() => {
                const nextValue = !isTlDr;
                setIsTlDr(nextValue)
            }} content={<label style={{padding: 5}}>{"TL;DR - Use when you understand the concepts"}</label>}/>
        </HStack>

        <H2 style={blockTldrOmitStyle}>
            {PLUGIN_NAME} is?
        </H2>

        <P style={blockTldrOmitStyle}>
            A project management plugin for Obsidian.
            In {PLUGIN_NAME}, everything is defined by markdown tags.

            You can quickly add, navigate, and manage task progress anywhere in markdown.
        </P>
        <P style={blockTldrOmitStyle}>
            Almost all the operations can be done via context menu or command palette. Once you set a hotkey for the
            command palette, you can manage your tasks in high efficiency.
        </P>


        <H2>Open {Desc_ManagePage}</H2>
        <P style={blockTldrOmitStyle}>
            You can open {Desc_ManagePage} directly using the ribbon icon (<ObsidianIconView
            iconName={Icon_ManagePage}/>) on the leftmost bar, or use the command palette
            (<i>{CmdPal_OpenManagePage}</i>).
        </P>
        <P style={blockTldrOmitStyle}>
            When you first install {PLUGIN_NAME}, there will be no tasks or workflows. Don't worry, we're gonna go
            through
            the basics in the following sections. You will build a beautiful {Desc_ManagePage} in no time.

            You can also use the template to get started.
            Check {HelpPage_Template} tab for more details.
        </P>
        <P style={blockTldrShowStyle}>
            Open {Desc_ManagePage} via

        </P>
        <ul style={blockTldrShowStyle}>
            <li>
                the ribbon icon (<ObsidianIconView iconName={Icon_ManagePage}/>) on the leftmost bar,
            </li>
            <li>
                the command (<i>{CmdPal_OpenManagePage}</i>).

            </li>
        </ul>


        <H2>A workflow is?</H2>
        <P style={blockTldrOmitStyle}>
            When you are working on a task, you may break it down into several steps. Sometimes, these steps are
            independent, while sometimes they have to be done in a certain order.
            Therefore, we have two kinds of workflows.


        </P>

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

        <H3>Use tags to define workflows</H3>
        <div>
            A <b>chain</b> workflow is defined by a task marked with <HashTagView
            tagWithoutHash={`${Tag_Prefix_Workflow}chain`}/>.<span style={inlineTldrOmitStyle}> The steps in the workflow is defined by tags with
            prefix <HashTagView tagWithoutHash={Tag_Prefix_Step}/>.
            The order of the
            steps determines the dependency chain.</span>
        </div>
        <TaggedTaskView content={"write_scripts"}
                        tags={[`${Tag_Prefix_Workflow}chain`, `${Tag_Prefix_Step}write`, `${Tag_Prefix_Step}revise`, `${Tag_Prefix_Step}export`]}/>

        <P style={blockTldrOmitStyle}>
            This defines a chain workflow named <i>write_scripts</i>, where the task is to write scripts, revise, and
            export it to somewhere. You cannot revise before writing, and you cannot export before revising.
        </P>


        <P>
            A <b>checkbox</b> workflow is defined by a task marked with <HashTagView
            tagWithoutHash={`${Tag_Prefix_Workflow}checkbox`}/>.<span style={inlineTldrOmitStyle}> The order of
            the steps does not matter.</span>
        </P>

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
        <H2>Use tags to define managed tasks</H2>
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

        <P style={blockTldrOmitStyle}>
            This makes the task a <i>managed task</i>, and it will show up in {Desc_ManagePage}.
            You can use the ribbon icon on the leftmost bar (<ObsidianIconView iconName={Icon_ManagePage}/>), or use the
            command palette (<i>{CmdPal_OpenManagePage}</i>) to open it.
        </P>

        <P style={blockTldrOmitStyle}>
            Here are more examples of the <i>card_design</i> task.
        </P>
        <TaggedTaskView content={"card: warlock, normal attack"} tags={[`${Tag_Prefix_TaskType}card_design`]}/>
        <TaggedTaskView content={"card: warlock, fire magic"} tags={[`${Tag_Prefix_TaskType}card_design`]}/>

        <H3>Use tags to add steps</H3>
        <div style={blockTldrOmitStyle}>
            Remember we define some steps for each workflow. Now we finish the writing work for preface. It goes to the
            revise phase. So we mark it as:
        </div>
        <TaggedTaskView content={"Write preface"}
                        tags={[`${Tag_Prefix_TaskType}write_scripts`, `${Tag_Prefix_Step}write`]}/>


        <P>
            In {Desc_ManagePage}, ticking or unticking a checkbox will add or remove the corresponding tag in markdown
            automatically.
            <span
                style={inlineTldrOmitStyle}> See <i>{`Task Completion`}</i> section under <HelpPanelSwitcher
                setPanelName={props.setTab}
                panelName={HelpViewTabsNames[1]}/> tab for more
            details.</span>
        </P>

        <H2>
            A project <label style={inlineTldrOmitStyle}>is?</label>
        </H2>
        <P style={blockTldrOmitStyle}>
            A project is a collection of workflows and tasks. You can use project to group related workflows and tasks,
            manage project version, so that you have a nice and clean {Desc_ManagePage}.
        </P>

        <H3 style={blockTldrShowStyle}>Define a project</H3>
        <P style={blockTldrShowStyle}>
            A project can be defined by
        </P>
        <ul style={blockTldrShowStyle}>
            <li> a <b>project tag</b> (a tag with prefix <HashTagView tagWithoutHash={Tag_Prefix_Project}/>)</li>
            <li><label>obsidian file <LinkView text={"property"}
                                               onClick={() => open("https://help.obsidian.md/Editing+and+formatting/Properties")}/><label> </label>
                <InlineCodeView text={Frontmatter_FolderProject}/></label></li>
            <li> obsidian file <LinkView text={"property"}
                                         onClick={() => open("https://help.obsidian.md/Editing+and+formatting/Properties")}/><label> </label>
                <InlineCodeView text={Frontmatter_FileProject}/></li>
        </ul>


        <H3 style={blockTldrOmitStyle}>Group your workflows and tasks</H3>
        <P style={blockTldrOmitStyle}>
            You can set a folder as a project root, and all the workflows and tasks under this folder will be grouped
            into this project. To do this, you can use the obsidian file property <InlineCodeView
            text={Frontmatter_FolderProject}/>.
        </P>
        <MarkdownFrontMatterView keyString={Frontmatter_FolderProject}
                                 valueString={"MyProject"}/>
        <P style={blockTldrOmitStyle}>
            Add this property to any markdown file directly in this folder, and set the value to your project name.
            The folder hierarchy may look like this.
        </P>
        <FileNavView style={blockTldrOmitStyle} pathHierarchy={[
            {
                name: "Example Folder: MyProject - Root", isFolder: true, children: [
                    {name: "MyProject 1.md (Contains property `tpm_project_root: MyProject`)", isFolder: false},
                    {name: "MyProject 2.md (Tasks in this file will be in [MyProject])", isFolder: false},
                ]
            },
        ]}/>
        <P style={blockTldrOmitStyle}>
            You can also set a file as a project with property <InlineCodeView
            text={Frontmatter_FileProject}/>. It will override the folder project. For example, tasks in the folder <i>My
            Project
            3</i> will be in the project <i>Another Project</i>.

        </P>
        <FileNavView style={blockTldrOmitStyle} pathHierarchy={[
            {
                name: "Example Folder: MyProject - Root", isFolder: true, children: [
                    {name: "MyProject 1.md (Contains property `tpm_project_root: MyProject`)", isFolder: false},
                    {name: "MyProject 2.md (Tasks in this file will be in [MyProject])", isFolder: false},
                    {name: "MyProject 3.md (Contains property `tpm_project: Another Project`)", isFolder: false},
                ]
            },
        ]}/>
        <P style={blockTldrOmitStyle}>
            More granular control can be achieved by using <b>project tags</b>. You can add a project tag to a workflow
            or a task, and it will be grouped into that project.

        </P>

        <TaggedTaskView content={"Write preface"}
                        tags={[`${Tag_Prefix_TaskType}write_scripts`, `${Tag_Prefix_Step}write`, `${Tag_Prefix_Project}MyProject`]}/>
        <P>
            <label style={inlineTldrOmitStyle}>For project tags to work, your project name should form a valid tag. For
                example, </label>
            <i>My Project</i> is not a
            valid tag, but <i>MyProject</i> is.
        </P>


        <H2>Subprojects</H2>
        <P style={blockTldrOmitStyle}>
            When a project grows larger and larger, it is important to keep it manageable.
            You can use subprojects to split a large project into smaller ones.
        </P>

        <P>
            <label style={inlineTldrOmitStyle}>Subprojects can be added with <InlineCodeView text={"/"}/> in the project
                name. </label>
            <i>MyProject/MySubproject</i> is a subproject of <i>MyProject</i>.
            <label style={inlineTldrOmitStyle}> This naming method is consistent with the
                hierarchical tags. Thus, project tags is naturally supported.</label>
        </P>

        <P style={blockTldrOmitStyle}>
            Personally, I use subprojects for versioning. When I am developing {PLUGIN_NAME}, I have a project named
            <i> TagProject</i>. For each version, I use <i> TagProject/x.y.z</i> to focus on certain features. You can
            develop your own way of
            breaking down projects, either by version, by module or by assignee.
        </P>

        <H2>Project, workflow and tasks' Relationships</H2>
        <H3>Orphan tasks</H3>
        <P style={blockTldrOmitStyle}>
            A workflow or a task will always be assigned to a certain project. In {Desc_ManagePage}, only the workflows
            in the chosen project will be displayed. Tasks will only be displayed if they are in the shown
            project, <b>and</b> are in the shown workflows.

            When using the command <i>{CmdPal_SetWorkflowToTask}</i>, only the workflows available in the current task's
            project
            are shown.
        </P>
        <P>
            An orphan task's project does not match its workflow's.
            <label style={inlineTldrOmitStyle}> According to the rules above, i</label>
            <label style={inlineTldrShowStyle}> I</label>t will not show
            except in <b>{ProjectFilterName_All}</b>.
        </P>
        <P style={blockTldrOmitStyle}>

        </P>
        <OrphanTaskButtonAndPanel orphanTasks={[]}/>


        <H3>Unclassified workflows</H3>
        <P>
            By default, all workflows and tasks are under <i>{ProjectName_Unclassified}</i>.
            <label style={inlineTldrOmitStyle}> This is designed to share workflows across all projects. If you do not
                want this behavior, you can disable
                it in settings.</label>
        </P>

        <H3>Share workflows via subprojects</H3>

        <P>
            Simply put, a task belongs not only to its project, but also to all its parent projects.
            A workflow belongs to all its subprojects, but not its parent projects.
        </P>
        <P style={blockTldrOmitStyle}>
            The reason is that when you are working on a subproject, you may want to reuse the workflows defined in the
            parent. But you may not want to share your subproject's workflows to the parent or other subprojects.
            For tasks, when you select a project in {Desc_ManagePage}, you can see all the tasks in the subprojects.
        </P>
        <P style={blockTldrOmitStyle}>
            There's also a toggle in {Desc_ManagePage} to show workflows in subprojects, in case you want to see them.
        </P>


        <H2>Use tags to add, well, tags</H2>

        <P style={blockTldrOmitStyle}>
            Sometimes you want to give a task a property, but you don't want to make it a workflow step. For example,
            you
            want to mark the task abandoned or high priority.
            You can use <i>managed tags</i> to do that.
        </P>
        <P style={blockTldrOmitStyle}>
            The managed tags have the prefix <HashTagView tagWithoutHash={Tag_Prefix_Tag}/> so it would not be confused
            with
            normal tags, such as <HashTagView tagWithoutHash={`${Tag_Prefix_Tag}abandoned`}/>.
        </P>
        <P style={blockTldrShowStyle}>
            The managed tags have the prefix <HashTagView tagWithoutHash={Tag_Prefix_Tag}/>, such as <HashTagView
            tagWithoutHash={`${Tag_Prefix_Tag}abandoned`}/>.
        </P>
        <TaggedTaskView content={"card: warlock, fire magic"}
                        tags={[`${Tag_Prefix_TaskType}card_design`, `${Tag_Prefix_TaskType}abandoned`]}/>
        <P style={blockTldrOmitStyle}>
            Managed tags will show in {Desc_ManagePage} as filters, while normal tags won't. You can set a tag be
            included
            or excluded in the search on {Desc_ManagePage}.</P>
        <P style={blockTldrOmitStyle}>
            If you want to define a workflow without any steps, you can always place a dummy step tag
            in the workflow definition, such as <HashTagView tagWithoutHash={`${Tag_Prefix_Step}done`}/>.
        </P>

        <div style={{display: "none"}}>
            <H2>Best Practices</H2>
            <P style={blockTldrOmitStyle}>Since the step tag is already defined, they can be auto completed.
                Note that adding a step tag represents we have done the step. It is more natural for me and the meaning
                stays
                the same with checkbox workflow. If you want to make a step representing the work you are doing, you can
                add
                a <b><i>done</i></b> step at the end of each chain workflow.
            </P>


            <P style={blockTldrOmitStyle}>
                If you set the workflow for the very first time, it's tag is not available for auto-completion. Instead
                of
                manually typing the workflow tag, you can also use context menu or command palette
                (<i>{CmdPal_SetWorkflowToTask}</i>) to do it. With a hotkey bound, this is as fast as auto-completion.
            </P>
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
            <P style={blockTldrOmitStyle}>After typing the first workflow tag, you can use auto-completion.
                But using the command palette is preferred, since it can replace an existing workflow tag with the new
                one.
                You don't have to remove the old one yourself.
            </P>
            <P style={blockTldrOmitStyle}>
                You can choose whichever way is more convenient for you. Markdown is a
                text file after all.
            </P>
        </div>
        <CommandTutorialView/>

    </>
}

const CommandTutorialView = () => {

    const {
        blockTldrOmitStyle,
        blockTldrShowStyle,
    } = useSharedTlDr();

    return <>
        <H2>Commands and Context Menu</H2>

        It is suggested that you set a hotkey for your most used commands. You can do this in Obsidian's Settings -
        Hotkeys - Search for "{PLUGIN_NAME}".

        <H3>{CmdPal_JumpToManagePage}</H3>

        <P style={blockTldrOmitStyle}>When your cursor is at a task or workflow, you
            can do the following things
            with context menu or command palette (<i>{CmdPal_JumpToManagePage}</i>):
        </P>
        <ul style={blockTldrOmitStyle}>
            <li>If the cursor is at a workflow, you can open {Desc_ManagePage} with only this workflow filtered.
            </li>
            <li>
                If the cursor is at a managed task, you can open {Desc_ManagePage} with only this task shown.
            </li>
        </ul>

        <P style={blockTldrShowStyle}>
            Jump to workflow or task in {Desc_ManagePage} when the cursor is at a workflow or a managed task.
        </P>

        <H3>{CmdPal_SetWorkflowToTask}</H3>
        Choose the workflows available in the current task's project, and set the workflow.
        <H3>{CmdPal_SetProject}</H3>
        From all the defined projects, choose one to assign to the workflow or task.

    </>
}


const UserManual = () => {
    const stepStateStyle = {fontWeight: "bold"};

    return <>
        <H1>User Manual</H1>


        <H2>Projects</H2>


        <P>A project</P>
        <ul>
            <li>
                can have many subprojects
            </li>
            <li>can have many workflows and tasks</li>
        </ul>
        <P>
            A workflow
        </P>
        <ul>
            <li>can have many tasks</li>
            <li>can have one project</li>
            <li>belongs to all subprojects</li>
            <li>is in <i>{ProjectName_Unclassified}</i> if not in any other project</li>
            <li>belongs to all projects if it is in the <i>{ProjectName_Unclassified}</i> project, if the user want</li>
        </ul>

        <P>
            A task
        </P>
        <ul>
            <li>can have one project</li>
            <li>can have one workflow</li>
            <li>belongs to all parent projects</li>
            <li>is in <i>{ProjectName_Unclassified}</i> if not in any other project</li>
        </ul>

        <H2>Rules for workflows and tasks</H2>
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

        <H2>Task Completion</H2>
        In Obsidian, you may have various symbol to put into the checkbox, such as <InlineCodeView text={"*, /, -, x"}/>,
        etc.
        Any status will be recognized as completion in {PLUGIN_NAME}.
        The behaviour in {Desc_ManagePage} for each workflow is different. We call the task in the markdown page as <i>main
        task</i>, and the steps defined in the workflow as <i>steps</i>.
        <P>
            <b>Checkbox workflow</b>: When all the steps defined are completed.
        </P>
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
        <P style={centerChildrenVertStyle}>
            This is a template for {PLUGIN_NAME}. You can use it as a starting point.
        </P>
        <P style={centerChildrenVertStyle}>
            This can be created with one click in the plugin.
        </P>
        <P style={centerChildrenVertStyle}>
            <button onClick={() => {
                if (templateView) {
                    // fs.writeFileSync("TagProject_Template.md", templateMd)
                    app.vault.adapter.write(templateTargetFilePath, templateMd)
                }
            }}>Create this template at <label style={{padding: 3, fontStyle: "italic"}}>{templateTargetFilePath}</label>
            </button>
        </P>
        <P>
            A {Desc_ManagePage} showcase
        </P>
        <ManagePageForTemplate/>
        <P>
            The source markdown
        </P>
        {templateView}
    </>
}

