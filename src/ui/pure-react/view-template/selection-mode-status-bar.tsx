import React from "react";

interface SelectionModeStatusBarProps {
    selectedCount: number;
    onExit: () => void;
}

/**
 * Selection Mode Status Bar Component
 * Displays the current selection mode status with selected count and instructions
 * Includes a button to manually exit selection mode
 */
export function SelectionModeStatusBar({selectedCount, onExit}: SelectionModeStatusBarProps) {
    return (
        <div style={{
            padding: "8px 12px",
            backgroundColor: "var(--background-modifier-active)",
            border: "1px solid var(--background-modifier-border)",
            borderRadius: "6px",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            marginBottom: "4px"
        }}>
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px"
            }}>
                <span style={{
                    fontWeight: "500",
                    color: "var(--text-normal)"
                }}>
                    Selection Mode
                </span>
                <span style={{
                    padding: "2px 8px",
                    backgroundColor: "var(--background-primary)",
                    borderRadius: "12px",
                    fontSize: "11px",
                    fontWeight: "600",
                    color: "var(--text-accent)"
                }}>
                    {selectedCount} selected
                </span>
            </div>
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px"
            }}>
                <span style={{
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    fontStyle: "italic"
                }}>
                    Press ESC to cancel
                </span>
                <button
                    onClick={onExit}
                    style={{
                        padding: "4px 10px",
                        fontSize: "11px",
                        backgroundColor: "var(--background-modifier-border)",
                        border: "1px solid var(--background-modifier-border)",
                        borderRadius: "4px",
                        cursor: "pointer",
                        color: "var(--text-normal)",
                        transition: "background-color 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--background-modifier-hover)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--background-modifier-border)";
                    }}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
