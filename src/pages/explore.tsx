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
import {
  Button,
  DrawStyle,
  HorizontalGroup,
  VerticalGroup,
  IconButton,
  InlineField,
  InlineLabel,
  Input,
  Counter,
  LoadingPlaceholder,
  useTheme2
} from '@grafana/ui';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { VariableHide } from '@grafana/schema';
import { Field } from 'datasource/types';
import FieldValueFrequency from '../datasource/components/FieldValueFrequency';
import { FixedSizeList as List } from 'react-window'

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

interface FieldStatsState extends SceneObjectState {
  fields: Field[];
  topTenMostPopularFields: Field[];
  visible: boolean;
  loading: boolean;
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
  loading: boolean;
}

const KaldbQueryRenderer = ({ model }: SceneComponentProps<KaldbQuery>) => {
  const { loading } = model.useState();

  return (
    <>
      <InlineField label="Query" grow={true}>
        <Input
          defaultValue={queryStringVariable.getValue().toString()}
          // This is a bit of a hack to get the defaultValue to update after the user has made some changes and then
          // we try to update the queryStringVariable for them again.
          // Link to StackOverflow discussion: https://stackoverflow.com/questions/30146105/react-input-defaultvalue-doesnt-update-with-state
          key={queryStringVariable.getValue().toString()}
          placeholder="Lucene Query"
          onKeyDown={(e) => (e.key === 'Enter' ? model.doQuery() : null)}
          onChange={(e) => model.onTextChange(e.currentTarget.value)}
        />
      </InlineField>
      {loading ? (
        <Button
          icon="fa fa-spinner"
          onClick={() => {
            queryRunner.cancelQuery();
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

const KalDBFieldsList = (fields: Field[], topTenMostPopularFields: Field[]) => {
  const getIcon = (field: Field): string => {
    if (field.type === 'string') {
      return 'fa fas fa-font';
    }

    if (field.type === 'text') {
      return 'fa fas fa-font';
    }

    if (field.type === 'integer') {
      return 'fa fas fa-hashtag';
    }

    if (field.type === 'float') {
      return 'fa fas fa-hashtag';
    }

    if (field.type === 'double') {
      return 'fa fas fa-hashtag';
    }

    if (field.type === 'long') {
      return 'fa fas fa-hashtag';
    }

    if (field.type === 'boolean') {
      return 'fa fas fa-lightbulb';
    }

    if (field.type === 'time') {
      return 'fa far fa-calendar';
    }

    return 'fa fas fa-question';
  };

  const getTitle = (field: Field): string => {
    if (field.type === 'string') {
      return 'String field';
    }

    if (field.type === 'text') {
      return 'Text field';
    }

    if (field.type === 'integer') {
      return 'Integer field';
    }

    if (field.type === 'float') {
      return 'Float field';
    }

    if (field.type === 'double') {
      return 'Double field';
    }

    if (field.type === 'long') {
      return 'Long field';
    }

    if (field.type === 'boolean') {
      return 'Boolean field';
    }

    if (field.type === 'time') {
      return 'Date field';
    }

    return 'Unknown field';
  };

  const ListItem = ({ index,  data }) => {
    const field = data[index];

    return (<div key={index} style={{
      cursor: 'pointer'
    }}>
      <FieldValueFrequency
        field={field}
        onPlusClick={(field: Field, value: string) => queryComponent.appendToQuery(`${field.name}: ${value}`)}
        onMinusClick={(field: Field, value: string) =>
          queryComponent.appendToQuery(`NOT ${field.name}: ${value}`)
        }
      >
        <div>
          <HorizontalGroup>
            <i className={getIcon(field)} title={getTitle(field)} style={{ paddingTop: '12px' }}></i>
            <span
              style={{
                paddingTop: '10px',
                fontFamily: 'monospace',
              }}
            >
              {field.name}
            </span>
          </HorizontalGroup>
        </div>
      </FieldValueFrequency>
    </div>);
  }


  return (
    <div>
      <div
        style={{
          backgroundColor: useTheme2().isDark ? '#343741' : '#e6f1fa',
          paddingLeft:'15px',
        }}
      >
        <span
          style={{
            padding: '15px',
            fontWeight: 'bold',
          }}
        >
          Popular
        </span>
        <List
          height={30*topTenMostPopularFields.length}
          width={"100%"}
          itemCount={topTenMostPopularFields.length}
          itemData={topTenMostPopularFields}
          itemSize={30}
          style={{
            overflow: 'hidden',
            maxWidth: '250px'
          }}
        >
          {ListItem}
        </List>
      </div>
      <div
        style={{
          paddingLeft:'15px',
        }}
      >
        <List
          height={33*fields.length}
          width={"100%"}
          itemCount={fields.length}
          itemData={fields}
          itemSize={30}
          style={{
            overflow: 'hidden',
            maxWidth: '250px'
          }}
        >
          {ListItem}
        </List>
        </div>
    </div>
  );
};

const KalDBFieldsRenderer = ({ model }: SceneComponentProps<FieldStats>) => {
  const { fields, topTenMostPopularFields, visible, loading } = model.useState();

  const getFoldIcon = () => {
    if (visible) {
      return 'angle-down';
    }
    return 'angle-right';
  };

  return (
    <>
      {loading ? (
        <LoadingPlaceholder text={'Loading...'} />
      ) : (
        <VerticalGroup>
          <HorizontalGroup spacing={'lg'} justify={'space-between'}>
            <HorizontalGroup spacing={'xs'} justify={'flex-start'}>
              <Button
                size={'sm'}
                variant={'secondary'}
                icon={getFoldIcon()}
                onClick={() => fieldComponent.setVisible(!visible)}
              ></Button>
              <span
                style={{
                  padding: '15px',
                  fontWeight: 'bold',
                }}
              >
                Available fields:
              </span>
            </HorizontalGroup>

            <Counter value={fields.length} />
          </HorizontalGroup>
          {visible ? KalDBFieldsList(fields, topTenMostPopularFields) : null}
        </VerticalGroup>
      )}
    </>
  );
};

class FieldStats extends SceneObjectBase<FieldStatsState> {
  static Component = KalDBFieldsRenderer;
  constructor(state?: Partial<FieldStatsState>) {
    super({
      fields: [],
      topTenMostPopularFields: [],
      visible: true,
      loading: true,
      ...state,
    });
  }
  setTopTenMostPopularFields = (fields: Field[]) => {
    this.setState({
      topTenMostPopularFields: fields,
    });
  };

  setLoading = (loading: boolean) => {
    this.setState({
      loading: loading,
    });
  };

  setVisible = (visible: boolean) => {
    this.setState({
      visible: visible,
    });
  };

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
      loading: false,
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

  appendToQuery = (query: string) => {
    let currentQuery = this.state.query;
    let newQuery = '';
    let currentQueryIsBlank = currentQuery.replace(' ', '').length === 0;

    // Append the new query to the current one. Handle the case of there already being a whitespace at the end,
    // and the edge case of the current query being empty
    if (currentQuery.endsWith(' ')) {
      if (currentQueryIsBlank) {
        newQuery = currentQuery + query;
      } else {
        newQuery = currentQuery + 'AND ' + query;
      }
    } else {
      if (currentQueryIsBlank) {
        newQuery = query;
      } else {
        newQuery = currentQuery + ' AND ' + query;
      }
    }

    this.setState({
      query: newQuery,
    });

    this.doQuery();
  };

  setLoading = (loading: boolean) => {
    this.setState({
      loading: loading,
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
                width: '20%',
                maxWidth: 100,
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

      // Set field names, the most popular fields, and calculates the frequency of the most common values
      if (data.length > 0 && data[0].fields.length > 0) {
        let fieldCounts: Map<string, number> = new Map<string, number>();

        let mappedFields: Map<string, Field> = new Map<string, Field>();
        data[0].fields.map((unmappedField) => {
          let unmappedFieldValuesArray = unmappedField.values.toArray();
          let logsWithDefinedValue = unmappedFieldValuesArray.filter((value) => value !== undefined).length;

          let mapped_field: Field = {
            name: unmappedField.name,
            type: unmappedField.type.toString(),
            numberOfLogsFieldIsIn: logsWithDefinedValue,
            unmappedFieldValuesArray: unmappedFieldValuesArray
          };

          fieldCounts.set(unmappedField.name, logsWithDefinedValue);
          mappedFields.set(unmappedField.name, mapped_field);
        });

        let sortedFieldCounts: Map<string, number> = new Map([...fieldCounts].sort((a, b) => (a[1] >= b[1] ? -1 : 0)));
        let topTenMostPopularFields: Field[] = [];
        let i = 0;
        for (let [name, _count] of sortedFieldCounts) {
          if (i === 10) {
            break;
          }

          // Add the name to the top ten field and remove it from the mapped fields, which is used to display all the
          // others. This way we don't double-display
          topTenMostPopularFields.push(mappedFields.get(name));
          mappedFields.delete(name);
          i++;
        }

        fieldComponent.setFields([...mappedFields.values()]);
        fieldComponent.setTopTenMostPopularFields(topTenMostPopularFields);
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

const queryRunner = new SceneQueryRunner({
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

queryRunner.subscribeToEvent(SceneObjectStateChangedEvent, (event) => {
  if (typeof event.payload.newState !== 'undefined') {
    if (event.payload.newState['data'].state === 'Done') {
      queryComponent.setLoading(false); 
      fieldComponent.setLoading(false);
    } else if (event.payload.newState['data'].state === 'Loading') {
      resultsCounter.setResults(-1);
      queryComponent.setLoading(true); 
      fieldComponent.setLoading(true);
    } else if (event.payload.newState['data'].state === 'Error') {
      queryComponent.setLoading(false); 
      fieldComponent.setFields([]);
      fieldComponent.setTopTenMostPopularFields([])
      fieldComponent.setLoading(false);
      logsNodeStats.setCount(-1, -1);
      resultsCounter.setResults(-1);
      histogramNodeStats.setCount(-1, -1);
    }
  }
});

logsPanel.setData(
  new SceneDataTransformer({
    $data: queryRunner,
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
        for (let i = data[1].fields[1].values['buffer'].length - 1; i >= 0; i--) {
          counter += data[1].fields[1].values['buffer'][i];
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
    $data: queryRunner,
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
