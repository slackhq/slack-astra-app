import React from 'react';
import { Field, ValueFrequency } from 'datasource/types';
import { Toggletip } from './Toggletip';
import { HorizontalGroup, VerticalGroup, Button } from '@grafana/ui';

interface Props {
  field: Field;
  children: JSX.Element;
  onPlusClick?: (field: Field, value: string) => void;
  onMinusClick?: (field: Field, value: string) => void;
}


/*
 * Calculates the frequency map for a list of values.
 * The map returned is in sorted descending order
 */
function getFrequencyMap<T>(values: T[]): Map<string, number> {
  let frequencyMap = new Map<string, number>();
  for (let value of values) {
    if (value === undefined) {
      continue;
    }

    let stringValue = JSON.stringify(value);

    let currentCount = frequencyMap.has(stringValue) ? frequencyMap.get(stringValue) : 0;
    frequencyMap.set(stringValue, currentCount + 1);
  }
  return new Map([...frequencyMap].sort((a, b) => (a[1] >= b[1] ? -1 : 0)));
}

function getValueCountsForField(unmappedFieldValuesArray: any): ValueFrequency[] {
  let frequencyMapForField = getFrequencyMap(unmappedFieldValuesArray);
  let topFiveMostPopularValues: ValueFrequency[] = [];
  let i = 0;
  for (let [value, _count] of frequencyMapForField) {
    if (i === 5) {
      break;
    }
    let definedCount = unmappedFieldValuesArray.filter((value) => value !== undefined).length;
    let valueFreq: ValueFrequency = {
      value: value,
      frequency: _count / definedCount,
    };
    topFiveMostPopularValues.push(valueFreq);
    i++;
  }
  return topFiveMostPopularValues;
}

const InnerTitle = (field: Field) => {
  return (
  <span
      style={{
        fontFamily: 'monospace',
      }}
    >
      <h5>
        <b>{field.name}</b>
      </h5>
    </span>
  );
};

const InnerContent = (
  field: Field,
  onPlusClick?: (field: Field, value: string) => void,
  onMinusClick?: (field: Field, value: string) => void
) => {
  let mostCommonValues = getValueCountsForField(field.unmappedFieldValuesArray)
  return (
    <>
      <span>
        <b>
          Top {mostCommonValues.length} {mostCommonValues.length > 1 ? 'values' : 'value'}
        </b>
      </span>
      {mostCommonValues.map((valueFreq) => {
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
    </>
  );
};

const InnerFooter = (field: Field) => {
  return (
    <span>
      Exists in {field.numberOfLogsFieldIsIn} / {field.unmappedFieldValuesArray.values.length} records
    </span>
  );
};

/**
 * A component to show the FieldValueFrequency for a given field value in the app UI.
 */
const FieldValueFrequency = ({ field, children, onMinusClick, onPlusClick }: Props) => {
  // This doesn't make sense for this field
  if (field.name === '_source') {
    return <></>;
  }

  return (
    <Toggletip
      title={InnerTitle(field)}
      content={() => InnerContent(field, onPlusClick, onMinusClick)}
      footer={InnerFooter(field)}
      closeButton={false}
      placement={'right'}
    >
      {React.cloneElement(children)}
    </Toggletip>
  );
};

export default FieldValueFrequency;
