import React, { useMemo } from 'react';

import {
  CustomTransformOperator,
  DataSourceVariable,
  EmbeddedScene,
  PanelBuilders,
  SceneApp,
  SceneAppPage,
  SceneComponentProps,
  SceneDataTransformer,
  SceneFlexItem,
  SceneFlexLayout,
  SceneObjectBase,
  SceneObjectState,
  SceneObjectStateChangedEvent,
  SceneQueryRunner,
  SceneReactObject,
  SceneTimePicker,
  SceneTimeRange,
  SceneVariableSet,
  TextBoxVariable,
  VariableValueSelectors,
} from '@grafana/scenes';
import { AppRootProps, ArrayVector, DataFrame } from '@grafana/data';
import { DrawStyle, InlineField, Input, Button, InlineLabel, IconButton } from '@grafana/ui';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { VariableHide } from '@grafana/schema';

/**
 * The main explore component for KalDB, using the new Grafana scenes implementation.
 *
 * @see {@link https://grafana.github.io/scenes/ | Grafana scenes documentation}
 * @see {@link https://developers.grafana.com/ui/latest/index.html?path=/story/docs-overview-intro--page | Grafana UI documentation}
 */

const dataSourceVariable = new DataSourceVariable({
  name: 'datasource',
  pluginId: 'slack-kaldb-app-backend-datasource',
  hide: VariableHide.hideVariable,
});

const queryStringVariable = new TextBoxVariable({
  name: 'query',
  value: '',
  hide: VariableHide.hideVariable,
});

// todo - node stats should be moved to another file and imported
interface NodeStatsState extends SceneObjectState {
  total: number;
  failed: number;
}

interface Field {
  name: string;
  type: string;
}

interface FieldStatsState extends SceneObjectState {
  fields: Field[];
}

const NodeStatsRenderer = ({ model }: SceneComponentProps<NodeStats>) => {
  const { total, failed } = model.useState();
  return (
    <>
      {total > -1 && failed > -1 ? (
        <IconButton name={'bug'} tooltip={`${total} nodes queried, ${failed} failed`}></IconButton>
      ) : null}
    </>
  );
};

class NodeStats extends SceneObjectBase<NodeStatsState> {
  static Component = NodeStatsRenderer;
  constructor(state?: Partial<NodeStatsState>) {
    super({
      total: -1,
      failed: -1,
      ...state,
    });
  }
  setCount = (total: number, failed: number) => {
    this.setState({
      total: total,
      failed: failed,
    });
  };
}

// todo - results stats should be moved to another file and imported
interface ResultsStatsState extends SceneObjectState {
  results: number;
}

const ResultsStatsRenderer = ({ model }: SceneComponentProps<ResultStats>) => {
  const { results } = model.useState();

  return <>{results > -1 ? <h5>{results.toLocaleString('en-US')} hits</h5> : <h5></h5>}</>;
};

class ResultStats extends SceneObjectBase<ResultsStatsState> {
  static Component = ResultsStatsRenderer;
  constructor(state?: Partial<ResultsStatsState>) {
    super({
      results: -1,
      ...state,
    });
  }
  setResults = (results: number) => {
    this.setState({
      results: results,
    });
  };

  getCount() {
    return this.state.results;
  }
}

interface KaldbQueryState extends SceneObjectState {
  query: string;
  timeseriesLoading: boolean;
  logsLoading: boolean;
}

const KaldbQueryRenderer = ({ model }: SceneComponentProps<KaldbQuery>) => {
  const { timeseriesLoading, logsLoading } = model.useState();

  return (
    <>
      <InlineField label="Query" grow={true}>
        <Input
          defaultValue={queryStringVariable.getValue().toString()}
          placeholder="Lucene Query"
          onKeyDown={(e) => (e.key === 'Enter' ? model.doQuery() : null)}
          onChange={(e) => model.onTextChange(e.currentTarget.value)}
        />
      </InlineField>
      {timeseriesLoading || logsLoading ? (
        <Button
          icon="fa fa-spinner"
          onClick={() => {
            logsQueryRunner.cancelQuery();
            histogramQueryRunner.cancelQuery();
          }}
          variant="destructive"
        >
          Cancel
        </Button>
      ) : (
        <Button icon="sync" onClick={model.doQuery}>
          Run Query
        </Button>
      )}
    </>
  );
};

const KalDBFieldsRenderer = ({ model }: SceneComponentProps<FieldStats>) => {
  // TODO: Loading state
  // const { timeseriesLoading, logsLoading } = model.useState();
  const { fields } = model.useState();

  return (
    <>
      <div>Available fields: {fields.length}</div>
      <ul>
        {fields.map((field) => (
          <li key={field.name}>
            {field.name} ({field.type})
          </li>
        ))}
      </ul>
    </>
  );
};

class FieldStats extends SceneObjectBase<FieldStatsState> {
  static Component = KalDBFieldsRenderer;
  constructor(state?: Partial<FieldStatsState>) {
    super({
      fields: [],
      ...state,
    });
  }

