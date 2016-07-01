var React = require('react');
var ReactDOM = require('react-dom');
var config = require('../config.json');
var helper = require('./helper.js');
var GridCreator = require('./HeatmapCreator.js');
var Evaluator = require('./Evaluator.js');
var Simulator = require('../backend/simulator.js');

// Latitude and Longitude for San Francisco center
var mapCenterLocation = new google.maps.LatLng(37.7441, -122.4450);
var gridCenterPointsArray = [];
var appbaseRef = helper.appbaseRef;
var Map = React.createClass({
  getInitialState: function() {
    return ({
      // initial map parameters
      mapParams: {
        center: mapCenterLocation,
        zoom: 14,
        streetViewControl: true,
        mapTypeId: google.maps.MapTypeId.HYBRID,
        scaleControl: true
      },
      map: null,
      // array to store the center locations of each grid the map is divided into
      gridCenterPoints: []
    });
  },

  // stream the updates happening in the grid, i.e new demander comes, new suppiler comes, etc. and according to new surge price change the color of grid cell
  callRealtimeGridUpdates: function(gridPointsIndex) {
    var index = gridPointsIndex;
    var self = this;
    var gridCenterPoints = this.state.gridCenterPoints;
    var requestObject = helper.buildRequestObject([gridCenterPoints[index].upLeftCoord.lng,gridCenterPoints[index].upLeftCoord.lat], [gridCenterPoints[index].lowRightCoord.lng,gridCenterPoints[index].lowRightCoord.lat])

    // appbase search stream query
    appbaseRef.searchStream(requestObject).on('data', function(stream) {
      var detectedPoint= Evaluator.findSurgePrice(stream, gridCenterPoints, index);
      console.log("detectedPoint" +detectedPoint);
      gridCenterPoints[detectedPoint.index].cell.setOptions({ fillColor:  detectedPoint.gridCenterPoints[index].color});
      gridCenterPoints[detectedPoint.index].cell.setOptions({ strokeColor:  detectedPoint.gridCenterPoints[index].color});
      gridCenterPoints[detectedPoint.index].cell.setOptions({ strokeOpacity:  detectedPoint.gridCenterPoints[index].opacity*0});
      gridCenterPoints[detectedPoint.index].cell.setOptions({ fillOpacity:  detectedPoint.gridCenterPoints[index].opacity*4});
    }).on('error', function(stream) {
      console.log(stream)
    });
  },

  createShowSimulationButton: function() {
    var self = this;
    var showButton = document.createElement("input");
    showButton.type = "button";
    showButton.value = "Start Simulation";
    showButton.className = "btn btn-primary";
    showButton.onclick = function(){
      var win = window.open('simulation.html', '_blank');
      Simulator.dataGenerator();
      win.focus();
    };
    var foo = document.getElementById("floating-panel");
    foo.appendChild(showButton);
  },

  callStaticUpdates: function(map, gridCenterPointsArray, index) {
    var self = this;
    var requestObject = helper.buildRequestObject([gridCenterPointsArray[index].upLeftCoord.lng,gridCenterPointsArray[index].upLeftCoord.lat], [gridCenterPointsArray[index].lowRightCoord.lng,gridCenterPointsArray[index].lowRightCoord.lat])
    appbaseRef.search(requestObject).on('data', function(stream) {
      for(var h = 0; h < stream.hits.total; h++){
        var detectedPoint= Evaluator.findSurgePrice(stream.hits.hits[h], gridCenterPointsArray, index);

        gridCenterPointsArray[detectedPoint.index].cell.setOptions({ fillColor:  detectedPoint.gridCenterPoints[index].color});
        gridCenterPointsArray[detectedPoint.index].cell.setOptions({ strokeColor:  detectedPoint.gridCenterPoints[index].color});
        gridCenterPointsArray[detectedPoint.index].cell.setOptions({ strokeOpacity:  detectedPoint.gridCenterPoints[index].opacity*0});
        gridCenterPointsArray[detectedPoint.index].cell.setOptions({ fillOpacity:  detectedPoint.gridCenterPoints[index].opacity*4});
      }
      gridCenterPointsArray[index].cell.setMap(self.state.map);
    }).on('error', function(stream) {
      console.log(stream)
    });
  },

  callForUpdates: function(map, gridCenterPoints) {
    var self = this;
    for (var index = 0; index < gridCenterPointsArray.length; index++) {
      this.callStaticUpdates(map, gridCenterPointsArray, index);
    }
  },

  componentDidMount: function() {
    var self = this;
    // push the map on the DOM
    var map = new google.maps.Map(document.getElementById('app'), this.state.mapParams);
    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(document.getElementById('over_map'));
    this.setState({
      map: map
    });
    this.createShowSimulationButton()
    // when the map is initialized, we set grid bounds and start listening for data updates
    google.maps.event.addListenerOnce(map, 'idle', function(){
      gridCenterPointsArray = GridCreator.createGridLines(map.getBounds(), 0);
      self.callForUpdates(map,gridCenterPointsArray);
      self.setState({
        gridCenterPoints: gridCenterPointsArray
      }, function(){
        for (var index = 0; index < gridCenterPointsArray.length; index++) {
          self.callRealtimeGridUpdates(index);
        }
      });
    });
  },

  render: function() {
    return (<div>Error Displaying the map!</div>);
  }
});

module.exports = Map;
