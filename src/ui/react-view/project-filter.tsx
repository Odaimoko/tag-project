import React, {useContext} from "react";
import {OdaPmProject} from "../../data-model/OdaPmProject";
import {FilterHeadHStack} from "./workflow-filter";
import {HStack} from "./view-template/h-stack";

import {ProjectView} from "./project-view";


import {varBackgroundSecondary} from "./style-def";
import {OptionValueType, SearchableDropdown} from "./view-template/searchable-dropdown";
import {PluginContext} from "../obsidian/manage-page-view";
import {ProjectInspectorModal} from "../obsidian/project-inspector/project-inspector-modal";
import {notify} from "../../utils/o-notice";

export const ProjectFilterName_All = "All Projects";
export const ProjectFilterOptionValue_All = "###ALL###";

// If optionValue is not defined, use name as optionValue

function getOptionValueName(opValue: string | undefined, listOpValues: OptionValueType[]) {
    if (opValue === undefined)
        return null;

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

export function loopIndex(nextIdx: number, len: number) {
    if (nextIdx < 0) {
        nextIdx = len - 1;
    } else if (nextIdx >= len) {
        nextIdx = 0;
    }
    return nextIdx;
}

/**
 * A style that will show or hide the dropdown.
 * @param dropDownDisplay
 */
export function getDropdownStyle(dropDownDisplay: string | undefined, zIndex = 10) {
    dropDownDisplay ??= "none";
    const dropdownStyle = {
        display: dropDownDisplay,
        position: "absolute",
        zIndex: zIndex,
        background: varBackgroundSecondary
    } as React.CSSProperties;
    return dropdownStyle;
}

const headingStyle = {
    display: "flex",
    justifyContent: "flex-start" // 横向居中
};
const AllProjectsOption = {
    name: ProjectFilterName_All,
    optionValue: ProjectFilterOptionValue_All
} as OptionValueType;

export function ProjectFilter(props: {
    allProjects: OdaPmProject[],
    dropdownProjects: OdaPmProject[],
    handleSetDisplayNames: (names: string[]) => void,
    displayNames: string[]
}) {
    const plugin = useContext(PluginContext);

    const nonCompletedSortedProjects = [...props.dropdownProjects].sort(
        (a, b) => a.name.localeCompare(b.name))
    const projectsAndAll = [AllProjectsOption, ...nonCompletedSortedProjects]
    // Decide the project name shown at the top. If the project is completed, we show all.
    const firstProjectName = props.displayNames.first();
    const projectDisplayName = getOptionValueName(firstProjectName, projectsAndAll)
    if (projectDisplayName === null) {
        props.handleSetDisplayNames([ProjectFilterOptionValue_All])
        notify(`Project ${firstProjectName} not found or completed, showing all projects.`)
        return null;
    }
    
    const displayingProject = props.allProjects.filter(k => k.name === projectDisplayName).first();

    return <div>
        <div style={headingStyle}>

            <FilterHeadHStack>
                <button
                    onClick={() => new ProjectInspectorModal(plugin).open()}>Manage
                </button>
                <label>or</label>
                <SearchableDropdown dropdownId={"project"} data={projectsAndAll}
                                    handleSetOptionValues={props.handleSetDisplayNames}
                                    placeholder={"Search/Select Project"}/>
                <h2>
                    <HStack spacing={5}>
                        Project: {displayingProject ? displayingProject &&
                        <ProjectView project={displayingProject}/> : projectDisplayName}
                    </HStack>
                </h2>
            </FilterHeadHStack>

        </div>

        {/*<ProjectInspectorView plugin={plugin}/>*/}
    </div>
}
