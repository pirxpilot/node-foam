var getlet = require('getlet')
  , concat = require('concat-stream')
  , XML = require('./lib/xml')
  ;

module.exports = function soap (uri, operation, action, message, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  var networkError;
  var xml = envelope(operation, message, options);
  var out = concat({ encoding: 'string' }, function(data) {
    if (networkError) return callback(networkError);
    XML.parse(data, function(err, obj) {
      if (err) return callback(err);
      callback(null, obj['Envelope']['Body']);
    });
  });

  if (options.benchmark) console.time('soap request: ' + uri);

  getlet(uri)
    .method('POST')
    .send(xml)
    .set(headers(action, xml.length))
    .pipe(out)
    .on('error', function(err) {
      networkError = err;
    });
};

function envelope (operation, message, options) {
  var xml = '<?xml version="1.0" encoding="UTF-8"?>';
  xml += '<env:Envelope xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
    'xmlns:env="http://schemas.xmlsoap.org/soap/envelope/" ' + namespaces(options.namespaces) + '>';

  if (options.header) {
    xml += '<env:Header>';
    xml += typeof options.header === 'object' ? XML.stringify(options.header) : options.header.toString();
    xml += '</env:Header>';
  }

  xml += '<env:Body>';
  xml += serializeOperation(operation, options); // '<' + operation + ' xmlns="' + options.namespace + '"' + '>';
  xml += typeof message === 'object' ? XML.stringify(message) : message.toString();
  xml += '</' + operation + '>';
  xml += '</env:Body>';
  xml += '</env:Envelope>';

  return xml;
}

function headers (schema, length) {
  return {
    Soapaction: schema,
    'Content-Type': 'text/xml;charset=UTF-8',
    'Content-Length': length,
    'Accept-Encoding': 'gzip',
    Accept: '*/*'
  };
}

function namespaces (ns) {
  var attributes = '';
  for (var name in ns) {
    attributes += name + '="' + ns[name] + '" ';
  }
  return attributes.trim();
}

function serializeOperation (operation, options) {
  return '<' + operation + (options.namespace ? ' xmlns="' + options.namespace + '"' : '') + '>';
}
