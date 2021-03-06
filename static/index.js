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
  return getPrettyDate(tripData.start) + "<br/><strong>" + convertToReadableTime(parseInt(tripData['length'])) + "</strong> (" + getOrdinal(point.index + 1) + ")"
}

var getPrettyDate = function(ms) {
  var d = new Date(ms);
  return [d.getMonth() + 1, d.getDate(), d.getFullYear()].join("/") + " " + d.getHours() + ":" + padL(d.getMinutes(), '0', 2);
}

var padL = function(a, b, c) {
  a = a + '';
  while (a.length  < c) {
    a = b + a;
  }
  return a;
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
    return [parseInt(t['length']), getTimeOfDay(t)]; 
  });
  console.log(obj);
  return obj;
}

var getTimeOfDay = function(data) {
  var time = data.start;
  return (new Date(time).getHours() * 60 + new Date(time).getMinutes()) * -1;
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
        case 1: $(element).text(convertToReadableTime(data.filtered[i]['length'])); break;
        default: $(element).text(getPrettyDate(data.filtered[i].start)); break;
      }
    });
    
    $(table).append(tr);
  });
  $("#scores").append(table); 
}

var renderStats = function(data) {
  $("#stats td").text("--");
  
  var lastInstall = Math.max(
    parseInt(_.find(stations, function(s){ return s.terminalName == data.from_id}).installDate),
    parseInt(_.find(stations, function(s){ return s.terminalName == data.to_id}).installDate));
  
  var daysOnline = (new Date('4/1/2012 0:00:00').valueOf() - parseInt(lastInstall)) / (86400 * 1000);
  
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
  }
}

var renderInfo = function(data) {
  var fromStation = _.find(stations, function(s) { return s.terminalName == data.from_id});
  var toStation = _.find(stations, function(s) { return s.terminalName == data.to_id});
  $("#link_map").attr("href", "http://maps.google.com/maps?saddr=" + getGoogleMapSrc(fromStation) + "&daddr=" + getGoogleMapSrc(toStation) + "&lci=bike&dirflg=b&t=m");
  $(".dd").empty();
  $("#from_map").attr("src", getTinymapSrc(fromStation.lat, fromStation.long, "green"));
  $("#from_install").text(new Date(parseInt(fromStation.installDate)).toDateString()).css("color", getStationColor(new Date(parseInt(fromStation.installDate))));
  $("#from_bikes").text(fromStation.nbBikes).css("color", getCountColor(fromStation.nbBikes));
  $("#from_docks").text(fromStation.nbEmptyDocks).css("color", getCountColor(fromStation.nbEmptyDocks));
  $("#to_map").attr("src", getTinymapSrc(toStation.lat, toStation.long, "red"));
  $("#to_install").text(new Date(parseInt(toStation.installDate)).toDateString()).css("color", getStationColor(new Date(parseInt(toStation.installDate))));
  $("#to_bikes").text(toStation.nbBikes).css("color", getCountColor(toStation.nbBikes));
  $("#to_docks").text(toStation.nbEmptyDocks).css("color", getCountColor(toStation.nbEmptyDocks));
}

var getGoogleMapSrc = function(station){
  return station.lat + "," + station.long;
}

var getStationColor = function(date) {
  if (date.valueOf() > new Date(2012, 3, 1).valueOf()) {
    return "#FFA7A5";
  }
  if (date.valueOf() > new Date(2012, 2, 1).valueOf()) {
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
