import { StyleProps, VStack } from "./h-stack";
import React, { JSX, useCallback, KeyboardEvent, useEffect, useRef, useState } from "react";
import { getDropdownStyle, PopupDisplay, usePopup } from "./hovering-popup";
import { devLog } from "../../../utils/env-util";
import { INameable } from "../props-typing/i-nameable";
import { isCharacterInput } from "./event-handling/react-user-input";
import { dropdownSelectedColor, varDropdownNonSelected } from "../style-def";
import { loopIndex } from "../utils/loop-index";
import { ClickableView } from "./clickable-view";
import { Cross } from "../icon/Cross";
import { toggleValueInArray } from "../utils/toggle-value-in-array";
import "./searchable-dropdown.css"

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

const FADE_PX = 16;

/** Max height of the dropdown list; keep low enough that scroll appears with ~8+ items. */
const DROPDOWN_LIST_MAX_HEIGHT = "min(70vh, 320px)";

/** Scroll-end indicator: shared dimensions */
const END_INDICATOR_BAR_HEIGHT = 4;
const END_INDICATOR_FADE_HEIGHT = 2;
const END_INDICATOR_FADE_MARGIN = 4;
const END_INDICATOR_PADDING_TOP = 3;
const END_INDICATOR_PADDING_BOTTOM = 3;

