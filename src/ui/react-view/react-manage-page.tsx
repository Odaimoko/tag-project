import {I_OdaPmProjectTask, I_OdaPmWorkflow} from "../../data-model/workflow-def";
import React, {KeyboardEvent, useContext, useEffect, useRef, useState} from "react";
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
import {OdaPmProject} from "../../data-model/OdaPmProject";
import {StyleProps, VStack} from "./view-template/h-stack";
import {I_Nameable} from "../../data-model/I_Nameable";

const ProjectFilterName_All = "All Projects";
const ProjectFilterOptionValue_All = "###ALL###";

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

    // Load from settings. settingsDisplayWorkflowNames is not directly used. It is also filtered against projects.
    const [settingsDisplayWorkflowNames, setDisplayWorkflowNames] = useState(getSettings()?.display_workflow_names as string[]);
    const [displayTags, setDisplayTags] = useState(getSettings()?.manage_page_display_tags as string[]);
    const [excludedTags, setExcludedTags] = useState(getSettings()?.manage_page_excluded_tags as string[]);
    const [displayProjectOptionValues, setDisplayProjectOptionValues] = useState(initDisplayProjectOptionValues);

    function initDisplayProjectOptionValues() {
        const settingsValue = getSettings()?.manage_page_display_projects as string[];
        if (settingsValue.length === 0) {
            settingsValue.push(ProjectFilterOptionValue_All);
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

    const rectifiedDisplayTags = displayTags.filter(k => db?.pmTags.contains(k))
    const rectifiedExcludedTags = excludedTags.filter(k => db?.pmTags.contains(k))

    // place all hooks before return. React doesn't allow the order to be changed.
    if (workflows.length === 0 || db === null)
        return <EmptyWorkflowView/>

    function isInAnyProject(projectNames: string[], projectTask: I_OdaPmProjectTask) {
        // TODO Performance
        if (projectNames.length === 0) return true;
        if (projectNames.includes(ProjectFilterOptionValue_All)) return true;
        const b = projectNames.some(k => projectTask.isInProject(k));
        return b;
    }

    // Filter
    // Show only this project's workflows
    workflows = workflows.filter(k => isInAnyProject(displayProjectOptionValues, k));

    // settingsDisplayWorkflowNames may contain workflows from other projects. We filter them out.
    const displayWorkflowNames = settingsDisplayWorkflowNames.filter(k => workflows.some(wf => wf.name === k));
    const displayWorkflows = workflows.filter(k => {
        return displayWorkflowNames.includes(k.name);
    });

    let filteredTasks = db.getFilteredTasks(displayWorkflows, rectifiedDisplayTags, rectifiedExcludedTags);
    filteredTasks = filteredTasks.filter(k => isInAnyProject(displayProjectOptionValues, k))
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

            <ProjectFilter projects={projects} displayNames={displayProjectOptionValues}
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

interface I_OptionItem {
    name: string,
    optionValue: string,
}

type OptionValueType = I_Nameable | I_OptionItem;

function getProjectOptionValue(project: OptionValueType) {
    // @ts-ignore
    return Object.keys(project).includes("optionValue") ? project['optionValue'] : project.name;
}

function getOptionValueName(opValue: string | undefined, listOpValues: OptionValueType[]) {
    if (opValue === undefined) return null;

    for (const project of listOpValues) {
        // @ts-ignore
        if (Object.keys(project).includes("optionValue") && project['optionValue'] === opValue) {
            return project.name;
        } else if (
            project.name === opValue
        )
            return project.name
    }
    return null;
}

const isCharacterInput = (event: KeyboardEvent) => {
    // Check if the key is a character input excluding the escape key
    return (
        event.key.length === 1 && // Check for single character keys
        event.key !== 'Escape' && // Exclude the escape key
        !event.ctrlKey && !event.altKey && // Exclude control and alt keys
        !event.metaKey // Exclude meta key (e.g., Command key on macOS)
        // Add more conditions as needed for specific cases
    );
};


function loopIndex(nextIdx: number, len: number) {
    if (nextIdx < 0) {
        nextIdx = len - 1;
    } else if (nextIdx >= len) {
        nextIdx = 0;
    }
    return nextIdx;
}

const SearchDropdown = (props: {
    data: OptionValueType[]
    handleSetOptionValues(param: string[]): void;
} & StyleProps) => {
    const [searchText, setSearchText] = useState("")
    const [dropDownDisplay, setDropDownDisplay] = useState("none");

    const filtered = props.data.filter(k => k.name.toLowerCase().includes(searchText.toLowerCase()))

    function handleSetSearchText(txt: string) {
        setSearchText(txt)
    }

    const childRefs: Record<string, HTMLElement | null> = {}; // Object to hold references to child components
    const inputRef = useRef<HTMLInputElement>(null);
    const selectedChild = useRef(-1);
    // Put OnKeyDown Event on the container div, so that we can use arrow keys to select the project.
    // Dont put it on the input box, otherwise when the focus is not on the input box, the event will not be triggered.
    function resetKeyboardState() {
        selectedChild.current = -1;
    }

    return <div style={props.style}
                onKeyDown={handleBaseKeyboard}
                onBlur={(event) => {
                    // Hide Dropdown if we lose focus
                    if (event.relatedTarget && event.relatedTarget.id.startsWith("project_choice")) {
                        // Let the project_choice button handle the click event
                        // Otherwise when we lose focus and hide the dropdown, the button will not be triggered.
                    } else {
                        // TODO Close when click outside
                        hideDropdown()
                    }
                }}
    >
        <input ref={inputRef}
               type="text" placeholder="Search/Select Project"
               value={searchText}
               onChange={(event) => {
                   const text = event.target.value;
                   // when there is text, show the dropdown
                   if (text && text.length > 0) {
                       showDropdown()
                   } else {
                       hideDropdown()
                   }
                   handleSetSearchText(text)
               }}

               onFocus={() => {
                   // show when click search inputbox

                   console.log("Input Focused")
                   showDropdown()
               }}
        />
        {/*Add background so it won't be transparent. */}
        <div id={"project_choices"} style={{
            display: dropDownDisplay,
            position: "absolute",
            zIndex: 1,
            background: "var(--background-primary)"
        }}
        >
            <VStack spacing={2}>
                {filtered.map((project: OptionValueType) => {
                    const childId = `project_choice_${project.name}`;
                    return (
                        <button id={childId} onClick={(event) => {
                            // console.log(event.target) // html element
                            props.handleSetOptionValues([getProjectOptionValue(project)])
                            hideDropdown()
                            handleSetSearchText("");
                        }} key={project.name}
                                ref={(ref) => {
                                    childRefs[childId] = ref;
                                }}
                        >{project.name}</button>
                    )
                })}
            </VStack>

        </div>
    </div>

    function handleBaseKeyboard(event: KeyboardEvent) {

        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            showDropdown()
            const keys = Object.keys(childRefs);
            if (keys.length === 0) return true;
            const offset = event.key === "ArrowDown" ? 1 : -1;

            selectedChild.current = loopIndex(selectedChild.current + offset, keys.length);
            const curKey = keys[selectedChild.current];
            childRefs[curKey]?.focus();
        } else if (isCharacterInput(event)) {
            devLog(`Input Focus via ${event.key}`)
            inputRef.current?.focus();
        } else if (event.key === "Escape") {
            inputRef.current?.focus()
        } else if (event.key === "Enter") {
            console.log("Propagate")
            // inputRef.current?.focus();
            return true
        }
        return undefined;
    }

    function showDropdown() {
        setDropDownDisplay("block")
    }

    function hideDropdown() {
        setDropDownDisplay("none")
        resetKeyboardState()
    }
}

function ProjectFilter(props: {
    projects: OdaPmProject[],
    handleSetDisplayNames: (names: string[]) => void,
    displayNames: string[]
}) {
    const headingStyle = {
        display: "flex",
        justifyContent: "flex-start" // 横向居中
    };
    const projectsAndAll = [
        {
            name: ProjectFilterName_All,
            optionValue: ProjectFilterOptionValue_All
        }, ...props.projects
    ]
    // If optionValue is not defined, use name as optionValue
    return <div>
        <div style={headingStyle}>

            <FilterHeadHStack>
                <SearchDropdown data={projectsAndAll}
                                handleSetOptionValues={props.handleSetDisplayNames}/>
                <h2>Project: {getOptionValueName(props.displayNames.first(), projectsAndAll)}</h2>
            </FilterHeadHStack>
        </div>

        {/*<label style={headingStyle}>*/}
        {/*    Only shows workflows and tasks in this project.*/}
        {/*</label>*/}

    </div>
}

// endregion
