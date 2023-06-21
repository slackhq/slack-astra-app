import React, { useMemo } from "react";

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
  SceneQueryRunner, SceneReactObject,
  SceneTimePicker,
  SceneTimeRange,
  SceneVariableSet,
  TextBoxVariable,
  VariableValueSelectors,
  VizPanel
} from "@grafana/scenes";
import {
  AppRootProps,
  ArrayVector,
  DataFrame,
  Field,
  FieldType,
  LinkModel
} from "@grafana/data";
import { DrawStyle, InlineField, Input, Button, InlineLabel, IconButton } from "@grafana/ui";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { VariableHide } from "@grafana/schema";
import { VariableInterpolation } from "@grafana/runtime";

const timerange = new SceneTimeRange({
  from: 'now-15m',
  to: 'now',
});

const dataSourceVariable = new DataSourceVariable({
  name: 'Datasource',
  options: [],
  value: '',
  text: '',
  pluginId: 'slack-kaldb-app-backend-datasource',
  hide: VariableHide.hideVariable,
});

const queryString = new TextBoxVariable({
  name: 'Query',
  value: '*:*',
  hide: VariableHide.hideVariable,
});

const controls = new VariableValueSelectors({});

interface ResultsStatsState extends SceneObjectState {
  results: number;
}

interface NodeStatsState extends SceneObjectState {
  total: number;
  failed: number;
}

const NodeStatsRenderer = ({ model }: SceneComponentProps<NodeStats>) => {
  const { total, failed } = model.useState();

  return (
    <>
      {
        (total > -1 && failed > -1) ?
          <IconButton name={"bug"} tooltip={`${total} nodes queried, ${failed} failed`}>
          </IconButton>
      : null}
    </>
  );
};

const ResultsStatsRenderer = ({ model }: SceneComponentProps<ResultStats>) => {
  const { results } = model.useState();

  return (
    <>
      {
        results > -1 ?
            <h5>{results.toLocaleString("en-US")} hits</h5>
          : <h5></h5>
      }
    </>
  );
};

// const CounterRenderer = (props: SceneComponentProps<Counter>) => {
//   return <div>Counter</div>;
// };

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
  query: string,
}

const KaldbQueryRenderer = ({ model }: SceneComponentProps<KaldbQuery>) => {
  // const { query } = model.useState();

  return (
    <>
      <InlineField label="Query" grow={true}>
        <Input placeholder="*:*" onKeyDown={(e) => e.key === 'Enter' ? model.doQuery(): null} onBlur={(e) => model.onTextChange(e.currentTarget.value)}/>
      </InlineField>
      <Button icon='sync' onClick={model.doQuery}>
        Run Query
      </Button>
    </>
  );
};

class KaldbQuery extends SceneObjectBase<KaldbQueryState> {
  static Component = KaldbQueryRenderer;

  constructor(state?: Partial<KaldbQueryState>) {
    super({
      query: '*:*',
      ...state,
    });
  }

  doQuery = () => {
    queryString.setValue(this.state.query);
    // console.log('query string: ' + this.state.query);
  };

  onTextChange = (query: string) => {
    if (query.length == 0) {
      this.setState({
        query: '*:*',
      });
    } else {
      this.setState({
        query: query,
      });
    }
  };
}

const histoCounter = new NodeStats();
const logsCounter = new NodeStats();
const resultsCounter = new ResultStats();
const query = new KaldbQuery();

