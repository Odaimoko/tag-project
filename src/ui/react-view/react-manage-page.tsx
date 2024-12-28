import {I_OdaPmProjectTask, I_OdaPmWorkflow} from "../../data-model/workflow-def";
import React, {useContext, useEffect, useState} from "react";
import {PluginContext} from "../obsidian/manage-page-view";
import {EventEmitter} from "events";
import {getSettings, setSettingsValueAndSave, usePluginSettings} from "../../settings/settings";
import {OdaPmDbProvider} from "../../data-model/OdaPmDb";
import {
    Evt_DbReloaded,
    Evt_JumpTask,
    Evt_JumpWorkflow,
    Evt_ManagePageReRender,
    Evt_ReqDbReload
} from "../../typing/dataview-event";
import {devLog} from "../../utils/env-util";
import {OdaPmTask} from "../../data-model/OdaPmTask";
import {TaskTableView} from "./task-table-view";
import {WorkflowFilterView} from "./workflow-filter-view";
import {TagFilterView} from "./tag-filter-view";
import {ProjectFilterOptionValue_All, ProjectFilterView} from "./project-filter-view";
import {HStack, VStack} from "../pure-react/view-template/h-stack";
import {FixOrphanTasksView} from "./fix-orphan-tasks-view";
import {ModuleFilter} from "./module-filter";
import {Desc_ManagePage} from "../obsidian/help-page/help-page-view";
import {InlineCodeView} from "../common/inline-code-view";
import {ObsidianIconView} from "./obsidian-icon-view";
import {obsidianIconOffsetCenteredStyle} from "./tag-project-style";
import {diffGroupSpacing, sameGroupSpacing} from "../pure-react/style-def";

function isInAnyProject(projectTask: I_OdaPmProjectTask, displayPrjNames: string[]) {
    // TODO Performance
    if (displayPrjNames.length === 0)
        return true;

    if (displayPrjNames.includes(ProjectFilterOptionValue_All))
        return true;

    const b = displayPrjNames.some(k => projectTask.isInProject(k));
    return b;
}

function isInCompletedProjects(projectTask: I_OdaPmProjectTask, completedPrjNames: string[]) {
    return projectTask.projects.some(m => m.isCompleted(completedPrjNames));
}

function isInAnyModule(projectTask: OdaPmTask, displayModuleIds: string[]) {
    if (getSettings()?.manage_page_header_as_module === false) {
        return true;
    }
    if (displayModuleIds.length === 0)
        return true; // default show all

    const b = displayModuleIds.some(k => projectTask.getModuleId() === k);
    return b;
}

function useFilteredTags(): Array<string> {
    const db = OdaPmDbProvider.get();
    const [showPriority, setShowPriority]
        = usePluginSettings<boolean>("show_priority_tags_in_manage_page");
    if (db === null)
        return [];
    let pmTags = db.pmTags || [];

    if (!showPriority) {

        pmTags = pmTags.filter(k => !db.pmPriorityTags.contains(k));
        devLog(pmTags)
    }
    return pmTags;

}

function getPmTaskStatuses(): Array<string> {
    const db = OdaPmDbProvider.get();
    if (db === null)
        return [];
    const pmTasks = db.pmTasks || [];

    return pmTasks.map(k => k.getStatus()).unique();

}

