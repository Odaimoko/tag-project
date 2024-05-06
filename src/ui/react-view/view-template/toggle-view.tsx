import React, {JSX, useState} from "react";
import {I_Stylable} from "./icon-view";
import {IRenderable} from "../../common/i-renderable";

export const ToggleView = (props: {
    content?: string | JSX.Element,
    onChange?: (nextChecked: boolean) => void,
    onLabelClicked?: () => void,
    initialState?: boolean,
} & I_Stylable) => {
    const {
        content, onChange, onLabelClicked, initialState = false,
    } = props;
    const [isChecked, setIsChecked] = useState(initialState);
    const handleCheckboxChange = () => {
        const nextToggle = !isChecked;
        setIsChecked(nextToggle);
        onChange?.(nextToggle);
    };
    return <ExternalToggleView externalControl={isChecked} content={content} onChange={handleCheckboxChange}
                               onContentClicked={onLabelClicked} style={props.style}
    />
}
export const ExternalToggleView = (props:
                                       {
                                           externalControl: boolean,
                                           onChange: () => void,
                                           onLabelClicked?: () => void,
                                           content?: IRenderable,

                                       } & I_Stylable) => {
    const {externalControl, onChange, onContentClicked, content} = props;
    const className = externalControl ? "checkbox-container  is-enabled" : "checkbox-container";
    return <div style={{
        display: "flex",
        alignItems: "center",
        ...props.style
    } as React.CSSProperties}>
        <span className={className} onClick={onChange}>
            <input type="checkbox"/>
        </span>
        {
            // if content is not null, render it. If no content, we do not want this marginLeft.
            !!content && <span style={{marginLeft: 5}}
                               onClick={onContentClicked}>
            {content}
        </span>
        }

    </div>
}
