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
import {HStack} from "../../pure-react/view-template/h-stack";
import {centerChildren, centerChildrenVertStyle} from "../../pure-react/style-def";
import {Evt_ManagePageReRender} from "../../../typing/dataview-event";

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
        <div>
            <HStack style={{
                ...centerChildrenVertStyle, ...centerChildren
            }} spacing={3}>
                <label>Name</label>
                <input
                    type="text" placeholder={"Search Project"}
                    value={searchText}
                    onChange={(event) => {
                        const text = event.target.value;
                        setSearchText(text);
                    }}
                />
            </HStack>
        </div>
        , "Completed",];

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

    return <div>
        <h1>Project Inspector</h1>
        <div>
            <label>
                If completed, the project will be hidden from the manage page.
            </label>
            <label>
                Its workflows and tasks are also hidden.
            </label>
        </div>

        <DataTable tableTitle={"PP"}
                   headers={headers}
                   rows={rows}
                   cellStyleGetter={cellStyleGetter}
                   thStyleGetter={headStyleGetter}/>
    </div>
}

