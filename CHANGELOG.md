# Changelog

# 0.0.3
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
