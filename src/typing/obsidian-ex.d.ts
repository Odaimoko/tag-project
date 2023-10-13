import "obsidian";
import {DataViewEvents} from "./dataview-event";

// https://github.com/blacksmithgu/obsidian-dataview/blob/7640f7394e1e5e6ad8ddc4aef611497b3969624b/src/typings/obsidian-ex.d.ts#L5
declare module "obsidian" {
    interface MetadataCache {
        on(name: DataViewEvents, callback: () => void, ctx?: any): EventRef;
    }

    interface App {
        appId?: string;
        plugins: {
            enabledPlugins: Set<string>;
        };
    }
}