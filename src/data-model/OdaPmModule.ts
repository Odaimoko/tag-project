import {OdaPmTask} from "./OdaPmTask";
import {INameable} from "../ui/pure-react/props-typing/i-nameable";
import {I_GetTaskSource, TaskSource} from "./TaskSource";

/**
 * @deprecated
 */
export const ModuleId_All = "###ALL###";
export const ModuleId_Unclassified = "###UNCLASSIFIED###";

/**
 * A module is a collection of tasks under headers with the same name.
 */
export class OdaPmModule implements INameable, I_GetTaskSource {
    // Built-in module will start with `#`.
    // User-defined module has the same name as the header.
    id: string;
    /**
     * The name of the module.
     */
    name: string;
    tasks: OdaPmTask[];

    constructor(id: string) {
        this.id = id;
        this.name = id;
        this.tasks = [];
    }

    /** 来源信息：优先自身 source，否则用任意一个 task 的 source 代理 */
    getSource(): TaskSource | null {
        if (this.tasks.length > 0) {
            return this.tasks[0].getSource();
        }
        return null;
    }

    toString() {
        return this.name;
    }
}
