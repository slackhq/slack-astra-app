import { DataSourceSettings, SelectableValue } from '@grafana/data';
import { valid } from 'semver';
import { Flavor, OpenSearchOptions } from '../types';
import { defaultMaxConcurrentShardRequests } from './KalDbDetails';

export const coerceOptions = (
  options: DataSourceSettings<OpenSearchOptions, {}>
): DataSourceSettings<OpenSearchOptions, {}> => {
  const flavor = options.jsonData.flavor || Flavor.KalDB;
  const version =
    valid(options.jsonData.version) ||
    AVAILABLE_VERSIONS.find(v => v.value.flavor === flavor)?.value.version ||
    AVAILABLE_VERSIONS[AVAILABLE_VERSIONS.length - 1].value.version;

  return {
    ...options,
    jsonData: {
      ...options.jsonData,
      timeField: options.jsonData.timeField || '@timestamp',
      version,
      flavor,
      maxConcurrentShardRequests:
        options.jsonData.maxConcurrentShardRequests || defaultMaxConcurrentShardRequests(flavor, version),
      logMessageField: options.jsonData.logMessageField || '',
      logLevelField: options.jsonData.logLevelField || '',
      pplEnabled: options.jsonData.pplEnabled ?? true,
    },
  };
};

export const isValidOptions = (options: DataSourceSettings<OpenSearchOptions>): boolean => {
  return (
    // version should be a valid semver string
    !!valid(options.jsonData.version) &&
    // flavor should be valid
    (options.jsonData.flavor === Flavor.OpenSearch || options.jsonData.flavor === Flavor.Elasticsearch) &&
    // timeField should not be empty or nullish
    !!options.jsonData.timeField &&
    // maxConcurrentShardRequests should be a number AND greater than 0
    !!options.jsonData.maxConcurrentShardRequests &&
    // message & level fields should be defined
    options.jsonData.logMessageField !== undefined &&
    options.jsonData.logLevelField !== undefined &&
    // PPLEnabled should be defined
    options.jsonData.pplEnabled !== undefined
  );
};

interface Version {
  version: string;
  flavor: Flavor;
}

export const AVAILABLE_VERSIONS: Array<SelectableValue<Version>> = [
  {
    label: 'KalDB 0.0.x',
    value: {
      flavor: Flavor.KalDB,
      version: '0.0.1',
    },
  },
];

export const AVAILABLE_FLAVORS: Array<SelectableValue<string>> = [
  { label: 'KalDB', value: Flavor.KalDB },
  { label: 'OpenSearch', value: Flavor.OpenSearch },
  { label: 'ElasticSearch', value: Flavor.Elasticsearch },
];
