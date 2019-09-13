
     geotab.addin.mapreplay = function(api, state) {
         var map;
         var replayLayer;
         var vehicles;
         var tripsById = {};
         var initializeMap = function () {
             // Initialize the map container
             map = new L.Map("mapreplay-map").on("load", function () {
                 setTimeout(function () {
                     map.invalidateSize();
                 }, 500);
                 document.getElementById("mapreplay-options").style.display = "block";
             }).setView([43.436884, -79.711760], 15);
             // Add a layer to put the replay on
             replayLayer = L.layerGroup().addTo(map);
             // Add the map tiles layer
             L.tileLayer("http://{s}.tile.osm.org/{z}/{x}/{y}.png", {
                 subdomains: "abc",
                 type: "osm",
                 attribution: "&copy; <a href=\"http://osm.org/copyright\">OpenStreetMap</a> contributors",
                 maxZoom: 18
             }).addTo(map);
         };
         var initializeEventHandlers = function () {
             var vehicleSelect = document.getElementById("mapreplay-options-vehicle"),
                 tripsSelect = document.getElementById("mapreplay-options-trips");
             // Handle when a vehicle is selected
             vehicleSelect.addEventListener("change", function (e) {
                 var selectedVehicleId = this.value;
                 tripsSelect.innerHTML = "";
                 if (selectedVehicleId) {
                     // Add a loading option
                     tripsSelect.appendChild((function () {
                         var loadingOpt = document.createElement("option");
                         loadingOpt.textContent = "Loading...";
                         return loadingOpt;
                     })());
                     tripsSelect.style.display = "block";
                     // Get trips for this vehicle, and populate the selection box
                     getTrips(selectedVehicleId, function (trips) {
                         populateTripsSelect(trips);
                     });
                 }
             }, true);
             // Handle when a trip is selected
             tripsSelect.addEventListener("change", function (e) {
                 var selectedTripId = this.value,
                     fullTrip = tripsById[selectedTripId];
                 if (fullTrip) {
                     getLogs(fullTrip, function (logs) {
                         drawTrip(logs);
                     });
                 }
             }, true);
         };
         var reset = function () {
             var tripsSelect = document.getElementById("mapreplay-options-trips"),
                 speedDisplay = document.getElementById("mapreplay-dashboard-speed"),
                 timeDisplay = document.getElementById("mapreplay-dashboard-time");
             tripsSelect.innerHTML = "";
             tripsSelect.style.display = "none";
             replayLayer.clearLayers();
             if (speedDisplay) {
                 speedDisplay.textContent = "0";
             }
             if (timeDisplay) {
                 timeDisplay.textContent = moment().format("lll");
             }
         };
         var getVehicles = function (finishedCallback) {
             api.call("Get", {
                 typeName: "Device",
                 search: {
                     fromDate: new Date()
                 }
             }, function (results) {
                 vehicles = results.map(function (vehicle) {
                     return {
                         name: vehicle.name,
                         id: vehicle.id
                     };
                 });
                 finishedCallback();
             }, function (errorString) {
                 alert(errorString);
             });
         };
         var getTrips = function (vehicleId, finishedCallback) {
             var lastWeek = new Date();
             lastWeek.setDate(lastWeek.getDate() - 7);
             api.call("Get", {
                 typeName: "Trip",
                 search: {
                     deviceSearch: {
                         id: vehicleId
                     },
                     fromDate: lastWeek
                 },
                 resultsLimit: 1000
             }, function (trips) {
                 tripsById = {};
                 for (var i = 0; i < trips.length; i++) {
                     var trip = trips[i];
                     tripsById[trip.id] = trip;
                 };
                 finishedCallback(trips);
             }, function (errorString) {
                 alert(errorString);
             });
         };
         var getLogs = function (trip, finishedCallback) {
             api.call("Get", {
                 typeName: "LogRecord",
                 search: {
                     deviceSearch: {
                         id: trip.device.id
                     },
                     fromDate: trip.start,
                     toDate: trip.stop
                 }
             }, function (logs) {
                 finishedCallback(logs);
             }, function (errorString) {
                 alert(errorString);
             })
         };
         var populateVehicleSelect = function () {
             var vehicleSelect = document.getElementById("mapreplay-options-vehicle");
             vehicleSelect.appendChild((function () {
                 var defaultOption = document.createElement("option");
                 defaultOption.default = true;
                 defaultOption.selected = true;
                 defaultOption.value = "";
                 defaultOption.textContent = "Select a vehicle...";
                 return defaultOption;
             })());
             if (vehicles) {
                 vehicles.forEach(function (vehicle) {
                     var opt = document.createElement("option");
                     opt.value = vehicle.id;
                     opt.textContent = vehicle.name;
                     vehicleSelect.appendChild(opt);
                 });
             }
         };
         var populateTripsSelect = function (trips) {
             var tripsSelect = document.getElementById("mapreplay-options-trips");
             tripsSelect.innerHTML = "";
             tripsSelect.appendChild((function () {
                 var defaultOption = document.createElement("option");
                 defaultOption.default = true;
                 defaultOption.selected = true;
                 defaultOption.value = "";
                 defaultOption.textContent = "Select a trip...";
                 return defaultOption;
             })());
             if (trips) {
                 trips.reverse();
                 trips.forEach(function (trip) {
                     var opt = document.createElement("option");
                     opt.value = trip.id;
                     opt.textContent = moment(trip.start).format("lll") + " (" + moment.duration(trip.drivingDuration).humanize() + ")";
                     tripsSelect.appendChild(opt);
                 });
             } else {
                 tripsSelect.style.display = "none";
             }
         };
         var updateDashboardTimeout;
         var updateDashboard = function (logs, durations) {
             // We're done this recursive call when all the logs have been displayed on the dashboard
             if (!logs.length) {
                 return;
             }
             // Reset the display if another trip had been selected
             if (updateDashboardTimeout) {
                 clearTimeout(updateDashboardTimeout);
             }
             var speedDisplay = document.getElementById("mapreplay-dashboard-speed"),
                 timeDisplay = document.getElementById("mapreplay-dashboard-time");
             // Update the display with the next log
             var log = logs.shift();
             if (speedDisplay) {
                 speedDisplay.textContent = Math.round(log.speed);
             }
             if (timeDisplay) {
                 timeDisplay.textContent = moment(log.dateTime).format('lll');
             }
             // Add a timeout corresponding to the duration between the logs until we display the next log
             var waitDuration = durations.shift() || 0;
             updateDashboardTimeout = setTimeout(function () {
                 updateDashboard(logs, durations);
             }, waitDuration);
         };
         var drawTrip = function (logs) {
             replayLayer.clearLayers();
             var line = [],
                 durations = [],
                 lastLogDate,
                 speedup = 5;
             logs.forEach(function (log, i) {
                 line.push(new L.LatLng(log.latitude, log.longitude));
                 if (lastLogDate) {
                     durations.push((new Date(log.dateTime).getTime() - new Date(lastLogDate).getTime())/speedup);
                 }
                 lastLogDate = log.dateTime;
             });
             // Adds the trip line as a layer
             replayLayer.addLayer(new L.polyline(line, {
                 color: "red",
                 weight: 7,
                 opacity: 0.5,
                 smoothFactor: 1
             }));
             // Adds a moving marker to the layer
             var movingMarker = L.Marker.movingMarker(line, durations);
             replayLayer.addLayer(movingMarker);
             movingMarker.start();
             // Update the dashboard as the trip progresses
             updateDashboard(logs.slice(0), durations.slice(0));
             // Fit the map to the selected trip
             map.fitBounds(line);
         };
         return {
             /*
              * Page lifecycle method: initialize is called once when the addin first starts
              * Use this function to initialize the addin's state such as default values or
              * make API requests (Geotab or external) to ensure interface is ready for the user.
              */
             initialize: function(api, state, callback) {
                 // Initialize the map
                 initializeMap();
                 // Must be called to let the app know that we've initialized the addon
                 getVehicles(callback);
             },

             /*
              * Page lifecycle method: focus is called when the page has finished initialize method
              * and again when a user leaves and returns to your addin that has already been initialized.
              * Use this function to refresh state such as vehicles, zones or exceptions which may have
              * been modified since it was first initialized.
              */
             focus: function() {
                 reset();
                 initializeEventHandlers();
                 populateVehicleSelect();
             },

             /*
              * Page lifecycle method: blur is called when the user is leaving your addin.
              * Use this function to save state or commit changes to a datastore or release memory.
              */
             blur: function() {
                 reset();
             }
         };
     };


     //////////////////////////////////////////////////////////////

       //   api.call('Get', {
       //     typeName: 'LogRecord',
       //     search: {
       //       'deviceSearch': {
       //         id: deviceId
       //       },
       //       fromDate: dateFrom,
       //       toDate: dateTo
       //     }
       //   }, logRecords => {
       //     console.log(10)
       //     let coordinates = [];
       //     let bounds = [];
       //
       //           for (var x=0; x < logRecords.length; x++){
       //           console.log(logRecords[x].latitude);}
       // console.log(11)
       //     for (let i = 0; i < logRecords.length; i++) {
       //       if (logRecords[i].latitude !== 0 || logRecords[i].longitude !== 0) {
       //         coordinates.push({
       //           lat: logRecords[i].latitude,
       //           lon: logRecords[i].longitude,
       //           value: 1
       //         });
       //         bounds.push(new L.LatLng(logRecords[i].latitude, logRecords[i].longitude));
       //       }
       //     }
       // console.log(12)
       //     if (coordinates.length > 0) {
       //       map.fitBounds(bounds);
       //       heatMapLayer.setLatLngs(coordinates);
       //     } else {
       //       errorHandler('Not enough data to display');
       //     }
       //
       //     toggleLoading(false);
       //   }, error => {
       //     console.log(13)
       //     errorHandler(error);
       //     toggleLoading(false);
       //   });
       // };