const endIndicatorBaseStyle: React.CSSProperties = {
    flexShrink: 0,
    position: "sticky",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    padding: `${END_INDICATOR_PADDING_TOP}px 0 ${END_INDICATOR_PADDING_BOTTOM}px`,
    background: "var(--background-secondary)",
    borderBottom: "1px solid var(--background-modifier-border)",
    zIndex: 1,
    pointerEvents: "none",
};
const endIndicatorTopStyle: React.CSSProperties = { ...endIndicatorBaseStyle, top: 0 };
const endIndicatorBottomStyle: React.CSSProperties = {
    ...endIndicatorBaseStyle,
    bottom: 0,
    borderBottom: "none",
    borderTop: "1px solid var(--background-modifier-border)",
    flexDirection: "column-reverse",
    padding: `${END_INDICATOR_PADDING_BOTTOM}px 0 ${END_INDICATOR_PADDING_TOP}px`,
};
const endIndicatorBarStyle: React.CSSProperties = {
    width: "100%",
    height: END_INDICATOR_BAR_HEIGHT,
    background: "var(--link-color)",
    opacity: 0.7,
};
const endIndicatorFadeTopStyle: React.CSSProperties = {
    width: "100%",
    height: END_INDICATOR_FADE_HEIGHT,
    marginTop: END_INDICATOR_FADE_MARGIN,
    background: "linear-gradient(to bottom, var(--background-secondary), transparent)",
};
const endIndicatorFadeBottomStyle: React.CSSProperties = {
    width: "100%",
    height: END_INDICATOR_FADE_HEIGHT,
    marginBottom: END_INDICATOR_FADE_MARGIN,
    background: "linear-gradient(to top, var(--background-secondary), transparent)",
};
export const SearchableDropdown = (props: {
    data: OptionValueType[]
    handleSetOptionValues(param: string[]): void;
    placeholder?: string;
    RenderView?: (props: { item: OptionValueType }) => JSX.Element;
    singleSelect?: boolean;
    currentOptionValues?: OptionValueType[]; // Current selected option values. If singleSelect, we don't need to pass this.
    dropdownId: string; // used to check if we clicked outside the dropdown. The direct interactable element should have a prefix of this id.
    onFocus?: () => void;
    onBlur?: () => void;
    showInputBox?: boolean
    initDropdownStatus?: PopupDisplay; // 0.12.0, If initDropdownStatus is "block", we will expand the dropdown when mounted. In this case we should manually focus on the input box so when it goes blur, the dropdown will be hidden. 
} & StyleProps) => {
    const singleSelect = props.singleSelect ?? true; // Default to single select
    if (!singleSelect) {
        // Multiple select
        // If currentOptionValues is not passed, we log error
        if (props.currentOptionValues === undefined) {
            console.error("Multiple Select Dropdown must pass currentOptionValues. Data are ", props.data)
        }
    }
    const initDropdownStatus = props.initDropdownStatus ?? "none";
    const focusOnMounted: boolean = initDropdownStatus == "block";
    const showInputBox = props.showInputBox ?? true;
    const dropdownId = props.dropdownId;
    const [searchText, setSearchText] = useState("")
    const { dropDownDisplay, setDropDownDisplay, showDropdown } = usePopup(initDropdownStatus);
    const filtered = props.data.filter(k => k.name.toLowerCase().includes(searchText.toLowerCase()))
    const RenderView = props.RenderView ?? DefaultSearchableOptionView;

    function handleSetSearchText(txt: string) {
        setSearchText(txt)
    }

    const childRefs: Record<string, HTMLButtonElement | null> = {}; // Object to hold references to child components
    const inputRef = useRef<HTMLInputElement>(null);
    const listContainerRef = useRef<HTMLDivElement>(null); // the container of the dropdown list
    const selectedChild = useRef(-1);
    // the proximity of the scroll to the top and bottom of the dropdown
    // calculated as the ratio of the scroll distance to the fade distance
    const [scrollProximity, setScrollProximity] = useState({ top: 1, bottom: 0 });

    const updateScrollState = useCallback(() => {
        const el = listContainerRef.current;
        if (!el) return;
        // scrollTop: the distance from the top of the container to the top of the visible area
        // scrollHeight: the total height of the container
        // clientHeight: the height of the visible area
        const { scrollTop, scrollHeight, clientHeight } = el;
        const top = Math.max(0, 1 - scrollTop / FADE_PX);
        const distFromBottom = scrollHeight - clientHeight - scrollTop;
        const bottom = Math.max(0, Math.min(1, distFromBottom / FADE_PX));
        setScrollProximity((prev) =>
            (prev.top !== top || prev.bottom !== bottom) ? { top, bottom } : prev
        );
    }, []);

    useEffect(() => {
        if (dropDownDisplay === "block") updateScrollState();
    }, [dropDownDisplay, filtered.length, updateScrollState]);

    // Put OnKeyDown Event on the container div, so that we can use arrow keys to select the project.
    // Don't put it on the input box, otherwise when the focus is not on the input box, the event will not be triggered.
    function resetKeyboardState() {
        selectedChild.current = -1;
    }

    useEffect(() => {
        if (focusOnMounted)
            inputRef.current?.focus()
    }, [focusOnMounted]);
    return <div className={"dropdown-root"} style={Object.assign({}, props.style, { position: "relative" })}
        onKeyDown={handleBaseKeyboard}
        onBlur={(event) => {
            // Hide Dropdown if we lose focus
            // target is the element that lost focus (input), relatedTarget is the element that gains focus
            if (event.relatedTarget?.id?.startsWith(dropdownId)) {
                // Let the project_choice button handle the click event
                // Otherwise when we lose focus and hide the dropdown, the button will not be triggered.
            } else {
                // Close when click outside
                devLog(`Close when click outside ${dropdownId}`)
                props.onBlur?.()
                hideDropdown()
            }
        }}
        onFocus={props.onFocus}
    >
        <span id={`${dropdownId}_input`} style={{
            display: "flex", alignItems: "center",
            transform: `scale(${showInputBox ? 1 : 0})` // this won't change the layout, only the visual part
        }}>
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
            <ClickableView style={{ marginLeft: -25, paddingTop: 5 }}
                onIconClicked={() => {
                    setSearchText("")
                    // input's focus is already lost onclick, so we need to 
                    // 1. show the already hidden dropdown.
                    //    a. must. merely focusing on the input box will show the dropdown on the next event loop, which causes blinking dropdown.
                    // 2. focus on it again, so that user can input text immediately.
                    showDropdown()
                    inputRef.current?.focus()
                }} icon={<Cross />} />
        </span>
        {/*Add background so it won't be transparent. */}
        <div
            ref={listContainerRef}
            className={"dropdown-button-collection"}
            id={`${dropdownId}s`}
            style={{
                ...getDropdownStyle(dropDownDisplay),
                maxHeight: DROPDOWN_LIST_MAX_HEIGHT,
                minHeight: 0,
                overflow: "auto",
            }}
            onScroll={updateScrollState}
        >
            <div
                aria-hidden
                style={{
                    ...endIndicatorTopStyle,
                    opacity: scrollProximity.top,
                    transform: `translateY(${-12 * (1 - scrollProximity.top)}px)`,
                    transition: "opacity 0.12s ease-out, transform 0.12s ease-out",
                }}
            >
                <div style={endIndicatorBarStyle} />
                <div style={endIndicatorFadeTopStyle} />
            </div>
            <VStack className={"dropdown-button-collection"} spacing={2}>
                {filtered.map((option: OptionValueType) => {
                    const childId = `${dropdownId}_${option.name}`;
                    // @ts-ignore
                    const isSelected = !singleSelect ? props.currentOptionValues.includes(option) : false;
                    return (
                        <button className="dropdown-button"
                            style={{ background: isSelected ? dropdownSelectedColor : varDropdownNonSelected }}
                            id={childId}
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
                                    const projectOptionValues = props.currentOptionValues.map(k => getProjectOptionValue(k));
                                    // @ts-ignore
                                    toggleValueInArray(getProjectOptionValue(option), projectOptionValues, props.handleSetOptionValues,)
                                }

                            }} key={option.name}
                            ref={(ref) => {
                                childRefs[childId] = ref;
                            }}
                        >
                            <RenderView item={option} />
                        </button>
                    )
                })}
            </VStack>
            <div
                aria-hidden
                style={{
                    ...endIndicatorBottomStyle,
                    opacity: scrollProximity.bottom,
                    transform: `translateY(${12 * (1 - scrollProximity.bottom)}px)`,
                    transition: "opacity 0.12s ease-out, transform 0.12s ease-out",
                }}
            >
                <div style={endIndicatorBarStyle} />
                <div style={endIndicatorFadeBottomStyle} />
            </div>
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
