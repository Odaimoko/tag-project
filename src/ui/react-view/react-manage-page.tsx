import {I_OdaPmWorkflow, Tag_Prefix_Tag, Workflow_Type_Enum_Array, WorkflowType} from "../../data-model/workflow-def";
import React, {useContext, useEffect, useState} from "react";
import {PluginContext} from "../manage-page-view";
import {EventEmitter} from "events";

import {initialToUpper} from "../../utils/format-util";
import {
    FilterMethod_Excluded,
    FilterMethod_Included,
    FilterMethod_NotFiltering,
    getNextFilterMethod,
    getSettings,
    setSettingsValueAndSave
} from "../../Settings";
import {ClickableIconView, I_Stylable, InternalLinkView} from "./view-template/icon-view";
import {OdaPmDbProvider} from "../../data-model/odaPmDb";
import {Evt_DbReloaded, Evt_JumpTask, Evt_JumpWorkflow} from "../../typing/dataview-event";
import {devLog} from "../../utils/env-util";
import {HStack} from "./view-template/h-stack";
import {OdaPmTask} from "../../data-model/OdaPmTask";
import {ExternalControlledCheckbox} from "./view-template/checkbox";
import {TaskTableView} from "./task-table-view";
import {openTaskPrecisely} from "../../utils/io-util";
import {getIconByWorkflow, getIconViewByWorkflowType, iconViewAsAWholeStyle} from "./style-def";


export function ReactManagePage({eventCenter}: {
    eventCenter?: EventEmitter
}) {
    devLog("ReactManagePage rendered.")
    // only for re-render
    const [rerenderState, setRerenderState] = useState(0);

    function triggerRerender() {
        // console.log(`ReactManagePage rerender triggered. ${rerenderState + 1}`)
        setRerenderState((prevState) => prevState + 1)
    }

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

    const plugin = useContext(PluginContext);

    const db = OdaPmDbProvider.get();
    const workflows = db?.workflows || [];

    // Use workflow names as filters' state instead. previously we use workflows themselves as state, but this requires dataview to be initialized.
    // However, this component might render before dataview is ready. The partially ready workflows will be used as the initial value, which is incorrect.
    // This is to fix the bug: On open Obsidian, the filter may not work.
    const [displayWorkflowNames, setDisplayWorkflowNames] = useState(getSettings()?.display_workflow_names as string[]);
    const [displayTags, setDisplayTags] = useState(getSettings()?.manage_page_display_tags as string[]);
    const [excludedTags, setExcludedTags] = useState(getSettings()?.manage_page_excluded_tags as string[]);

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

    const rectifiedDisplayTags = displayTags.filter(k => db?.pmTags.contains(k))
    const rectifiedExcludedTags = excludedTags.filter(k => db?.pmTags.contains(k))

    // place all hooks before return. React doesn't allow the order to be changed.
    if (workflows.length === 0 || db === null)
        return <EmptyWorkflowView/>

    const displayWorkflows = workflows.filter(k => {
        return displayWorkflowNames.includes(k.name);
    });

    const filteredTasks = db.getFilteredTasks(displayWorkflows, rectifiedDisplayTags, rectifiedExcludedTags);

    // console.log(`ReactManagePage Render. All tasks: ${tasks_with_workflow.length}. Filtered Tasks: ${filteredTasks.length}. Workflow: ${curWfName}. IncludeCompleted: ${includeCompleted}`)

    const pmTags = db.pmTags || [];
    return (
        <>

            <WorkflowFilterHeading workflows={workflows} displayWorkflowNames={displayWorkflowNames}
                                   handleSetDisplayWorkflows={handleSetDisplayWorkflows}/>
            <div>
                {workflows.map((workflow: I_OdaPmWorkflow) => {
                    return (
                        <WorkflowFilterCheckbox key={workflow.name} displayWorkflows={displayWorkflowNames}
                                                workflow={workflow}
                                                setDisplayWorkflows={handleSetDisplayWorkflows}/>
                    )
                })}
            </div>
            {pmTags.length > 0 ?
                <HStack style={{alignItems: "center"}} spacing={10}>
                    <h3>{rectifiedDisplayTags.length}/{pmTags.length} Tags(s)</h3>
                    <button onClick={() => {
                        handleSetDisplayTags([...pmTags]);
                        handleSetExcludedTags([])
                    }}>Include All
                    </button>
                    <button onClick={() => {
                        handleSetDisplayTags([]);
                        handleSetExcludedTags([...pmTags])
                    }}>Exclude All
                    </button>
                    <button onClick={() => {
                        handleSetDisplayTags([]);
                        handleSetExcludedTags([])
                    }}>Clear
                    </button>
                </HStack>
                : null}
            <div>
                {pmTags.map((tag: string) => {
                    return <TagFilterCheckbox key={tag} excludeTags={rectifiedExcludedTags}
                                              tag={tag} displayed={rectifiedDisplayTags}
                                              setDisplayed={handleSetDisplayTags}
                                              setExcludedTags={handleSetExcludedTags}
                    />
                })
                }
            </div>

            {/*<WorkflowOverviewView filteredTasks={filteredTasks}/>*/}
            <p/>
            <TaskTableView displayWorkflows={displayWorkflows}
                           filteredTasks={filteredTasks}/>

        </>
    )
}

