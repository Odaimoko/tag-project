import {I_Renderable} from "./i_Renderable";
import React, {Fragment, JSX, ReactNode, useState} from "react";
import {getIcon} from "obsidian";

const taskLinkHtmlString = getIcon("link")?.outerHTML;
// Render an html string as a React component.
// https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml
export function InternalLinkView({content, onIconClicked, onContentClicked}: {
    content: I_Renderable,
    onIconClicked?: () => void,
    onContentClicked?: () => void
}) {
    return <span>

        <a className={"cm-underline"} onClick={onIconClicked}>
            <HTMLStringComponent htmlString={taskLinkHtmlString}/>
        </a>
        <span onClick={onContentClicked}>
        {content}
        </span>
    </span>

}

// We cannot interact in Dataview Table, so we create our own.
export const DataTable = ({
                              tableTitle,
                              headers, rows,
                              onHeaderClicked,
                              tableStyle,
                              headerStyle,
                              cellStyle,
                          }: {
    tableTitle: string,
    headers: I_Renderable[],
    rows: I_Renderable[][],
    onHeaderClicked?: (arg0: number) => void,
    tableStyle?: React.CSSProperties,
    headerStyle?: React.CSSProperties,
    cellStyle?: React.CSSProperties,
}) => {

    return (
        <table style={tableStyle} key={tableTitle}>
            <thead>
            <tr>
                {headers.map((header: string, index) => {
                    return <th style={headerStyle} key={header}>
                        <div onClick={() => {
                            onHeaderClicked?.(index)
                        }}>{header}</div>
                    </th>;
                })}
            </tr>
            </thead>
            <tbody>
            {rows.map((items, rowIdx) => (
                <tr key={rowIdx}>
                    {items.map(
                        function (k, columnIdx) {
                            const key = `${tableTitle}_${rowIdx}_${columnIdx}`;
                            return <td style={cellStyle} key={key}>{k}</td>;
                        }
                    )}
                </tr>))
            }
            </tbody>
        </table>
    );
}
/**
 * A checkbox that is totally controlled by its parent.
 * @param externalControl
 * @param onChange
 * @param onLabelClicked
 * @param content
 * @constructor
 */
export const ExternalControlledCheckbox = ({externalControl, onChange, onLabelClicked, content}:
                                               {
                                                   externalControl: boolean,
                                                   onChange: () => void,
                                                   onLabelClicked?: () => void,
                                                   content?: I_Renderable

                                               }) => {
    // Click the label won't trigger the checkbox change event
    return (
        <Fragment>
            <input
                type="checkbox"
                checked={externalControl}
                onChange={onChange}
            />
            <label onClick={onLabelClicked}>
                {content}
            </label>
        </Fragment>
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
                         }: {
                             content?: string | JSX.Element,
                             onChange?: (nextChecked: boolean) => void,
                             onLabelClicked?: () => void,
                             initialState?: boolean,
                         }
) => {
    const [isChecked, setIsChecked] = useState(initialState);

    const handleCheckboxChange = () => {
        const nextToggle = !isChecked;
        setIsChecked(nextToggle);
        onChange?.(nextToggle);
    };
    return <ExternalControlledCheckbox externalControl={isChecked}
                                       onChange={handleCheckboxChange} onLabelClicked={onLabelClicked}
                                       content={content}/>
}

function getSpacingStyle(spacing: number | undefined, isHorizontal = true) {
    return isHorizontal ? {width: spacing} : {height: spacing}
}

// https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key
// JSX elements directly inside a map() call always need keys! 
interface StackProps {
    style?: React.CSSProperties,
    spacing?: number,
    children: ReactNode[],
}

export function HStack(props: StackProps) {
    return <div style={Object.assign({}, {display: "flex", flexDirection: "row"}, props.style)}>
        {props.children?.map((child: ReactNode, i: number) => {
            return <Fragment key={i}>
                {i > 0 ? <div style={getSpacingStyle(props.spacing)}/> : null}
                {child}
            </Fragment>
        })}
    </div>
}

function HTMLStringComponent({htmlString, useSpan = true}: {
    htmlString?: string,
    useSpan?: boolean
}) {
    if (useSpan)
        return (
            <span dangerouslySetInnerHTML={{__html: htmlString ?? ""}}/>
        );
    else return <div dangerouslySetInnerHTML={{__html: htmlString ?? ""}}/>
}