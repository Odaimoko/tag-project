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
                               onLabelClicked={onLabelClicked} style={props.style}
    />
}
export const ExternalToggleView = (props:
                                       {
                                           externalControl: boolean,
                                           onChange: () => void,
                                           onLabelClicked?: () => void,
                                           content?: IRenderable,

                                       } & I_Stylable) => {
    const {externalControl, onChange, onLabelClicked, content} = props;
    const className = externalControl ? "checkbox-container  is-enabled" : "checkbox-container";
    return <div style={{
        display: "flex",
        alignItems: "center",
        ...props.style
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
