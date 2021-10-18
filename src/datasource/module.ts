import { DataSourcePlugin } from '@grafana/data';
import { DataSource } from './datasource';
import { ConfigEditor } from './ConfigEditor';
import { QueryEditor } from './QueryEditor';
import { KalDbQuery, KalDbDataSourceOptions } from './types';

export const plugin = new DataSourcePlugin<DataSource, KalDbQuery, KalDbDataSourceOptions>(DataSource)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditor);
