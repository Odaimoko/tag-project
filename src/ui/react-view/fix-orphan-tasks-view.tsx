import {OdaPmDb} from "../../data-model/OdaPmDb";
import {HStack, VStack} from "../pure-react/view-template/h-stack";
import {HoveringPopup} from "../pure-react/view-template/hovering-popup";
import {TwiceConfirmButton} from "../pure-react/view-template/twice-confirm-button";
import {ObsidianIconView} from "./obsidian-icon-view";
import {getDefaultTableStyleGetters, OdaTaskSummaryCell} from "./task-table-view";
import {ProjectView} from "./project-view";
import {ClickableWorkflowView} from "./workflow-filter-view";
import {DataTable} from "../pure-react/view-template/data-table";
import React, {useState} from "react";
import {ProjectFilterName_All} from "./project-filter-view";
import {OdaPmTask} from "../../data-model/OdaPmTask";
import {miniGroupSpacing, warningColor} from "../pure-react/style-def";


function OrphanTasksFixPanel({orphanTasks}: { orphanTasks: OdaPmTask[] }) {
    // Task\n Workflow
    // Project\n Project
    const headers = ["Fix", "Task", "Workflow",];
    const rows = orphanTasks.map((task, i) => {
        const wfProject = task.type.getFirstProject();
        return [<HStack style={{alignItems: "center"}} spacing={2}>
            <HoveringPopup
                hoveredContent={<TwiceConfirmButton
                    onConfirm={() => {
                        task.assignToWorkflowProject();
                    }}
                    confirmView={"Fix"}
                    twiceConfirmView={<label>Confirm</label>}
                />}
                popupContent={<VStack style={{alignItems: "center"}} spacing={miniGroupSpacing}>
                    {`${task.getFirstProject()?.name}`}
                    <ObsidianIconView iconName={"chevron-down"} yOffset={false}/>
                    {`${wfProject?.name}`}
                </VStack>}
                title={<label style={{
                    whiteSpace: "nowrap",
                    color: warningColor
                }}>NOT Undoable: Move Task to Project</label>}
            />
            {/*<label style={{whiteSpace: "nowrap"}}>Move Task to Project</label>*/}
        </HStack>, <VStack spacing={2}>
            <OdaTaskSummaryCell key={`${task.boundTask.path}:${task.boundTask.line}`}
                                oTask={task}
                                taskFirstColumn={task.summary} showCheckBox={false} showWorkflowIcon={false}/>

            <ProjectView project={task.getFirstProject()}/>

        </VStack>, <VStack spacing={2}>
            <ClickableWorkflowView workflow={task.type} showCheckBox={false} showWorkflowIcon={false}/> <HStack
            style={{alignItems: "center"}} spacing={10}>
            {/*<button>Assign to</button>*/}
            <ProjectView project={wfProject}/>

        </HStack>
        </VStack>,]
    })
    const {cellStyleGetter, headStyleGetter} = getDefaultTableStyleGetters(
        "unset", "unset",
        0, false
    );
    return <div>
        <DataTable tableTitle={"Orphan Tasks"} headers={headers} rows={rows}
                   thStyleGetter={headStyleGetter}
                   cellStyleGetter={cellStyleGetter}
        />
    </div>
}

export function OrphanTaskButtonAndPanel(props: {
    orphanTasks: OdaPmTask[]
}) {
    const [panelShown, setPanelShown] = useState(false);
    return <div><HStack spacing={5} style={{alignItems: "center"}}>
        <HoveringPopup
            hoveredContent={<ObsidianIconView style={{color: "var(--text-warning)"}}
                                              iconName={"alert-circle"}/>}
            popupContent={
                <VStack>
                    <label style={{whiteSpace: "nowrap"}}>
                        An orphan task's project does not match its workflow's.
                    </label>
                    <label style={{whiteSpace: "nowrap"}}>
                        It will not show except in <b>{ProjectFilterName_All}</b>.
                    </label>
                </VStack>}
            title={"What is an Orphan Task?"}
        />

        <button onClick={() => setPanelShown(!panelShown)}>
            Fix {props.orphanTasks.length} orphan task(s) {
            panelShown ?
                <ObsidianIconView yOffset={false} iconName={"chevron-down"}/> :
                <ObsidianIconView yOffset={false} iconName={"chevron-right"}/>
        }
        </button>


    </HStack>

        {panelShown ? <OrphanTasksFixPanel orphanTasks={props.orphanTasks}/> : null}
    </div>;
}

export function FixOrphanTasksView({db}: { db?: OdaPmDb }) {
    const orphanTasks = db?.orphanTasks || [];
    if (orphanTasks.length === 0) return <></>;
    return <OrphanTaskButtonAndPanel orphanTasks={orphanTasks}/>
}
