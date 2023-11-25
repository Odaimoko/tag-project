//#ifdef DEVELOPMENT_BUILD

/**
 * Convert a Jsx Element to a Markdown string.
 */
import {createContext} from "react";
import {renderToString} from "react-dom/server";
import {IRenderable} from "../ui/common/i-renderable";

export function jsxToMarkdown(jsx: IRenderable): string {
    const html = renderToString(
        <MarkdownConvertContext.Provider value={true}>
            {jsx}
        </MarkdownConvertContext.Provider>
    )

    return html
}

// used when we want to convert jsx to markdown for quartz
export const MarkdownConvertContext = createContext(false);
//#endif
