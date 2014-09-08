(function()
{
	// ## Styles
	freeboard.addStyle('.button-widget-button', 'text-transform: uppercase; opacity: 0.8; display: block; padding: 15px; background: #444; color: white; font-weight: 100; font-size: 20px; line-height:20px; text-align: center; -webkit-transition: opacity 0.25s; transition: opacity 0.25s;');
	freeboard.addStyle('.button-widget-button:hover', 'opacity: 1; text-decoration: none; color: white;');

	// ## Helper methods
	function formatValue(value, type)
	{
		switch(type.toUpperCase())
		{
			case "BOOLEAN":
			case "BOOL":
				return value.toLowerCase() === "true" || value == "1";
				break;
			case "INT":
			case "DOUBLE":
			case "NUMBER":
				return Number(value);
				break;
			case "JSON":
				try
				{
					return JSON.parse(value);
				}
				catch(e)
				{
					return {};
				}
				break;
			default:
				return String(value);
				break;
		}
	}

	var sparkApiSettings = [
		{
			"name"         : "access_token",
			"display_name" : "Access Token",
			"type"         : "text",
            "required"     : true
		},
		{
			"name"        : "device_id",
			"display_name": "Device ID",
			"type"        : "text",
			"required"	  : true
		},
		{
			"name"        : "api_version",
			"display_name": "API Version",
			"type"        : "option",
			"options"	  : [
				{
					"name": "v1",
					"value": "v1"
				}
			],
			"required"	  : true
		}
	];

	// ## Polling Spark Core Datasource
	freeboard.loadDatasourcePlugin({
		"type_name"   : "sparkcore_polling",
		"display_name": "Spark Core (Polling)",
       	"description" : "A datasource for speaking with a Spark Core using request polling.",
		"settings"    : _.union(sparkApiSettings, [
			,
			{
				"name"        : "variable_name",
				"display_name": "Variable Name",
				"type"        : "text",
				"required"	  : true
			},
			{
				"name"        : "variable_type",
				"display_name": "Variable Type",
				"type"        : "text",
				"description" : "Can be one of BOOLEAN, NUMBER, STRING or JSON",
				"default_value" : "NUMBER",
				"required"	  : true
			},
			{
				"name"         : "refresh_time",
				"display_name" : "Refresh Time",
				"type"         : "text",
				"description"  : "In milliseconds",
				"default_value": 5000
			}
		]),
		newInstance   : function(settings, newInstanceCallback, updateCallback)
		{
			newInstanceCallback(new sparkCorePollingDatasourcePlugin(settings, updateCallback));
		}
	});

	var sparkCorePollingDatasourcePlugin = function(settings, updateCallback)
	{
		var self = this;

		var currentSettings = settings;

		var refreshTimer;

		function getData()
		{
			$.ajax({
					url  : "https://api.spark.io/" + currentSettings.api_version + "/devices/" + currentSettings.device_id + "/" + currentSettings.variable_name,
					type : "GET",
					beforeSend: function(xhr)
					{
						try
						{
							xhr.setRequestHeader("Authorization", "Bearer " + currentSettings.access_token);
						}
						catch(e)
						{
						}
					},
					success   : function(data)
					{
						updateCallback(formatValue(data.result, currentSettings.variable_type));
					},
					error     : function(xhr, status, error)
					{
						//console.log(error);
					}
				});

		}

		function initEventSource(interval)
		{
			if(refreshTimer)
			{
				clearInterval(refreshTimer);
			}

			refreshTimer = setInterval(function()
			{
				// Here we call our getData function to update freeboard with new data.
				getData();

			}, interval);
		}

		function destroyEventSource()
		{
			if(refreshTimer)
			{
				clearInterval(refreshTimer);
			}
		}

		self.onSettingsChanged = function(newSettings)
		{
			destroyEventSource();

			currentSettings = newSettings;

			initEventSource(currentSettings.refresh_time);
		}

		self.updateNow = function()
		{
			getData();
		}

		self.onDispose = function()
		{
			destroyEventSource();
		}

		initEventSource(currentSettings.refresh_time);
	}

	// ## Streaming Spark Core Datasource
	freeboard.loadDatasourcePlugin({
		"type_name"   : "sparkcore_stream",
		"display_name": "Spark Core (Stream)",
       	"description" : "A datasource for speaking with a Spark Core using a Server-Sent Events stream.",
		"settings"    : _.union(sparkApiSettings, [
			{
				"name"        : "events",
				"display_name": "Events",
				"type"        : "array",
				"settings"    : [
					{
						"name"        : "name",
						"display_name": "Name",
						"type"        : "text"
					},
					{
						"name"        : "type",
						"display_name": "Data Type",
						"type"        : "text"
					}
				]
			}
		]),
		newInstance   : function(settings, newInstanceCallback, updateCallback)
		{
			newInstanceCallback(new sparkCoreStreamDatasourcePlugin(settings, updateCallback));
		}
	});

	var sparkCoreStreamDatasourcePlugin = function(settings, updateCallback)
	{
		var self = this;

		var currentSettings = settings;

		var eventSource;

		var dataObj = {};

		function onMessage(evt)
		{
			if(evt.origin == "https://api.spark.io") 
			{
				var sparkData = JSON.parse(evt.data);
				if(sparkData.coreid == currentSettings.device_id) 
				{
					var evtDef = _.find(currentSettings.events, function(itm){
						return itm.name == evt.type;
					});

					dataObj[evt.type] = formatValue(sparkData.data, evtDef.type);
					
					updateCallback(dataObj);
				}
			}
		}

		function onOpen(evt)
		{
			//console.log(evt);
		}

		function onError(evt)
		{
			throw new Error("Error connecting to the Spark Core API.")
		}

		function initEventSource()
		{
			if (!window.EventSource) 
			{
				throw new Error("Browser doesn't support EventSource.")
			} 
			else 
			{
				// Create event source
				eventSource = new EventSource("https://api.spark.io/" + currentSettings.api_version + "/devices/" + currentSettings.device_id + "/events?access_token=" + currentSettings.access_token);

				// Hookup standard event handlers
				eventSource.addEventListener('open', onOpen, false);
				eventSource.addEventListener('error', onError, false);

				// Hookup custom event handlers
				for(var i = 0; i < currentSettings.events.length; i++) 
				{
					// Add event handler
					eventSource.addEventListener(currentSettings.events[i].name, onMessage, false);

					// Add data property
					dataObj[currentSettings.events[i].name] = formatValue("", currentSettings.events[i].type);
				}

				// Broadcast an initial update
				updateCallback(dataObj);
			}
		}

		function destroyEventSource()
		{
			// Close connection
			if(eventSource.readyState == EventSource.OPEN) {
				eventSource.close();
			}

			// Remove custom event handlers
			for(var i = 0; i < currentSettings.events.length; i++)
			{
				// Remove handler
				eventSource.removeEventListener(currentSettings.events[i].name, onMessage, false);

				// Remove property from data object
				delete dataObj[currentSettings.events[i].name];
			}

			// Remove standard event handlers
			eventSource.removeEventListener('open', onOpen, false);
			eventSource.removeEventListener('error', onError, false);
		}

		self.onSettingsChanged = function(newSettings)
		{
			destroyEventSource();

			currentSettings = newSettings;

			initEventSource();
		}

		self.updateNow = function()
		{
			// Event source streams as it happens, so no need for this
		}

		self.onDispose = function()
		{
			destroyEventSource();
		}

		initEventSource();
	}

	// ## Basic Button Widget
	/*freeboard.loadWidgetPlugin({
		"type_name"   : "mb_buttons_button",
		"display_name": "Button",
		"settings"    : [
            {
                "name": "text",
                "display_name": "Text",
                "type": "calculated"
            },
            {
                "name": "color",
                "display_name": "Color",
                "type": "calculated",
                "description": "<br /><br /><hr />"
            },
            {
                "name": "url",
                "display_name": "URL",
                "description": "The URL to notify when the button is toggled.",
                "type": "calculated"
            },
            {
                "name": "method",
                "display_name": "Method",
                "type": "option",
                "options" : [
					{
						name: "GET",
						value: "GET"
					},
					{
						name: "POST",
						value: "POST"
					},
					{
						name: "PUT",
						value: "PUT"
					},
					{
						name: "DELETE",
						value: "DELETE"
					}
                ]
            },
            {
                "name": "body",
                "display_name": "Body",
                "description": "The body of the request. Normally only used if method is POST",
                "type": "calculated"
            },
            {
                "name": "headers",
                "display_name": "Headers",
                "type": "array",
                "settings" : [
					{
						name        : "name",
						display_name: "Name",
						type        : "text"
					},
					{
						name        : "value",
						display_name: "Value",
						type        : "text"
					}
				]
            },
		],
		newInstance   : function(settings, newInstanceCallback)
		{
			newInstanceCallback(new buttonWidget(settings));
		}
	});*/

	var buttonWidget = function(settings)
	{
		var self = this;
		var currentSettings = settings;
		var url, body;

		var buttonElement = $('<a href="#" class="button-widget-button"></a>')
			.on("click", function(e){

				e.preventDefault();

				var payload = body;

				// Can the body be converted to JSON?
				if(payload)
				{
					try
					{
						payload = JSON.parse(payload);
					}
					catch(e)
					{

					}
				}

				$.ajax({
					url  : url,
					//dataType  : (errorStage == 1) ? "JSONP" : "JSON",
					type : currentSettings.method || "GET",
					data : payload,
					beforeSend: function(xhr)
					{
						try
						{
							_.each(currentSettings.headers, function(header)
							{
								var name = header.name;
								var value = header.value;

								if(!_.isUndefined(name) && !_.isUndefined(value))
								{
									xhr.setRequestHeader(name, value);
								}
							});
						}
						catch(e)
						{
						}
					},
					success   : function(data)
					{
						//console.log("Success!");
					},
					error     : function(xhr, status, error)
					{
						//console.log(error);
					}
				});

			});

		self.render = function(containerElement)
		{
			$(containerElement).append(buttonElement);
		}

		self.getHeight = function()
		{
			return 1;
		}

		self.onSettingsChanged = function(newSettings)
		{
			// Store settings
			currentSettings = newSettings;
		}

		self.onCalculatedValueChanged = function(settingName, newValue)
		{
			switch(settingName){
				case "text":
					$(buttonElement).html(newValue);
					break;
				case "color":
					$(buttonElement).css("backgroundColor", newValue);
					break;
				case "url":
					url = newValue;
					break;
				case "body":
					body = newValue;
					break;
			}
		}

		self.onDispose = function()
		{
			$(buttonElement).off("click");
		}
	}

	// ## Spark Button Widget
	freeboard.loadWidgetPlugin({
		"type_name"   : "mb_buttons_sparkbutton",
		"display_name": "Button (Spark)",
		"settings"    : _.union([
            {
                "name": "text",
                "display_name": "Text",
                "type": "calculated",
				"required"	  : true
            },
            {
                "name": "color",
                "display_name": "Color",
                "type": "calculated"
            }
        ],
        sparkApiSettings,
        [
			{
				"name"        : "function_name",
				"display_name": "Function Name",
				"type"        : "text",
				"required"	  : true
			},
			{
				"name"        : "argument_name",
				"display_name": "Argument Name",
				"type"        : "text",
				"required"	  : true
			},
			{
				"name"        : "argument_value",
				"display_name": "Argument Value",
				"type"        : "calculated",
				"required"	  : true
			},
		]),
		newInstance   : function(settings, newInstanceCallback)
		{
			newInstanceCallback(new sparkButtonWidget(settings));
		}
	});

	var sparkButtonWidget = function(settings)
	{
		var self = this;

		var convertToButtonSettings = function(settings)
		{
			var newSettings = $.extend({}, settings);
			newSettings.method = "POST";
			newSettings.headers = [ { "name" : "Authorization", "value" : "Bearer " + settings.access_token }];
			return newSettings;
		}

		var btn = new buttonWidget(convertToButtonSettings(settings));
		btn.onCalculatedValueChanged("url", "https://api.spark.io/" + settings.api_version + "/devices/" + settings.device_id + "/" + settings.function_name);

		self.render = function(containerElement)
		{
			btn.render(containerElement);
		}

		self.getHeight = function()
		{
			return btn.getHeight();
		}

		self.onSettingsChanged = function(newSettings)
		{
			btn.onSettingsChanged(convertToButtonSettings(newSettings));
		}

		self.onCalculatedValueChanged = function(settingName, newValue)
		{
			switch(settingName){
				case "argument_value":
					btn.onCalculatedValueChanged("body", settings.argument_name +"="+ newValue);
					break;
				default:
					btn.onCalculatedValueChanged(settingName, newValue);
					break
			}
		}

		self.onDispose = function()
		{
			btn.onDispose();
		}
	}

}());