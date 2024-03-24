import {OdaPmTask} from "./OdaPmTask";

export const UNCLASSIFIED_MODULE_ID = "#UNCLASSIFIED#";

/**
 * A module is a collection of tasks under headers with the same name.
 */
export class OdaPmModule {
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
