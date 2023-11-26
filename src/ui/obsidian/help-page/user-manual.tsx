import {H1, H2, P} from "../../common/heading";
import {ProjectName_Unclassified} from "../../../data-model/OdaPmProject";
import {CmdPal_JumpToManagePage, PLUGIN_NAME} from "../../../main";
import {InlineCodeView} from "../../common/inline-code-view";
import React from "react";
import {Desc_ManagePage} from "./help-page-view";

export const UserManual = () => {
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
