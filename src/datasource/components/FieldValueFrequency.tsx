import React from 'react';
import { Field } from 'datasource/types';
import { Toggletip } from './Toggletip';
import { HorizontalGroup, VerticalGroup, Button } from '@grafana/ui';

interface Props {
  field: Field;
  children: JSX.Element;
  onPlusClick?: (field: Field, value: string) => void;
  onMinusClick?: (field: Field, value: string) => void;
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

const InnerContent = (
  field: Field,
  onPlusClick?: (field: Field, value: string) => void,
  onMinusClick?: (field: Field, value: string) => void
) => {
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
              <HorizontalGroup>
                <span
                  style={{
                    fontFamily: 'monospace',
                  }}
                >
                  {valueFreq.value === '""' ? <i>&quot;&quot; (empty) </i> : valueFreq.value}
                </span>
              </HorizontalGroup>
              <HorizontalGroup spacing={'xs'} justify={'flex-end'} align={'flex-end'}>
                <span>{(valueFreq.frequency * 100).toFixed(2)}%</span>
                <Button
                  size={'sm'}
                  variant={'secondary'}
                  icon={'plus'}
                  onClick={() => (onPlusClick ? onPlusClick(field, valueFreq.value) : null)}
                ></Button>
                <Button
                  size={'sm'}
                  variant={'secondary'}
                  icon={'minus'}
                  onClick={() => (onMinusClick ? onMinusClick(field, valueFreq.value) : null)}
                ></Button>
              </HorizontalGroup>
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
export const FieldValueFrequency = ({ field, children, onMinusClick, onPlusClick }: Props) => {
  // This doesn't make sense for this field
  if (field.name === '_source') {
    return <div></div>;
  }

  return (
    <Toggletip
      title={InnerTitle(field)}
      content={InnerContent(field, onPlusClick, onMinusClick)}
      footer={InnerFooter(field)}
      closeButton={false}
      placement={'right'}
    >
      {React.cloneElement(children)}
    </Toggletip>
  );
};
