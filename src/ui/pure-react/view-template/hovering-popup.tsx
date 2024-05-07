import React, {useState} from "react";
import {IRenderable} from "../props-typing/i-renderable";
import {ClickableObsidianIconView} from "../../react-view/obsidian-icon-view";
import {HStack} from "./h-stack";
import {varBackgroundSecondary} from "../../react-view/style-def";

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

export function usePopup(init = "none") {
    const [dropDownDisplay, setDropDownDisplay] = useState(init);

    function toggleDropdown() {
        toggleDropDown(setDropDownDisplay)
    }

    function showDropdown() {
        setDropDownDisplay("block")
    }

    function hideDropdown() {
        setDropDownDisplay("none")
    }

    return {dropDownDisplay, setDropDownDisplay, toggleDropdown, showDropdown, hideDropdown}
}

type PopupProps = Partial<ReturnType<typeof usePopup>>;

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

/**
 *
 * @param props If hideDropdown or showDropdown is not given, use usePopup() to get them.
 * @constructor
 */
export function HoveringPopup(props: {
    hoveredContent: IRenderable, popupContent: IRenderable, style?: React.CSSProperties, title?: IRenderable
} & PopupProps) {
    let {dropDownDisplay, hideDropdown, showDropdown} = props;
    if (hideDropdown === undefined || showDropdown === undefined) {
        const {dropDownDisplay: d, hideDropdown: h, showDropdown: s} = usePopup();
        dropDownDisplay = d;
        hideDropdown = h;
        showDropdown = s;
    }

    return <div
        onMouseEnter={() => {
            showDropdown?.()
        }} onMouseLeave={() => {
        hideDropdown?.()
    }}
        style={Object.assign({}, props.style, {position: "relative"},)}>
        {props.hoveredContent}
        {props.popupContent ? <div style={Object.assign({
            borderWidth: 1,
            border: "solid var(--link-color)",
            borderRadius: 10,
        }, getDropdownStyle(dropDownDisplay))}>
            <div style={{margin: 5}}>
                <HStack
                    style={{justifyContent: "space-between", alignItems: "center", margin: 5}}>
                    {typeof props.title === "string" ?
                        <label style={{whiteSpace: "nowrap"}}>{props.title}</label> :
                        props.title as React.ReactNode
                    }
                    <ClickableObsidianIconView onIconClicked={hideDropdown} iconName={"x"}/>
                </HStack>
                {props.popupContent}
            </div>
        </div> : null}
    </div>
}
