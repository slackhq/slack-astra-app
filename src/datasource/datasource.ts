import { DataSourceInstanceSettings } from '@grafana/data';
import { DataSourceWithBackend } from '@grafana/runtime';
import { KalDbDataSourceOptions, KalDbQuery } from './types';

export class DataSource extends DataSourceWithBackend<KalDbQuery, KalDbDataSourceOptions> {
  constructor(instanceSettings: DataSourceInstanceSettings<KalDbDataSourceOptions>) {
    super(instanceSettings);
  }
}
