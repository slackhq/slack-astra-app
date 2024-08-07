# Changelog

## 0.6.2
### New features
* N/A

### Breaking changes
* N/A

### Bugs squashed
* Swapped the default query to be `*:*` instead of `*`. This was resulting in
a failure to load logs when using newer querying paths

## 0.6.1
### New features
* N/A

### Breaking changes
* N/A

### Bugs squashed
* Resolved a date timezone formatting issue where dates were incorrectly rendered on explore page
* Disabled field type icon as this was rendering incorrect types
* Addressed some text alignment and overflow bugs
* Fixed available field count not including top fields

## 0.6.0
### New features
* N/A

### Breaking changes
* Project name updated - this will require require re-creating any existing data sources 
* Minimum Grafana version updated to 10.0

### Bugs squashed
* Resolved an issue where date time formatting was incorrectly handled after Astra updates to support ES datasources
* Resolved an issue where empty results would incorrectly render faux table contents
* Resolved an issue where empty results would not correctly clear previous result state

## 0.5.1
### New features
* N/A

### Breaking changes
* N/A

### Bugs squashed
* Fixed a bug that was preventing the histogram from rendering on Grafana 10
* Fixed an off-by-one error that was preventing a result with 1 log returned from rendering
* Fixed a bug that was preventing metadata fields from being rendered in the expanded view


## 0.5.0
### New features
* Significantly improved the performance through proper virtualization

### Breaking changes
* Significantly refactored the UI to be fully custom and more in-line with 
our future design ideas/plans

### Bugs squashed
N/A


## 0.4.0
### New features
* Improved the performance of the application by combining two network requests into one
* Improved the performance of the application through various optimizations that _should_
result in an average load time speed up of ~50%

### Breaking changes
N/A

### Bugs squashed
* Fixed the background color for the most popular fields list not being correct in dark mode 


## 0.3.0
### New features
* Added a sidebar that displays all the detected fields in the logs returned
* Added a popover on the sidebar that when clicked will show detailed statistics about the values of a given field
* Added buttons to the popover sidebar UI that allows you to filter fields by one of the values shown (either positively
or negatively), added loading indicators, folding, and various other small touchups

### Breaking changes
N/A

### Bugs squashed
* Fixed an issue in the explore UI where queries over `250px` wide in the filter query textbox would cause the textbox to 
go behind other components
* Fixed an issue in the explore UI where if you cleared out all of the text from the filter query textbox you would be
unable to add more text

## 0.2.1
### New features
N/A

### Breaking changes
* Removes deprecated "raw document" type from selectable metric options (prefer "raw data" moving forward)

### Bugs squashed
* Explore no longer requests an unused aggregation when querying logs

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
* Fixed an issue where the Astra log UI would fail to render in Grafana 9.X versions
* Fixed an issue where we weren't properly mapping and parsing the dates returned by Astra
* Fixed an issue where we still allowed folks to select "PPL" as a query type, despite it not being (currently)
supported

## 0.0.2

### New features
* Initial release of Astra backend datasource
* Shard count (total, failed) from Astra explore page

### Breaking changes
* Elasticsearch is no longer a supported datasource from Astra explore UI

## 0.0.1

Initial plugin release
