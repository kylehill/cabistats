var stations = [];

$('document').ready(function() {
  $.getJSON('/method/stationlist', function(data) {
    _.chain(data.stations.station)
      .sortBy(function(i) {
        return i.name
      }).each(function(i) {
        stations.push({name: i.name, id: i.terminalName});
        $("#fromDDL, #toDDL").append("<option value='" + i.terminalName + "'>" + i.name + "</option>") 
    });
    
    $("#fromDDL, #toDDL").on("change", getTripData)
    $("#fromDDL").val(_.shuffle(stations)[0].id);
    $("#toDDL").val(_.shuffle(stations)[0].id);
    $("#fromDDL").change();
  });
});

var getTripData = function(){
  $.getJSON('/method/from/' + $("#fromDDL").val() + '/to/' + $("#toDDL").val(), function(data) {
    if (data.tripCount > 0) {
      $("#scores").empty();
      var table = document.createElement("table");
      _.times((Math.min(5, data.qualCount)), function(i){
        var tr = document.createElement("tr");

        _.times(3, function(i){
          $(tr).append(document.createElement("td"));
        });

        $(tr).children().each(function(j, element){
          switch(j) {
            case 0: $(element).text(i+1); break;
            case 1: $(element).text(convertToReadableTime(data.filtered[i].trip.seconds)); break;
            default: $(element).text(data.filtered[i].trip.end); break;
          }
        });
        
        $(table).append(tr);
      });
      $("#scores").append(table);
    }
  });
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
  s = seconds;
  
  if (d > 0) {
    val += d + "d ";
    val += h + "h ";
    val += m + "m ";
    val += s + "s";
    return val;
  }
  else {
    if (h > 0) {
      val += h + "h ";
      val += m + "m ";
      val += s + "s";
      return val;
    }
    else {
      if (m > 0) {
        val += m + "m ";
        val += s + "s";
        return val;
      }
      else {
        return s + "s";
      }
    }
  }
}