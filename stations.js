var redis = require("redis"),
    client = redis.createClient(), 
	lazy = require("lazy"), 
	fs = require("fs");

client.on("error", function (err) {
    console.log("Error " + err);
});

client.select(1, redis.print);

new lazy(fs.createReadStream('stations.txt'))
	.lines
	.forEach(function(line){
		client.set("station:id:"+line.toString().split('\t')[0], line.toString().split('\t')[1].split('\r')[0]);
		client.del("station:name:"+line.toString().split('\t')[1]);
		client.set("station:name:"+line.toString().split('\t')[1].split('\r')[0], line.toString().split('\t')[0]);
	});
	
