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

export class OdaPmStep {
    tag: string;
    name: string;


    constructor(tag: string) {
        this.tag = tag;
        this.name = tag.replace("#iPm/step/", "");
    }

    toObject() {
        return {
            tag: this.tag,
            name: this.name,
        }
    }
}

interface I_OdaPmWorkflowType {

    type: WorkflowType;
    steps: OdaPmStep[];
    name: string;
}

export class OdaPmWorkflowType implements I_OdaPmWorkflowType {

    name: string;
    steps: OdaPmStep[];
    type: WorkflowType;

    constructor(type: WorkflowType, name: string) {

        this.type = type;
        this.steps = [];
        this.name = name;
    }

    addStep(tag: string) {
        this.steps.push(new OdaPmStep(tag));
    }

    // dataview won't render class. so we need to convert to object
    toObject() {
        return {
            type: this.type,
            steps: this.steps.map(k => k.toObject()),
            name: this.name,
        }
    }
}