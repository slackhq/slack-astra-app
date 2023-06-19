import {
  ButtonGroup,
  DrawStyle,
  EmptySearchResult,
  ErrorBoundaryAlert,
  InlineField,
  InlineFieldRow,
  LegendDisplayMode,
  //LogRows,
  PageToolbar,
  PanelChrome,
  QueryField,
  stylesFactory,
  TimeRangePicker,
  TimeSeries,
  ToolbarButton,
  TooltipPlugin,
  useTheme,
  ZoomPlugin,
} from '@grafana/ui';
import React, { Dispatch, FC, SetStateAction, useEffect, useState } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';

import {
  AppEvents,
  applyFieldOverrides,
  AppRootProps,
  dateTimeForTimeZone,
  dateTimeParse, Field,
  FieldColorModeId,
  getTimeZone,
  GrafanaTheme,
  KeyValue,
  LogsDedupStrategy,
  rangeUtil,
  TimeRange,
  toDataFrame,
  toUtc,
} from '@grafana/data';

// @ts-ignore
import { getFieldLinksForExplore } from 'app/features/explore/utils/links';

import { DataSourcePicker, getDataSourceSrv, getLocationSrv, SystemJS } from '@grafana/runtime';
import { css, cx } from '@emotion/css';

const copyStringToClipboard = (string: string) => {
  const el = document.createElement('textarea');
  el.value = string;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);

  SystemJS.load('app/core/app_events').then((appEvents: any) => {
    appEvents.emit(AppEvents.alertSuccess, ['Link copied']);
  });
};

const getStyles = stylesFactory((theme: GrafanaTheme) => {
  return {
    pageToolbar: css`
      padding-top: 8px;
      padding-bottom: 8px;
    `,
    timeseriesChart: css`
      margin-top: 21px;
    `,
    logLines: css`
      margin-top: 21px;

      /* For some reason after the upgrade to Grafana 9.x, the UI hardcoded that
      the content for the logs be strictly limited to whatever the height was. This
      would be fine if the height of the panel was dynamic, but it's fixed. Which means
      we can only set a fixed height for our log viewing (which isn't great), or we can
      do what I did here, which is to find the CSS class that ends in "-panel-content"
      (which this does, link: https://github.com/grafana/grafana/blob/2656c06e0bbc38df5a4a373246dae94d2a7b7cfc/packages/grafana-ui/src/components/PanelChrome/PanelChrome.tsx#L295)
      and unset the "contain" property. This is a bit hacky, but while we're relying on
      the ChromePanel to do what we want, it'll just have to be that way.
      */
      div[class$='-panel-content'] {
        contain: unset !important;
      }
    `,
    queryContainer: css`
      label: queryContainer;
      // Need to override normal css class and don't want to count on ordering of the classes in html.
      height: auto !important;
      flex: unset !important;
      padding: ${theme.panelPadding}px;
    `,
    infoText: css`
      font-size: ${theme.typography.size.sm};
      color: ${theme.colors.textWeak};
      margin-bottom: 20px;
    `,
    exploreContainer: css`
      padding: 16px;
    `,
  };
});

const hasInitialQueryParams = (query: KeyValue<any>) => {
  const params = Object.keys(query);
  return (
    params.includes('queryString') && params.includes('dataSource') && params.includes('to') && params.includes('from')
  );
};

const getZoomedTimeRange = (range: TimeRange, factor: number): TimeRange => {
  const timespan = range.to.valueOf() - range.from.valueOf();
  const center = range.to.valueOf() - timespan / 2;

  const to = center + (timespan * factor) / 2;
  const from = center - (timespan * factor) / 2;

  return rangeUtil.convertRawToRange({ from: dateTimeParse(from), to: dateTimeParse(to) });
};

const formatLogLine = (source: any) => {
  const startHighlight = '\u001b[1m';
  const endHighlight = '\u001b[0m';

  let response = '';
  for (let key of Object.keys(source)) {
    response += `${startHighlight}${key}:${endHighlight} ${source[key]} `;
  }

  return response.substr(0, response.length - 1);
};

