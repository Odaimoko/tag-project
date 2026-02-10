import {IRenderable} from "../props-typing/i-renderable";
import React, {useEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {HStack, VStack} from "./h-stack";
import {ClickableObsidianIconView} from "../../react-view/obsidian-icon-view";
import {centerChildren, diffGroupSpacing, sameGroupSpacing} from "../style-def";
import {OptionValueType, SearchableDropdown} from "./searchable-dropdown";
import {devLog} from "../../../utils/env-util";
import {SelectionCheckbox} from "./selection-checkbox";
import {SelectionModeStatusBar} from "./selection-mode-status-bar";
import {useSelectionMode} from "./use-selection-mode";

interface DataTableParams {
    tableTitle: string;
    headers: IRenderable[];
    rows: IRenderable[][];
    onHeaderClicked?: (arg0: number) => void;
    tableStyle?: React.CSSProperties;
    thStyle?: React.CSSProperties;
    thStyleGetter?: (column: number) => React.CSSProperties;
    cellStyle?: React.CSSProperties;
    cellStyleGetter?: (column: number, row: number) => React.CSSProperties;
    rowRange?: [number, number]; // [begin, end], if end is -1, means the end is the last row
    onRowContextMenu?: (rowIndex: number, event: React.MouseEvent) => void;
    rowData?: any[]; // Additional data for each row (e.g., task objects)
    // Selection mode props
    enableSelectionMode?: boolean; // Enable selection mode feature
    selectionMode?: boolean; // External control of selection mode (controlled component)
    onSelectionChange?: (selectedRowIndices: number[]) => void; // Callback when selection changes
    onSelectionModeChange?: (isSelectionMode: boolean) => void; // Callback when selection mode changes
}

/**
 *
 * @param tableTitle
 * @param headers
 * @param rows
 * @param onHeaderClicked
 * @param tableStyle
 * @param thStyle
 * @param cellStyle
 * @param cellStyleGetter override cellStyle. give more complicated style for table values.
 * @constructor
 */
    // We cannot interact in Dataview Table, so we create our own.
export const DataTable = ({
                              tableTitle,
                              headers, rows,
                              onHeaderClicked,
                              tableStyle,
                              thStyle,
                              thStyleGetter,
                              cellStyle,
                              cellStyleGetter,
                              rowRange,
                              onRowContextMenu,
                              rowData,
                              enableSelectionMode = false,
                              selectionMode: externalSelectionMode,
                              onSelectionChange,
                              onSelectionModeChange
                          }: DataTableParams) => {
        const tableRef = useRef<HTMLTableElement>(null);

        // Use selection mode hook for state management
        const {
            isSelectionMode,
            setIsSelectionMode,
            selectedRows,
            toggleRowSelection
        } = useSelectionMode({
            enableSelectionMode,
            externalSelectionMode,
            onSelectionChange,
            onSelectionModeChange
        });

        const start = rowRange?.[0] ?? 0;
        const end = Math.min(rowRange?.[1] ?? rows.length, rows.length);
        const displayedRows = rows.slice(start, end);
        const displayedRowData = rowData ? rowData.slice(start, end) : undefined;

        // Handle row click for selection
        const handleRowClick = (actualRowIndex: number, event: React.MouseEvent) => {
            if (!enableSelectionMode || !isSelectionMode) return;

            event.preventDefault();
            event.stopPropagation();
            toggleRowSelection(actualRowIndex);
        };

        return (
            <div style={{position: "relative"}}>
                <table ref={tableRef} style={tableStyle} key={tableTitle}>
                    <tbody>
                    {displayedRows.map((items: IRenderable[], rowIdx) => {
                        const actualRowIndex = start + rowIdx;
                        const isSelected = isSelectionMode && selectedRows.has(actualRowIndex);
                        return (
                            <tr
                                key={rowIdx}
                                onClick={(e) => handleRowClick(actualRowIndex, e)}
                                onContextMenu={(e) => {
                                    if (!isSelectionMode) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onRowContextMenu?.(actualRowIndex, e);
                                    }
                                }}
                                style={{
                                    cursor: isSelectionMode ? "pointer" : "default",
                                    backgroundColor: isSelected ? "var(--background-modifier-active)" : "transparent",
                                    userSelect: "none"
                                }}
                            >
                                {isSelectionMode && (
                                    <SelectionCheckbox
                                        isSelected={isSelected}
                                        onToggle={(e) => handleRowClick(actualRowIndex, e as any)}
                                    />
                                )}
                                {items.map(
                                    function (k: IRenderable, columnIdx) {
                                        const key = `${tableTitle}_${rowIdx}_${columnIdx}`;
                                        const cStyle = cellStyleGetter ?
                                            cellStyleGetter(columnIdx, actualRowIndex) :
                                            cellStyle;
                                        return <td style={cStyle} key={key}>{k}</td>;
                                    })}
                            </tr>
                        );
                    })}
                    </tbody>
                    {/*Draw header at the end, so it can cover body view. Or else the body content will be rendered above headers. */}
                    <thead>
                    <tr>
                        {isSelectionMode && <th style={{width: "40px", padding: "8px 4px"}}></th>}
                        {headers.map((header: IRenderable, index) => {
                            const headerStyle = thStyleGetter ? thStyleGetter(index) : thStyle;
                            return <th style={headerStyle} key={index}>
                                <div onClick={() => {
                                    onHeaderClicked?.(index)
                                }}>{header}</div>
                            </th>;
                        })}
                    </tr>
                    </thead>
                </table>
            </div>
        );
    }

