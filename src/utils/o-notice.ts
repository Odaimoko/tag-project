import {Notice} from "obsidian";
import {PLUGIN_NAME} from "../main";

export class ONotice extends Notice {
    /**
     *
     * @param message
     * @param duration seconds
     */
    constructor(message: string | DocumentFragment, duration = 5) {
        const durInSec = duration ? duration * 1000 : duration;
        if (typeof message === "string")
            super(`[${PLUGIN_NAME}] ${message}`, durInSec);
        else {
            const doc = message as DocumentFragment;
            doc.prepend(`[${PLUGIN_NAME}] `);
            super(message, durInSec);
        }
    }
}

export function notify(message: string | DocumentFragment, duration?: number) {
    new ONotice(message, duration);
}
