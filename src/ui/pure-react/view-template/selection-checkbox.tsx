import React from "react";

interface SelectionCheckboxProps {
    isSelected: boolean;
    onToggle: (e: React.MouseEvent) => void;
}

/**
 * Selection Checkbox Component
 * A visually prominent checkbox for row selection in data tables
 */
export function SelectionCheckbox({isSelected, onToggle}: SelectionCheckboxProps) {
    return (
        <td 
            style={{
                width: "40px",
                textAlign: "center",
                padding: "8px 4px",
                backgroundColor: isSelected ? "var(--background-modifier-active)" : "transparent",
                verticalAlign: "middle"
            }}
            onClick={(e) => {
                e.stopPropagation();
                onToggle(e);
            }}
        >
            <div style={{
                width: "20px",
                height: "20px",
                margin: "0 auto",
                border: `2px solid ${isSelected ? "var(--interactive-accent)" : "var(--background-modifier-border)"}`,
                borderRadius: "4px",
                backgroundColor: isSelected ? "var(--interactive-accent)" : "var(--background-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
                fontSize: "14px",
                fontWeight: "bold",
                color: isSelected ? "var(--text-on-accent)" : "transparent",
                boxShadow: isSelected ? "0 2px 4px rgba(0, 0, 0, 0.2)" : "none"
            }}
            onMouseEnter={(e) => {
                if (!isSelected) {
                    e.currentTarget.style.borderColor = "var(--interactive-accent)";
                    e.currentTarget.style.backgroundColor = "var(--background-modifier-hover)";
                }
            }}
            onMouseLeave={(e) => {
                if (!isSelected) {
                    e.currentTarget.style.borderColor = "var(--background-modifier-border)";
                    e.currentTarget.style.backgroundColor = "var(--background-primary)";
                }
            }}
            >
                {isSelected ? "✓" : ""}
            </div>
        </td>
    );
}
