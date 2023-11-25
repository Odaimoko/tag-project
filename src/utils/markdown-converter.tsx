//#ifdef DEVELOPMENT_BUILD

/**
 * Convert a Jsx Element to a Markdown string.
 */
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";

export function jsxToMarkdown(jsx: React.JSX.Element): string {
    const html = renderToStaticMarkup(
        <MarkdownConvertContext.Provider value={true}>
            {jsx}
        </MarkdownConvertContext.Provider>
    )

    console.log(html)
    return html
}

// used when we want to convert jsx to markdown for quartz
export const MarkdownConvertContext = React.createContext(false);
//#endif
