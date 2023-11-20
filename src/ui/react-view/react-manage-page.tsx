import {I_OdaPmProjectTask, I_OdaPmWorkflow} from "../../data-model/workflow-def";
import React, {useContext, useEffect, useState} from "react";
import {PluginContext} from "../manage-page-view";
import {EventEmitter} from "events";
import {getSettings, setSettingsValueAndSave} from "../../Settings";
import {OdaPmDbProvider} from "../../data-model/odaPmDb";
import {Evt_DbReloaded, Evt_JumpTask, Evt_JumpWorkflow} from "../../typing/dataview-event";
import {devLog} from "../../utils/env-util";
import {OdaPmTask} from "../../data-model/OdaPmTask";
import {TaskTableView} from "./task-table-view";
import {FilterHeadHStack, WorkflowFilter} from "./workflow-filter";
import {TagFilter} from "./tag-filter";
import {OdaPmProject, ProjectName_Unclassified} from "../../data-model/OdaPmProject";


export function ReactManagePage({eventCenter}: {
    eventCenter?: EventEmitter
}) {
    devLog("ReactManagePage rendered.")
    // region Re-render trigger
    // only for re-render
    const [rerenderState, setRerenderState] = useState(0);

    function triggerRerender() {
        // console.log(`ReactManagePage rerender triggered. ${rerenderState + 1}`)
        setRerenderState((prevState) => prevState + 1)
    }

    // endregion

    // region Event
    function jumpTask(oTask: OdaPmTask) {
        jumpWf(oTask.type)
    }

    function jumpWf(wf: I_OdaPmWorkflow) {
        setDisplayWorkflowNames([wf.name])
        setDisplayTags([])
    }

    // How to prevent add listener multiple times? use custom emitter instead of obsidian's event emitter
    useEffect(() => {
        eventCenter?.addListener(Evt_DbReloaded, triggerRerender)
        eventCenter?.addListener(Evt_JumpTask, jumpTask)
        eventCenter?.addListener(Evt_JumpWorkflow, jumpWf)
        return () => {
            eventCenter?.removeListener(Evt_DbReloaded, triggerRerender)
            eventCenter?.removeListener(Evt_JumpTask, jumpTask)
            eventCenter?.removeListener(Evt_JumpWorkflow, jumpWf)

        }
    }, [rerenderState]);
    // endregion
    const plugin = useContext(PluginContext);

    const db = OdaPmDbProvider.get();
    let workflows = db?.workflows || [];
    const projects = db?.pmProjects || [];
    // Use workflow names as filters' state instead. previously we use workflows themselves as state, but this requires dataview to be initialized.
    // However, this component might render before dataview is ready. The partially ready workflows will be used as the initial value, which is incorrect.
    // This is to fix the bug: On open Obsidian, the filter may not work.
    const [displayWorkflowNames, setDisplayWorkflowNames] = useState(getSettings()?.display_workflow_names as string[]);
    const [displayTags, setDisplayTags] = useState(getSettings()?.manage_page_display_tags as string[]);
    const [excludedTags, setExcludedTags] = useState(getSettings()?.manage_page_excluded_tags as string[]);
    const [displayProjectNames, setDisplayProjectNames] = useState(initDisplayProjectNames);

    function initDisplayProjectNames() {
        const settingsValue = getSettings()?.manage_page_display_projects as string[];
        if (settingsValue.length === 0) {
            settingsValue.push(ProjectName_Unclassified);
        }
        return settingsValue;
    }

    function handleSetDisplayWorkflows(names: string[]) {
        setSettingsValueAndSave(plugin, "display_workflow_names", [...names])
        setDisplayWorkflowNames(names)
    }

    function handleSetDisplayTags(names: string[]) {
        setSettingsValueAndSave(plugin, "manage_page_display_tags", [...names])
        setDisplayTags(names)
    }

    function handleSetExcludedTags(names: string[]) {
        setSettingsValueAndSave(plugin, "manage_page_excluded_tags", [...names])
        setExcludedTags(names)
    }

    function handleSetDisplayProjects(names: string[]) {
        setSettingsValueAndSave(plugin, "manage_page_display_projects", [...names])
        setDisplayProjectNames(names)
    }

    const rectifiedDisplayTags = displayTags.filter(k => db?.pmTags.contains(k))
    const rectifiedExcludedTags = excludedTags.filter(k => db?.pmTags.contains(k))

    // place all hooks before return. React doesn't allow the order to be changed.
    if (workflows.length === 0 || db === null)
        return <EmptyWorkflowView/>

    function isInAnyProject(projects: string[], projectTask: I_OdaPmProjectTask) {
        const b = projects.some(k => projectTask.isInProject(k));
        return b;
    }

    // Filter
    // Show only this project's workflows
    workflows = workflows.filter(k => isInAnyProject(displayProjectNames, k));

    const displayWorkflows = workflows.filter(k => {
        return displayWorkflowNames.includes(k.name);
    });

    let filteredTasks = db.getFilteredTasks(displayWorkflows, rectifiedDisplayTags, rectifiedExcludedTags);
    filteredTasks = filteredTasks.filter(k => isInAnyProject(displayProjectNames, k))
    // console.log(`ReactManagePage Render. All tasks: ${tasks_with_workflow.length}. Filtered Tasks: ${filteredTasks.length}. Workflow: ${curWfName}. IncludeCompleted: ${includeCompleted}`)

    let pmTags = db.pmTags || [];
    // It is undefined how saved tags will behave after we switch projects.
    // So we prevent tags from being filtered by tasks.
    // pmTags = pmTags.filter(k => {
    //     for (const pmTask of filteredTasks) {
    //         if (pmTask.boundTask.tags.includes(k))
    //             return true;
    //     }
    // })
    // endregion
    return (
        <>
            <p/>
            <ProjectFilter projects={projects} displayNames={displayProjectNames}
                           handleSetDisplayNames={handleSetDisplayProjects}
            />
            <WorkflowFilter workflows={workflows} displayNames={displayWorkflowNames}
                            handleSetDisplayNames={handleSetDisplayWorkflows}/>
            <TagFilter
                pmTags={pmTags}
                rectifiedExcludedTags={rectifiedExcludedTags}
                rectifiedDisplayTags={rectifiedDisplayTags}
                handleSetDisplayNames={handleSetDisplayTags}
                handleSetExcludedNames={handleSetExcludedTags}
            />
            <p/>
            <TaskTableView displayWorkflows={displayWorkflows}
                           filteredTasks={filteredTasks}/>

        </>
    )
}

const EmptyWorkflowView = () => {
    return <h1>No Workflow defined, or Dataview is not initialized.</h1>
}


function ProjectFilter(props: {
    projects: OdaPmProject[],
    handleSetDisplayNames: (names: string[]) => void,
    displayNames: string[]
}) {
    const centerStyle = {
        display: "flex",
        justifyContent: "center"
    };
    return <div>
        <div style={centerStyle}>
            <FilterHeadHStack>
                <h2>Project</h2>

                <select style={{fontSize: "medium"}} value={props.displayNames.first()} onChange={(event) => {
                    props.handleSetDisplayNames([event.target.value])
                }}>
                    {props.projects.map((project: OdaPmProject) => {
                        return (
                            <option key={project.name} value={project.name}>{project.name}</option>
                        )
                    })}
                </select>
            </FilterHeadHStack>
        </div>
        <label style={centerStyle}>
            Only shows workflows, tags and tasks in this project.
        </label>
    </div>
}

// endregion
