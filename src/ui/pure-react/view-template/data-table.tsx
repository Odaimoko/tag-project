import {IRenderable} from "../props-typing/i-renderable";
import React, {useState} from "react";
import {HStack, VStack} from "./h-stack";
import {ClickableObsidianIconView} from "../../react-view/obsidian-icon-view";
import {sameGroupSpacing} from "../style-def";
import {LinkView} from "../../common/link-view";

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

export const PaginatedDataTable = (props: Omit<DataTableParams, "rowRange"> & {
    dataCountPerPage: number,
    maxPageButtonCount: number
}) => {
    const totalPageCount = Math.ceil(props.rows.length / props.dataCountPerPage);
    const [curPage, setCurPage] = useState(0);
    const rowRange: [number, number] = [curPage * props.dataCountPerPage, (curPage + 1) * props.dataCountPerPage];
    return (
        <VStack>
            <PaginationView  {...props} totalPageCount={totalPageCount} externalCurPage={curPage}
                             externalSetCurPage={setCurPage}/>
            <DataTable {...props} rowRange={rowRange}/>
        </VStack>
    )
}

interface PaginationViewParams {
    externalCurPage: number;
    totalPageCount: number;
    maxPageButtonCount: undefined | number;
    externalSetCurPage: (page: number) => void
}

const MaxPages = 20;

/**
 * `<< < 1 2 3 4 5 ... > >>`
 * @constructor
 */
function PaginationView({
                            externalCurPage,
                            totalPageCount,
                            maxPageButtonCount,
                            externalSetCurPage
                        }: PaginationViewParams) {
    const pageInteractableArray = []
    maxPageButtonCount = maxPageButtonCount ?? MaxPages
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
    // Only show maximum 5 page links, with current at the center if possible
    let pageStartInclusive = Math.max(0, externalCurPage - Math.floor(maxPageButtonCount / 2));
    const pageEndExclusive = Math.min(totalPageCount, pageStartInclusive + maxPageButtonCount);
    if (pageEndExclusive - pageStartInclusive < maxPageButtonCount) {
        // not enough pages
        pageStartInclusive = Math.max(0, pageEndExclusive - maxPageButtonCount);
    }
    for (let i = pageStartInclusive; i < pageEndExclusive; i++) {
        const displayPage = i + 1;
        if (i === externalCurPage) {
            pageInteractableArray.push(<label>{displayPage}</label>)
        } else {
            // clickable underline
            pageInteractableArray.push(<LinkView text={displayPage.toString()} onClick={() => {
                externalSetCurPage(i);
            }}/>)
        }
    }
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
    return <HStack spacing={sameGroupSpacing}>
        {...pageInteractableArray}
        <label>
            Showing {externalCurPage + 1} of {totalPageCount}
        </label>
    </HStack>
}
