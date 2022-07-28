# KalDB Grafana App

This Grafana plugin adds support for [KalDB](https://github.com/slackhq/kaldb), and includes both a datasource and 
simplified explore interface.

To get started [install](https://grafana.com/docs/grafana/latest/plugins/installation/) this app, then enable it from 
the Grafana plugins page under "KalDB by Slack". Once installed a new datasource type will be available, and the KalDB
explore icon will appear on the left side of the Grafana UI.

![KalDB explore](src/img/kaldb_explore.png)

## KalDB vs Elasticsearch datasource
⚠️ The KalDB datasource is not currently stable, so prefer using the 
[Elasticsearch API compatibility](https://github.com/slackhq/kaldb/blob/a6582a5f1e73ef69058b6a51b602328873498ab0/kaldb/src/main/java/com/slack/kaldb/elasticsearchApi/ElasticsearchApiService.java) 
provided by KalDB when configuring a datasource.
