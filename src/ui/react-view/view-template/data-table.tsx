import {IRenderable} from "../../common/i-renderable";
import React from "react";

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
                          }: {
        tableTitle: string,
        headers: IRenderable[],
        rows: IRenderable[][],
        onHeaderClicked?: (arg0: number) => void,
        tableStyle?: React.CSSProperties,
        thStyle?: React.CSSProperties,
        thStyleGetter?: (column: number) => React.CSSProperties,
        cellStyle?: React.CSSProperties,
        cellStyleGetter?: (column: number, row: number) => React.CSSProperties
    }) => {

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
                    {headers.map((header: string, index) => {
                        const headerStyle = thStyleGetter ? thStyleGetter(index) : thStyle;
                        return <th style={headerStyle} key={header}>
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
