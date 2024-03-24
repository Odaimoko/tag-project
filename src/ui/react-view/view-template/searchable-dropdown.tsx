import {StyleProps, VStack} from "./h-stack";
import React, {KeyboardEvent, useRef, useState} from "react";
import {usePopup} from "./hovering-popup";
import {devLog} from "../../../utils/env-util";
import {I_Nameable} from "../../../data-model/I_Nameable";
import {getDropdownStyle, loopIndex} from "../project-filter";
import {isCharacterInput} from "../../../utils/react-user-input";
import {IRenderable} from "../../common/i-renderable";
import {toggleValueInArray} from "../workflow-filter";
import {dropdownSelectedColor} from "../style-def";


interface I_OptionItem {
    // Shown in the dropdown
    name: string,
    // Identify the option
    optionValue: string,
}

export type OptionValueType = I_Nameable | I_OptionItem;

/**
 * If the op is I_OptionItem, return its optionValue, otherwise return its name.
 * @param op
 */
function getProjectOptionValue(op: OptionValueType) {
    // @ts-ignore
    return Object.keys(op).includes("optionValue") ? op['optionValue'] : op.name;
}

function DefaultSearchableOptionView(props: { item: OptionValueType }) {
    return <label>{props.item.name}</label>
}


export const SearchableDropdown = (props: {
    data: OptionValueType[]
    handleSetOptionValues(param: string[]): void;
    placeholder?: string;
    RenderView?: (props: { item: OptionValueType }) => IRenderable;
    singleSelect?: boolean;
    currentOptionValues?: OptionValueType[]; // Current selected option values. If singleSelect, we don't need to pass this.
    dropdownId: string;
} & StyleProps) => {
    const singleSelect = props.singleSelect ?? true; // Default to single select
    if (!singleSelect) {
        // Multiple select
        // If currentOptionValues is not passed, we log error
        if (props.currentOptionValues === undefined) {
            console.error("Multiple Select Dropdown must pass currentOptionValues. Data are ", props.data)
        }
    }
    const searchString = props.dropdownId;
    const [searchText, setSearchText] = useState("")
    const {dropDownDisplay, setDropDownDisplay, showDropdown} = usePopup();
    const filtered = props.data.filter(k => k.name.toLowerCase().includes(searchText.toLowerCase()))
    const RenderView = props.RenderView ?? DefaultSearchableOptionView;

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

    return <div style={Object.assign({}, props.style, {position: "relative"})}
                onKeyDown={handleBaseKeyboard}
                onBlur={(event) => {
                    // Hide Dropdown if we lose focus
                    if (event.relatedTarget && event.relatedTarget.id.startsWith(searchString)) {
                        // Let the project_choice button handle the click event
                        // Otherwise when we lose focus and hide the dropdown, the button will not be triggered.
                    } else {
                        // Close when click outside
                        devLog("Close when click outside")
                        hideDropdown()
                    }
                }}
    >
        <input ref={inputRef}
               type="text" placeholder={props.placeholder}
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

                   devLog("Input Focused");
                   showDropdown();
               }}
        />
        {/*Add background so it won't be transparent. */}
        <div id={`${searchString}s`} style={getDropdownStyle(dropDownDisplay)}
        >
            <VStack spacing={2}>
                {filtered.map((option: OptionValueType) => {
                    const childId = `${searchString}_${option.name}`;
                    // @ts-ignore
                    const has = !singleSelect ? props.currentOptionValues.includes(option) : false;
                    return (
                        <button style={{background: has ? dropdownSelectedColor : "none"}} id={childId}
                                onClick={(event) => {
                            // console.log(event.target) // html element
                                    if (singleSelect) {
                                        devLog(`Single Select Option Value ${option.name}`)
                                        props.handleSetOptionValues([getProjectOptionValue(option)])

                                        hideDropdown()
                                        handleSetSearchText("");
                                    } else {
                                        // toggle the option
                                        devLog(`Toggle Option Value ${getProjectOptionValue(option)}`)
                                        // @ts-ignore
                                        toggleValueInArray(getProjectOptionValue(option), props.currentOptionValues.map(k => getProjectOptionValue(k)), props.handleSetOptionValues,)
                                    }

                                }} key={option.name}
                                ref={(ref) => {
                                    childRefs[childId] = ref;
                                }}
                        >
                            <RenderView item={option}/>
                        </button>
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


    function hideDropdown() {
        setDropDownDisplay("none")
        resetKeyboardState()
    }
}
