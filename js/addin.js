geotab.addin.geotabHeatMap = function (api, state) {
	var map,
		baseLayer,
		heatMapLayer,
		vehicleSelect,
		dateFromInput,
		dateToInput,

		errorHandler = function(message) {
			document.getElementById("addin-error").innerHTML = message;
		},

		toggleLoading = function(show) {
			if (show) {
				document.getElementById("addin-loading").style.display = "block";
			} else {
				setTimeout(function() {
					document.getElementById("addin-loading").style.display = "none";
				}, 600);
			}
		},

        initializeInterface = function () {
            baseLayer = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
								subdomains: "abc",
								type: "osm",
								attribution: "&copy; <a href=\"https://osm.org/copyright\">OpenStreetMap</a> contributors",
								id: 'mapbox.streets',
								maxZoom: 18
						});

            heatMapLayer = L.TileLayer.heatMap({
                radius: {
                    value: 24,
                    absolute: false
                },
                opacity: 0.7,
                gradient: {
                    0.45: "rgb(0,0,255)",
                    0.55: "rgb(0,255,255)",
                    0.65: "rgb(0,255,0)",
                    0.95: "yellow",
                    1.0: "rgb(255,0,0)"
                }
            });

            map = new L.Map('addin-map', {
                center: new L.LatLng(44.94, -93.50),
                zoom: 13,
                layers: [baseLayer, heatMapLayer]
            });

            vehicleSelect = document.getElementById("addin-vehicles");
            dateFromInput = document.getElementById("addin-from");
            dateToInput = document.getElementById("addin-to");

            var now = new Date();
            var dd = now.getDate(),
	            mm = now.getMonth() + 1,
	            yy = now.getFullYear();

            if (dd < 10) {
                dd = "0" + dd;
            }

            if (mm < 10) {
                mm = "0" + mm;
            }

            dateFromInput.value = yy + "-" + mm + "-" + dd + "T" + "09:00";
            dateToInput.value = yy + "-" + mm + "-" + dd + "T" + "17:00";

            document.getElementById("addin-vehicles").addEventListener("change", function (event) {
                event.preventDefault();
                displayHeatMap();
            });

            document.getElementById("addin-from").addEventListener("change", function (event) {
                event.preventDefault();
                displayHeatMap();
            });

            document.getElementById("addin-to").addEventListener("change", function (event) {
                event.preventDefault();
                displayHeatMap();
            });
        },

		displayHeatMap = function () {
			var deviceId = vehicleSelect[vehicleSelect.selectedIndex].getAttribute("data-deviceid"),
				fromValue = dateFromInput.value,
				toValue = dateToInput.value;

			errorHandler("");

			if ((deviceId === null) || (fromValue === "") || (toValue === "")) {
				return;
			}

			toggleLoading(true);

			var dateFrom = new Date(fromValue).toISOString(),
				dateTo = new Date(toValue).toISOString();

			api.call("Get", {
				typeName: "LogRecord",
				search: {
					deviceSearch: {
						id: deviceId
					},
					fromDate: dateFrom,
					toDate: dateTo
				}
			}, function (result) {
				var coordinates = [];
				var bounds = [];

				for (var i = 0; i < result.length; i++) {
					if (result[i].latitude != 0 || result[i].longitude != 0) {
						coordinates.push({
							lat: result[i].latitude,
							lon: result[i].longitude,
							value: 1
						});
						bounds.push(new L.LatLng(result[i].latitude, result[i].longitude));
					}
				}

				if (coordinates.length > 0) {
					map.fitBounds(bounds);
					heatMapLayer.setData(coordinates);
				} else {
					errorHandler("Not enough data to display");
				}

				toggleLoading(false);
			}, function (error) {
				errorHandler(error);
				toggleLoading(false);
			});
		};

	return {
	    initialize: function (api, state, callback) {
	        initializeInterface();
	        callback();
	    },
	    focus: function () {
	        api.call("Get", {
	            typeName: "Device",
							'search': {
								'groups': [{'id': 'b278A'}]
							}
	        }, function (result) {
	            if (result && result.length > 0) {
					result.sort(function (a, b) {
						a = a.name.toLowerCase();
						b = b.name.toLowerCase();
						if (a === b) return 0;
						if (a > b) return 1;
						return -1;
					});
	                var now = new Date();
	                for (var i = 0; i < result.length; i++) {
	                    if (new Date(result[i].activeTo) > now) {
	                        var option = new Option();
	                        option.text = result[i].name;
	                        option.setAttribute("data-deviceid", result[i].id);
	                        vehicleSelect.add(option);
	                    }
	                }
	            }
	        }, function (error) {
	            errorHandler(error);
	        });

	        setTimeout(function () {
	            map.invalidateSize();
	        }, 200);
		},
		blur: function() {

		}
	};
};
