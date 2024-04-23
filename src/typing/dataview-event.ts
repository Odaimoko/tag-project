export const DataviewMetadataChangeEvent = "dataview:metadata-change";
export const DataviewIndexReadyEvent = "dataview:index-ready";
export const DataviewAPIReadyEvent = "dataview:api-ready"
export type DataViewEvents =
    typeof DataviewMetadataChangeEvent
    | typeof DataviewIndexReadyEvent
    | typeof DataviewAPIReadyEvent;


export const Evt_JumpWorkflow = "tpm:jump-workflow";
export const Evt_JumpTask = "tpm:jump-task";
// Trigger database refresh
export const Evt_ReqDbReload = "tpm:db-req-reload";
export const Evt_DbReloaded = "tpm:db-reloaded";
export const Evt_SettingsChanged = "tpm:settings-changed";
export const Evt_ManagePageReRender = "tpm:manage-page-re-render";
