var app = require('express').createServer();
var redis = require('redis');
var async = require('async');
var client = redis.createClient();
var request = require('request');
var parser = require('xml2json');
var underscore = require('underscore');

client.select(1);

app.get('/', function(req, res){
  res.sendfile("public/index.html");
});

app.get("/public/*", function(req, res){
  res.sendfile("public/" + req.params);
});

app.get('/station/:id', function(req, res){
  request({uri: 'http://' + req.headers.host + '/stationlist', json: true }, function(error, response, body) {
    res.json(underscore.find(body.stations.station, function(s){ return s.terminalName == req.params.id; }));
  });
});

app.get('/stationlist', function(req, res){
  async.auto({
    getXml : function(callback) { 
      request('http://capitalbikeshare.com/data/stations/bikeStations.xml', function(error, response, body) {
        callback(null, parser.toJson(body, {object:true}));
      });
    },
    doStuff : [ 'getXml', function(callback, results) {
      res.json(results.getXml);
    }]
  });
});

app.get('/from/:f/to/:t', function(req, res){
  var f = req.params.f;
  var t = req.params.t;
  async.auto({
    getFromName : function(callback) {
      client.get('station:id:' + f, function(err, res){
        callback(null, res);
      });
    },
    getToName : function(callback) {
      client.get('station:id:' + t, function(err, res){
        callback(null, res);
      });
    },
    getTrips : function(callback) {
      client.zrange('from:' + f + ':to:' + t, 0, -1, 'withscores', function(err, results){
        var tripData = tripDataToArray(results);
        appendTrip(tripData, 0, function() { callback(null, tripData); })
      });
    },
    sendResponse : [ 'getFromName', 'getToName', 'getTrips', function(callback, results) {
      res.json(results);
    }]
  });
});

app.get('/trip/:id', function(req, res) {
  var id = req.params.id;
  client.hgetall("trip:" + id, function(err, results){
    res.json(results);
  });
});

var appendTrip = function(data, i, cb) {
  client.hgetall("trip:" + data[i].id, function(err, results){
    data[i]["trip"] = results;
    if (i < data.length - 1) {
      appendTrip(data, i+1, cb);    
    }
    else {
      cb();
    }
  });
}

var tripDataToArray = function(obj){
  var arr = new Array();
  for(var i = 0; i < obj.length / 2; i++){
    arr.push({ 
      place : i+1,
      id : obj[i * 2],
      time : obj[i * 2+1]
    });
  }
  return arr;
}

app.listen(3001);