var app = require('express').createServer();
var async = require('async');
var request = require('request');
var parser = require('xml2json');
var underscore = require('underscore');
var mongodb = require("mongodb");

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
  var from = parseInt(req.params.f);
  var to = parseInt(req.params.t);
  async.auto({
    getTrips : function(callback) {
      mongodb.Db.connect('mongodb://heroku_app3673083:7900vvrtbg9lkicid1c7168l19@ds031777.mongolab.com:31777/heroku_app3673083', function(error, connection) {
        connection.collection('ptp', function(err, collection) {
          collection.find({'from' : from, 'to' : to}).nextObject(function(err, arr) {
            var obj = {};
            obj.from_id = from;
            obj.to_id = to;
            obj.tripCount = 0;

            if (arr != null) {
              var t = arr.trips;
              obj.tripCount = arr.trips.length;
              obj.distance = arr.elevation;
              obj.elevation = arr.distance; // whoops
              
              // meta stats
              obj.tripAverage = Math.round(underscore.reduce(t, function(sum, trip) { return sum + trip['length']; }, 0) / obj.tripCount);
              obj.tripMedian = getMedian(underscore.pluck(t, 'length'));
              obj.tripMemberRate = underscore.reduce(t, function(sum, trip) { return sum + (trip.type ? 1 : 0); }, 0) / obj.tripCount;

              obj.limit = parseInt(t[0]['length']) * 5;
              obj.min = parseInt(t[0]['length']);
              obj.filtered = underscore.filter(t, function(trip) { return trip['length'] < obj.limit; });

              obj.qualCount = obj.filtered.length;
              obj.qualAverage = Math.round(underscore.reduce(obj.filtered, function(sum, trip) { return sum + trip['length']; }, 0) / obj.qualCount);
              obj.qualMedian = getMedian(underscore.pluck(obj.filtered, 'length'));
              obj.qualMemberRate = underscore.reduce(obj.filtered, function(sum, trip) { return sum + (trip.type ? 1 : 0); }, 0) / obj.qualCount;
            }
            connection.close();
            res.json(obj);
          });
        });
      });
    }
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
    return parseInt(array[0]);
  }
  if (array.length % 2 == 1) {
    return parseInt(array[Math.floor(array.length / 2)]);
  }
  return (parseInt(array[Math.floor(array.length / 2) - 1]) + parseInt(array[Math.floor(array.length / 2)])) / 2
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