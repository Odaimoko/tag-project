import {Modal} from "obsidian";
import {createRoot, Root} from "react-dom/client";
import OdaPmToolPlugin from "../../../main";
import React, {useState} from "react";
import {OdaPmDbProvider} from "../../../data-model/OdaPmDb";
import {DataTable} from "../../pure-react/view-template/data-table";
import {setSettingsValueAndSave, usePluginSettings} from "../../../settings/settings";
import {Checkbox} from "../../pure-react/view-template/checkbox";
import {getDefaultTableStyleGetters} from "../../react-view/task-table-view";
import {ProjectView} from "../../react-view/project-view";
import {HStack, VStack} from "../../pure-react/view-template/h-stack";
import {centerChildren, centerChildrenVertStyle, diffGroupSpacing} from "../../pure-react/style-def";
import {Evt_ManagePageReRender} from "../../../typing/dataview-event";
import {
    filterCardStyle,
    filterInputStyle,
    tableContainerStyle,
    tableElementStyle,
} from "../../react-view/filter-card-styles";

export class ProjectInspectorModal extends Modal {
    root: Root | null = null;
    plugin: OdaPmToolPlugin;

    constructor(plugin: OdaPmToolPlugin) {
        super(plugin.app);
        this.plugin = plugin;
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.empty();
        // React
        this.root = createRoot(contentEl); // Override the previous container
        this.root.render(<ProjectInspectorView plugin={this.plugin}/>)
    }

    onClose() {
        this.root?.unmount();
        this.root = null;
    }
}

const {cellStyleGetter, headStyleGetter} = getDefaultTableStyleGetters(
    "unset", "unset",
    0, false
);

/** Project Inspector specific styles (extends shared filter styles) */
const projectTableContainerStyle: React.CSSProperties = {
    ...tableContainerStyle,
    maxHeight: "60vh",
    marginTop: "12px",
};
const projectSearchInputStyle: React.CSSProperties = {
    ...filterInputStyle,
    minWidth: 200,
};

export const ProjectInspectorView = (props: {
    plugin: OdaPmToolPlugin
}) => {
    const db = OdaPmDbProvider.get();
    const [searchText, setSearchText] = useState("");
    let projects = db?.pmProjects ?? [];
    const [completedProjects, setCompletedProjects] = usePluginSettings<string[]>("completed_project_names");
    projects = projects.filter(k => k.name.toLowerCase().includes(searchText?.toLowerCase() ?? ""));

    function handleSetCompletedProjects(names: string[]) {
        setCompletedProjects(names);
        setSettingsValueAndSave(props.plugin, "completed_project_names", [...names])
        db?.emit(Evt_ManagePageReRender);
    }

    const headers = [
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontWeight: 500 }}>Name</label>
            <input
                type="text"
                placeholder="Search Project..."
                value={searchText}
                style={projectSearchInputStyle}
                onChange={(event) => {
                    const text = event.target.value;
                    setSearchText(text);
                }}
            />
        </div>,
        "Completed",
    ];

    const rows = projects.map(k => [
        <ProjectView project={k}/>,
        <Checkbox initialState={completedProjects.includes(k.name)} onChange={(checked) => {
            if (checked) {
                handleSetCompletedProjects([...completedProjects, k.name]);
            } else {
                handleSetCompletedProjects(completedProjects.filter(m => k.name !== m));
            }
        }}/>
    ]);

    return (
        <VStack spacing={diffGroupSpacing}>
            <div>
                <h1 style={{ marginBottom: 8 }}>Project Inspector</h1>
                <div style={filterCardStyle}>
                    <div style={{ fontSize: "0.95em", lineHeight: 1.5 }}>
                        <div>If completed, the project will be hidden from the manage page.</div>
                        <div>Its workflows and tasks are also hidden.</div>
                    </div>
                </div>
            </div>

            <div style={projectTableContainerStyle}>
                <DataTable
                    tableTitle="Projects"
                    headers={headers}
                    rows={rows}
                    cellStyleGetter={cellStyleGetter}
                    thStyleGetter={headStyleGetter}
                    tableStyle={tableElementStyle}
                />
            </div>
        </VStack>
    );
}

