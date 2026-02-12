import React, { MouseEvent, useState } from "react";
import {
    getExpandCollapseChevronStyle,
    getExpandCollapseContentStyle,
    getExpandCollapseSummaryStyle,
} from "../pure-react/style-def";
import { ObsidianIconView } from "./obsidian-icon-view";

/** Shared styles for filter cards (Workflow, Module, etc.) */
export const filterCardStyle: React.CSSProperties = {
    padding: "12px 14px",
    marginBottom: 12,
    backgroundColor: "var(--background-secondary)",
    border: "1px solid var(--background-modifier-border)",
    borderRadius: "8px",
};

export const filterButtonStyle: React.CSSProperties = {
    padding: "4px 10px",
    fontSize: "0.9em",
    border: "1px solid var(--background-modifier-border)",
    borderRadius: "6px",
    backgroundColor: "var(--background-modifier-border)",
    color: "var(--text-normal)",
    cursor: "pointer",
};

/** Shared input style for search boxes in filters, project inspector, etc. */
export const filterInputStyle: React.CSSProperties = {
    padding: "6px 10px",
    borderRadius: 6,
    border: "1px solid var(--background-modifier-border)",
    backgroundColor: "var(--background-primary)",
    fontSize: "0.9em",
};

/** Shared table container style (rounded border, scroll area) */
export const tableContainerStyle: React.CSSProperties = {
    border: "1px solid var(--background-modifier-border)",
    borderRadius: "10px",
    backgroundColor: "var(--background-primary)",
    overflow: "auto",
};

/** Shared table element base style */
export const tableElementStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
};

export const filterTogglesRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 10,
    padding: "8px 10px",
    backgroundColor: "var(--background-modifier-hover)",
    borderRadius: "6px",
    gap: 16,
};

export const filterSelectedListContainerStyle: React.CSSProperties = {
    marginTop: 8,
    paddingTop: 8,
    borderTop: "1px solid var(--background-modifier-border)",
    overflow: "hidden",
};

export const filterSelectedListStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "6px 12px",
};

export const filterSummaryTextStyle: React.CSSProperties = {
    color: "var(--text-muted)",
    fontSize: "0.95em",
};

export const chipWrapStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 8px 2px 4px",
    backgroundColor: "var(--background-modifier-hover)",
    border: "1px solid var(--background-modifier-border)",
    borderRadius: "6px",
};

export const chipRemoveIconStyle: React.CSSProperties = {
    marginLeft: 4,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    color: "var(--text-muted)",
};

export const FILTER_EXPAND_THRESHOLD = 4;

const contentWrapperStyle = (expanded: boolean) =>
    getExpandCollapseContentStyle(expanded, "1000px");
const summaryWrapperStyle = (expanded: boolean) =>
    getExpandCollapseSummaryStyle(expanded, "50px");

/**
 * Reusable list of selected chips with remove (x) button.
 * Supports expand/collapse when selected count exceeds threshold.
 * When expandThreshold is exceeded, pass expanded + onExpandToggle to control from parent (e.g. heading click).
 */
export function SelectableChipList<T>(props: {
    items: T[];
    selectedKeys: string[];
    onSelectionChange: (keys: string[]) => void;
    getKey: (item: T) => string;
    renderChipContent: (item: T) => React.ReactNode;
    getTooltip?: (item: T) => string | undefined;
    typeName?: string;
    expandThreshold?: number;
    /** When provided, expand/collapse is controlled by parent (e.g. filter heading click). */
    expanded?: boolean;
}) {
    const {
        items,
        selectedKeys,
        onSelectionChange,
        getKey,
        renderChipContent,
        getTooltip,
        typeName = "Item",
        expandThreshold = FILTER_EXPAND_THRESHOLD,
        expanded: controlledExpanded,
    } = props;

    const selectedItems = items.filter((item) => selectedKeys.includes(getKey(item)));
    const selectedCount = selectedItems.length;
    const useExpandToggle = items.length > expandThreshold;
    const [internalExpanded, setInternalExpanded] = useState(false);
    const expanded =
        useExpandToggle && controlledExpanded !== undefined
            ? controlledExpanded
            : internalExpanded;

    if (selectedCount === 0) return null;

    const listContent = (
        <div style={filterSelectedListStyle}>
            {selectedItems.map((item) => {
                const key = getKey(item);
                const removeFromSelection = (e: MouseEvent) => {
                    e.stopPropagation();
                    onSelectionChange(selectedKeys.filter((k) => k !== key));
                };
                return (
                    <span
                        key={key}
                        style={chipWrapStyle}
                        title={getTooltip?.(item)}
                    >
                        {renderChipContent(item)}
                        <span
                            style={chipRemoveIconStyle}
                            onClick={removeFromSelection}
                            role="button"
                            aria-label={`Remove ${key} from selection`}
                        >
                            <ObsidianIconView iconName="x" yOffset={false} />
                        </span>
                    </span>
                );
            })}
        </div>
    );

    return (
        <div style={filterSelectedListContainerStyle}>
            {useExpandToggle && (
                <div style={summaryWrapperStyle(expanded)}>
                    <div style={filterSummaryTextStyle}>
                        {selectedCount} {typeName}{selectedCount !== 1 ? "s" : ""}
                    </div>
                </div>
            )}
            <div
                style={
                    useExpandToggle
                        ? contentWrapperStyle(expanded)
                        : contentWrapperStyle(true)
                }
            >
                {listContent}
            </div>
        </div>
    );
}

/**
 * Props for filter card header row with optional expand chevron.
 * Used by WorkflowFilterView and ModuleFilter to get consistent title addon.
 */
export function FilterExpandChevron(props: { expanded: boolean }) {
    return (
        <span style={getExpandCollapseChevronStyle(props.expanded)}>
            <ObsidianIconView yOffset={false} iconName="chevron-right" />
        </span>
    );
}

export { getExpandCollapseContentStyle, getExpandCollapseSummaryStyle };
