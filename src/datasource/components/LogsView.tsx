import React from 'react'
import { useState } from 'react'
import { Log } from 'datasource/types'
import { LogColumn, LogColumnType } from 'datasource/components/Logs/types'
import LogsTable from 'datasource/components/Logs/LogsTable'


interface LogsViewProps {
    logs: Log[];
    timeField: string;
    timestamps: number[]
    datasourceUid: string;
    datasourceName: string;
}

const LogsView = ({ logs, timeField, timestamps, datasourceUid, datasourceName, }: LogsViewProps) => {
    if (logs.length === 0) {
        return (
            <></>
        );
    }
    const [columns, setColumns] = useState<LogColumn[]>([
        {
            logColumnType: LogColumnType.TIME,
            underlyingFieldName: timeField

        }, 
        {
            logColumnType: LogColumnType.DOCUMENT,
            underlyingFieldName: null
        }])

    const [ expandedRows, setExpandedRows ] = useState(Array(logs.length).fill(false));

    return (
        <LogsTable
            logs={logs}
            timeField={timeField}
            columns={columns}
            timestamps={timestamps}
            expandedRows={expandedRows}
            setExpandedRows={setExpandedRows}
            setColumns={setColumns}
            datasourceName={datasourceName}
            datasourceUid={datasourceUid}
        />
    )

};

export default LogsView
