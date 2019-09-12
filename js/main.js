/**
 * @returns {{initialize: Function, focus: Function, blur: Function}}
 */
geotab.addin.heatmap = () => {
  'use strict';

  let api;

  let map;
  let heatMapLayer;

  let elVehicleSelect;
  let elDateFromInput;
  let elDateToInput;
  let elError;
  let elLoading;
console.log(1);
  /**
   * Display error message
   * @param {string} message - The error message.
   */
  let errorHandler = message => {
    elError.innerHTML = message;
  };

  /**
   * Toggle loading spinner
   * @param {boolean} show - [true] to display the spinner, otherwise [false].
   */
  let toggleLoading = show => {
    if (show) {
      elLoading.style.display = 'block';
    } else {
      setTimeout(() => {
        elLoading.style.display = 'none';
      }, 600);
    }
  };

  /**
   * Displays the heatmap of a vehicle location history
   */
  let displayHeatMap = function () {
    let deviceId = elVehicleSelect.value;
    let fromValue = elDateFromInput.value;
    let toValue = elDateToInput.value;

    errorHandler('');

    if ((deviceId === null) || (fromValue === '') || (toValue === '')) {
      return;
    }

    toggleLoading(true);

    let dateFrom = new Date(fromValue).toISOString();
    let dateTo = new Date(toValue).toISOString();

console.log(7);
console.log(deviceId);


 api.call("Get", {
        typeName: "ExceptionEvent",
        search: {
            deviceSearch: {
                id: deviceId
            },
            ruleSearch: {
                id: "a1wrQ3PBsTUuNVZ7cqjCjHA",
                includeZoneStopRules: false
            },
            fromDate: dateFrom,
            toDate: dateTo
      }
    }, function(exception) {
      console.log(dateFrom);
      console.log(deviceId);
    api.call("Get", {
        typeName: "LogRecord",
        search: {
            fromDate: dateFrom.activeFrom,
            toDate: dateFrom.activeTo,
            deviceSearch: {
                id: deviceId
            }
        }
    }, function(LogRecord) {
      let coordinates = [];
      let bounds = [];

      for (let i = 0; i < LogRecord.length; i++) {
        if (LogRecord[i].latitude !== 0 || LogRecord[i].longitude !== 0) {
          coordinates.push({
            lat: LogRecord[i].latitude,
            lon: LogRecord[i].longitude,
            value: 1
          });
          bounds.push(new L.LatLng(LogRecord[i].latitude, LogRecord[i].longitude));
        }
      }
console.log("hi")
      if (coordinates.length > 0) {
        map.fitBounds(bounds);
        heatMapLayer.setLatLngs(coordinates);
      } else {
        errorHandler('Not enough data');
      }

        api.call("GetAddresses", {
            "coordinates": [{
                "x": LogRecord[0].longitude,
                "y": LogRecord[0].latitude
            }],
            "movingAddreses": false,
            "hosAddresses": false

        }, function(Address) {
            api.call("Get", {
                "typeName": "Device",
                "search": {
                    "id": deviceId
                }
            }, function(Device) {
                        api.call("Get", {
                            "typeName": "Rule",
                            "search": {
                                "id": exception.rule.id
                            }
                        }, function(Rule) {
                            console.log(Device[0].name + " was at : " + Address[0].formattedAddress +
                            ", (coordinates: " + LogRecord[0].latitude + ", " + LogRecord[0].longitude +
                            ") and triggered the " + Rule[0].name + " rule. They were active from" + exception.activeFrom + "to" + exception.activeTo);
                        });
                    }
                );
        });
    }

  );
}, function (error) {
  errorHandler(error);
  toggleLoading(false);
});
};

  //   api.call('Get', {
  //     typeName: 'LogRecord',
  //     resultsLimit: 1000,
  //     search: {
  //       deviceSearch: {
  //         id: deviceId
  //       },
  //       fromDate: dateFrom,
  //       toDate: dateTo
  //     }
  //   }, function (logRecords) {
  //     let coordinates = [];
  //     let bounds = [];
  //
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
  //
  //     if (coordinates.length > 0) {
  //       map.fitBounds(bounds);
  //       heatMapLayer.setLatLngs(coordinates);
  //     } else {
  //       errorHandler('Not enough data');
  //     }
  //
  //     toggleLoading(false);
  //   }, function (error) {
  //     errorHandler(error);
  //     toggleLoading(false);
  //   });
  // };

  /**
   * Intialize the user interface
   * @param {object} coords - An object with the latitude and longitude to render on the map.
   */
  let initializeInterface = coords => {
    // setup the map
    map = new L.Map('heatmap-map', {
        center: new L.LatLng(coords.latitude, coords.longitude),
        zoom: 13
    });

    L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/streets-v10/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiZ2VvdGFiIiwiYSI6ImNpd2NlaW02MjAxc28yeW9idTR3dmRxdTMifQ.ZH0koA2g2YMMBOcx6EYbwQ').addTo(map);
console.log(3);
    heatMapLayer = L.heatLayer({
      radius: {
        value: 24,
        absolute: false
      },
      opacity: 0.7,
      gradient: {
        0.45: 'rgb(0,0,255)',
        0.55: 'rgb(0,255,255)',
        0.65: 'rgb(0,255,0)',
        0.95: 'yellow',
        1.0: 'rgb(255,0,0)'
      }
    }).addTo(map);

    // find reused elements
    elVehicleSelect = document.getElementById('vehicles');
    elDateFromInput = document.getElementById('from');
    elDateToInput = document.getElementById('to');
    elError = document.getElementById('error');
    elLoading = document.getElementById('loading');

    // set up dates
    let now = new Date();
    let dd = now.getDate();
    let mm = now.getMonth() + 1;
    let yy = now.getFullYear();

    if (dd < 10) {
      dd = '0' + dd;
    }

    if (mm < 10) {
      mm = '0' + mm;
    }

    elDateFromInput.value = yy + '-' + mm + '-' + dd + 'T' + '00:00';
    elDateToInput.value = yy + '-' + mm + '-' + dd + 'T' + '23:59';

    // events
    document.getElementById('vehicles').addEventListener('change', event => {
      event.preventDefault();
      displayHeatMap();
    });

    document.getElementById('from').addEventListener('change', event => {
      event.preventDefault();
      displayHeatMap();
    });

    document.getElementById('to').addEventListener('change', event => {
      event.preventDefault();
      displayHeatMap();
    });
  };
console.log(2);
  /**
   * Sort named entities
   * @param {object} a - The left comparison named entity
   * @param {object} b - The right comparison named entity
   */
  let sortByName = (a, b) => {
    a = a.name.toLowerCase();
    b = b.name.toLowerCase();

    if (a === b) {
      return 0;
    }

    if (a > b) {
      return 1;
    }

    return -1;
  };

  return {
    initialize(freshApi, state, callback) {
      api = freshApi;

      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(position => {
          initializeInterface(position.coords);
          callback();
        });
      } else {
        initializeInterface({ longitude: -93.10, latitude: 44.94});
        callback();
      }

    },
    focus(freshApi, freshState) {
      api = freshApi;
      while (elVehicleSelect.firstChild) {
        elVehicleSelect.removeChild(elVehicleSelect.firstChild);
      }
console.log(4);
      api.call('Get', {
        typeName: 'Device',
        search: {
          fromDate: new Date().toISOString(),
          'groups': [{'id': 'b27D5'}]
        }
      }, vehicles => {
        if (!vehicles || vehicles.length < 0) {
          return;
        }
console.log(6);
        vehicles.sort(sortByName);

        vehicles.forEach(vehicle => {
          let option = new Option();
          option.text = vehicle.name;
          option.value = vehicle.id;
          elVehicleSelect.add(option);
        });
      }, errorHandler);


console.log(5);
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }
  };
};
