import React, {useEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {VStack} from "./h-stack";

/**
 * Context Menu Item Interface
 * Represents a single menu item in the context menu
 */
export interface ContextMenuItem {
    label: string;
    onClick: () => void;
}

/**
 * Context Menu Props Interface
 * @param items - Array of menu items to display
 * @param x - X coordinate in viewport (from event.clientX)
 * @param y - Y coordinate in viewport (from event.clientY)
 * @param onClose - Callback when menu should be closed
 */
interface ContextMenuProps {
    items: ContextMenuItem[];
    x: number; // Viewport X coordinate (clientX)
    y: number; // Viewport Y coordinate (clientY)
    onClose: () => void;
}

/**
 * Context Menu Component
 * 
 * CSS Positioning Knowledge:
 * - position: fixed - Positions element relative to the VIEWPORT (browser window)
 *   - Not affected by scrolling
 *   - Not affected by parent element's position
 *   - However, if any ancestor has transform, perspective, or filter CSS properties,
 *     fixed positioning becomes relative to that ancestor instead of viewport!
 *   - This is why we use React Portal to render directly to document.body
 * 
 * - position: absolute - Positions element relative to nearest positioned ancestor
 *   - Would be affected by parent container's position/transform
 * 
 * - position: relative - Positions element relative to its normal position
 * 
 * Coordinate Systems:
 * - event.clientX/Y - Coordinates relative to VIEWPORT (top-left of visible area)
 * - event.pageX/Y - Coordinates relative to DOCUMENT (includes scroll offset)
 * - event.offsetX/Y - Coordinates relative to TARGET ELEMENT
 * 
 * We use clientX/Y because we want viewport-relative positioning with fixed.
 */
export function ContextMenu({items, x, y, onClose}: ContextMenuProps) {
    // Ref to access the menu DOM element for measuring and positioning
    const menuRef = useRef<HTMLDivElement>(null);
    
    // State to store the adjusted position (may differ from x, y if menu needs to be repositioned)
    const [position, setPosition] = useState({x, y});
    
    // Flag to prevent multiple position adjustments (performance optimization)
    const isAdjustedRef = useRef(false);

    /**
     * Reset adjustment flag and update position when props change
     * This happens when a new context menu is opened (new x, y coordinates)
     */
    useEffect(() => {
        setPosition({x, y});
        isAdjustedRef.current = false; // Reset flag for new menu
    }, [x, y]);

    /**
     * Adjust position after menu is rendered to ensure it stays within viewport
     * 
     * Why we need this:
     * - The menu might be too large to fit at the click position
     * - We want to keep a margin from viewport edges for better UX
     * - We need to measure the actual menu size (getBoundingClientRect) before adjusting
     * 
     * getBoundingClientRect() returns:
     * - A DOMRect object with position and size relative to VIEWPORT
     * - left, top: position relative to viewport
     * - width, height: actual rendered dimensions
     * - This is why we use it - it gives viewport-relative measurements
     * 
     * requestAnimationFrame timing:
     * - Browser batches DOM updates and renders them before next frame
     * - First RAF: ensures React has updated the DOM
     * - Second RAF: ensures browser has rendered and we can measure accurately
     * - This is necessary because React updates are asynchronous
     */
    useEffect(() => {
        if (!menuRef.current || isAdjustedRef.current) return;

        const adjustPosition = () => {
            const menu = menuRef.current;
            if (!menu || isAdjustedRef.current) return;

            // Get the menu's position and dimensions relative to viewport
            // This is crucial - getBoundingClientRect() returns viewport coordinates
            const rect = menu.getBoundingClientRect();
            
            // Only adjust if menu has valid dimensions
            // If width/height is 0, menu hasn't rendered yet, retry
            if (rect.width === 0 || rect.height === 0) {
                // Retry if menu not yet rendered (async rendering)
                requestAnimationFrame(adjustPosition);
                return;
            }

            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const margin = 10; // Minimum distance from viewport edges

            // Start with the original clientX/Y coordinates (viewport-relative)
            let newX = x;
            let newY = y;

            // Adjust horizontal position if menu would overflow right edge
            // Check: click position + menu width > viewport width - margin
            if (x + rect.width > viewportWidth - margin) {
                // Move menu left so it fits: viewport width - menu width - margin
                newX = viewportWidth - rect.width - margin;
            }
            // Adjust horizontal position if menu would overflow left edge
            // This can happen if the above adjustment moved it too far left
            if (newX < margin) {
                newX = margin; // Keep margin from left edge
            }

            // Adjust vertical position if menu would overflow bottom edge
            // Check: click position + menu height > viewport height - margin
            if (y + rect.height > viewportHeight - margin) {
                // Move menu up so it fits: viewport height - menu height - margin
                newY = viewportHeight - rect.height - margin;
            }
            // Adjust vertical position if menu would overflow top edge
            if (newY < margin) {
                newY = margin; // Keep margin from top edge
            }

            // Only update state if position actually changed (avoid unnecessary re-renders)
            if (newX !== x || newY !== y) {
                setPosition({x: newX, y: newY});
            }
            isAdjustedRef.current = true; // Mark as adjusted to prevent re-adjustment
        };

        /**
         * Double requestAnimationFrame pattern:
         * - First RAF: React has updated DOM, but browser hasn't rendered yet
         * - Second RAF: Browser has rendered, getBoundingClientRect() will return accurate values
         * - This ensures we measure the menu AFTER it's fully rendered
         */
        requestAnimationFrame(() => {
            requestAnimationFrame(adjustPosition);
        });
    }, [x, y]);

    /**
     * Handle click outside and Escape key to close menu
     * 
     * Event Listener Notes:
     * - We attach listeners to document, not the menu itself
     * - This allows us to detect clicks anywhere on the page
     * - contains() checks if the click target is inside the menu
     * - If click is outside, we close the menu
     * 
     * Event Bubbling:
     * - Events bubble up from target to document
     * - We check event.target to see where the click originated
     * - stopPropagation() in menu prevents clicks inside from bubbling up
     */
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Check if click target is outside the menu
            // contains() returns true if the node is a descendant of menuRef.current
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        // Attach listeners to document to catch all clicks/keypresses
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);

        // Cleanup: remove listeners when component unmounts or onClose changes
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [onClose]);

    /**
     * Menu Content JSX
     * 
     * CSS Properties Explained:
     * - position: "fixed" - Position relative to VIEWPORT (not document or parent)
     *   - left/top are viewport coordinates
     *   - Menu stays in same position when scrolling
     *   - Only works correctly when rendered to document.body (via Portal)
     * 
     * - zIndex: 10000 - Ensures menu appears above other content
     *   - Higher z-index = appears on top
     *   - Only works within same stacking context
     *   - Portal to body ensures we're in root stacking context
     * 
     * - boxShadow - Creates depth/3D effect
     *   - "0 2px 8px rgba(0, 0, 0, 0.15)" = x-offset y-offset blur color
     *   - Makes menu appear to float above content
     * 
     * - borderRadius - Rounds corners for modern look
     * 
     * - stopPropagation() - Prevents click events from bubbling up
     *   - Without this, clicking menu items would also trigger handleClickOutside
     *   - This is why we check contains() in handleClickOutside
     */
    const menuContent = (
        <div
            ref={menuRef}
            style={{
                position: "fixed", // Viewport-relative positioning
                left: `${position.x}px`, // X coordinate from viewport left edge
                top: `${position.y}px`, // Y coordinate from viewport top edge
                backgroundColor: "var(--background-primary)", // Obsidian theme variable
                border: "1px solid var(--background-modifier-border)", // Obsidian theme variable
                borderRadius: "4px", // Rounded corners
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)", // Shadow for depth: x-offset y-offset blur color
                zIndex: 10000, // High z-index to appear above other content
                minWidth: "200px", // Minimum width for consistent appearance
                padding: "4px 0", // Vertical padding (top/bottom), no horizontal padding
            }}
            onClick={(e) => e.stopPropagation()} // Prevent clicks inside menu from bubbling to document
        >
            <VStack spacing={0}>
                {items.map((item, index) => (
                    <div
                        key={index}
                        onClick={(e) => {
                            e.stopPropagation();
                            item.onClick();
                            onClose();
                        }}
                        style={{
                            padding: "8px 16px", // Vertical 8px, horizontal 16px
                            cursor: "pointer", // Shows hand cursor on hover (indicates clickable)
                            userSelect: "none", // Prevents text selection when clicking
                        }}
                        onMouseEnter={(e) => {
                            // Hover effect: change background color
                            // Using inline style for dynamic updates
                            e.currentTarget.style.backgroundColor = "var(--background-modifier-hover)";
                        }}
                        onMouseLeave={(e) => {
                            // Remove hover effect when mouse leaves
                            e.currentTarget.style.backgroundColor = "transparent";
                        }}
                    >
                        {item.label}
                    </div>
                ))}
            </VStack>
        </div>
    );

    /**
     * React Portal - Critical for correct positioning!
     * 
     * Why use Portal?
     * - React Portal renders children into a different DOM node than parent
     * - We render to document.body instead of the component's parent
     * 
     * The Problem Portal Solves:
     * - CSS position: fixed is supposed to be relative to viewport
     * - BUT if any ancestor has transform, perspective, or filter CSS properties,
     *   fixed positioning becomes relative to that ancestor instead!
     * - This causes incorrect positioning/offsets
     * 
     * The Solution:
     * - Render directly to document.body via Portal
     * - document.body typically has no transform/filter CSS
     * - This ensures fixed positioning works relative to viewport
     * - Menu appears exactly where clientX/Y coordinates indicate
     * 
     * Portal Benefits:
     * - Fixed positioning works correctly
     * - Menu appears above all other content (z-index works correctly)
     * - No CSS inheritance issues from parent containers
     * - Event handling still works (React handles this automatically)
     * 
     * Note: Portal doesn't break React component tree - props/context still work!
     */
    return createPortal(menuContent, document.body);
}
