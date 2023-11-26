import {I_Stylable} from "../react-view/view-template/icon-view";
import React, {useContext} from "react";
import {MarkdownConvertContext} from "../../utils/markdown-converter";
import {IRenderable} from "./i-renderable";
import {wrapChildrenWithArray} from "../react-view/view-template/h-stack";

export function getMdHeadingByString({layer, content, style}: {
    layer: 1 | 2 | 3 | 4 | 5 | 6,
    content: string
} & I_Stylable) {
    if (style && style?.display === "none") return null;
    return `\n\n${'#'.repeat(layer)} ${content}\n\n`;
}

/**
 * Only output the text content of children, including nested.
 * @param children
 */
function getChildrenAsString(children: React.ReactNode): string {
    return wrapChildrenWithArray(children).map(k => {
        if (k?.hasOwnProperty("props")) { // @ts-ignore
            return getChildrenAsString(k.props.children)
        } else {
            // console.log(`SubPart: [${k}]-end`)
            return k
        }
    }).join("")

}

const Heading = (props: React.PropsWithChildren<I_Stylable> & {
    layer: 1 | 2 | 3 | 4 | 5 | 6
}) => {
    const mcc = useContext(MarkdownConvertContext);
    const content = getChildrenAsString(props.children);
    // console.log(getChildrenAsString(props.children))
    // when we use `{PLUGIN_NAME} is` under headings, prop.children is an array ["Tag Project", "is"]. We need to join them.
    if (mcc) {
        const mdHeading = getMdHeadingByString({layer: props.layer, content: content, style: props.style});
        return mdHeading as IRenderable
    }
    switch (props.layer) {
        case 1:
            return <h1 {...props}/>
        case 2:
            return <h2 {...props}/>
        case 3:
            return <h3 {...props}/>
        case 4:
            return <h4 {...props}/>
        case 5:
            return <h5 {...props}/>
        case 6:
            return <h6 {...props}/>
        default:
            return <h1 {...props}/>
    }
}

export const H1 = (props: React.PropsWithChildren<I_Stylable>) => {
    return <Heading layer={1} {...props}/>
}
export const H2 = (props: React.PropsWithChildren<I_Stylable>) => {
    return <Heading layer={2} {...props}/>
}
export const H3 = (props: React.PropsWithChildren<I_Stylable>) => {
    return <Heading layer={3} {...props}/>
}
export const H4 = (props: React.PropsWithChildren<I_Stylable>) => {
    return <Heading layer={4} {...props}/>
}
export const H5 = (props: React.PropsWithChildren<I_Stylable>) => {
    return <Heading layer={5} {...props}/>
}
export const H6 = (props: React.PropsWithChildren<I_Stylable>) => {
    return <Heading layer={6} {...props}/>
}
export const P = (props: React.PropsWithChildren<I_Stylable>) => {
    const mcc = useContext(MarkdownConvertContext);
    if (!mcc) {
        return <p {...props}>
            {props.children}
        </p>
    } else {
        const style = props.style;

        if (style && style?.display === "none") return null;
        return <>
            {"\n\n"}
            {props.children}
        </>
    }
}
