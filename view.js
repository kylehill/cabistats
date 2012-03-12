var app = require('express').createServer();
var redis = require('redis');
var async = require('async');
var client = redis.createClient();
var request = require('request');
var parser = require('xml2json');

client.select(1, redis.print);

app.get('/', function(req, res){
  request('http://localhost:3001/stations', function(e, r, b) {
    
  });
});

app.get('/stations', function(req, res){
  async.auto({
    getXml : function(callback) { 
      request('http://capitalbikeshare.com/data/stations/bikeStations.xml', function(error, response, body) {
        callback(null, parser.toJson(body));
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
      client.zrange('from:' + f + ':to:' + t, 0, -1, 'withscores', function(err, res){
        callback(null, tripDataToArray(res))
      });
    },
    sendResponse : [ 'getFromName', 'getToName', 'getTrips', function(callback, results) {
      res.send(results);
    }]
  });
});

var getStations = function(){
  
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