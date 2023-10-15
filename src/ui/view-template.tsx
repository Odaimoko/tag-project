import {I_Renderable} from "./i_Renderable";
import React, {Fragment, JSX, ReactNode, useState} from "react";
import {getIcon} from "obsidian";

export interface I_Stylable {
    style?: React.CSSProperties;
}

// const taskLinkHtmlString = getIcon("link")?.outerHTML;
/**
 * https://lucide.dev/icons/
 * @param iconName
 * @constructor
 */
export function ObsidianIconView({iconName, style}: { iconName: string } & I_Stylable) {
    const htmlString = getIcon(iconName)?.outerHTML
    return <HTMLStringComponent style={style} htmlString={htmlString}/>;
}

/**
 * Premade Component.
 * @constructor
 */
export function InternalLinkView({content, onIconClicked, onContentClicked, style}: {
    content: I_Renderable,
    onIconClicked?: () => void,
    onContentClicked?: () => void,
} & I_Stylable) {
    return <ClickableIconView style={style} content={content} onIconClicked={onIconClicked}
                              onContentClicked={onContentClicked}
                              iconName={"link"}
    />
}

export function ClickableIconView({content, onIconClicked, onContentClicked, iconName, style}: {
    content?: I_Renderable,
    onIconClicked?: () => void,
    onContentClicked?: () => void,
    iconName: string
} & I_Stylable) {
    return <span style={style}>

        <a className={"cm-underline"} onClick={onIconClicked}>
           <ObsidianIconView iconName={iconName}/>
        </a>
        <span onClick={onContentClicked}>
        {content}
        </span>
    </span>
}

/**
 *
 * @param tableTitle
 * @param headers
 * @param rows
 * @param onHeaderClicked
 * @param tableStyle
 * @param thStyle
 * @param cellStyle
 * @param cellStyleGetter override cellStyle. give more complicated style for table values.
 * @constructor
 */
    // We cannot interact in Dataview Table, so we create our own.
export const DataTable = ({
                              tableTitle,
                              headers, rows,
                              onHeaderClicked,
                              tableStyle,
                              thStyle,
                              thStyleGetter,
                              cellStyle,
                              cellStyleGetter,
                          }: {
        tableTitle: string,
        headers: I_Renderable[],
        rows: I_Renderable[][],
        onHeaderClicked?: (arg0: number) => void,
        tableStyle?: React.CSSProperties,
        thStyle?: React.CSSProperties,
        thStyleGetter?: (column: number) => React.CSSProperties,
        cellStyle?: React.CSSProperties,
        cellStyleGetter?: (column: number, row: number) => React.CSSProperties
    }) => {

        return (
            <table style={tableStyle} key={tableTitle}>
                <tbody>
                {rows.map((items: I_Renderable[], rowIdx) => (
                    <tr key={rowIdx}>
                        {items.map(
                            function (k: I_Renderable, columnIdx) {
                                const key = `${tableTitle}_${rowIdx}_${columnIdx}`;
                                const cStyle = cellStyleGetter ?
                                    cellStyleGetter(columnIdx, rowIdx) :
                                    cellStyle;
                                return <td style={cStyle} key={key}>{k}</td>;
                            })}

                    </tr>))
                }
                </tbody>
                {/*Draw header at the end, so it can cover body view. Or else the body content will be rendered above headers. */}
                <thead>
                <tr>
                    {headers.map((header: string, index) => {
                        const headerStyle = thStyleGetter ? thStyleGetter(index) : thStyle;
                        return <th style={headerStyle} key={header}>
                            <div onClick={() => {
                                onHeaderClicked?.(index)
                            }}>{header}</div>
                        </th>;
                    })}
                </tr>
                </thead>
            </table>
        );
    }
/**
 * A checkbox that is totally controlled by its parent.
 * @param externalControl
 * @param onChange
 * @param onLabelClicked
 * @param content
 * @param style
 * @constructor
 */
export const ExternalControlledCheckbox = ({externalControl, onChange, onLabelClicked, content, style}:
                                               {
                                                   externalControl: boolean,
                                                   onChange: () => void,
                                                   onLabelClicked?: () => void,
                                                   content?: I_Renderable,

                                               } & I_Stylable) => {
    // Click the label won't trigger the checkbox change event
    return (
        <span style={style}>
            <input
                type="checkbox"
                checked={externalControl}
                onChange={onChange}
            />
            <label onClick={onLabelClicked}>
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
    // style won't override flex and row property of HStack
    return <div style={Object.assign({}, props.style, {display: "flex", flexDirection: "row"})}>
        {props.children?.map((child: ReactNode, i: number) => {
            return <Fragment key={i}>
                {i > 0 ? <div style={getSpacingStyle(props.spacing)}/> : null}
                {child}
            </Fragment>
        })}
    </div>
}

// Render an html string as a React component.
// https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml
function HTMLStringComponent({htmlString, useSpan = true, style}: {
    htmlString?: string,
    useSpan?: boolean
} & I_Stylable) {
    if (useSpan)
        return (
            <span style={style} dangerouslySetInnerHTML={{__html: htmlString ?? ""}}/>
        );
    else return <div style={style} dangerouslySetInnerHTML={{__html: htmlString ?? ""}}/>
}