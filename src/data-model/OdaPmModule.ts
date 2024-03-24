import {OdaPmTask} from "./OdaPmTask";
import {I_Nameable} from "./I_Nameable";

/**
 * @deprecated
 */
export const ModuleId_All = "###ALL###";
export const ModuleId_Unclassified = "###UNCLASSIFIED###";

/**
 * A module is a collection of tasks under headers with the same name.
 */
export class OdaPmModule implements I_Nameable {
    // Built-in module will start with `#`.
    // User-defined module has the same name as the header.
    id: string;
    /**
     * The name of the module.
     */
    name: string;
    tasks: OdaPmTask[]

    constructor(id: string) {
        this.id = id;
        this.name = id;
        this.tasks = [];
    }

    toString() {
        return this.name;
    }
}