export function ReactManagePage({eventCenter}: {
    eventCenter?: EventEmitter
}) {
    devLog("ReactManagePage rendered.",)
    // region Re-render trigger
    // only for re-render
    const [rerenderState, setRerenderState] = useState(0);
    const [panelShown, setPanelShown] = usePluginSettings<boolean>("manage_page_filters_shown")

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
        eventCenter?.addListener(Evt_ManagePageReRender, triggerRerender)

        return () => {
            eventCenter?.removeListener(Evt_DbReloaded, triggerRerender)
            eventCenter?.removeListener(Evt_JumpTask, jumpTask)
            eventCenter?.removeListener(Evt_JumpWorkflow, jumpWf)
            eventCenter?.removeListener(Evt_ManagePageReRender, triggerRerender)
        }
    }, [rerenderState]);
    // endregion
    const plugin = useContext(PluginContext);

    const db = OdaPmDbProvider.get();
    let workflows = db?.workflows || [];
    const allProjects = db?.pmProjects || [];
    const modules = db?.pmModules || {};
    const pmTags = useFilteredTags();
    const settingsCompletedProjects = getSettings()?.completed_project_names as string[];
    const pmStatuses = getPmTaskStatuses();
    //region Display Variables
    // Use workflow names as filters' state instead. previously we use workflows themselves as state, but this requires dataview to be initialized.
    // However, this component might render before dataview is ready. The partially ready workflows will be used as the initial value, which is incorrect.
    // This is to fix the bug: On open Obsidian, the filter may not work.
    // Load from settings. settingsDisplayWorkflowNames is not directly used. It is also filtered against allProjects.
    const [settingsDisplayWorkflowNames, setDisplayWorkflowNames]
        = useState(getSettings()?.display_workflow_names as string[]);
    const [settingsDisplayModuleIds, setDisplyModuleIds]
        = useState(getSettings()?.display_module_names as string[]);
    const [displayTags, setDisplayTags]
        = useState(getSettings()?.manage_page_display_tags as string[]);
    const [excludedTags, setExcludedTags]
        = useState(getSettings()?.manage_page_excluded_tags as string[]);

    const [displayStatuses, setDisplayStatuses]
        = useState(getSettings()?.manage_page_display_task_statuses as string[]);
    const [excludedStatuses, setExcludedStatuses]
        = useState(getSettings()?.manage_page_excluded_task_statuses as string[]);
    // Current project displayed
    const [settingsDisplayProjectOptionValues, setDisplayProjectOptionValues]
        = useState(initDisplayProjectOptionValues);
    // endregion
    const [showSubprojectWorkflows, setShowSubprojectWorkflows]
        = usePluginSettings<boolean>("show_subproject_workflows")
    const [showUnclassified, setShowUnclassified]
        = usePluginSettings<boolean>("unclassified_workflows_available_to_all_projects");

    function initDisplayProjectOptionValues() {
        const settingsValue = getSettings()?.manage_page_display_projects as string[];
        if (settingsValue.length === 0) {
            settingsValue.push(ProjectFilterOptionValue_All); // Default show all
        }
        return settingsValue;
    }

    // region Set wrapper
    function handleSetDisplayWorkflows(names: string[]) {
        setSettingsValueAndSave(plugin, "display_workflow_names", [...names])
        setDisplayWorkflowNames(names)
    }

    function handleSetDisplayModuleIds(names: string[]) {
        devLog(`Setting display modules to ${names}`)
        setSettingsValueAndSave(plugin, "display_module_names", [...names])
        setDisplyModuleIds(names)
    }

    function handleSetDisplayTags(names: string[]) {
        setSettingsValueAndSave(plugin, "manage_page_display_tags", [...names])
        setDisplayTags(names)
    }

    function handleSetExcludedTags(names: string[]) {
        setSettingsValueAndSave(plugin, "manage_page_excluded_tags", [...names])
        setExcludedTags(names)
    }

    function handleSetDisplayStatuses(names: string[]) {
        setSettingsValueAndSave(plugin, "manage_page_display_task_statuses", [...names])
        setDisplayStatuses(names)
    }

    function handleSetExcludedStatuses(names: string[]) {
        setSettingsValueAndSave(plugin, "manage_page_excluded_task_statuses", [...names])
        setExcludedStatuses(names)
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
    const rectifiedDisplayTags = displayTags.filter(k => pmTags.contains(k))
    const rectifiedExcludedTags = excludedTags.filter(k => pmTags.contains(k))
    const rectifiedDisplayStatuses = displayStatuses.filter(k => pmStatuses.includes(k))
    const rectifiedExcludedStatuses = excludedStatuses.filter(k => pmStatuses.includes(k))

    // region Rectify

    // if a project is deleted while being displayed, use all allProjects instead.
    const displayProjectOptionValues = settingsDisplayProjectOptionValues.filter(k => {
        return allProjects.some(p => p.name === k)
    })
    if (displayProjectOptionValues.length === 0) {
        displayProjectOptionValues.push(ProjectFilterOptionValue_All)
    }
    // Don't show completed allProjects in the dropdown
    const dropdownProjects = allProjects.filter(k =>
        !settingsCompletedProjects.some(m => m === k.name))

    // only show modules under current project
    const filteredModules = Object.values(modules)
        .filter(k =>
            k.tasks.some(m => isInAnyProject(m, displayProjectOptionValues)))
    // if a module is deleted while being displayed, use all modules instead.
    const displayModuleIds = settingsDisplayModuleIds.filter(k => {
        return filteredModules.some(m => m.id === k)
    })

    // endregion

    // Filter
    // Show only this project's workflows
    workflows = workflows.filter(isWorkflowShownInPage);

    function isWorkflowShownInPage(workflow: I_OdaPmWorkflow) {
        // workflow's isInAnyProject checks if the workflow is in a project's parent. 
        const inAnyProject = isInAnyProject(workflow, displayProjectOptionValues);
        const isSubProjectWorkflow = showSubprojectWorkflows && // if showSubprojectWorkflows is true, show subprojects' workflows
            displayProjectOptionValues.some(m => workflow.getFirstProject()?.isSubprojectOfName(m));
        // if the workflow's project is completed, don't show
        const isParentProjectCompleted = isInCompletedProjects(workflow, settingsCompletedProjects);
        const isShown = (inAnyProject || isSubProjectWorkflow)
            && !isParentProjectCompleted;
        // devLog(`Workflow ${workflow.name} is shown: ${isShown}. inAnyProject: ${inAnyProject}, 
        // isSubProjectWorkflow: ${isSubProjectWorkflow}, isParentProjectCompleted: ${isParentProjectCompleted}. Completed projects: ${settingsCompletedProjects}`)
        return isShown
            ;
    }

    // settingsDisplayWorkflowNames may contain workflows from other allProjects. We filter them out.
    const displayWorkflowNames = settingsDisplayWorkflowNames
        .filter(k => workflows.some(wf => wf.name === k));
    const displayWorkflows = workflows.filter(k => {
        return displayWorkflowNames.includes(k.name);
    });


    const filteredTasks = db
        .getFilteredTasks(displayWorkflows, rectifiedDisplayTags, rectifiedExcludedTags)
        .filter(k =>
            isInAnyProject(k, displayProjectOptionValues)
            && isInAnyModule(k, displayModuleIds)
            && !isInCompletedProjects(k, settingsCompletedProjects)
        ).filter(k => {
            return k.isStatus(displayStatuses) && (excludedStatuses.length == 0 ||
                // exclude only if excludedStatuses is not empty, since `isStatus` returns true for empty array
                !k.isStatus(excludedStatuses)
            );
        })

    // It is undefined how saved tags will behave after we switch allProjects.
    // So we prevent tags from being filtered by tasks.
    // pmTags = pmTags.filter(k => {
    //     for (const pmTask of filteredTasks) {
    //         if (pmTask.boundTask.tags.includes(k))
    //             return true;
    //     }
    // })

    // endregion
    return (
        <VStack spacing={sameGroupSpacing}>
            <HStack>
                <ProjectFilterView allProjects={allProjects} dropdownProjects={dropdownProjects}
                                   displayNames={displayProjectOptionValues}
                                   handleSetDisplayNames={handleSetDisplayProjects}
                />
            </HStack>
            <VStack spacing={sameGroupSpacing}>
                <HStack spacing={diffGroupSpacing}>
                    <FixOrphanTasksView db={db}/>
                    <button onClick={() => setPanelShown(!panelShown)}>
                        Filters {
                        panelShown ?
                            <ObsidianIconView style={obsidianIconOffsetCenteredStyle} iconName={"chevron-down"}/> :
                            <ObsidianIconView style={obsidianIconOffsetCenteredStyle} iconName={"chevron-right"}/>
                    }
                    </button>
                </HStack>

                {panelShown ? <div>


                    <WorkflowFilterView workflows={workflows} displayNames={displayWorkflowNames}
                                        handleSetDisplayNames={handleSetDisplayWorkflows}
                                        showSubprojectWorkflows={showSubprojectWorkflows}
                                        setShowSubprojectWorkflows={setShowSubprojectWorkflows}
                                        showUnclassifiedWorkflows={showUnclassified}
                                        setShowUnclassifiedWorkflows={setShowUnclassified}
                    />
                    {getSettings()?.manage_page_header_as_module &&
                        <ModuleFilter modules={filteredModules} displayModuleIds={displayModuleIds}
                                      handleSetDisplayModuleIds={handleSetDisplayModuleIds}/>}
                    <TagFilterView
                        pmTags={pmTags}
                        rectifiedDisplayTags={rectifiedDisplayTags}
                        handleSetDisplayNames={handleSetDisplayTags}
                        rectifiedExcludedTags={rectifiedExcludedTags}
                        handleSetExcludedNames={handleSetExcludedTags}
                    />
                    <TagFilterView
                        pmTags={pmStatuses}
                        rectifiedDisplayTags={rectifiedDisplayStatuses}
                        handleSetDisplayNames={handleSetDisplayStatuses}
                        rectifiedExcludedTags={rectifiedExcludedStatuses}
                        handleSetExcludedNames={handleSetExcludedStatuses}
                        tagRenderer={(t) => {
                            return <InlineCodeView text={`[${t}]`}/>;
                        }
                        }
                        titleName={"Status"}
                    />
                </div> : null}
            </VStack>
            <p></p>
            <TaskTableView displayWorkflows={displayWorkflows}
                           filteredTasks={filteredTasks}/>

        </VStack>
    )
}

const EmptyWorkflowView = () => {
    const db = OdaPmDbProvider.get();
    return <div>
        <h1>No Workflow defined, or Dataview is not initialized.</h1>
        <button onClick={() => {
            db?.emit(Evt_ReqDbReload);
        }}>
            <label>Try Refresh {Desc_ManagePage}</label>
        </button>
    </div>
}


// endregion
