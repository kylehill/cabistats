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
    console.log(data);
  });
}