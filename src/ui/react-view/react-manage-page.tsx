import {I_OdaPmProjectTask, I_OdaPmWorkflow} from "../../data-model/workflow-def";
import React, {useContext, useEffect, useState} from "react";
import {PluginContext} from "../obsidian/manage-page-view";
import {EventEmitter} from "events";
import {getSettings, setSettingsValueAndSave} from "../../Settings";
import {OdaPmDb, OdaPmDbProvider} from "../../data-model/odaPmDb";
import {Evt_DbReloaded, Evt_JumpTask, Evt_JumpWorkflow} from "../../typing/dataview-event";
import {devLog} from "../../utils/env-util";
import {OdaPmTask} from "../../data-model/OdaPmTask";
import {getDefaultTableStyleGetters, OdaTaskSummaryCell, TaskTableView} from "./task-table-view";
import {WorkflowFilter, WorkflowFilterCheckbox} from "./workflow-filter";
import {TagFilter} from "./tag-filter";
import {ProjectFilter, ProjectFilterName_All, ProjectFilterOptionValue_All} from "./project-filter";
import {HStack, VStack} from "./view-template/h-stack";
import {ClickableIconView, ObsidianIconView} from "./view-template/icon-view";
import {DataTable} from "./view-template/data-table";
import {OdaPmProject} from "../../data-model/OdaPmProject";

function ProjectView(props: {
    project: OdaPmProject | null,
    style?: React.CSSProperties
}) {
    const project = props.project;
    // TODO Jump To Project Definition
    return <div style={props.style}>
        <ClickableIconView iconName={"folder"} content={<label>{project?.name}</label>}/>
    </div>
}

function OrphanTasksFixPanel({db}: { db: OdaPmDb }) {
    const orphanTasks = db.orphanTasks;
    const plugin = useContext(PluginContext);
    // Task\n Workflow
    // Project\n Project
    const headers = ["Task", "Workflow"];
    const rows = orphanTasks.map((task, i) => {
        return [<VStack spacing={2}>
            <OdaTaskSummaryCell key={`${task.boundTask.path}:${task.boundTask.line}`}
                                oTask={task}
                                taskFirstColumn={task.summary} showCheckBox={false} showWorkflowIcon={false}/>

            <ProjectView project={task.getFirstProject()}/>

        </VStack>, <VStack style={{margin: 10}} spacing={2}>
            <WorkflowFilterCheckbox workflow={task.type} showCheckBox={false} showWorkflowIcon={false}/> <HStack
            style={{alignItems: "center"}} spacing={10}>
            {/*<button>Assign to</button>*/}
            <ProjectView project={task.type.getFirstProject()}/>

        </HStack>
        </VStack>]
    })
    const {cellStyleGetter, headStyleGetter} = getDefaultTableStyleGetters(
        "unset", "unset",
        0, false
    );
    return <div>
        <DataTable tableTitle={"SomeTitleNtImp"} headers={headers} rows={rows}
                   thStyleGetter={headStyleGetter}
                   cellStyleGetter={cellStyleGetter}
        />
    </div>
}

function FixOrphanTasks({db}: { db: OdaPmDb }) {
    const [panelShown, setPanelShown] = useState(true);
    const orphanTasks = db.orphanTasks;
    if (orphanTasks.length === 0) return <></>;

    return <div><HStack spacing={5} style={{alignItems: "center"}}>
        <ObsidianIconView style={{color: "var(--color-red)"}} iconName={"alert-circle"}/>
        <button onClick={() => setPanelShown(!panelShown)}>
            Fix {orphanTasks.length} orphan task(s)
        </button>
        <VStack>

            <label>
                An orphan task's project does not match its workflow's.
            </label>
            <label>
                It will not show except in <b>{ProjectFilterName_All}</b>.
            </label>
        </VStack>
    </HStack>

        {panelShown ? <OrphanTasksFixPanel db={db}/> : null}
    </div>;
}

function isInAnyProject(projectNames: string[], projectTask: I_OdaPmProjectTask) {
    // TODO Performance
    if (projectNames.length === 0) return true;
    if (projectNames.includes(ProjectFilterOptionValue_All)) return true;
    const b = projectNames.some(k => projectTask.isInProject(k));
    return b;
}

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
        setDisplayProjectOptionValues([ProjectFilterOptionValue_All]);
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

    //region Display Variables
    // Use workflow names as filters' state instead. previously we use workflows themselves as state, but this requires dataview to be initialized.
    // However, this component might render before dataview is ready. The partially ready workflows will be used as the initial value, which is incorrect.
    // This is to fix the bug: On open Obsidian, the filter may not work.
    // Load from settings. settingsDisplayWorkflowNames is not directly used. It is also filtered against projects.
    const [settingsDisplayWorkflowNames, setDisplayWorkflowNames] = useState(getSettings()?.display_workflow_names as string[]);
    const [displayTags, setDisplayTags] = useState(getSettings()?.manage_page_display_tags as string[]);
    const [excludedTags, setExcludedTags] = useState(getSettings()?.manage_page_excluded_tags as string[]);
    const [displayProjectOptionValues, setDisplayProjectOptionValues] = useState(initDisplayProjectOptionValues);

    function initDisplayProjectOptionValues() {
        const settingsValue = getSettings()?.manage_page_display_projects as string[];
        if (settingsValue.length === 0) {
            settingsValue.push(ProjectFilterOptionValue_All); // Default show all
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
        setDisplayProjectOptionValues(names)
    }

    // endregion

    // place all hooks before return. React doesn't allow the order to be changed.
    if (workflows.length === 0 || db === null)
        return <EmptyWorkflowView/>

    // region Filtering
    const rectifiedDisplayTags = displayTags.filter(k => db?.pmTags.contains(k))
    const rectifiedExcludedTags = excludedTags.filter(k => db?.pmTags.contains(k))

    // Filter
    // Show only this project's workflows
    workflows = workflows.filter(isWorkflowInProject);

    function isWorkflowInProject(k: I_OdaPmWorkflow) {
        return isInAnyProject(displayProjectOptionValues, k);
    }

    // settingsDisplayWorkflowNames may contain workflows from other projects. We filter them out.
    const displayWorkflowNames = settingsDisplayWorkflowNames.filter(k => workflows.some(wf => wf.name === k));
    const displayWorkflows = workflows.filter(k => {
        return displayWorkflowNames.includes(k.name);
    });

    const filteredTasks = db.getFilteredTasks(displayWorkflows, rectifiedDisplayTags, rectifiedExcludedTags)
        .filter(k => isInAnyProject(displayProjectOptionValues, k))
    // console.log(`ReactManagePage Render. All tasks: ${tasks_with_workflow.length}. Filtered Tasks: ${filteredTasks.length}. Workflow: ${curWfName}. IncludeCompleted: ${includeCompleted}`)

    const pmTags = db.pmTags || [];
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
        <div>
            <HStack>

                <ProjectFilter projects={projects} displayNames={displayProjectOptionValues}
                               handleSetDisplayNames={handleSetDisplayProjects}
                />
            </HStack>
            <FixOrphanTasks db={db}/>

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

        </div>
    )
}

const EmptyWorkflowView = () => {
    return <h1>No Workflow defined, or Dataview is not initialized.</h1>
}


function toggleDropDown(setDropDownDisplay: (value: (((prevState: string) => string) | string)) => void) {
    setDropDownDisplay((prevState) => {
            if (prevState === "none") {
                return "block";
            } else {
                return "none";
            }
        }
    )
}


// endregion
