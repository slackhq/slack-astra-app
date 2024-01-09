import React from 'react'
import { Log } from 'datasource/types'
import { LogColumnType, LogColumn } from 'datasource/components/Logs/types'
import  getLogTableContext from 'datasource/components/Logs/context'
import { Button, useTheme2 } from '@grafana/ui'


interface LogKeyValProps {
    field: string,
    val: any
}


const LogKeyVal = ({ field, val }: LogKeyValProps) => {
    return (<div style={{display:'inline-block', paddingRight: '10px'}}>
        <div style={{backgroundColor: useTheme2().isDark ? '#343741' : '#e6f1fa', display: 'inline', borderRadius: '6px', marginRight: '3px', padding: '2px 4px'}}>
            {field + ":"}

        </div>
        <div style={{display: 'inline-block'}}>
            {val}
        </div>
    </div>);
}

interface ExpandedLogKeyValProps {
    field: string,
    val: any
}


const ExpandedLogKeyVal = ({ field, val }: ExpandedLogKeyValProps) => {
    return (
        <tr>
        <td style={{}}>
            {field + ":"}

        </td>
        <td>
            {val}
        </td>
    </tr>);
}

interface ExpandedDocumentProps {
    log: Log,
    index: number,
    datasourceUid: string,
    datasourceName: string
}


const ExpandedDocument  = ({ log, index, datasourceUid, datasourceName, }: ExpandedDocumentProps) => {
    const { setSize, windowWidth } = getLogTableContext();
    const root = React.useRef<HTMLDivElement>();
    React.useEffect(() => {
        if (root.current) {
            setSize(index, root.current.getBoundingClientRect().height);
        }
    }, [windowWidth]);

    const link = {
        datasource: datasourceUid,
        queries: [{
            query: log.get("trace_id"), // TODO: This should be user configurable
            refId: "A",
        }],
        range:{
            from: "now-15m", // TODO: This shouldn't be hardcoded
            to: "now", // TODO: This also shouldn't be hardcoded
        },
    };

    const orgId = 1; // TODO: This shouldn't be hardcoded
    const protocol = window.location.protocol.toString();
    const hostname = window.location.hostname.toString();
    const port = window.location.port.toString();

    /*
     * The format for the Grafana Explore UI (in a urlencoded form):
     *'https://<grafana URL>/explore?left={"datasource":"<datasource UID>","queries":[{"query":"<trace ID>","refId":"A"}],"range":{"from":"now-15m"," to":"now"}}&orgId=<org ID>'
    */
    const formattedLink = `${protocol}//${hostname}${port ? ":" + port : ""}/explore?left=${encodeURIComponent(JSON.stringify(link))}&orgId=${orgId}`

    // TODO: We should add an icon here as well
    return (
    <div ref={root}>
            <span style={
                {
                    fontWeight: 'bold',
                    paddingTop: '25px',
                    paddingBottom: '25px'
                }
            }>
                Expanded Document
            </span>
            <table>
                <tr>
                    <th>
                        Field
                    </th>
                    <th>
                        Value
                    </th>

                </tr>
                {
                    Array.from(log.keys()).map((key) => (
                        <ExpandedLogKeyVal
                            field={key}
                            val={log.get(key)}
                            key={key}
                        />
                    ))       
                }
            </table>
            {
                // TODO: Should this value be configurable?
                log.has('trace_id') && datasourceName && datasourceUid ? 
                (
                        <a href={formattedLink}>
                            <Button
                                size={'sm'}
                                variant={'primary'}
                            >
                                View in {datasourceName}
                            </Button>
                        </a>
                )
                    : ''
            }
            
    </div>
    );
}


const DocumentCell = (log: Log, style: any, rowIndex: number, expanded: boolean, datasourceUid: string, datasourceName: string) => (
    <div
        style={{
                display: 'inline-block',
                lineHeight: '2em',
                fontFamily: 'monospace',
                fontSize: '12px',
                overflow: 'hidden',
                paddingTop: '10px',
                ...style
            }}
    >
        <div style={{maxHeight: '115px', overflow: 'hidden'}}>
            {
                Array.from(log.keys()).map((key) => (
                    <LogKeyVal
                        field={key}
                        val={log.get(key)}
                        key={key}
                    />
                ))
            }
        </div>
        {
            expanded ?
                (<ExpandedDocument
                    log={log}
                    index={rowIndex}
                    datasourceUid={datasourceUid}
                    datasourceName={datasourceName}
                />)
                      
            : ''
        }
    </div>
)

