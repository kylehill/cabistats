var redis = require("redis"),
    client = redis.createClient();
var async = require("async");
var underscore = require("underscore");

var list = [];
client.select(1);
    
async.auto({
  getKeys: function(callback) {
    client.keys('from:*', function(err, keys) {
      callback(null, keys);
    });
  },
  getMaxes: [ 'getKeys', function(callback, vars) {
    async.map(vars.getKeys, function(item, cb) {
      client.zrevrange(item, 0, 0, "withscores", function(err, scores) {
        cb(null, {id: item, max: parseInt(scores[1])})
      });
    }, function(err, results) {
      callback(null, underscore.sortBy(results, function(item){ return item.max; }));
      client.quit();
    });
  }],
  printAllPretty: [ 'getMaxes', function(callback, vars) {
    console.log(vars.getMaxes);
  }]
});