  setFields = (fields: Field[]) => {
    this.setState({
      fields: fields,
    });
  };
}

class KaldbQuery extends SceneObjectBase<KaldbQueryState> {
  static Component = KaldbQueryRenderer;

  constructor(state?: Partial<KaldbQueryState>) {
    super({
      query: '',
      timeseriesLoading: false,
      logsLoading: false,
      ...state,
    });
  }

  doQuery = () => {
    queryStringVariable.setValue(this.state.query);
  };

  onTextChange = (query: string) => {
    if (query.length === 0) {
      this.setState({
        query: '',
      });
    } else {
      this.setState({
        query: query,
      });
    }
  };

  setLogsLoading = (loading: boolean) => {
    this.setState({
      logsLoading: loading,
    });
  };

  setTimeseriesLoading = (loading: boolean) => {
    this.setState({
      timeseriesLoading: loading,
    });
  };
}

const histogramNodeStats = new NodeStats();
const logsNodeStats = new NodeStats();
const resultsCounter = new ResultStats();
const queryComponent = new KaldbQuery();
const fieldComponent = new FieldStats();

const getExploreScene = () => {
  return new EmbeddedScene({
    $variables: new SceneVariableSet({
      variables: [dataSourceVariable, queryStringVariable],
    }),
    body: new SceneFlexLayout({
      direction: 'column',
      children: [
        new SceneFlexLayout({
          height: 35,
          direction: 'row',
          children: [
            new SceneFlexLayout({
              children: [
                new SceneFlexItem({
                  width: '100%',
                  body: queryComponent,
                }),
                new SceneFlexItem({
                  // todo - zoom out is currently broken, and is a known issue
                  // https://github.com/grafana/scenes/issues/67
                  body: new SceneTimePicker({ isOnCanvas: true }),
                }),
              ],
            }),
          ],
        }),
        new SceneFlexLayout({
          width: '100%',
          children: [
            new SceneFlexItem({
              width: '20%',
              maxWidth: 300,
              body: new SceneFlexLayout({
                direction: 'column',
                children: [
                  new SceneFlexLayout({
                    height: 35,
                    direction: 'row',
                    children: [
                      new SceneFlexItem({
                        width: 'auto',
                        body: new SceneReactObject({
                          reactNode: <InlineLabel width="auto">Data source</InlineLabel>,
                        }),
                      }),
                      new SceneFlexLayout({
                        direction: 'column',
                        children: [
                          new SceneFlexItem({
                            body: dataSourceVariable,
                          }),
                        ],
                      }),
                    ],
                  }),
                  new SceneFlexItem({
                    height: '100%',
                    body: fieldComponent,
                  }),
                ],
              }),
            }),
            new SceneFlexItem({
              width: '100%',
              body: new SceneFlexLayout({
                direction: 'column',
                children: [
                  new SceneFlexItem({
                    body: resultsCounter,
                  }),
                  new SceneFlexItem({
                    height: 300,
                    body: histogramPanel.build(),
                  }),
                  new SceneFlexItem({
                    height: '100%',
                    minHeight: 300,
                    body: logsPanel.build(),
                  }),
                ],
              }),
            }),
          ],
        }),
      ],
    }),
    controls: [new VariableValueSelectors({})],
  });
};

const logsPanel = PanelBuilders.logs()
  .setOption('showTime', true)
  .setOption('wrapLogMessage', true)
  .setHoverHeader(true)
  .setHeaderActions(
    new SceneFlexLayout({
      children: [logsNodeStats],
    })
  )
  .setTitle('Logs');

const logsQueryRunner = new SceneQueryRunner({
  datasource: {
    uid: '${datasource}',
  },
  queries: [
    {
      refId: 'A',
      query: '${query:raw}',
      queryType: 'lucene',
      metrics: [
        {
          id: '1',
          type: 'logs',
        },
      ],
      bucketAggs: [],
      // todo - this should use the config value for timestamp
      timeField: '_timesinceepoch',
    },
  ],
});

logsQueryRunner.subscribeToEvent(SceneObjectStateChangedEvent, (event) => {
  if (typeof event.payload.newState !== 'undefined') {
    if (event.payload.newState['data'].state === 'Done') {
      queryComponent.setLogsLoading(false);
    } else if (event.payload.newState['data'].state === 'Loading') {
      queryComponent.setLogsLoading(true);
    } else if (event.payload.newState['data'].state === 'Error') {
      queryComponent.setLogsLoading(false);
      logsNodeStats.setCount(-1, -1);
      fieldComponent.setFields([]);
    }
  }
});

/**
 * This custom transform operation is used to rewrite the _source field to an ansi log line, as
 * well as initialize the meta information used for debugging purposes.
 */
