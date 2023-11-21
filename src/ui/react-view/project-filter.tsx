import React, {KeyboardEvent, useRef, useState} from "react";
import {I_Nameable} from "../../data-model/I_Nameable";
import {OdaPmProject} from "../../data-model/OdaPmProject";
import {FilterHeadHStack} from "./workflow-filter";
import {StyleProps, VStack} from "./view-template/h-stack";
import {devLog} from "../../utils/env-util";

const ProjectFilterName_All = "All Projects";
export const ProjectFilterOptionValue_All = "###ALL###";

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

    const childRefs: Record<string, HTMLButtonElement | null> = {}; // Object to hold references to child components
    const inputRef = useRef<HTMLInputElement>(null);
    const selectedChild = useRef(-1);
    // Put OnKeyDown Event on the container div, so that we can use arrow keys to select the project.
    // Don't put it on the input box, otherwise when the focus is not on the input box, the event will not be triggered.
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
                   // show when click search input box

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

export function ProjectFilter(props: {
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
