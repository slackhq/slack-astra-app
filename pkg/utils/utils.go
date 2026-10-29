// Copied from github.com/grafana/opensearch-datasource v1.2.0 (Apache 2.0), pkg/utils.
// Vendored so the backend no longer depends on github.com/grafana/grafana v6.

package utils

import (
	"encoding/json"

	"github.com/bitly/go-simplejson"
)

func NewJsonFromAny(data interface{}) *simplejson.Json {
	dataByte, _ := json.Marshal(data)
	dataJson, _ := simplejson.NewJson(dataByte)
	return dataJson
}

func NewRawJsonFromAny(data interface{}) []byte {
	dataByte, _ := json.Marshal(data)
	dataJson, _ := simplejson.NewJson(dataByte)
	dataJsonRaw, _ := dataJson.MarshalJSON()
	return dataJsonRaw
}
