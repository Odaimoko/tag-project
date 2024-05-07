import {createContext} from "react";
//#ifdef DEVELOPMENT_BUILD
/**
 * Convert a Jsx Element to a Markdown string.
 */
import {renderToString} from "react-dom/server";
import {IRenderable} from "../ui/pure-react/props-typing/i-renderable";

export function jsxToMarkdown(jsx: IRenderable): string {
    const element = <MarkdownConvertContext.Provider value={true}>
        {jsx}
    </MarkdownConvertContext.Provider>;
    let html = renderToString(
        element
    )
    // Sometimes we want to use a Markdown paragraph, but `renderToString` will place an empty comment at the beginning,
    // making it a html element.
    // There is another emtpy comment at the end of the html output by renderToString. So we use non-greedy regex.
    html = html.replace(/<!--.*?-->/g, "")// remove comments. 
    return html
}

// used when we want to convert jsx to markdown for quartz
//#endif
export const MarkdownConvertContext = createContext(false);
