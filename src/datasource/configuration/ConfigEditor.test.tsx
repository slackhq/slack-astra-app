import React from 'react';
import { mount, shallow } from 'enzyme';
import { ConfigEditor } from './ConfigEditor';
import { DataSourceHttpSettings } from '@grafana/ui';
import { KalDbDetails } from './KalDbDetails';
import { LogsConfig } from './LogsConfig';
import { createDefaultConfigOptions } from './mocks';
import { render } from '@testing-library/react';

describe('ConfigEditor', () => {
  it('should render without error', () => {
    mount(<ConfigEditor onOptionsChange={() => {}} options={createDefaultConfigOptions()} />);
  });

  it('should render all parts of the config', () => {
    const wrapper = shallow(<ConfigEditor onOptionsChange={() => {}} options={createDefaultConfigOptions()} />);
    expect(wrapper.find(DataSourceHttpSettings).length).toBe(1);
    expect(wrapper.find(KalDbDetails).length).toBe(1);
    expect(wrapper.find(LogsConfig).length).toBe(1);
  });

  it('should set defaults', () => {
    const options = createDefaultConfigOptions();

    delete options.jsonData.flavor;
    delete options.jsonData.version;
    delete options.jsonData.timeField;
    delete options.jsonData.maxConcurrentShardRequests;
    delete options.jsonData.pplEnabled;

    render(
      <ConfigEditor
        onOptionsChange={options => {
          expect(options.jsonData.flavor).toBe('kaldb');
          expect(options.jsonData.version).toBe('0.0.1');
          expect(options.jsonData.timeField).toBe('@timestamp');
        }}
        options={options}
      />
    );
    expect.assertions(3);
  });

  it('should not apply default if values are set', () => {
    const onChange = jest.fn();

    mount(<ConfigEditor onOptionsChange={onChange} options={createDefaultConfigOptions()} />);

    expect(onChange).toHaveBeenCalledTimes(0);
  });
});
