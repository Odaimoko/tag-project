import {IRenderable} from "../props-typing/i-renderable";
import React, {useEffect, useState} from "react";
import {HStack, VStack} from "./h-stack";
import {ClickableObsidianIconView} from "../../react-view/obsidian-icon-view";
import {centerChildren, diffGroupSpacing, sameGroupSpacing} from "../style-def";
import {OptionValueType, SearchableDropdown} from "./searchable-dropdown";
import {devLog} from "../../../utils/env-util";

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
                              rowRange
                          }: DataTableParams) => {
        const start = rowRange?.[0] ?? 0;
        const end = Math.min(rowRange?.[1] ?? rows.length, rows.length);
        rows = rows.slice(start, end);
        return (
            <table style={tableStyle} key={tableTitle}>
                <tbody>
                {rows.map((items: IRenderable[], rowIdx) => (
                    <tr key={rowIdx}>
                        {items.map(
                            function (k: IRenderable, columnIdx) {
                                const key = `${tableTitle}_${rowIdx}_${columnIdx}`;
                                const cStyle = cellStyleGetter ?
                                    cellStyleGetter(columnIdx, rowIdx) :
                                    cellStyle;
                                return <td style={cStyle} key={key}>{k}</td>;
                            })}

                    </tr>))
                }
                </tbody>
                {/*Draw header at the end, so it can cover body view. Or else the body content will be rendered above headers. */}
                <thead>
                <tr>
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
        );
    }

interface SetTableDataCountPerPageParams {
    dataCountPerPage: number,
    setDataCountPerPage: (count: number) => void,
}

export const PaginatedDataTable = (props: Omit<DataTableParams, "rowRange"> & SetTableDataCountPerPageParams & {
    maxPageButtonCount: number
}) => {
    const totalPageCount = Math.ceil(props.rows.length / props.dataCountPerPage);
    const [curPage, setCurPage] = useState(0);
    const rowRange: [number, number] = [curPage * props.dataCountPerPage, (curPage + 1) * props.dataCountPerPage];
    useEffect(() => {
        const clamped = Math.clamp(curPage, 0, totalPageCount - 1);
        setCurPage(clamped) // When tasks change, the current page should change to the first.
    }, [props.rows]);
    return (
        <VStack>
            <HStack style={{
                justifyContent: "space-between", // align left and right
                alignItems: "center",
                display: 'flex'
            }}>
                <PaginationView  {...props} totalPageCount={totalPageCount} externalCurPage={curPage}
                                 externalSetCurPage={setCurPage}/>
                <SetCountPerPageWidget {...props}/>
            </HStack>

            <DataTable {...props} rowRange={rowRange}/>
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

    function setSettings(inputText: string[]) {
        if (inputText.length === 0) {
            return
        }
        setSearching(false)
        props.setDataCountPerPage(Number(inputText[0]))
    }

    // 10,20,50

    return <HStack style={centerChildren} spacing={sameGroupSpacing}>
        <div>
            {
                // since a inputbox's height is the same as the button, we use absolute position and hide the input box to 
                searching && <div style={{position: "absolute"}}>
                    <SearchableDropdown data={AvailableTasksPerPage} handleSetOptionValues={setSettings}
                                        dropdownId={"SetCountPerPageWidget"}
                                        showInputBox={false}
                                        initDropdownStatus={"block"} onBlur={() => {
                        setSearching(false)
                    }}/>

                </div>

            }
            <button onClick={() => {
                setSearching(!searching)
            }}>{props.dataCountPerPage}</button>

        </div>
        <label> Tasks per page</label>
    </HStack>
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
