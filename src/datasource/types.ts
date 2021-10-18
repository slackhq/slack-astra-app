import { DataQuery, DataSourceJsonData } from '@grafana/data';

export interface KalDbQuery extends DataQuery {
  index: string;
  queryText?: string;
}

export const defaultQuery: Partial<KalDbQuery> = {
  index: 'index',
};

/**
 * These are options configured for each DataSource instance
 */
export interface KalDbDataSourceOptions extends DataSourceJsonData {
  url?: string;
}
