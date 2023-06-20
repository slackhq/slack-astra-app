import React, { useMemo } from 'react';

import {
  EmbeddedScene,
  SceneFlexLayout,
  SceneFlexItem,
  PanelBuilders,
  SceneQueryRunner,
  SceneTimeRange,
  SceneDataTransformer,
  SceneApp,
  SceneAppPage,
  SceneTimePicker,
  SceneControlsSpacer,
  SceneRefreshPicker,
  DataSourceVariable,
  SceneVariableSet,
  VariableValueSelectors,
  TextBoxVariable, CustomTransformOperator, SceneObjectState, SceneObjectBase, SceneComponentProps, VizPanel
} from "@grafana/scenes";
import { AppRootProps, DataFrame } from "@grafana/data";
import { DrawStyle } from "@grafana/ui";
import { Observable } from "rxjs";
import { map } from 'rxjs/operators';

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
});

const queryString = new TextBoxVariable({
  name: 'Query',
  value: '*:*',
});

const controls = new VariableValueSelectors({});

// function CustomRenderer(props: SceneComponentProps<Counter>) {
//   return <div>Counter</div>;
// }

//controls.Component = CustomRenderer;

interface CounterState extends SceneObjectState {
  total: number;
  failed: number;
  results: number;
}

const CounterRenderer = ({ model }: SceneComponentProps<Counter>) => {
  const { total, failed, results } = model.useState();

  return (
    <div>
      {
        results >= 0 ?
          <div>Results: {results.toLocaleString("en-US")}</div>
      : <div>Total Nodes: {total} | Failed Nodes: {failed}</div>
      }
    </div>
  );
};

// const CounterRenderer = (props: SceneComponentProps<Counter>) => {
//   return <div>Counter</div>;
// };

class Counter extends SceneObjectBase<CounterState> {
  static Component = CounterRenderer;
  constructor(state?: Partial<CounterState>) {
    super({
      results: -1,
      total: 0,
      failed: 0,
      ...state,
    });
  }
  setCount = (results: number, total: number, failed: number) => {
    this.setState({
      results: results,
      total: total,
    failed: failed
    });
  };
}

const histoCounter = new Counter();
const logsCounter = new Counter();
const resultsCounter = new Counter();

const getLogs = () => {
  //const terms = myTerms.build();
  return new EmbeddedScene({
    $variables: new SceneVariableSet({
      variables: [dataSourceVariable, queryString],
    }),
    body: new SceneFlexLayout({
      direction: 'column',
      children: [
        new SceneFlexItem({
          body: histoCounter,
        }),
        new SceneFlexItem({
          body: resultsCounter,
        }),
        new SceneFlexItem({
          width: '100%',
          height: 300,
          body: hist,
        }),
        new SceneFlexLayout({
          width: '100%',
          children: [
            new SceneFlexItem({
              width: '20%',
              height: 600,
              body: new VizPanel({
                title: 'Field names',
                pluginId: 'text',
                options: {
                  content: '',
                },
              }),
            }),
            new SceneFlexItem({
              width: '80%',
              height: 600,
              body: myPanel,
            }),
            new SceneFlexItem({
              body: logsCounter,
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

const prefixHandlerTransformation: CustomTransformOperator = () => (source: Observable<DataFrame[]>) => {
  // console.log(source);
  return source.pipe(
    map((data: DataFrame[]) => {
      if (data.length > 0 && data[0].meta['shards']) {
        console.log(data[0]);
        logsCounter.setCount(-1, data[0].meta['shards'].total, data[0].meta['shards'].failed);
      }
      return data;
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
  $timeRange: timerange
});

const myHistogram = PanelBuilders.timeseries()
  .setCustomFieldConfig('drawStyle', DrawStyle.Bars)
  .setCustomFieldConfig('fillOpacity', 100)
  // .setOption('showTime', true)
  // .setOption('wrapLogMessage', true)
  //.setDescription('totalNodes:' + totalNodes + ' | failedNodes: ' + failedNodes)
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
        resultsCounter.setCount(counter, 0, 0);
        histoCounter.setCount(-1, data[0].meta['shards'].total, data[0].meta['shards'].failed);
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
  subTitle: 'foo',
  titleImg: '',
  titleIcon: 'compass',
  $timeRange: timerange,
  controls: [
    new SceneControlsSpacer(),
    new SceneTimePicker({ isOnCanvas: true }),
    new SceneRefreshPicker({ isOnCanvas: true }),
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
