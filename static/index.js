var stations = [];
var cachedData = {};

$('document').ready(function() {
  $.getJSON('/method/stationlist', function(data) {
    _.chain(data.stations.station)
      .sortBy(function(i) {
        return i.name
      }).each(function(i) {
        stations.push(i);
        $("#fromDDL, #toDDL").append("<option value='" + i.terminalName + "'>" + i.name + "</option>") 
    });
    
    $("#fromDDL, #toDDL").on("change", changeDropdowns)
    shuffle();
  });
  
  $("#link_random").on("click", shuffle);
  $("#link_reverse").on("click", reverse);
  $("#link_info").on("click", showInfo);
});

var shuffle = function(){
  $("#fromDDL").val(_.shuffle(stations)[0].terminalName);
  $("#toDDL").val(_.shuffle(stations)[0].terminalName);
  $("#fromDDL").change();
}

var reverse = function(){
  var from_id = $("#fromDDL").val();
  $("#fromDDL").val($("#toDDL").val());
  $("#toDDL").val(from_id);
  $("#fromDDL").change();
}

var showInfo = function(){
  $("#showInfo").toggle();
}
var changeDropdowns = function(){
  getTripData($("#fromDDL").val(), $("#toDDL").val());
}

var getTripData = function(from_id, to_id){
  $.getJSON('/method/from/' + from_id + '/to/' + to_id, function(data) {
    console.log(data);
    cachedData = data;
    
    // Station info
    renderInfo(data);
    
    if (data.tripCount > 0) {
      $("#panel").show(); $("#noData").hide();
      
      // High scores table
      renderScores(data);
      // Statistics table
      renderStats(data);
      // Graph it up
      renderGraphs(data);
    }
    else {
      $("#panel").hide(); $("#noData").show();
    }
  });
}

var renderGraphs = function(data) {
  $("#graph").empty();
  Flotr.draw(document.getElementById("graph"), [transmuteData(data)], {
    yaxis: {
      max: 60,
      min: -1500,
      ticks: [
        [0, '12am'], [-120, '2am'], [-240, '4am'], [-360, '6am'], [-480, '8am'], [-600, '10am'],
        [-720, '12pm'], [-840, '2pm'], [-960, '4pm'], [-1080, '6pm'], [-1200, '8pm'], [-1320, '10pm'], [-1440, '12am']
      ]
    },
    xaxis: {
      min: data.min * (10/11),
      max: data.limit * (11/10),
      noTicks: 10,
      tickFormatter: convertToReadableTime
    },
    mouse: {
      track:true,
      trackFormatter: trackData
    }
  });
}

var trackData = function(point) {
  var tripData = cachedData.filtered[point.index];
  return tripData.trip.start + "<br/><strong>" + convertToReadableTime(parseInt(tripData.trip.seconds)) + "</strong> (" + getOrdinal(tripData.place) + ")"
}

var getOrdinal = function(place) {
  var divH = place % 100;
  if (divH > 10 && divH < 20) {
    return place + "th";
  }
  switch (place % 10) {
    case 1:
      return place + "st"; break;
    case 2:
      return place + "nd"; break;
    case 3:
      return place + "rd"; break;
    default:
      return place + "th"; break;
  }
}

var transmuteData = function(data) {
  var obj = {};
  obj.points = {show : true};
  obj.data = _.map(data.filtered, function(t){ 
    return [parseInt(t.trip.seconds), getTimeOfDay(t)]; 
  });
  return obj;
}

var getTimeOfDay = function(data) {
  var time = data.trip.startTime;
  return (parseInt(time.split(":")[0]) * 60 + parseInt(time.split(":")[1])) * -1;
}

var renderScores = function(data) {
  $("#scores").empty();
  var table = document.createElement("table");
  _.times((Math.min(5, data.qualCount)), function(i){
    var tr = document.createElement("tr");

    _.times(3, function(i){
      $(tr).append(document.createElement("td"));
    });

    $(tr).children().each(function(j, element){
      switch(j) {
        case 0: $(element).text(getOrdinal(i+1)); break;
        case 1: $(element).text(convertToReadableTime(data.filtered[i].trip.seconds)); break;
        default: $(element).text(data.filtered[i].trip.start); break;
      }
    });
    
    $(table).append(tr);
  });
  $("#scores").append(table); 
}