const logsResultTransformation: CustomTransformOperator = () => (source: Observable<DataFrame[]>) => {
  return source.pipe(
    map((data: DataFrame[]) => {
      // Set log count
      if (data.length > 0 && data[0].meta['shards']) {
        logsNodeStats.setCount(data[0].meta['shards'].total, data[0].meta['shards'].failed);
      }

      // Set field names
      if (data.length > 0 && data[0].fields.length > 0) {
        let mappedFields: Field[] = data[0].fields.map((unmapped_field) => {
          return {
            name: unmapped_field.name,
            type: unmapped_field.type.toString(),
          };
        });
        fieldComponent.setFields(mappedFields);
      }

      return data.map((frame: DataFrame) => {
        return {
          ...frame,
          fields: frame.fields.map((field) => {
            // todo - this should use the config value "message field name"
            if (field.name === '_source') {
              return {
                ...field,
                values: new ArrayVector(
                  field.values.toArray().map((v) => {
                    let str = '';
                    for (const [key, value] of Object.entries(v)) {
                      // we specifically choose style code "2" here (dim) because it is the only style
                      // that has custom logic specific to Grafana to allow it to look good in dark and light themes
                      // https://github.com/grafana/grafana/blob/701c6b6f074d4bc515f0824ed4de1997db035b69/public/app/features/logs/components/LogMessageAnsi.tsx#L19-L24
                      str = str + key + ': ' + '\u001b[2m' + value + '\u001b[0m' + ' ';
                    }
                    return str;
                  })
                ),
              };
            }
            return {
              ...field,
              keys: ['Line'],
            };
          }),
        };
      });
    })
  );
};

logsPanel.setData(
  new SceneDataTransformer({
    $data: logsQueryRunner,
    transformations: [
      logsResultTransformation,
      {
        id: 'organize',
        options: {
          excludeByName: {},
          indexByName: {
            // todo - this should use the config value for timestamp
            _timesinceepoch: 0,
            // todo - this should use the config value "message field name"
            _source: 1,
          },
          renameByName: {},
        },
      },
    ],
  })
);

const histogramQueryRunner = new SceneQueryRunner({
  datasource: {
    uid: '${datasource}',
  },
  queries: [
    {
      refId: 'A',
      query: '${query:raw}',
      queryType: 'lucene',
      metrics: [
        {
          id: '1',
          type: 'count',
        },
      ],
      bucketAggs: [
        {
          type: 'date_histogram',
          id: '2',
          settings: {
            interval: 'auto',
          },
          // todo - this should use the config value for timestamp
          field: '_timesinceepoch',
        },
      ],
      // todo - this should use the config value for timestamp
      timeField: '_timesinceepoch',
    },
  ],
  maxDataPoints: 30,
});

histogramQueryRunner.subscribeToEvent(SceneObjectStateChangedEvent, (event) => {
  if (typeof event.payload.newState !== 'undefined') {
    if (event.payload.newState['data'].state === 'Done') {
      queryComponent.setTimeseriesLoading(false);
    } else if (event.payload.newState['data'].state === 'Loading') {
      resultsCounter.setResults(-1);
      queryComponent.setTimeseriesLoading(true);
    } else if (event.payload.newState['data'].state === 'Error') {
      queryComponent.setTimeseriesLoading(false);
      resultsCounter.setResults(-1);
      histogramNodeStats.setCount(-1, -1);
    }
  }
});

const histogramPanel = PanelBuilders.timeseries()
  .setCustomFieldConfig('drawStyle', DrawStyle.Bars)
  .setCustomFieldConfig('fillOpacity', 100)
  .setOption('legend', { showLegend: false })
  .setHoverHeader(true)
  .setHeaderActions(
    new SceneFlexLayout({
      children: [histogramNodeStats],
    })
  )
  .setTitle('Histogram');

/**
 * This custom transform operation is used to calculate the total results, as well as initialize the
 * meta information used for debugging purposes
 */
const histogramResultTransformation: CustomTransformOperator = () => (source: Observable<DataFrame[]>) => {
  return source.pipe(
    map((data: DataFrame[]) => {
      if (data.length > 0 && data[0].meta['shards']) {
        let counter = 0;
        for (let i = data[0].fields[1].values['buffer'].length - 1; i >= 0; i--) {
          counter += data[0].fields[1].values['buffer'][i];
        }
        resultsCounter.setResults(counter);
        histogramNodeStats.setCount(data[0].meta['shards'].total, data[0].meta['shards'].failed);
      }
      return data;
    })
  );
};

histogramPanel.setData(
  new SceneDataTransformer({
    $data: histogramQueryRunner,
    transformations: [histogramResultTransformation],
  })
);

const explorePage = new SceneAppPage({
  title: 'Explore',
  $timeRange: new SceneTimeRange({
    from: 'now-15m',
    to: 'now',
  }),
  url: '/a/slack-kaldb-app',
  getScene: getExploreScene,
});

const getSceneApp = () =>
  new SceneApp({
    pages: [explorePage],
  });

const ExploreComponent = () => {
  const scene = useMemo(() => getSceneApp(), []);
  return <scene.Component model={scene} />;
};

export const PluginPropsContext = React.createContext<AppRootProps | null>(null);

export class Explore extends React.PureComponent<AppRootProps> {
  render() {
    return (
      <PluginPropsContext.Provider value={this.props}>
        <ExploreComponent />
      </PluginPropsContext.Provider>
    );
  }
}