interface SetTableDataCountPerPageParams {
    dataCountPerPage: number,
    setDataCountPerPage: (count: number) => void,
    onExitSelectionMode?: () => void; // Callback to exit selection mode when task per page is changed
}

export const PaginatedDataTable = (props: Omit<DataTableParams, "rowRange"> & SetTableDataCountPerPageParams & {
    maxPageButtonCount: number
}) => {
    const totalPageCount = Math.ceil(props.rows.length / props.dataCountPerPage);
    const [curPage, setCurPage] = useState(0);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedCount, setSelectedCount] = useState(0);
    const rowRange: [number, number] = [curPage * props.dataCountPerPage, (curPage + 1) * props.dataCountPerPage];
    
    useEffect(() => {
        const clamped = Math.clamp(curPage, 0, totalPageCount - 1);
        setCurPage(clamped) // When tasks change, the current page should change to the first.
    }, [props.rows]);

    // Handle selection mode change from DataTable
    const handleSelectionModeChange = (isMode: boolean) => {
        setIsSelectionMode(isMode);
        props.onSelectionModeChange?.(isMode);
        if (!isMode) {
            setSelectedCount(0);
        }
    };

    // Handle selection change from DataTable
    const handleSelectionChange = (selectedRowIndices: number[]) => {
        setSelectedCount(selectedRowIndices.length);
        props.onSelectionChange?.(selectedRowIndices);
    };

    return (
        <VStack spacing={diffGroupSpacing}>
            <HStack style={{
                justifyContent: "space-between", // align left and right
                alignItems: "center",
                display: 'flex'
            }}>
                <PaginationView  {...props} totalPageCount={totalPageCount} externalCurPage={curPage}
                                 externalSetCurPage={setCurPage}/>
                <HStack spacing={sameGroupSpacing} style={centerChildren}>
                    {props.enableSelectionMode && !isSelectionMode && (
                        <button 
                            onClick={() => {
                                setIsSelectionMode(true);
                            }}
                            style={{
                                padding: "4px 8px",
                                fontSize: "12px",
                                cursor: "pointer"
                            }}
                        >
                            Selection Mode
                        </button>
                    )}
                    <SetCountPerPageWidget 
                        {...props}
                        onExitSelectionMode={props.enableSelectionMode && isSelectionMode ? () => {
                            setIsSelectionMode(false);
                        } : undefined}
                    />
                </HStack>
            </HStack>

            {/* Selection mode status bar - positioned between pagination and table */}
            {props.enableSelectionMode && isSelectionMode && (
                <SelectionModeStatusBar 
                    selectedCount={selectedCount}
                    onExit={() => {
                        setIsSelectionMode(false);
                    }}
                />
            )}

            <DataTable 
                {...props} 
                rowRange={rowRange}
                enableSelectionMode={props.enableSelectionMode}
                selectionMode={isSelectionMode}
                onSelectionModeChange={handleSelectionModeChange}
                onSelectionChange={handleSelectionChange}
            />
        </VStack>
    )
}
// 100 leads to lagging
const AvailableTasksPerPage: OptionValueType[] = [
    {
        name: "10"
    },
    {
        name: "20"
    },
    {
        name: "50"
    },
]

/**
 Dropdown to set tasks count per page
 *
 * @param props
 * @constructor
 */
