import React, {useState} from "react";
import {IRenderable} from "../props-typing/i-renderable";
import {HStack} from "./h-stack";
import {EXPAND_COLLAPSE_EASING, EXPAND_COLLAPSE_DURATION, varBackgroundSecondary} from "../style-def";
import {ClickableView} from "./clickable-view";
import {Cross} from "../icon/Cross";

const POPUP_APPEAR_DURATION = "0.2s";

const popupTitleStyle: React.CSSProperties = {
    whiteSpace: "nowrap",
    fontSize: "0.85em",
    fontWeight: 600,
    color: "var(--text-muted)",
    letterSpacing: "0.02em",
};

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

export type PopupDisplay = "block" | "none";

export function usePopup(init: PopupDisplay = "none") {
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
 * Style for the dropdown container. Uses opacity + transform for animated show/hide (display kept "block" when content exists so transition runs).
 */
export function getDropdownStyle(dropDownDisplay: string | undefined, zIndex = 10): React.CSSProperties {
    dropDownDisplay ??= "none";
    const visible = dropDownDisplay === "block";
    return {
        display: "block",
        position: "absolute",
        zIndex,
        background: varBackgroundSecondary,
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0.97)",
        pointerEvents: visible ? "auto" : "none",
        transition: `opacity ${POPUP_APPEAR_DURATION} ${EXPAND_COLLAPSE_EASING}, transform ${POPUP_APPEAR_DURATION} ${EXPAND_COLLAPSE_EASING}`,
        boxShadow: "0 4px 16px rgba(0,0,0,0.15), 0 0 1px rgba(0,0,0,0.08)",
    };
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
    const {dropDownDisplay: d, hideDropdown: h, showDropdown: s} = usePopup();
    if (hideDropdown === undefined || showDropdown === undefined) {
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
            border: "1px solid var(--background-modifier-border)",
            borderRadius: 10,
            minWidth: "120px",
        }, getDropdownStyle(dropDownDisplay))}>
            <div style={{ margin: 8 }}>
                <HStack
                    style={{
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 6,
                        paddingBottom: 6,
                        borderBottom: "1px solid var(--background-modifier-border)",
                    }}>
                    {typeof props.title === "string" ?
                        <span style={popupTitleStyle}>{props.title}</span> :
                        (props.title as React.ReactNode)
                    }
                    <ClickableView icon={<Cross/>} onIconClicked={hideDropdown}/>
                </HStack>
                {props.popupContent}
            </div>
        </div> : null}
    </div>
}
