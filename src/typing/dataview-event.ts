export const DataviewMetadataChangeEvent = "dataview:metadata-change";
export const DataviewIndexReadyEvent = "dataview:index-ready";
export const DataviewAPIReadyEvent = "dataview:api-ready"
export type DataViewEvents =
    typeof DataviewMetadataChangeEvent
    | typeof DataviewIndexReadyEvent
    | typeof DataviewAPIReadyEvent;


export const iPm_JumpWorkflow = "iPm:jump-workflow";
export const iPm_JumpTask = "iPm:jump-task";
export const iPm_DbReloaded = "iPm:db-reloaded";