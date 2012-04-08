
var redis = require("redis"),
    client = redis.createClient(), 
	lazy = require("lazy"), 
	fs = require("fs");

client.on("error", function (err) {
    console.log("Error " + err);
});

client.select(1, redis.print);

new lazy(fs.createReadStream('2012-1st-quarter.csv'))
	.lines
	.forEach(function(line){
		var r = new ride(line.toString().split(','));
		client.incr("trip", function(err, id){
			client.hmset("trip:"+id, r);
			client.zadd("from:"+r.startPoint+":to:"+r.endPoint, r.seconds, id, function(err, res) {
				if (err !== null)
				{ console.log("id:"+id +" err:"+err); }
			});
			client.zadd("bike:"+r.bike, (Date.parse(r.start) / 1000) - 1280000000, id, function(err, res){
				if (err !== null)
				{ console.log("id:"+id + "err:"+err); }
			});
		}); 
	});
	
var ride = function(arr)
{
  this.seconds = arr[1];
  this.startDate = arr[2].split(' ')[0];
	this.startTime = arr[2].split(' ')[1];
	this.start = arr[2];
	this.endDate = arr[5].split(' ')[0];
	this.endTime = arr[5].split(' ')[1];
	this.end = arr[5];
	this.startPoint = arr[4];
	this.endPoint = arr[7];
	this.bike = arr[8];
	this.memberType = (arr[9] == 'Registered' ? '1/r' : '2/r') ;
	
	
}