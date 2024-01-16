import React, { useLayoutEffect, useState } from 'react'
import { Log } from 'datasource/types'
import { VariableSizeGrid as Grid } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import { LogColumn, LogColumnType } from 'datasource/components/Logs/types'
import { LogTableContext } from 'datasource/components/Logs/context'
import LogCell from 'datasource/components/Logs/LogsCell'

// Used for dynamically resizing our statically sized Grid when a resize 
// operation happens
const useWindowSize = () => {
  let [size, setSize] = useState([0, 0]);
  useLayoutEffect(() => {
    function updateSize() {
      setSize([window.innerWidth, window.innerHeight]);
    }
    window.addEventListener("resize", updateSize);
    updateSize();
    return () => window.removeEventListener("resize", updateSize);
  }, []);
  return size;
};


interface LogsTableProps {
    logs: Log[];
    timeField: string;
    columns: LogColumn[];
    timestamps: number[];
    expandedRows: boolean[];
    datasourceUid: string;
    datasourceName: string;
    setExpandedRows: ((value: boolean[] | ((preVar: boolean[]) => boolean[])) => void);
    setColumns: ((value: LogColumn[] | ((preVar: LogColumn[]) => LogColumn[])) => void);
    datasourceField: string;
}

const LogsTable = ({ logs, timeField, columns, timestamps, expandedRows, setColumns, setExpandedRows, datasourceUid, datasourceName, datasourceField }: LogsTableProps) => {
    let gridRef: React.RefObject<Grid> = React.createRef<Grid>();

    // In order to get highly variable (and unknown at the time of rendering) row heights in a virtualized environment
    // where we need to know the _exact_ size of the rows ahead of time, we need to do just in time sizing. Essentially
    // we can accomplish that by having this map that gets updated whenever we know the size of the thing we need to render.
    // After we know that size, we can force a re-render, passing in the proper size into our Grid down below. Hopefully
    // one day we don't need to do that, but that's entirely dependent on [this](https://github.com/bvaughn/react-window/issues/6) PR
    // getting merged in.
    const sizeMap = React.useRef({});
    const setSize = (index, size) => {
        sizeMap.current = { ...sizeMap.current, [index]: size };
        if (gridRef.current) {
            gridRef.current.resetAfterRowIndex(index);
        }
    }

    // * The header row should have a height of 25
    // * Any expanded row should have the height of whatever the height of the thing rendered is, plus 135 for padding for the already
    // rendered row
    // * Every other row should only have a height of 125
    const getSize = React.useCallback(index => index === 0 ? 25 : sizeMap.current[index] + 135 || 125, []);
    const [windowWidth] = useWindowSize();

    let setExpandedRowsAndReRender = (expandedRows: boolean[], rowIndex: number) => {
        if (gridRef.current) {
            gridRef.current.resetAfterRowIndex(rowIndex);
        }

        setExpandedRows(expandedRows);
    }
    return (
        <LogTableContext.Provider value={{ setSize, windowWidth }}>
            <AutoSizer>
                {
                    ({height, width}) => (
                        <Grid
                            ref={gridRef}
                            columnCount={columns.length}
                            columnWidth={index => columns[index].logColumnType === LogColumnType.TIME ? 300 : width-310}
                            height={height}
                            rowCount={logs.length}
                            rowHeight={getSize}
                            width={width}
                            itemData={{logs, timestamps, columns, timeField, setColumns, setExpandedRowsAndReRender, expandedRows, datasourceUid, datasourceName, datasourceField}}
                        >
                            {LogCell}
                        </Grid>

                    )
                }
            </AutoSizer>
        </LogTableContext.Provider>
    );
}

export default LogsTable
