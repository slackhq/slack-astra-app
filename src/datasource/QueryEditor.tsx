import { defaults } from 'lodash';

import React, { ChangeEvent, PureComponent } from 'react';
import { LegacyForms } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from './datasource';
import { defaultQuery, KalDbDataSourceOptions, KalDbQuery } from './types';

const { FormField } = LegacyForms;

type Props = QueryEditorProps<DataSource, KalDbQuery, KalDbDataSourceOptions>;

export class QueryEditor extends PureComponent<Props> {
  onQueryTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query } = this.props;
    onChange({ ...query, queryText: event.target.value });
  };

  onIndexChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query } = this.props;
    onChange({ ...query, index: event.target.value });
  };

  render() {
    const query = defaults(this.props.query, defaultQuery);
    const { queryText, index } = query;

    return (
      <div className="gf-form">
        <FormField width={4} value={index} onChange={this.onIndexChange} label="Index" />
        <FormField
          labelWidth={8}
          value={queryText || ''}
          onChange={this.onQueryTextChange}
          label="Query"
          placeholder="Lucene Query"
        />
      </div>
    );
  }
}
