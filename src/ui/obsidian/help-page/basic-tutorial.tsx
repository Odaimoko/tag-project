import {H1, H2, H3, P} from "../../common/heading";
import {
    CmdPal_JumpToManagePage,
    CmdPal_OpenManagePage,
    CmdPal_SetProject,
    CmdPal_SetWorkflowToTask,
    PLUGIN_NAME
} from "../../../main";
import React from "react";
import {usePluginSettings} from "../../../settings/settings";
import {ObsidianIconView} from "../../pure-react/view-template/icon-view";
import {Icon_ManagePage} from "../manage-page-view";
import {DataTable} from "../../pure-react/view-template/data-table";
import {WorkflowTypeLegend} from "../../react-view/workflow-filter";
import {HashTagView} from "../../common/hash-tag-view";
import {
    Tag_Prefix_Step,
    Tag_Prefix_Tag,
    Tag_Prefix_TaskType,
    Tag_Prefix_Workflow
} from "../../../data-model/workflow-def";
import {TaggedTaskView} from "../../common/tagged-task-view";
import {HelpPanelSwitcher, LinkView} from "../../common/link-view";
import {
    Frontmatter_FileProject,
    Frontmatter_FolderProject,
    ProjectName_Unclassified,
    Tag_Prefix_Project
} from "../../../data-model/OdaPmProject";
import {InlineCodeView} from "../../common/inline-code-view";
import {MarkdownFrontMatterView} from "../../common/markdown-front-matter-view";
import {FileNavView} from "../../common/file-nav-view";
import {ProjectFilterName_All} from "../../react-view/project-filter";
import {OrphanTaskButtonAndPanel} from "../../react-view/fix-orphan-tasks";
import {Desc_ManagePage, HelpPage_Template, HelpPage_UserManual} from "./help-page-view";
import {centerChildrenVertStyle} from "../../react-view/style-def";

export function useSharedTlDr() {
    const [isTlDr, setIsTlDr] = usePluginSettings<boolean>("cached_help_page_tutorial_tldr")
    // hidden when tldr mode is on.
    const blockTldrOmitStyle: React.CSSProperties = {display: isTlDr ? "none" : "block"} //  visibility:"hidden" will still take space. So we use display instead
    const blockTldrShowStyle: React.CSSProperties = {display: isTlDr ? "block" : "none"}
    const inlineTldrOmitStyle: React.CSSProperties = {display: isTlDr ? "none" : "inline"}
    const inlineTldrShowStyle: React.CSSProperties = {display: isTlDr ? "inline" : "none"}
    return {isTlDr, setIsTlDr, blockTldrOmitStyle, blockTldrShowStyle, inlineTldrOmitStyle, inlineTldrShowStyle};
}

type TldrProps = ReturnType<typeof useSharedTlDr>;
export const BasicTutorial = (props: {
    setTab?: (tab: string) => void, tldrProps?: TldrProps
}) => {
    const blockTldrOmitStyle = props.tldrProps?.blockTldrOmitStyle;
    const blockTldrShowStyle = props.tldrProps?.blockTldrShowStyle;
    const inlineTldrOmitStyle = props.tldrProps?.inlineTldrOmitStyle;
    const inlineTldrShowStyle = props.tldrProps?.inlineTldrShowStyle;
    // console.log(props.tldrProps)
    return <>


        <H1 style={{}}>Tutorial</H1>
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
                panelName={HelpPage_UserManual}/> tab for more
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