const getShiftedTimeRange = (direction: number, origRange: TimeRange): TimeRange => {
  const range = {
    from: toUtc(origRange.from),
    to: toUtc(origRange.to),
  };

  const timespan = (range.to.valueOf() - range.from.valueOf()) / 2;
  let to: number, from: number;

  if (direction === -1) {
    to = range.to.valueOf() - timespan;
    from = range.from.valueOf() - timespan;
  } else if (direction === 1) {
    to = range.to.valueOf() + timespan;
    from = range.from.valueOf() + timespan;
    if (to > Date.now() && range.to.valueOf() < Date.now()) {
      to = Date.now();
      from = range.from.valueOf();
    }
  } else {
    to = range.to.valueOf();
    from = range.from.valueOf();
  }

  return rangeUtil.convertRawToRange({ from: dateTimeParse(from), to: dateTimeParse(to) });
};

export const Explore: FC<AppRootProps> = ({ query, path, meta }) => {
  const [intState, setIntState] = useState({
    queryString: query.queryString ? query.queryString : '',
    dataSource: query.dataSource
      ? query.dataSource
      : getDataSourceSrv().getList({
          type: ['slack-kaldb-app-backend-datasource'],
        })[0].name,
    timeRange:
      query.from && query.to
        ? rangeUtil.convertRawToRange({
            from: isNaN(query.from) ? query.from : dateTimeParse(parseInt(query.from, 10)),
            to: isNaN(query.to) ? query.to : dateTimeParse(parseInt(query.to, 10)),
          })
        : rangeUtil.convertRawToRange({
            from: 'now-15m',
            to: 'now',
          }),
  });

  const setSynchronizedState = (state: any) => {
    // merge input state with existing state, overwriting where necessary
    setIntState(Object.assign(intState, state));
    syncStateToUrl();
  };

  const syncStateToUrl = () => {
    getLocationSrv().update({
      partial: true,
      replace: true,
      query: {
        queryString: intState.queryString,
        dataSource: intState.dataSource,
        from: intState.timeRange.raw.from.valueOf(),
        to: intState.timeRange.raw.to.valueOf(),
      },
    });
  };

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({
    metrics: null,
    logs: null,
    metadata: null,
  });

  const theme = useTheme();
  if (!hasInitialQueryParams(query)) {
    syncStateToUrl();
  }

  const loadData = (callback: Dispatch<SetStateAction<any>>) => {
    getDataSourceSrv()
      .get(intState.dataSource)
      .then(function(datasourceApi) {
        const interval = rangeUtil.calculateInterval(intState.timeRange, 30).interval;
        datasourceApi
          .query({
            range: intState.timeRange,
            scopedVars: {
              __interval: { text: interval, value: interval },
            },
            targets: [
              {
                // @ts-ignore
                query: query.queryString,
                bucketAggs: [
                  {
                    type: 'date_histogram',
                    id: '1',
                    settings: { interval: interval },
                  },
                ],
              },
              {
                // @ts-ignore
                format: 'logs',
                isLogsQuery: true,
                metrics: [
                  {
                    type: 'logs',
                  },
                ],
                query: query.queryString,
                bucketAggs: null,
              },
            ],
          })
          // @ts-ignore
          .toPromise()
          .then(function(response) {
            const metricsResponse = response.data[0];
            const dataQueryResponseData = response.data[1];

            const metadata = {
              metrics: {
                shards: metricsResponse.meta.shards,
              },
              logs: {
                shards: dataQueryResponseData.meta.shards,
              },
            };

            // parse metrics
            const series = toDataFrame(metricsResponse);

            // parse logs
            let tmpLogRows = [];
            if (dataQueryResponseData && typeof dataQueryResponseData.get === 'function') {
              for (let i = 0; i < dataQueryResponseData.length; i++) {
                tmpLogRows.push({
                  // uid: Date.now(),
                  entryFieldIndex: 0,
                  rowIndex: i,
                  dataFrame: dataQueryResponseData,
                  labels: [],
                  entry: JSON.stringify(dataQueryResponseData.get(i)._source),
                  // @ts-ignore
                  timeEpochMs: new Date(dataQueryResponseData.get(i)[datasourceApi.timeField]).valueOf(),
                  hasAnsi: true,
                  // @ts-ignore
                  logLevel: datasourceApi.logLevelField,
                  raw: formatLogLine(dataQueryResponseData.get(i)._source),
                });
              }
            }

            callback({
              metrics: series,
              logs: tmpLogRows,
              metadata: metadata,
            });
          });
      });
  };

  const load = () => {
    setLoading(true);
    loadData(data => {
      setResults(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intState.timeRange, intState.dataSource]);

  const styles = getStyles(theme);

  console.log('3');
  return (
    <>
      <PageToolbar
        pageIcon="compass"
        parent={'KalDB'}
        title={'Explore'}
        className={cx(styles.pageToolbar)}
        //@ts-ignore
        onClickParent={() => {}}
        leftItems={[
          <DataSourcePicker
            key={'datasourcepicker'}
            type={['slack-kaldb-app-backend-datasource']}
            current={intState.dataSource}
            onChange={dataSource => {
              setSynchronizedState({
                dataSource: dataSource.name,
              });
            }}
          />,
        ]}
      >
        <ToolbarButton icon="share-alt" onClick={() => copyStringToClipboard(window.location.href)} />
        <TimeRangePicker
          value={intState.timeRange}
          // isSynced={true}
          onChange={event => {
            setSynchronizedState({
              timeRange: event,
            });
          }}
          onChangeTimeZone={event => {
            //console.log(event);
          }}
          onMoveBackward={() => {
            setSynchronizedState({
              timeRange: getShiftedTimeRange(-1, intState.timeRange),
            });
          }}
          onMoveForward={() => {
            setSynchronizedState({
              timeRange: getShiftedTimeRange(1, intState.timeRange),
            });
          }}
          onZoom={() => {
            setSynchronizedState({
              timeRange: getZoomedTimeRange(intState.timeRange, 2),
            });
          }}
        />
        <ButtonGroup>
          <ToolbarButton
            variant="primary"
            icon="sync"
            disabled={loading}
            onClick={event => {
              load();
            }}
          >
            Run query
          </ToolbarButton>
        </ButtonGroup>
      </PageToolbar>
      <div className={cx('explore-container', styles.exploreContainer)}>
        <div className={cx('panel-container', styles.queryContainer)}>
          <InlineFieldRow>
            <InlineField label="Query" labelWidth={17} grow>
              <>
                <QueryField
                  query={intState.queryString}
                  onBlur={() => {}}
                  onChange={query => {
                    setSynchronizedState({
                      queryString: query,
                    });
                  }}
                  placeholder="Lucene Query"
                  portalOrigin="elasticsearch"
                />
              </>
            </InlineField>
          </InlineFieldRow>
        </div>

        {!loading && results.metrics != null ? (
          <div className={cx(styles.timeseriesChart)}>
            <AutoSizer disableHeight>
              {({ width }) => {
                const series = results.metrics;

                // @ts-ignore
                series.fields[1].config.custom = {
                  drawStyle: DrawStyle.Bars,
                  fillOpacity: 100,
                  pointSize: 5,
                  lineWidth: 0,
                };
                // @ts-ignore
                series.fields[1].config.color = { mode: FieldColorModeId.PaletteClassic };
                // @ts-ignore
                series.fields[1].config.unit = 'short';

                const metricsResults = applyFieldOverrides({
                  // @ts-ignore
                  data: [series],
                  fieldConfig: {
                    overrides: [],
                    defaults: {},
                  },
                  // @ts-ignore
                  theme,
                  replaceVariables: (value: string) => value,
                });

                let totalHits = 0;

                // @ts-ignore
                const valueField = series.fields.find((field: any) => field.name === 'Value');
                if (valueField !== undefined) {
                  totalHits = valueField.state.calcs.sum;
                }

                return (
                  <PanelChrome height={350} width={width} title={'Graph'}>
                    {(innerWidth, innerHeight) => {
                      return (
                        <ErrorBoundaryAlert>
                          <div className={styles.infoText}>
                            <span>{totalHits.toLocaleString()} hits</span>
                            <span style={{ float: 'right' }}>
                              {results.metadata.metrics.shards.total} shards, {results.metadata.metrics.shards.failed}{' '}
                              failed
                            </span>
                          </div>

                          <TimeSeries
                            height={innerHeight - 50}
                            width={innerWidth}
                            frames={metricsResults}
                            legend={{
                              displayMode: LegendDisplayMode.List,
                              placement: 'bottom',
                              calcs: [],
                              showLegend: true,
                            }}
                            timeRange={intState.timeRange}
                            timeZone={getTimeZone()}
                          >
                            {(config, alignedDataFrame) => {
                              config.addHook('draw', u => {
                                let { top, height } = u.bbox;

                                // @ts-ignore
                                if (results.logs && results.logs.length === 500) {
                                  const maxTime = intState.timeRange.to.valueOf();

                                  const minLogTime = Math.min.apply(
                                    Math,
                                    // @ts-ignore
                                    results.logs.map((logLine: { timeEpochMs: any }) => logLine.timeEpochMs)
                                  );

                                  const calcLeft = u.valToPos(minLogTime, 'x', true);
                                  const calcWidth = u.valToPos(maxTime, 'x', true) - calcLeft;

                                  u.ctx.save();
                                  u.ctx.fillStyle = 'rgb(100, 100, 100, 0.2)';
                                  u.ctx.globalCompositeOperation = 'destination-over';
                                  u.ctx.fillRect(calcLeft, top, calcWidth, height);
                                  u.ctx.restore();
                                }
                              });

                              return (
                                <>
                                  <ZoomPlugin
                                    config={config}
                                    onZoom={range => {
                                      setSynchronizedState({
                                        timeRange: rangeUtil.convertRawToRange({
                                          from: dateTimeForTimeZone(getTimeZone(), range.from),
                                          to: dateTimeForTimeZone(getTimeZone(), range.to),
                                        }),
                                      });
                                    }}
                                  />
                                  <TooltipPlugin config={config} data={alignedDataFrame} timeZone={getTimeZone()} />
                                </>
                              );
                            }}
                          </TimeSeries>
                        </ErrorBoundaryAlert>
                      );
                    }}
                  </PanelChrome>
                );
              }}
            </AutoSizer>
          </div>
        ) : null}
        {!loading && results.logs != null ? (
          <div className={cx(styles.logLines)}>
            <AutoSizer disableHeight>
              {({ height, width }) => {
                return (
                  <PanelChrome height={height} width={width} title={`Logs`}>
                    {(innerWidth, innerHeight) => {
                      return (
                        <ErrorBoundaryAlert>
                          <div className={styles.infoText}>
                            <span>
                              {
                                // @ts-ignore
                                results.logs.length
                              }{' '}
                              of 500 limit
                            </span>
                            <span style={{ float: 'right' }}>
                              {results.metadata.logs.shards.total} shards, {results.metadata.logs.shards.failed} failed
                            </span>
                          </div>
                          {// @ts-ignore
                          results.logs.length > 0 ? (
                            <LogRows
                              // @ts-ignore
                              logRows={results.logs}
                              dedupStrategy={LogsDedupStrategy.none}
                              showLabels={true}
                              showTime={true}
                              wrapLogMessage={true}
                              timeZone={getTimeZone()}
                              enableLogDetails={true}
                              showContextToggle={() => {
                                return false;
                              }}
                              getFieldLinks={

                              }
                              prettifyLogMessage={true}
                            />
                          ) : (
                            <EmptySearchResult>Could not find anything matching your query</EmptySearchResult>
                          )}
                        </ErrorBoundaryAlert>
                      );
                    }}
                  </PanelChrome>
                );
              }}
            </AutoSizer>
          </div>
        ) : null}
      </div>
    </>
  );
};
