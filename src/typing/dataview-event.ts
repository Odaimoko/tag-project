export const DataviewMetadataChangeEvent = "dataview:metadata-change";
export const DataviewIndexReadyEvent = "dataview:index-ready";
export const DataviewAPIReadyEvent = "dataview:api-ready"
export type DataViewEvents =
    typeof DataviewMetadataChangeEvent
    | typeof DataviewIndexReadyEvent
    | typeof DataviewAPIReadyEvent;