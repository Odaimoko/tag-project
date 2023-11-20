import React, {Fragment, ReactNode} from "react";

// https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key
// JSX elements directly inside a map() call always need keys! 
interface StackProps {
    style?: React.CSSProperties,
    spacing?: number,
    children: ReactNode[],
}

function getSpacingStyle(spacing: number | undefined, isHorizontal = true) {
    return isHorizontal ? {width: spacing} : {height: spacing}
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