import React from 'react';
import { Field } from 'datasource/types';
import { Toggletip } from './Toggletip';
import { HorizontalGroup, VerticalGroup } from '@grafana/ui';

interface Props {
  field: Field;
  children: JSX.Element;
}

const InnerTitle = (field: Field) => {
  return (
    <div>
      <span
        style={{
          fontFamily: 'monospace',
        }}
      >
        <h5>
          <b>{field.name}</b>
        </h5>
      </span>
    </div>
  );
};

const InnerContent = (field: Field) => {
  return (
    <div>
      <span>
        <b>
          Top {field.mostCommonValues.length} {field.mostCommonValues.length > 1 ? 'values' : 'value'}
        </b>
      </span>
      {field.mostCommonValues.map((valueFreq) => {
        return (
          <VerticalGroup key={valueFreq.value}>
            <HorizontalGroup spacing={'lg'} justify={'space-between'}>
              <span
                style={{
                  fontFamily: 'monospace',
                }}
              >
                {valueFreq.value === '""' ? <i>&quot;&quot; (empty) </i> : valueFreq.value}
              </span>
              <span>{(valueFreq.frequency * 100).toFixed(2)}%</span>
            </HorizontalGroup>
            <div
              style={{
                width: `${(valueFreq.frequency * 100).toFixed(2)}%`,
                height: '4px',
                backgroundColor: 'green',
              }}
            ></div>
          </VerticalGroup>
        );
      })}
    </div>
  );
};

const InnerFooter = (field: Field) => {
  return (
    <span>
      Exists in {field.numberOfLogsFieldIsIn} / {field.totalNumberOfLogs} records
    </span>
  );
};

/**
 * A component to show the FieldValueFrequency for a given field value in the app UI.
 */
export const FieldValueFrequency = ({ field, children }: Props) => {
  // This doesn't make sense for this field
  if (field.name === '_source') {
    return <div></div>;
  }

  return (
    <Toggletip
      title={InnerTitle(field)}
      content={InnerContent(field)}
      footer={InnerFooter(field)}
      closeButton={false}
      placement={'right'}
    >
      {React.cloneElement(children)}
    </Toggletip>
  );
};