const getLogs = () => {
  //const terms = myTerms.build();
  return new EmbeddedScene({
    $variables: new SceneVariableSet({
      variables: [dataSourceVariable, queryString],
    }),
    body: new SceneFlexLayout({
      direction: 'column',
      children: [
        new SceneFlexLayout({
          height: 35,
          direction: 'row',
          children: [
            new SceneFlexLayout({
              // width: '80%',
              // ySizing: 'fill',
              children: [
                new SceneFlexItem({
                  width: '100%',
                  body: query,
                }),
                new SceneFlexItem({
                  body: new SceneTimePicker({ isOnCanvas: true }),
                }),
              ]
            }),
            // new SceneFlexLayout({
            //   // width: '20%',
            //   ySizing: 'content',
            //   children: [
            //     new SceneFlexItem({
            //       body: new SceneTimePicker({ isOnCanvas: true }),
            //     }),
            //   ]
            // })
          ]
        }),
        new SceneFlexLayout({
          width: '100%',
          children: [
            new SceneFlexItem({
              width: '20%',
              maxWidth: 300,
              //height: 600,
              body: new SceneFlexLayout({
                direction: 'column',
                children: [
                  new SceneFlexLayout({
                    height: 35,
                    direction: 'row',
                    // width: '100%',
                    children: [
                      new SceneFlexItem({
                        // ySizing: 'content',
                        //wrap: ''
                        // width: '20%',
                        width: 'auto',
                        body: new SceneReactObject({
                          reactNode:
                            <InlineLabel width="auto">
                              Datasource
                            </InlineLabel>
                          ,
                        })
                      }),
                      new SceneFlexLayout({
                        direction: 'column',
                        children: [
                          new SceneFlexItem({
                            // ySizing: 'content',
                            // width: '80%',
                            body: dataSourceVariable
                          })
                        ]
                      })
                    ]
                    //}),
                    // dataSourceVariable,
                    // height: 20
                  }),
                  new SceneFlexItem({
                    height: '100%',
                    body: new VizPanel({
                      // displayMode: 'transparent',
                      title: '',
                      pluginId: 'text',
                      options: {
                        content: '',
                      },
                    })
                  })
                ]
              }),
            }),
            new SceneFlexItem({
              width: '100%',
              // height: 600,
              //body: myPanel,
              body: new SceneFlexLayout({
                direction: 'column',
                children: [
                  new SceneFlexItem({
                    body: resultsCounter
                    // resultsCounter,

                  }),
                  // new VizPanel({
                  //   displayMode: 'transparent',
                  //   title: '',
                  //   pluginId: 'text',
                  //   options: {
                  //     content: '',
                  //   },
                  // })

                  // new SceneFlexItem({
                  //   height: 20,
                  //   body: histoCounter,
                  // }),
                  // new SceneFlexItem({
                  //   height: 20,
                  //   body: resultsCounter,
                  // }),

                  new SceneFlexItem({
                    height: 300,
                    body: hist,
                  }),
                  new SceneFlexItem({
                    height: '100%',
                    minHeight: 300,
                    // height: 300,
                    body: myPanel,
                  }),
                  // new SceneFlexItem({
                  //   body: logsCounter,
                  // }),
                  ]
              })
            }),

          ],
        }),
        // new SceneFlexItem({
        //   width: '20%',
        //   height: 600,
        //   body: terms,
        // }),
      ],
    }),
    controls: [controls],
  });
};

const myLogs = PanelBuilders.logs()
  .setOption('showTime', true)
  .setOption('wrapLogMessage', true)
  // .setDisplayMode('transparent')
  .setHoverHeader(true)
  .setHeaderActions(
    new SceneFlexLayout({
    children: [
      logsCounter,
    ]
    })
  )
  .setTitle('Logs');

const data = new SceneQueryRunner({
  datasource: {
    type: 'slack-kaldb-app-backend-datasource',
    uid: 'c1235829-3d57-4743-a436-a945321a07e4',
  },
  queries: [
    {
      refId: 'A',
      query: '${Query:raw}',
      queryType: 'lucene',
      metrics: [
        {
          id: '1',
          type: 'logs',
        },
      ],
      bucketAggs: [],
      // format: 'table',
      timeField: '_timesinceepoch',
    },
  ],
  $timeRange: timerange,
});

interface ExploreFieldLinkModel extends LinkModel<Field> {
  variables?: VariableInterpolation[];
}

// @ts-ignore
const prefixHandlerTransformation: CustomTransformOperator = () => (source: Observable<DataFrame[]>) => {
  // console.log(source);
  return source.pipe(
    map((data: DataFrame[]) => {
      if (data.length > 0 && data[0].meta['shards']) {
        console.log(data[0]);
        logsCounter.setCount(data[0].meta['shards'].total, data[0].meta['shards'].failed);
      }
      return data.map((frame: DataFrame) => {
        return {
          ...frame,
          fields: frame.fields.map((field) => {
            console.log(field);

            //new Field
            if (field.name === '_source') {
              return {
                ...field,
                values: new ArrayVector(field.values.toArray().map((v) => {
                    let str = '';
                  for (const [key, value] of Object.entries(v)) {
                    str = str + key + ': ' + '\u001b[2m' + value + '\u001b[0m' + ' ';
                  }
                    return str;
                }))
              };
            }

            const variableLink: ExploreFieldLinkModel = {
              href: 'test',
              onClick: () => {},
              origin: {
                config: { links: [] },
                name: 'Line',
                type: FieldType.string,
                values: new ArrayVector(['a', 'b']),
              },
              title: 'test',
              target: '_self',
              variables: [
                { variableName: 'path', value: 'test', match: '${path}', found: true },
                { variableName: 'msg', value: 'test msg', match: '${msg}', found: true },
              ],
            };

            // const variableLink: ExploreFieldLinkModel = {
            //   href: 'test',
            //   onClick: () => {},
            //   origin: {
            //     config: { links: [] },
            //     name: 'Line',
            //     type: FieldType.string,
            //     values: ['a', 'b'],
            //   },
            //   title: 'test',
            //   target: '_self',
            //   variables: [
            //     { variableName: 'path', value: 'test', match: '${path}', found: true },
            //     { variableName: 'msg', value: 'test msg', match: '${msg}', found: true },
            //   ],
            // };


            return {
              ...field,
              keys: ['Line'],
              fieldIndex: 2,
              links: [variableLink],
            };

            // return field;
          }),
        };
      });
      //return data;
    })
  );
};

