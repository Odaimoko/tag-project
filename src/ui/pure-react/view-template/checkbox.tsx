import React, {JSX, useState} from "react";
import {IRenderable} from "../props-typing/i-renderable";
import {GeneralMouseEventHandler} from "./event-handling/general-mouse-event-handler";
import {I_Stylable} from "../props-typing/i-stylable";

/**
 * A checkbox that is totally controlled by its parent.
 * @param externalControl
 * @param onChange
 * @param onLabelClicked
 * @param content
 * @param style
 * @constructor
 */
export const ExternalControlledCheckbox = ({externalControl, onChange, onContentClicked, content, style}:
                                               {
                                                   externalControl: boolean,
                                                   onChange: () => void,
                                                   onContentClicked?: GeneralMouseEventHandler,
                                                   content?: IRenderable,

                                               } & I_Stylable) => {
    // Click the label won't trigger the checkbox change event. When no content (e.g. step cell), remove input margin and hide label for centering.
    const inputStyle = content == null ? { margin: 0 } : undefined;
    const labelStyle = content == null ? { width: 0, height: 0, overflow: "hidden", margin: 0, padding: 0, display: "block" } : undefined;
    return (
        <span style={style}>
            <input
                type="checkbox"
                checked={externalControl}
                onChange={onChange}
                style={inputStyle}
            />
            <label onClick={onContentClicked} style={labelStyle}>
                {content}
            </label>
        </span>
    );
};
/**
 * A self-controlled checkbox. Note the difference in parameters with {@link ExternalControlledCheckbox}
 * @param content
 * @param onChange
 * @param onLabelClicked
 * @param initialState
 * @constructor
 */
export const Checkbox = ({
                             content,
                             onChange,
                             onLabelClicked,
                             initialState = false,
                             style,
                         }: {
                             content?: string | JSX.Element,
                             onChange?: (nextChecked: boolean) => void,
                             onLabelClicked?: () => void,
                             initialState?: boolean,
                         } & I_Stylable
) => {
    const [isChecked, setIsChecked] = useState(initialState);

    const handleCheckboxChange = () => {
        const nextToggle = !isChecked;
        setIsChecked(nextToggle);
        onChange?.(nextToggle);
    };
    return <ExternalControlledCheckbox style={style} externalControl={isChecked}
                                       onChange={handleCheckboxChange} onContentClicked={onLabelClicked}
                                       content={content}/>
}
