import React, {JSX, useState} from "react";
import {I_Stylable} from "./icon-view";
import {IRenderable} from "../../common/i-renderable";

export const ToggleView = ({
                               content, onChange, onLabelClicked, initialState = false,
                           }: {
    content?: string | JSX.Element,
    onChange?: (nextChecked: boolean) => void,
    onLabelClicked?: () => void,
    initialState?: boolean,
} & I_Stylable) => {
    const [isChecked, setIsChecked] = useState(initialState);
    const handleCheckboxChange = () => {
        const nextToggle = !isChecked;
        setIsChecked(nextToggle);
        onChange?.(nextToggle);
    };
    return <ExternalToggleView externalControl={isChecked} content={content} onChange={handleCheckboxChange}
                               onLabelClicked={onLabelClicked}
    />
}
export const ExternalToggleView = ({externalControl, onChange, onLabelClicked, content}:
                                       {
                                           externalControl: boolean,
                                           onChange: () => void,
                                           onLabelClicked?: () => void,
                                           content?: IRenderable,

                                       } & I_Stylable) => {
    const className = externalControl ? "checkbox-container  is-enabled" : "checkbox-container";
    return <div style={{
        display: "flex",
        alignItems: "center"
    } as React.CSSProperties}>
        <span className={className} onClick={onChange}>
            <input type="checkbox"/>
        </span>
        <span style={{marginLeft: 5}}
              onClick={onLabelClicked}>
            {content}
        </span>
    </div>
}