const transformedData = new SceneDataTransformer({
  $data: data,
  transformations: [
    prefixHandlerTransformation,
    {
      id: 'organize',
      options: {
        excludeByName: {},
        indexByName: {
          _timesinceepoch: 0,
          _source: 1,
        },
        renameByName: {},
      },
    },
  ],
});

myLogs.setData(transformedData);

const dataTs = new SceneQueryRunner({
  datasource: {
    type: 'slack-kaldb-app-backend-datasource',
    uid: 'c1235829-3d57-4743-a436-a945321a07e4',
  },
  queries: [
    {
      refId: 'A',
      query: '${Query:raw}',
      queryType: 'lucene',
      metrics: [
        {
          id: '1',
          type: 'count',
        },
        // {
        //   id: '2',
        //   type: 'cumulative_sum',
        //   field: '1'
        // },
      ],
      bucketAggs: [
        {
          type: 'date_histogram',
          id: '2',
          settings: {
            interval: 'auto',
          },
          field: '_timesinceepoch',
        },
      ],
      // format: 'table',
      timeField: '_timesinceepoch',
    },
  ],
  $timeRange: timerange,
  maxDataPoints: 30,
});

const myHistogram = PanelBuilders.timeseries()
  .setCustomFieldConfig('drawStyle', DrawStyle.Bars)
  .setCustomFieldConfig('fillOpacity', 100)
  .setOption('legend', {showLegend: false})
  .setHoverHeader(true)
  .setHeaderActions(
    new SceneFlexLayout({
      children: [
        // new SceneControlsSpacer(),
        histoCounter,
      ]
    })
  )
  // .set
  // .setOption('showTime', true)
  // .setOption('wrapLogMessage', true)
  //.setDescription('totalNodes:' + totalNodes + ' | failedNodes: ' + failedNodes)
  //.setHeaderActions()
  //.setHoverHeader(false)
  // .setDisplayMode('transparent')
  .setTitle('Histogram');


const prefixHandlerTransformationHisto: CustomTransformOperator = () => (source: Observable<DataFrame[]>) => {
  // console.log(source);
  return source.pipe(
    map((data: DataFrame[]) => {
      if (data.length > 0 && data[0].meta['shards']) {
        //console.log(data[0], data[0].fields[1].values['buffer']);

        var counter = 0;
        for (let i = data[0].fields[1].values['buffer'].length - 1; i >= 0; i--) {
          counter += data[0].fields[1].values['buffer'][i];
        }
        resultsCounter.setResults(counter);
        histoCounter.setCount(data[0].meta['shards'].total, data[0].meta['shards'].failed);
      }
      return data;
    })
  );
};


const transformedDataHisto = new SceneDataTransformer({
  $data: dataTs,
  transformations: [
    prefixHandlerTransformationHisto,
  ],
});

myHistogram.setData(transformedDataHisto);

const myPanel = myLogs.build();
const hist = myHistogram.build();


const myAppPage = new SceneAppPage({
  title: 'Explore',
  // renderTitle: (title: string) => <></>,
  //subTitle: 'foo',
  // titleImg: '',

  titleIcon: 'compass',
  $timeRange: timerange,
  controls: [
    // new SceneControlsSpacer(),
    // new SceneTimePicker({ isOnCanvas: true }),
    // new SceneRefreshPicker({ isOnCanvas: true }),
  ],
  url: '/a/slack-kaldb-app',
  getScene: getLogs,
});

const getSceneApp = () =>
  new SceneApp({
    pages: [myAppPage],
  });

const Exp = () => {
  const scene = useMemo(() => getSceneApp(), []);

  return <scene.Component model={scene} />;
};

// This is used to be able to retrieve the root plugin props anywhere inside the app.
export const PluginPropsContext = React.createContext<AppRootProps | null>(null);

export class Explore extends React.PureComponent<AppRootProps> {
  render() {
    return (
      <PluginPropsContext.Provider value={this.props}>
        <Exp />
      </PluginPropsContext.Provider>
    );
  }
}

// export const Explore: FC<AppRootProps> = ({ query, path, meta }) => {
//   const scene = getLogs();
//
//   console.log('4');
//   return (
//     <>
//       <scene.Component model={getLogs()} />
//     </>
//   );
// };
