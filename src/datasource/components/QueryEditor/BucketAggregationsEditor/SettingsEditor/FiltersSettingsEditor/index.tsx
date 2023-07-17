import { InlineField, Input, QueryField } from '@grafana/ui';
import { css } from '@emotion/css';
import React, { useEffect } from 'react';
import { AddRemove } from '../../../../AddRemove';
import { useDispatch, useStatelessReducer } from '../../../../../hooks/useStatelessReducer';
import { Filters } from '../../aggregations';
import { changeBucketAggregationSetting } from '../../state/actions';
import { BucketAggregationAction } from '../../state/types';
import { addFilter, changeFilter, removeFilter } from './state/actions';
import { reducer as filtersReducer } from './state/reducer';

interface Props {
  value: Filters;
}

export const FiltersSettingsEditor = ({ value }: Props) => {
  const upperStateDispatch = useDispatch<BucketAggregationAction<Filters>>();

  const dispatch = useStatelessReducer(
    (newState) => upperStateDispatch(changeBucketAggregationSetting(value, 'filters', newState)),
    value.settings?.filters,
    filtersReducer
  );

  // The model might not have filters (or an empty array of filters) in it because of the way it was built in previous versions of the datasource.
  // If this is the case we add a default one.
  useEffect(() => {
    if (!value.settings?.filters?.length) {
      dispatch(addFilter());
    }
  }, []);

  return (
    <>
      <div
        className={css`
          display: flex;
          flex-direction: column;
        `}
      >
        {value.settings?.filters!.map((filter, index) => (
          <div
            key={index}
            className={css`
              display: flex;
            `}
          >
            <div
              /*
              Unfortunately Grfana supplies no way to specify the minimum width for the QueryField and also make it so
              that when the string is empty it becomes unclickable. This means that if you ever delete the full query,
              you're no longer able to add a new query until you refresh. Since they also provide no way for us to pass
              in our own custom style, we have to use a CSS selector to selectively override the class with our own
              properties, which is what is down below. I confirmed that the value I selected for it is hardcoded in
              the code, so it should continue to work until we/they change it
              Link to the relevant code is here: https://github.com/grafana/grafana/blob/03c2efa2d6c2774c60b221f0b4481b4ac5d9efb5/packages/grafana-ui/src/components/QueryField/QueryField.tsx#L212
               */
              className={css`
                div[class^='slate-query-field'] {
                  min-width: 250px;
                }
              `}
            >
              <InlineField label="Query" labelWidth={10}>
                <QueryField
                  placeholder="Lucene Query"
                  portalOrigin="opensearch"
                  onBlur={() => {}}
                  onChange={(query) => dispatch(changeFilter(index, { ...filter, query }))}
                  query={filter.query}
                />
              </InlineField>
            </div>
            <InlineField label="Label" labelWidth={10}>
              <Input
                placeholder="Label"
                onBlur={(e) => dispatch(changeFilter(index, { ...filter, label: e.target.value }))}
                defaultValue={filter.label}
              />
            </InlineField>
            <AddRemove
              index={index}
              elements={value.settings?.filters || []}
              onAdd={() => dispatch(addFilter())}
              onRemove={() => dispatch(removeFilter(index))}
            />
          </div>
        ))}
      </div>
    </>
  );
};