function SetCountPerPageWidget(props: SetTableDataCountPerPageParams) {
    const [searching, setSearching] = useState(false)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number, left: number } | null>(null)

    function setSettings(inputText: string[]) {
        if (inputText.length === 0) {
            return
        }
        setSearching(false)
        props.setDataCountPerPage(Number(inputText[0]))
        // Exit selection mode when task per page is changed
        props.onExitSelectionMode?.()
    }

    // Calculate dropdown position based on button position
    useEffect(() => {
        if (searching && buttonRef.current) {
            const updatePosition = () => {
                if (buttonRef.current) {
                    const rect = buttonRef.current.getBoundingClientRect()
                    // Use getBoundingClientRect() which returns viewport coordinates
                    // Since we use position: fixed, we don't need to add scroll offsets
                    setDropdownPosition({
                        top: rect.bottom - rect.height, // offset with button height to align with button
                        left: rect.left
                    })
                }
            }

            // Update position immediately
            updatePosition()

            // Update position on scroll/resize to keep dropdown aligned with button
            window.addEventListener('scroll', updatePosition, true)
            window.addEventListener('resize', updatePosition)

            return () => {
                window.removeEventListener('scroll', updatePosition, true)
                window.removeEventListener('resize', updatePosition)
            }
        } else {
            setDropdownPosition(null)
        }
    }, [searching])

    // 10,20,50

    return <>
        <HStack style={centerChildren} spacing={sameGroupSpacing}>
            <div>
                <button
                    ref={buttonRef}
                    onClick={() => {
                        setSearching(!searching)
                    }}
                >
                    {props.dataCountPerPage}
                </button>
            </div>
            <label> Tasks per page</label>
        </HStack>
        {searching && dropdownPosition && createPortal(
            <div style={{
                position: "fixed",
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                zIndex: 1000
            }}>
                <SearchableDropdown
                    data={AvailableTasksPerPage}
                    handleSetOptionValues={setSettings}
                    dropdownId={"SetCountPerPageWidget"}
                    showInputBox={false}
                    initDropdownStatus={"block"}
                    onBlur={() => {
                        setSearching(false)
                    }}
                />
            </div>,
            document.body
        )}
    </>
}

interface PaginationViewParams {
    externalCurPage: number;
    totalPageCount: number;
    maxPageButtonCount: undefined | number;
    externalSetCurPage: (page: number) => void
}

const MaxPageButtonCount = 20;

/**
 * Slider
 * @constructor
 */
function PaginationView({
                            externalCurPage,
                            totalPageCount,
                            maxPageButtonCount,
                            externalSetCurPage
                        }: PaginationViewParams) {
    maxPageButtonCount = maxPageButtonCount ?? MaxPageButtonCount

    const pageInteractableArray = prepareInteractableArray(maxPageButtonCount);

    useEffect(() => {
        if (externalCurPage >= totalPageCount || externalCurPage < 0) {
            // When we change the tasks per page, the curPage might be out of range.
            devLog(`externalCurPage: ${externalCurPage}, totalPageCount: ${totalPageCount}`);
            externalSetCurPage(totalPageCount - 1)
        }
    }, [externalCurPage, externalSetCurPage, totalPageCount]);
    return <HStack spacing={diffGroupSpacing}>

        <HStack spacing={sameGroupSpacing} style={centerChildren}>
            {...pageInteractableArray}
        </HStack>

        <label>
            Page {externalCurPage + 1} of {totalPageCount}
        </label>

    </HStack>


    function prepareInteractableArray(maxButtons: number) {
        const pageInteractableArray = []

        pageInteractableArray.push(<ClickableObsidianIconView iconName={"arrow-left-to-line"} onIconClicked={() => {
            // to 0
            if (externalCurPage > 0)
                externalSetCurPage(0);
        }}/>)
        pageInteractableArray.push(<ClickableObsidianIconView iconName={"arrow-left"} onIconClicked={() => {
            // min 0
            if (externalCurPage > 0)
                externalSetCurPage(externalCurPage - 1);
        }}/>)

        pageInteractableArray.push(
            <input className="slider" type="range" value={externalCurPage} min={0} max={totalPageCount - 1} step="1"
                   onChange={(evt) => {
                       externalSetCurPage(Number(evt.target.value));
                   }}/>
        )
        // deprecated: `<< < 1 2 3 4 5 ... > >>`. Use a slider instead
        // for (let i = pageStartInclusive; i < pageEndExclusive; i++) {
        //     const style = {minWidth: 10};
        //     const displayPage = i + 1;
        //     if (i === externalCurPage) {
        //         const pageButton = <label style={style}>{displayPage}</label>;
        //         pageInteractableArray.push(pageButton)
        //     } else {
        //         // clickable underline
        //         pageInteractableArray.push(<LinkView style={style} text={displayPage.toString()} onClick={() => {
        //             externalSetCurPage(i);
        //         }}/>)
        //     }
        // }
        // add ... after

        pageInteractableArray.push(<ClickableObsidianIconView iconName={"arrow-right"} onIconClicked={() => {
            // max length-1
            if (externalCurPage < totalPageCount - 1)
                externalSetCurPage(externalCurPage + 1);
        }}/>)
        pageInteractableArray.push(<ClickableObsidianIconView iconName={"arrow-right-to-line"} onIconClicked={() => {
            // to length-1
            if (externalCurPage < totalPageCount - 1)
                externalSetCurPage(totalPageCount - 1);
        }}/>)
        return pageInteractableArray;
    }

}
