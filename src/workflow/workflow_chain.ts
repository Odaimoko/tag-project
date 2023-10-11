export const Workflow_Type_Enum_Array = [
    "chain",
    "checkbox",
] as const;
export type WorkflowType = typeof Workflow_Type_Enum_Array[number];

const Type_Definition_Tags: string[] = []

function initDefTags() {
    if (Type_Definition_Tags.length == 0) {
        for (const workflow of Workflow_Type_Enum_Array) {
            Type_Definition_Tags.push("#iPm/workflow/" + workflow)
        }
    }
}

export function getDefTags(): string[] {
    initDefTags();
    return Type_Definition_Tags;
}

export function getTypeDefTag(type: WorkflowType): string {
    initDefTags();
    return Type_Definition_Tags[Workflow_Type_Enum_Array.indexOf(type)];
}


type Step = string;

export interface OdaPmWorkflow {
    type: WorkflowType;
    steps: Step[];
    name: string;

}