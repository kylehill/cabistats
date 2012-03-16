var app = require('express').createServer();
var redis = require('redis');
var async = require('async');
var client = redis.createClient();
var request = require('request');
var parser = require('xml2json');
var underscore = require('underscore');
var jade = require('jade');

client.select(1);

app.get('/method/station/:id', function(req, res){
  request({uri: 'http://' + req.headers.host + '/stationlist', json: true }, function(error, response, body) {
    res.json(underscore.find(body.stations.station, function(s){ return s.terminalName == req.params.id; }));
  });
});

app.get('/method/stationlist', function(req, res){
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

app.get('/method/from/:f/to/:t', function(req, res){
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
        var td = tripDataToArray(results);
        async.forEach(td, addTrip, function(err){
          callback(null, td);
        });
      });
    },
    sendResponse : [ 'getFromName', 'getToName', 'getTrips', function(callback, results) {
      var obj = {}, t = results.getTrips;
      obj.from = results.getFromName;
      obj.to = results.getToName;
      obj.tripCount = t.length;
      
      if (t.length > 0) {
        // meta stats
        obj.tripAverage = Math.round(underscore.reduce(t, function(sum, trip) { return sum + parseInt(trip.trip.seconds); }, 0) / obj.tripCount);
        obj.tripMedian = getMedian(underscore.pluck(underscore.pluck(t, 'trip'), 'seconds'));
        obj.tripMemberRate = underscore.reduce(t, function(sum, trip) { return sum + (trip.trip.memberType == '1\r' ? 1 : 0); }, 0) / obj.tripCount;
      
        var limit = parseInt(t[0].trip.seconds) * 5;
        obj.filtered = underscore.filter(t, function(trip) { return trip.trip.seconds < limit; });
      
        obj.qualCount = obj.filtered.length;
        obj.qualAverage = Math.round(underscore.reduce(obj.filtered, function(sum, trip) { return sum + parseInt(trip.trip.seconds); }, 0) / obj.qualCount);
        obj.qualMedian = getMedian(underscore.pluck(underscore.pluck(obj.filtered, 'trip'), 'seconds'));
        obj.qualMemberRate = underscore.reduce(obj.filtered, function(sum, trip) { return sum + (trip.trip.memberType == '1\r' ? 1 : 0); }, 0) / obj.qualCount;
      }
      
      res.json(obj);
    }]
  });
});

app.get('/method/trip/:id', function(req, res) {
  var id = req.params.id;
  client.hgetall('trip:' + id, function(err, results){
    res.json(results);
  });
});

app.get('/', function(req, res){
  res.sendfile('static/index.html');
});
app.get('/*', function(req, res){
  res.sendfile('static/' + req.params);
});
app.listen(3001);


var getMedian = function(array) {
  if (array.length <= 1) { 
    return array[0];
  }
  return ((parseInt(array[Math.floor(array.length / 2) - 1]) + parseInt(array[Math.ceil(array.length / 2) - 1])) / 2);
}

var addTrip = function(item, callback) {
  client.hgetall('trip:' + item.id, function(err, results) {
    item.trip = results;
    callback();
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