const EmptyWorkflowView = () => {
    return <h1>No Workflow defined, or Dataview is not initialized.</h1>
}

export function WorkflowTypeLegend({type, style}: { type: WorkflowType } & I_Stylable) {
    return <span style={style}>
        <HStack spacing={3}>
        {getIconViewByWorkflowType(type)}
            <label>{initialToUpper(type)}</label>
    </HStack>
    </span>;
}

export function WorkflowTypeLegendView() {
    return <HStack spacing={10}>
        {Workflow_Type_Enum_Array.map((type: WorkflowType) => {
            return <WorkflowTypeLegend key={type}
                                       type={type}/>

        })}
    </HStack>;
}

const WorkflowFilterHeading = ({displayWorkflowNames, workflows, handleSetDisplayWorkflows}: {
    displayWorkflowNames: string[],
    workflows: I_OdaPmWorkflow[],
    handleSetDisplayWorkflows: (s: string[]) => void
}) => {
    return <span style={{display: "flex"}}>
            <HStack style={{
                display: "flex",
                alignItems: "center"
            }} spacing={10}>
                <h2>{displayWorkflowNames.length}/{workflows.length} Workflow(s)</h2>
                <button onClick={() => handleSetDisplayWorkflows(workflows.map(k => k.name))}>Select All
                </button>
                <button onClick={() => handleSetDisplayWorkflows([])}>Unselect All
                </button>
<WorkflowTypeLegendView/>
            </HStack>
            </span>
}

const WorkflowFilterCheckbox = ({workflow, displayWorkflows, setDisplayWorkflows}: {
    workflow: I_OdaPmWorkflow,
    displayWorkflows: string[],
    setDisplayWorkflows: React.Dispatch<React.SetStateAction<string[]>>
}) => {
    const plugin = useContext(PluginContext);

    const wfName = workflow.name;

    function tickCheckbox() {
        // invert the checkbox
        const v = !displayWorkflows.includes(wfName)
        const newArr = v ? [...displayWorkflows, wfName] : displayWorkflows.filter(k => k != wfName)
        setDisplayWorkflows(newArr)
    }

    // inline-block: make this check box a whole element. It won't be split into multiple sub-elements when layout.
    // block will start a new line, inline will not, so we use inline-block
    return <span style={{display: "inline-block", marginRight: 15}}>
        <ExternalControlledCheckbox
            content={<>
                <InternalLinkView
                    content={<span style={iconViewAsAWholeStyle}>
                        {getIconByWorkflow(workflow)}
                        <label style={{marginLeft: 3}}>{wfName}</label>
                    </span>}
                    onIconClicked={() =>
                        // Go to workflow def
                        openTaskPrecisely(plugin.app.workspace, workflow.boundTask)}
                    onContentClicked={tickCheckbox}/>
            </>}
            onChange={tickCheckbox}
            externalControl={displayWorkflows.includes(wfName)}
        />
    </span>

}

const TagFilterCheckbox = ({tag, displayed, setDisplayed, excludeTags, setExcludedTags}: {
    tag: string,
    displayed: string[],
    excludeTags: string[],
    setDisplayed: React.Dispatch<React.SetStateAction<string[]>>,
    setExcludedTags: React.Dispatch<React.SetStateAction<string[]>>
}) => {
    const tagIncludedIcon = "check"
    const tagExcludedIcon = "x"
    const noTagIcon = "scan"

    // Remove display from excluded and vice versa
    function tickCheckbox() {
        // invert the checkbox
        const excluded = excludeTags.includes(tag)
        const included = displayed.includes(tag);
        const curMethod = included ? FilterMethod_Included : (
            excluded ? FilterMethod_Excluded : FilterMethod_NotFiltering
        );
        const nextMethod = getNextFilterMethod(curMethod);
        const newArr = nextMethod == FilterMethod_Included ? [...displayed, tag] : displayed.filter(k => k != tag)
        setDisplayed(newArr)
        setExcludedTags((
            nextMethod == FilterMethod_Excluded ? [...excludeTags, tag] : excludeTags.filter(k => k != tag))
        )
    }

    // inline-block: make this check box a whole element. It won't be split into multiple sub-elements when layout.
    // block will start a new line, inline will not, so we use inline-block
    return <span style={{display: "inline-block", margin: 3}}>
        <ClickableIconView style={iconViewAsAWholeStyle} iconName={displayed.includes(tag) ? tagIncludedIcon : (
            excludeTags.includes(tag) ? tagExcludedIcon : noTagIcon
        )}
                           content={<label style={{marginLeft: 5}}>{tag.replace(Tag_Prefix_Tag, "")}</label>}
                           onIconClicked={tickCheckbox}
                           onContentClicked={tickCheckbox}
        />
    </span>

}


// endregion

// endregion
 
