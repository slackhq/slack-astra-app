// A stand-in for the Astra API, answering the requests the explore page makes with
// canned results. Each provisioned datasource points at its own path prefix
// (/a, /b), so tests can tell which datasource served a query. Requests are
// recorded and exposed at /__requests.
import { createServer } from 'node:http';

const port = Number(process.env.ASTRA_STUB_PORT ?? 9201);
const requests = [];

const hits = (ds) => {
  const now = Date.now();
  return ['api', 'api', 'worker'].map((service, i) => ({
    _id: `${ds}-${i}`,
    _index: 'testindex',
    _timesinceepoch: new Date(now - (i + 1) * 60_000).toISOString(),
    _source: {
      message: `hello from astra-${ds} ${i}`,
      service,
      trace_id: `trace-${ds}-${i}`,
      _timesinceepoch: new Date(now - (i + 1) * 60_000).toISOString(),
    },
  }));
};

const searchResponse = (ds) => {
  const docs = hits(ds);
  return {
    _shards: { total: 4, failed: 0 },
    hits: { total: { value: docs.length }, hits: docs },
    aggregations: {
      2: {
        buckets: docs.map((doc) => ({ key: Date.parse(doc._timesinceepoch), doc_count: 1 })),
      },
    },
  };
};

const mapping = {
  testindex: {
    mappings: {
      properties: {
        _timesinceepoch: { type: 'date' },
        message: { type: 'text' },
        service: { type: 'keyword' },
        trace_id: { type: 'keyword' },
      },
    },
  },
};

const send = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    const url = new URL(req.url, 'http://stub');
    if (url.pathname === '/__requests') {
      if (req.method === 'DELETE') {
        requests.length = 0;
      }
      return send(res, 200, requests);
    }

    const [, ds, ...rest] = url.pathname.split('/');
    const path = rest.join('/');
    requests.push({ ds, method: req.method, path, body });

    if (path.endsWith('_msearch')) {
      // _msearch bodies are NDJSON header/query pairs; answer each query.
      const searches = body.split('\n').filter(Boolean).length / 2;
      return send(res, 200, { responses: Array.from({ length: searches }, () => searchResponse(ds)) });
    }
    if (path.endsWith('_mapping')) {
      return send(res, 200, mapping);
    }
    return send(res, 404, { error: `astra stub has no handler for ${req.method} ${url.pathname}` });
  });
}).listen(port, () => console.log(`astra stub listening on ${port}`));
