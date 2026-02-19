import {OdaPmProject, OdaPmProjectDefinition} from "../../data-model/OdaPmProject";
import React, {MouseEvent, useContext} from "react";
import {PluginContext} from "../obsidian/manage-page-view";
import {ClickableObsidianIconView, InternalLinkView, LinkRowWithHover, ObsidianIconView} from "./obsidian-icon-view";
import {iconViewAsAWholeStyle} from "../pure-react/style-def";
import {openProjectPrecisely} from "../../utils/io-util";
import {VStack} from "../pure-react/view-template/h-stack";
import {HoveringPopup, usePopup} from "../pure-react/view-template/hovering-popup";
import {getForceNewTabOnClick} from "../../settings/settings";

const DEFINED_AT_TITLE_ICON = "map-pin";
const definedAtTitleStyle: React.CSSProperties = {
    whiteSpace: "nowrap",
    fontSize: "0.85em",
    fontWeight: 600,
    color: "var(--text-muted)",
    letterSpacing: "0.02em",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
};

const definedAtListStyle: React.CSSProperties = {
    paddingTop: 2,
};

export const IconName_Project = "folder";

function ProjectLinkView(props: {
    project: OdaPmProject,
    def: OdaPmProjectDefinition
}) {
    const plugin = useContext(PluginContext);
    return (
        <LinkRowWithHover>
            <InternalLinkView
                style={iconViewAsAWholeStyle}
                onIconClicked={openProject}
                onContentClicked={openProject}
                content={<label style={{ whiteSpace: "nowrap" }}>{props.def.getLinkText()}</label>}
            />
        </LinkRowWithHover>
    );

    function openProject(e: MouseEvent) {
        const forceNewTab = getForceNewTabOnClick(plugin, e);
        openProjectPrecisely(props.project, props.def, plugin.app.workspace, forceNewTab);
    }
}

export function ProjectView(props: {
    project: OdaPmProject | null,
    style?: React.CSSProperties
}) {
    if (props.project === null) return <></>;
    const project = props.project;
    const popupProps = usePopup("none");

    function toggleDropdown() {
        // toggleDropDown(setDropDownDisplay)
    }

    const showableDefinitions = project.projectDefinitions.filter(k => k.type !== "system");
    const projectContent = <label>{project.name}</label>;
    const hoveredContent = <ClickableObsidianIconView onContentClicked={toggleDropdown} onIconClicked={toggleDropdown}
                                                      iconName={IconName_Project}
                                                      content={projectContent}
                                                      clickable={showableDefinitions.length > 0}/>;
    const definedAtTitle = (
        <span style={definedAtTitleStyle}>
            <ObsidianIconView iconName={DEFINED_AT_TITLE_ICON} yOffset={false}/>
            Defined At
        </span>
    );

    const popupContent = showableDefinitions.length > 0 ?
        <div style={definedAtListStyle}>
            <VStack spacing={4}>
                {showableDefinitions.map((def, i) => (
                    <ProjectLinkView key={i} project={project} def={def}/>
                ))}
            </VStack>
        </div>
        : null;

    return <HoveringPopup {...popupProps} title={definedAtTitle}
                          hoveredContent={hoveredContent} popupContent={popupContent}/>

}