const TimestampCell = (timestamp: number, style: any, rowIndex: number, expandedRows: boolean[], onClick: ((index: number) => void)) => {
    const getFoldIcon = () => {
        if (expandedRows[rowIndex]) {
            return 'angle-down';
        }
        return 'angle-right';
    };

    return (
        <div style={
            {
                alignContent: 'center',
                textAlign: 'center',
                fontFamily: 'monospace',
                fontSize: '12px',
                paddingTop: '10px',
                display: 'flex',
                ...style
            }}>
            <div
                style={{
                    paddingLeft: '10px',
                    paddingRight: '15px'
                }}
            >
                <Button
                    size={'sm'}
                    variant={'secondary'}
                    icon={getFoldIcon()}
                    onClick={() => onClick(rowIndex)}
                />
            </div>
            <div>
                {timestamp === undefined ? '' : new Date(timestamp).toISOString()}
            </div>
        </div>
    );
}

const FieldCell = () => {
    return (<></>);
}

const HeaderCell = (column: LogColumn, style) => {
    // TODO: Handle field types
    // const log = data.logs[rowIndex];
    // const _timeField = data.timeField;

    // TODO: Implement sorting?
    return (
        <div
            style={{
                paddingLeft: column.logColumnType === LogColumnType.TIME ? '10px' : '0px',
                ...style
            }}
        >
            {column.logColumnType === LogColumnType.TIME ? 'Time' : 'Document'}
        </div>
    )
}

// Either expands or collapses the row, depending on the state its currently in
const invertRow = (expandedRows: boolean[], rowIndex: number): boolean[] => {
    expandedRows[rowIndex] = !expandedRows[rowIndex]
    return expandedRows
}

// If the row isn't being expanded, then shrink it back to its original size.
// NOTE: Because of how we handle it down below, "shrink it to its original size"
// effectively means set it to 0.
const shrinkRows = (expandedRows: boolean[], rowIndex: number, setSize: (index: number, value: number) => void): boolean => {
    if (!expandedRows[rowIndex]) {
        setSize(rowIndex, 0);
        return true;
    }
    return false;
}



const LogCell = ({ columnIndex, rowIndex, style, data }) => {
    const log = data.logs[rowIndex];
    const timestamp = data.timestamps[rowIndex];
    const column = data.columns[columnIndex];
    const setExpandedRowsAndReRender = data.setExpandedRowsAndReRender
    const expandedRows = data.expandedRows
    const datasourceUid = data.datasourceUid
    const datasourceName = data.datasourceName
    const { setSize } = getLogTableContext();


    // TODO: Ignoring for now as these will be used in a future pass
    // const _timeField = data.timeField;
    // const _setColumns = data.setColumns

    const handleOnClick = (rowIndex: number): any => {
        const newExpandedRows = invertRow(expandedRows, rowIndex);
        shrinkRows(newExpandedRows, rowIndex, setSize);
        setExpandedRowsAndReRender([...newExpandedRows], rowIndex);
    }

    // Handle drawing the borders for the entire row
    if (columnIndex === 0) {
        style['borderLeft'] = useTheme2().isDark ? '1px solid rgb(71, 71, 71)' : '1px solid rgba(36, 41, 46, 0.3)';
    }
    if (rowIndex == 0) {
        style['borderTop'] =  useTheme2().isDark ? '1px solid rgb(71, 71, 71)' : '1px solid rgba(36, 41, 46, 0.3)';
    }
    style['borderBottom'] =  useTheme2().isDark ? '1px solid rgb(71, 71, 71)' : '1px solid rgba(36, 41, 46, 0.3)';

    if (columnIndex === data.columns.length - 1) {
      style['borderRight'] = useTheme2().isDark ? '1px solid rgb(71, 71, 71)' : '1px solid rgba(36, 41, 46, 0.3)';
    }

    // Header row
    if (rowIndex === 0) {
        return HeaderCell(column, style)

    }

    if (column.logColumnType === LogColumnType.TIME) {
        return TimestampCell(timestamp, style, rowIndex, expandedRows, handleOnClick);
    } else if (column.logColumnType === LogColumnType.DOCUMENT) {
        return DocumentCell(log, style, rowIndex, expandedRows[rowIndex], datasourceUid, datasourceName);
    } else {
        return FieldCell();
    }
};

export default LogCell