var renderStats = function(data) {
  $("#stats td").text("--");
  
  var lastInstall = Math.max(
    parseInt(_.find(stations, function(s){ return s.terminalName === data.from_id}).installDate),
    parseInt(_.find(stations, function(s){ return s.terminalName === data.to_id}).installDate));
  
  var daysOnline = (new Date('1/1/2012 0:00:00').valueOf() - parseInt(lastInstall)) / (86400 * 1000);
  
  if (data.tripCount > 0) {
    $("#qualCount").text(data.qualCount);
    $("#tripCount").text(data.tripCount);
    $("#qualAverage").text(convertToReadableTime(data.qualAverage));
    $("#tripAverage").text(convertToReadableTime(data.tripAverage));
    $("#qualMedian").text(convertToReadableTime(data.qualMedian));
    $("#tripMedian").text(convertToReadableTime(data.tripMedian));
    $("#qualMemberRate").text(convertToPct(data.qualMemberRate));
    $("#tripMemberRate").text(convertToPct(data.tripMemberRate));
    
    $("#qualPerDay").text(roundTwoDec(data.qualCount / daysOnline));
    $("#tripPerDay").text(roundTwoDec(data.tripCount / daysOnline));
    
    $("#distance").text(data.filtered[0].trip.distance + " mi");
    $("#elevation").text(data.filtered[0].trip.elevation + " ft");
    $("#grade").text(convertToPct(parseInt(data.filtered[0].trip.elevation) / (parseInt(data.filtered[0].trip.distance) * 5260)) + "%");
  }
}

var renderInfo = function(data) {
  var fromStation = _.find(stations, function(s) { return s.terminalName === data.from_id});
  var toStation = _.find(stations, function(s) { return s.terminalName === data.to_id});
  $(".dd").empty();
  $("#from_map").attr("src", getTinymapSrc(fromStation.lat, fromStation.long, "green"));
  $("#from_install").text(new Date(parseInt(fromStation.installDate)).toDateString()).css("color", getStationColor(new Date(parseInt(fromStation.installDate))));
  $("#from_bikes").text(fromStation.nbBikes).css("color", getCountColor(fromStation.nbBikes));
  $("#from_docks").text(fromStation.nbEmptyDocks).css("color", getCountColor(fromStation.nbEmptyDocks));
  $("#to_map").attr("src", getTinymapSrc(toStation.lat, toStation.long, "red"));
  $("#to_install").text(new Date(parseInt(toStation.installDate)).toDateString()).css("color"), getStationColor(new Date(parseInt(toStation.installDate)));
  $("#to_bikes").text(toStation.nbBikes).css("color", getCountColor(toStation.nbBikes));
  $("#to_docks").text(toStation.nbEmptyDocks).css("color", getCountColor(toStation.nbEmptyDocks));
}

var getStationColor = function(date) {
  if (date.valueOf() > new Date(2012, 0, 1).valueOf()) {
    return "#FFA7A5";
  }
  if (date.valueOf() > new Date(2011, 11, 1).valueOf()) {
    return "#FFFFAA";
  }
  return "white";
}

var getCountColor = function(num) {
  if (num == 0) { return "#FFA7A5"; }
  if (num < 4) { return "#FFFFAA"; }
  return "white";
}

var getTinymapSrc = function(lat, long, color) {
  return "http://maps.googleapis.com/maps/api/staticmap?center=" + lat + "," + long + "&zoom=16&size=200x100&sensor=false&markers=color:" + color + "|" + lat + "," + long;
}

var convertToPct = function(dec){
  return Math.round(dec * 10000) / 100;
}

var roundTwoDec = function(dec){
  return Math.round(dec * 100) / 100;
}

var convertToReadableTime = function(seconds){
  var d = 0, h = 0, m = 0, s, val = "";
  while (seconds >= 86400) {
    seconds -= 86400;
    d++;
  }
  while (seconds >= 3600) {
    seconds -= 3600;
    h++;
  }
  while (seconds >= 60) {
    seconds -= 60;
    m++;
  }
  s = Math.round(seconds);
  
  if (d > 0) {
    val += d + "d ";
    val += h + "h ";
    val += m + "m ";
    val += s + "s ";
    return val;
  }
  else {
    if (h > 0) {
      val += h + "h ";
      val += m + "m ";
      val += s + "s ";
      return val;
    }
    else {
      if (m > 0) {
        val += m + "m ";
        val += s + "s ";
        return val;
      }
      else {
        return s + "s ";
      }
    }
  }
}