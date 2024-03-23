import React from "react";
import {OdaPmProject} from "../../data-model/OdaPmProject";
import {FilterHeadHStack} from "./workflow-filter";
import {HStack} from "./view-template/h-stack";

import {ProjectView} from "./project-view";


import {varBackgroundSecondary} from "./style-def";
import {OptionValueType, SearchableDropdown} from "./view-template/searchable-dropdown";

export const ProjectFilterName_All = "All Projects";
export const ProjectFilterOptionValue_All = "###ALL###";


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
export function getDropdownStyle(dropDownDisplay: string | undefined) {
    dropDownDisplay ??= "none";
    const dropdownStyle = {
        display: dropDownDisplay,
        position: "absolute",
        zIndex: 1,
        background: varBackgroundSecondary
    } as React.CSSProperties;
    return dropdownStyle;
}

export function ProjectFilter(props: {
    projects: OdaPmProject[],
    handleSetDisplayNames: (names: string[]) => void,
    displayNames: string[]
}) {
    const headingStyle = {
        display: "flex",
        justifyContent: "flex-start" // 横向居中
    };
    const sortedProjects = [...props.projects].sort(
        (a, b) => a.name.localeCompare(b.name))
    const projectsAndAll = [
        {
            name: ProjectFilterName_All,
            optionValue: ProjectFilterOptionValue_All
        }, ...sortedProjects
    ]
    // If optionValue is not defined, use name as optionValue
    const projectDisplayName = getOptionValueName(props.displayNames.first(), projectsAndAll);
    const displayingProject = props.projects.filter(k => k.name === projectDisplayName).first();
    return <div>
        <div style={headingStyle}>

            <FilterHeadHStack>
                <SearchableDropdown dropdownId={"project"} data={projectsAndAll}
                                    handleSetOptionValues={props.handleSetDisplayNames}
                                    placeholder={"Search/Select Project"}/>
                <h2><HStack spacing={5}>
                    Project: {displayingProject ? displayingProject &&
                    <ProjectView project={displayingProject}/> : projectDisplayName}
                </HStack>
                </h2>

            </FilterHeadHStack>
        </div>

        {/*<label style={headingStyle}>*/}
        {/*    Only shows workflows and tasks in this project.*/}
        {/*</label>*/}

    </div>
}
