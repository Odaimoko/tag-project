import {StyleProps, VStack} from "./h-stack";
import React, {KeyboardEvent, useRef, useState} from "react";
import {getDropdownStyle, usePopup} from "./hovering-popup";
import {devLog} from "../../../utils/env-util";
import {INameable} from "../props-typing/i-nameable";
import {isCharacterInput} from "./event-handling/react-user-input";
import {IRenderable} from "../props-typing/i-renderable";
import {dropdownSelectedColor} from "../style-def";
import {loopIndex} from "../utils/loop-index";
import {ClickableView} from "./clickable-view";
import {Cross} from "../icon/Cross";


interface I_OptionItem {
    // Shown in the dropdown
    name: string,
    // Identify the option
    optionValue: string,
}

export type OptionValueType = INameable | I_OptionItem;

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
    dropdownId: string; // used to check if we clicked outside the dropdown. The direct interactable element should have a prefix of this id.
} & StyleProps) => {
    const singleSelect = props.singleSelect ?? true; // Default to single select
    if (!singleSelect) {
        // Multiple select
        // If currentOptionValues is not passed, we log error
        if (props.currentOptionValues === undefined) {
            console.error("Multiple Select Dropdown must pass currentOptionValues. Data are ", props.data)
        }
    }
    const dropdownId = props.dropdownId;
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
                    // target is the element that lost focus (input), relatedTarget is the element that gains focus
                    devLog(event.relatedTarget?.id)
                    if (event.relatedTarget?.id?.startsWith(dropdownId)) {
                        // Let the project_choice button handle the click event
                        // Otherwise when we lose focus and hide the dropdown, the button will not be triggered.
                    } else {
                        // Close when click outside
                        devLog("Close when click outside")
                        hideDropdown()
                    }
                }}
    >
        <span id={`${dropdownId}_input`} style={{display: "flex", alignItems: "center"}}>
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
        <ClickableView style={{marginLeft: -25, paddingTop: 5}}
                                   onIconClicked={() => {
                               setSearchText("")
                               // input's focus is already lost onclick, so we need to 
                               // 1. show the already hidden dropdown.
                               //    a. must. merely focusing on the input box will show the dropdown on the next event loop, which causes blinking dropdown.
                               // 2. focus on it again, so that user can input text immediately.
                               showDropdown()
                               inputRef.current?.focus()
                                   }} icon={<Cross/>}/>
        </span>
        {/*Add background so it won't be transparent. */}
        <div id={`${dropdownId}s`} style={getDropdownStyle(dropDownDisplay)}
        >
            <VStack spacing={2}>
                {filtered.map((option: OptionValueType) => {
                    const childId = `${dropdownId}_${option.name}`;
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
