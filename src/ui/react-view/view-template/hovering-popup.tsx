import React, {useState} from "react";
import {IRenderable} from "../../common/i-renderable";
import {getDropdownStyle} from "../project-filter";
import {ClickableIconView} from "./icon-view";
import {HStack} from "./h-stack";

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
 *
 * @param props If hideDropdown or showDropdown is not given, use usePopup() to get them.
 * @constructor
 */
export function HoveringPopup(props: {
    hoveredContent: IRenderable, popupContent: IRenderable, style?: React.CSSProperties, title?: string
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
                    <label style={{whiteSpace: "nowrap"}}>{props.title}</label>
                    <ClickableIconView onIconClicked={hideDropdown} iconName={"x"}/>
                </HStack>
                {props.popupContent}
            </div>
        </div> : null}
    </div>
}
