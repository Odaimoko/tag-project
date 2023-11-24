import React from "react";

export const MarkdownFrontMatterView = (props: {
    keyString?: string,
    valueString?: string,
}) => {
    return <div className="metadata-property" data-property-key="tpm_project" data-property-type="text">
        <div className="metadata-property-key">
            <span className="metadata-property-icon" aria-disabled="false">
                <svg
                    xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="svg-icon lucide-text">
                    <path d="M17 6.1H3"></path><path d="M21 12.1H3"></path><path
                    d="M15.1 18H3"></path>
                </svg>
            </span>
            <input className="metadata-property-key-input" type="text" value={props.keyString}
                   onChange={() => {
                   }}/>
        </div>
        <div className="metadata-property-value">
            <div className="metadata-input-longtext mod-truncate" placeholder="Empty"
            >{props.valueString}</div>
        </div>

    </div>
}
