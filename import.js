
var redis = require("redis"),
    client = redis.createClient(), 
	lazy = require("lazy"), 
	fs = require("fs");

client.on("error", function (err) {
    console.log("Error " + err);
});

client.select(1, redis.print);
client.flushdb();

new lazy(fs.createReadStream('flat.csv'))
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
	this.startDate = arr[0].split(' ')[0];
	this.startTime = arr[0].split(' ')[1];
	this.start = arr[0];
	this.endDate = arr[1].split(' ')[0];
	this.endTime = arr[1].split(' ')[1];
	this.end = arr[1];
	this.startPoint = arr[2];
	this.endPoint = arr[3];
	this.seconds = arr[4];
	this.distance = arr[5];
	this.elevation = arr[6];
	this.bike = arr[7];
	this.memberType = arr[8];
	
	
}