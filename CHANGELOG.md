# Changelog

## 0.2.0
### New features
N/A

### Breaking changes
* Minimum supported Grafana version moved from 8.0 to 9.5

### Bugs squashed
* Resolved an issue where attempting to use datasource alerting could return an error of `request handler error: [plugin.unavailable] plugin unavailable`
* Resolved the deprecation warnings on build system by migrating from `@grafana/toolkit` to `@grafana/create-plugin` 


## 0.1.1
### New features
* Enabled datasource alerting

### Breaking changes
N/A

### Bugs squashed
N/A



## 0.1.0
### New features
* Added a button to go to the associated Zipkin trace view

### Breaking changes
* Rewrote our existing Explore page with a new version built on [Grafana scenes](https://grafana.github.io/scenes/).
This is due to the [unexpected deprecation of logs rendering](https://github.com/grafana/grafana/blob/a50afe67d3f3adef7c6d158d8f19383c07a28af1/docs/sources/breaking-changes/breaking-changes-v10-0.md?plain=1#L247-L269)
without a reasonable alternative provided (see [here](https://github.com/grafana/grafana/issues/65779),
and [here](https://github.com/grafana/grafana/issues/65778)). As no migration path was provided, the quickest solution was to switch
to scenes rendering - this however is not yet stable as it is still in public preview.

### Bugs squashed
N/A



## 0.0.3
### New features
N/A

### Breaking changes
N/A

### Bugs squashed
* Fixed an issue where the KalDB log UI would fail to render in Grafana 9.X versions
* Fixed an issue where we weren't properly mapping and parsing the dates returned by KalDB
* Fixed an issue where we still allowed folks to select "PPL" as a query type, despite it not being (currently)
supported

## 0.0.2

### New features
* Initial release of KalDB backend datasource
* Shard count (total, failed) from KalDB explore page

### Breaking changes
* Elasticsearch is no longer a supported datasource from KalDB explore UI

## 0.0.1

Initial plugin release
