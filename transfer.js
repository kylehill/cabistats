var redis = require("redis"),
    mongodb = require("mongodb"),
    async = require("async"),
    underscore = require("underscore");
    
var num = 0, count;

var client = redis.createClient();
var coll;
client.select(1, function() {
  async.auto({
    openDb : function(callback) {
      mongodb.Db.connect(process.env.MONGOLAB_URI, function(error, c) {
        console.log(error);
        callback(null, c);
      });
    },
    getCollection : ['openDb', function(callback, vars) {
      vars.openDb.collection('ptp', function(err, collection) {
        coll = collection;
        callback(null, collection);
      });
    }],
    clearCollection : ['getCollection', function(callback, vars) {
      vars.getCollection.remove({}, function(err, x) {
        callback(null);
      });
    }],
    getKeys : ['clearCollection', function(callback, vars) {
      client.keys('from:*', function(err, results) {
        callback(null, results);
      })
    }],
    processKeys : ['getKeys', 'clearCollection', function(callback, vars) {
      count = vars.getKeys.length;
      async.mapSeries(vars.getKeys, processKey, function(err, mapped) { client.quit(); vars.openDb.close(); callback(null); })
    }]
  });
});

var processKey = function(key, cb) {
  console.log(key + " " + num++ + "/" + count);
  var f = parseInt(key.split(':')[1]), t = parseInt(key.split(':')[3]);
  async.auto({
    getTrips : function(callback) {
      client.zrange(key, 0, -1, function(err, trips) {
        callback(null, trips);
      });
    },
    getTripData : ['getTrips', function(callback, vars) {
      async.mapSeries(vars.getTrips, getTripData, function(err, mapped) { callback(null, mapped); })
    }],
    postToMongo : ['getTripData', function(callback, vars) {
      coll.insert({ 
        'to' : t, 
        'from' : f, 
        'elevation' : vars.getTripData[0].distance, 
        'distance' : vars.getTripData[0].elevation, 
        'trips' : underscore.map(vars.getTripData, function(trip) {
            delete trip.elevation;
            delete trip.distance;
            return trip;  
          })
        }, function () {
          cb();
      });
    }]
  });
}

var getTripData = function(key, cb) {
  client.hgetall('trip:' + key, function(err, trip){
    cb(null, {
      id: parseInt(key), 
      length: parseInt(trip.seconds), 
      start:Date.parse(trip.start).valueOf(),
      type:(trip.memberType == '1\r'),
      elevation: parseFloat(trip.elevation),
      distance: parseFloat(trip.distance)
    });
  })
}