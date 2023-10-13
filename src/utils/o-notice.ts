import {Notice} from "obsidian";
import {PLUGIN_NAME} from "../main";

export class ONotice extends Notice {
    constructor(message: string) {
        super(`[${PLUGIN_NAME}] ${message}`);
    }
}