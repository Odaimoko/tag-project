import React from "react";

import {I_Stylable} from "../pure-react/props-typing/i-stylable";

interface I_PathHierarchy {
    name: string,
    isFolder: boolean,
    isFolderCollapsed?: boolean,
    children?: I_PathHierarchy[]
}

/**
 *
 * @param props isCollapsed: True if the folder is closed.
 * @constructor
 */
function FolderIcon(props: {
    isCollapsed?: boolean
}) {
    const className = "tree-item-icon collapse-icon nav-folder-collapse-indicator" + (props.isCollapsed ? " is-collapsed" : "");
    return <div className={className}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
             className="svg-icon right-triangle">
            <path d="M3 8L12 17L21 8"></path>
        </svg>
    </div>;
}

function FolderView(props: {
    name: string,
    isCollapsed?: boolean,
    children?: I_PathHierarchy[]
}) {

    return <div className="tree-item nav-folder is-collapsed">
        <div className="tree-item-self is-clickable mod-collapsible nav-folder-title" draggable="true">
            <FolderIcon isCollapsed={props.isCollapsed}/>
            <div className="tree-item-inner nav-folder-title-content">{props.name}</div>
        </div>

        {!props.isCollapsed &&
            <div className="tree-item-children nav-folder-children">
                <FileNavView pathHierarchy={props.children}/>
            </div>}
    </div>;
}

function FileView(props: {
    level?: number,
    name: string,
    isCollapsed?: boolean,
}) {
    return <div className="tree-item nav-file">
        <div className="tree-item-self is-clickable nav-file-title" draggable="true">
            <div className="tree-item-inner nav-file-title-content">{props.name}</div>
        </div>
        <div className="tree-item-children"></div>
    </div>;
}

export const FileNavView = (props: {
    pathHierarchy?: I_PathHierarchy[]
} & I_Stylable) => {
    const pathHierarchy = props.pathHierarchy ?? []
    if (pathHierarchy.length === 0) {
        return <></>
    }
    return <div style={props.style}>
        {pathHierarchy.map(k => {
                if (k.isFolder) {
                    return <FolderView children={k.children} key={k.name} name={k.name} isCollapsed={k.isFolderCollapsed}/>
                } else {
                    return <FileView key={k.name} name={k.name}/>
                }
            }
        )}
    </div>
    /* 
    // Example
    return <div className="tree-item nav-folder">
        <FolderView name={"Obsidian PM Tool"}/>
        <div className="tree-item-children nav-folder-children">

            <FolderView name={"assets"}/>
            <div className="tree-item nav-folder">
                <FolderView name={"version docs"}/>
                <div className="tree-item-children nav-folder-children">

                    <FileView name={"0.2.x"}/>
                    <FileView name={"TagProject-0.2.0 Features"}/>
                </div>
            </div>

            <FileView name={"Tag Project PDD"}/>

        </div>
    </div> 
    */
}

const exampleHierarchy = [
    {
        name: "Obsidian PM Tool", isFolder: true, isFolderCollapsed: false, children: [
            {name: "Tutorial", isFolder: true, isFolderCollapsed: false, children: []},
            {
                name: "User Manual", isFolder: true, isFolderCollapsed: false, children: [
                    {name: "Rules for workflows and tasks", isFolder: false, isFolderCollapsed: false, children: []},
                    {name: "Task Completion", isFolder: false, isFolderCollapsed: false, children: []},
                ]
            },
        ]
    },
]
