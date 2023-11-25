import React, {Fragment, ReactNode} from "react";
import {I_Stylable} from "./icon-view";

export type StyleProps = I_Stylable

// https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key
// JSX elements directly inside a map() call always need keys! 
interface StackProps extends StyleProps {
    spacing?: number,
    children?: ReactNode[] | ReactNode
}

function getSpacingStyle(spacing: number | undefined, isHorizontal = true) {
    return isHorizontal ? {width: spacing} : {height: spacing}
}

export function wrapChildrenWithArray(
    children: React.ReactNode
): React.ReactNode[] {
    if (children === undefined) return [];
    //remove null and undefined, otherwise they will still contribute to spacing
    if (children instanceof Array) return children.filter(k => k);
    return [children].filter(k => k);
}

function Stack(props: StackProps & { isHorizontal?: boolean }) {
    // style won't override flex and row property of HStack
    const source2 = {
        display: "flex",
        flexDirection: props.isHorizontal ? "row" : "column"
    };
    return <div
        style={Object.assign({}, props.style, source2)}>
        {wrapChildrenWithArray(props.children).map((child: ReactNode, i: number) => {
            return <Fragment key={i}>
                {i > 0 ? <div style={getSpacingStyle(props.spacing, props.isHorizontal)}/> : null}
                {child}
            </Fragment>
        })}
    </div>
}

export function VStack(props: StackProps) {
    return <Stack {...props} isHorizontal={false}/>
}

export function HStack(props: StackProps) {
    return <Stack {...props} isHorizontal={true}/>
}

