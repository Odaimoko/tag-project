import {I_OdaPmStep, Tag_Prefix_Step} from "./workflow-def";
import {I_GetTaskSource, TaskSource} from "./TaskSource";

class OdaPmStep implements I_OdaPmStep, I_GetTaskSource {
    tag: string;
    name: string;
    source?: TaskSource;

    constructor(tag: string) {
        this.tag = tag;
        this.name = tag.replace(Tag_Prefix_Step, "");
    }

    getSource(): TaskSource | null {
        return this.source ?? null;
    }

    toObject() {
        return {
            // tag: this.tag,
            name: this.name,
        }
    }
}

export const globalStepMap: Map<string, OdaPmStep> = new Map<string, OdaPmStep>();

/**
 * use global Pm Step library instead of creating new instances
 * @param tag
 */
export function getOrCreateStep(tag: string | undefined): OdaPmStep | null {
    if (!tag) return null;
    if (globalStepMap.has(tag)) {
        return <OdaPmStep>globalStepMap.get(tag);
    }
    const step = new OdaPmStep(tag);
    globalStepMap.set(tag, step);
    return step;
}
