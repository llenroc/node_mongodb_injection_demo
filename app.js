process.env.NODE_ENV = 'development';

var express = require('express'),
  expressValidator = require('express-validator'),
  Db = require('mongodb').Db,
  Server = require('mongodb').Server,
  app = express(),
  bodyParser = require('body-parser'),
  server = require('http').createServer(app),
  db = new Db('injection_demo', new Server('localhost', 27017));

db.open(function (err, db) {
  db.dropCollection('tokens', function () {
    db.createCollection('tokens', function (err, collection) {
      collection.insert([{
        docId: 1,
        token: 'XKCD7999',
        accessType: 'write'
      }, {
        docId: 1,
        token: 'XKCD7998',
        accessType: 'read'
      }]);
    });
  });
});

app.use(bodyParser.json());
app.use(expressValidator());

function checkDocAccess(docId, token, accessType, cb) {
  db.collection('tokens').findOne({
    accessType: accessType,
    docId: docId,
    token: token
  }, function (err, tokenInDb) {
    var retval = !err && tokenInDb;
    console.log('access to ' + docId + '/' + accessType + ' with token ' + token + ': ' + !!retval);
    cb(retval);
  });
}

app.get('/api/doc/:id', function (req, res) {
  var docId = req.params.id,
    token = req.query.token;

  req.assert('token').len(8);
  var errors = req.validationErrors();
  if (errors) {
    return res.status(400).json(errors);
  }

  checkDocAccess(parseInt(docId, 10), token, 'read',
    function (accessAllowed) {
      if (!accessAllowed) {
        return res.status(403).send('wrong id or invalid token');
      }
      res.status(200).send('You can read document #' + docId);
    });
});

app.put('/api/doc/:id', function (req, res) {
  checkDocAccess(parseInt(req.params.id, 10), req.body.token, 'write',
    function (accessAllowed) {
      if (!accessAllowed) {
        return res.status(403).send('wrong id or invalid token');
      }
      //TODO modify document
      res.status(200).send('You can modify document #' + req.params.id);
    });
});

app.get('/:filename', function (req, res) {
  res.status(200).sendFile(req.params.filename, {
    root: __dirname
  });
});


// Start server
var port = 3000;
server.listen(port, '127.0.0.1', function () {
  console.log('Express server listening on %d, in %s mode', port, app.get('env'));
});

// Expose app
exports = module.exports = app;