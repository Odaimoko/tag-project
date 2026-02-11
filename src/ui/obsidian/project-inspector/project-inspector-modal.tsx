import {Modal} from "obsidian";
import {createRoot, Root} from "react-dom/client";
import OdaPmToolPlugin from "../../../main";
import React, {useCallback, useMemo, useState} from "react";
import {OdaPmDbProvider} from "../../../data-model/OdaPmDb";
import {DataTable} from "../../pure-react/view-template/data-table";
import {usePluginSettings} from "../../../settings/settings";
import {ExternalControlledCheckbox} from "../../pure-react/view-template/checkbox";
import {getDefaultTableStyleGetters} from "../../react-view/task-table-view";
import {ProjectView} from "../../react-view/project-view";
import {HStack, VStack} from "../../pure-react/view-template/h-stack";
import {centerChildren, centerChildrenVertStyle, diffGroupSpacing} from "../../pure-react/style-def";
import {Evt_ManagePageReRender} from "../../../typing/dataview-event";
import {ClickableObsidianIconView} from "../../react-view/obsidian-icon-view";
import {PluginContext} from "../manage-page-view";

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
        this.root.render(
            <PluginContext.Provider value={this.plugin}>
                <ProjectInspectorView plugin={this.plugin}/>
            </PluginContext.Provider>
        )
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
    const allProjects = db?.pmProjects ?? [];
    const [completedProjects, setCompletedProjects] = usePluginSettings<string[]>("completed_project_names");
    
    // Filter projects based on search text
    const projects = useMemo(() => {
        return allProjects.filter(k => k.name.toLowerCase().includes(searchText?.toLowerCase() ?? ""));
    }, [allProjects, searchText]);

    const handleToggleCompleted = useCallback(async (projectName: string) => {
        const newCompletedProjects = completedProjects.includes(projectName)
            ? completedProjects.filter(m => m !== projectName)
            : [...completedProjects, projectName];
        
        // setCompletedProjects from usePluginSettings already handles saving and emitting events
        await setCompletedProjects(newCompletedProjects);
        db?.emit(Evt_ManagePageReRender);
    }, [completedProjects, setCompletedProjects, db]);

    const headers = [
        <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "600"
        }}>
            Project Name
        </div>,
        <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "600"
        }}>
            Completed
        </div>
    ];

    // Use useMemo to ensure rows are recreated when completedProjects changes
    const rows = useMemo(() => {
        return projects.map(k => [
            <ProjectView key={`project-${k.name}`} project={k}/>,
            <div key={`checkbox-${k.name}`} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
            }}>
                <ExternalControlledCheckbox 
                    externalControl={completedProjects.includes(k.name)} 
                    onChange={() => handleToggleCompleted(k.name)}
                />
            </div>
        ]);
    }, [projects, completedProjects, handleToggleCompleted]);

    return (
        <VStack spacing={diffGroupSpacing} style={{
            padding: "20px",
            maxHeight: "80vh",
            overflow: "auto"
        }}>
            {/* Header Section */}
            <VStack spacing={8}>
                <h1 style={{
                    margin: "0 0 8px 0",
                    fontSize: "24px",
                    fontWeight: "600",
                    color: "var(--text-normal)"
                }}>
                    Project Inspector
                </h1>
                <div style={{
                    padding: "12px 16px",
                    backgroundColor: "var(--background-modifier-hover)",
                    border: "1px solid var(--background-modifier-border)",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "var(--text-muted)",
                    lineHeight: "1.5"
                }}>
                    <div style={{ marginBottom: "4px" }}>
                        <strong style={{ color: "var(--text-normal)" }}>Note:</strong> If a project is marked as completed, it will be hidden from the manage page.
                    </div>
                    <div>
                        Its workflows and tasks will also be hidden.
                    </div>
                </div>
            </VStack>

            {/* Search Section */}
            <HStack style={{
                justifyContent: "flex-start",
                alignItems: "center"
            }} spacing={10}>
                <span style={{
                    display: "flex",
                    alignItems: "center",
                    flex: "1",
                    maxWidth: "400px"
                }}>
                    <input
                        style={{
                            width: "100%",
                            padding: "8px 12px",
                            fontSize: "13px",
                            border: "1px solid var(--background-modifier-border)",
                            borderRadius: "4px",
                            backgroundColor: "var(--background-primary)",
                            color: "var(--text-normal)",
                            outline: "none",
                            transition: "border-color 0.2s ease"
                        }}
                        type="text"
                        value={searchText}
                        placeholder="Search project name..."
                        onChange={(event) => {
                            const text = event.target.value;
                            setSearchText(text);
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = "var(--interactive-accent)";
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = "var(--background-modifier-border)";
                        }}
                    />
                    {searchText && (
                        <ClickableObsidianIconView 
                            style={{
                                marginLeft: "-25px",
                                paddingTop: "5px",
                                cursor: "pointer"
                            }}
                            onIconClicked={() => {
                                setSearchText("");
                            }} 
                            iconName={"x-circle"}
                        />
                    )}
                </span>
                <div style={{
                    fontSize: "13px",
                    color: "var(--text-muted)",
                    padding: "4px 8px"
                }}>
                    {projects.length} project{projects.length !== 1 ? 's' : ''} found
                </div>
            </HStack>

            {/* Table Section */}
            {projects.length > 0 ? (
                <DataTable 
                    tableTitle={"Projects"}
                    headers={headers}
                    rows={rows}
                    cellStyleGetter={cellStyleGetter}
                    thStyleGetter={headStyleGetter}
                />
            ) : (
                <div style={{
                    padding: "40px 20px",
                    textAlign: "center",
                    color: "var(--text-muted)",
                    fontSize: "14px"
                }}>
                    {searchText ? "No projects found matching your search." : "No projects available."}
                </div>
            )}
        </VStack>
    );
}

