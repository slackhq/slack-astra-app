import React from 'react'
import { Log } from 'datasource/types'
import { LogColumnType, LogColumn } from 'datasource/components/Logs/types'
import  getLogTableContext from 'datasource/components/Logs/context'
import { Button, useTheme2 } from '@grafana/ui'
import { dateTimeParse, getTimeZone } from '@grafana/data'
import { DARK_THEME_HIGHLIGHTED_BACKGROUND, DARK_THEME_OUTLINE, LIGHT_THEME_HIGHLIGHTED_BACKGROUND, LIGHT_THEME_OUTLINE } from './styles'

interface LogKeyValProps {
    field: string,
    val: any
}


const LogKeyVal = ({ field, val }: LogKeyValProps) => {
    return (<div style={{display:'inline-block', paddingRight: '10px'}}>
        <div 
            style={{
                backgroundColor: useTheme2().isDark ? DARK_THEME_HIGHLIGHTED_BACKGROUND : LIGHT_THEME_HIGHLIGHTED_BACKGROUND, 
                display: 'inline', 
                borderRadius: '6px', 
                marginRight: '3px', 
                padding: '2px 4px'
            }}>
            {field + ":"}

        </div>
        <div style={{display: 'inline-block'}}>
            {JSON.stringify(val)}
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
            {JSON.stringify(val)}
        </td>
    </tr>);
}

interface ExpandedDocumentProps {
    log: Log,
    index: number,
    datasourceUid: string,
    datasourceName: string,
    datasourceField: string,
    logMessageField: string,
}


const ExpandedDocument  = ({ log, index, datasourceUid, datasourceName, datasourceField, logMessageField }: ExpandedDocumentProps) => {
    // The index in the logs is off by one from the index in the table (due to the header row). In this
    // case we care about the index in the table, so add one to it.
    index += 1;

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
            query: log.get(datasourceField), 
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
                        key !== logMessageField ?
                            <ExpandedLogKeyVal
                                field={key}
                                val={log.get(key)}
                                key={key}
                            />
                        : <></>
                    ))       
                }
            </table>
            {
                log.has(datasourceField) && datasourceName && datasourceUid ? 
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


const DocumentCell = (log: Log, style: any, rowIndex: number, expanded: boolean, datasourceUid: string, datasourceName: string, datasourceField: string, logMessageField: string) => (
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
                    key !== logMessageField ?
                        <LogKeyVal
                            field={key}
                            val={log.get(key)}
                            key={key}
                        />
                    : <></>
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
                    datasourceField={datasourceField}
                    logMessageField={logMessageField}
                />)
                      
            : ''
        }
    </div>
)

const TimestampCell = (timestamp: string, style: any, rowIndex: number, expandedRows: boolean[], onClick: ((index: number) => void)) => {
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
            <>
                {dateTimeParse(timestamp, {timeZone: getTimeZone()}).format("YYYY-MM-DD @ HH:mm:ss:SSS Z").toString()}
            </>
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
    const column = data.columns[columnIndex];
    const setExpandedRowsAndReRender = data.setExpandedRowsAndReRender;
    const expandedRows = data.expandedRows;
    const datasourceUid: string = data.datasourceUid;
    const datasourceName: string = data.datasourceName;
    const datasourceField: string = data.datasourceField;
    const logMessageField: string = data.logMessageField;
    const { setSize } = getLogTableContext();
    const darkModeEnabled = useTheme2().isDark ;


    // TODO: Ignoring for now as these will be used in a future pass
    // const _timeField = data.timeField;
    // const _setColumns = data.setColumns

    const outline = darkModeEnabled ? DARK_THEME_OUTLINE : LIGHT_THEME_OUTLINE;

    // Handle drawing the borders for the entire row
    // Only draw a borderon the left if we're on the left-most cell
    if (columnIndex === 0) {
        style['borderLeft'] = outline;
    }

    // Only draw a border on the top if we're on the top-most cell
    if (rowIndex === 0) {
        style['borderTop'] =  outline;
    }

    // Only draw a border on the right if we're on the right-most cell
    if (columnIndex === data.columns.length - 1) {
      style['borderRight'] = outline;
    }

    style['borderBottom'] =  outline;

    // Header row
    if (rowIndex === 0) {
        return HeaderCell(column, style)

    }

    // The 0th row is the header row, but we still need to render the data in 
    // row 0. Thus the rowIndex is technically 1 more than the log length 
    rowIndex -= 1;
    const log = data.logs[rowIndex];
    const timestamp = data.timestamps[rowIndex];

    const handleOnClick = (rowIndex: number): any => {
        const newExpandedRows = invertRow(expandedRows, rowIndex);
        shrinkRows(newExpandedRows, rowIndex + 1, setSize);
        setExpandedRowsAndReRender([...newExpandedRows], rowIndex);
    }

    if (column.logColumnType === LogColumnType.TIME) {
        return TimestampCell(timestamp, style, rowIndex, expandedRows, handleOnClick);
    } else if (column.logColumnType === LogColumnType.DOCUMENT) {
        return DocumentCell(log, style, rowIndex, expandedRows[rowIndex], datasourceUid, datasourceName, datasourceField, logMessageField);
    } else {
        return FieldCell();
    }
};

export default LogCell
