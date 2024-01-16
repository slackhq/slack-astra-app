
export enum LogColumnType {
    TIME,
    DOCUMENT,
    FIELD
};

export type LogColumn = {
    logColumnType: LogColumnType,
    underlyingFieldName?: string
};

