// # Button Widgets
//
// A selection of button widgets
//
// -------------------

// Best to encapsulate your plugin in a closure, although not required.
(function()
{
	freeboard.addStyle('.button-widget-button', 'text-transform: uppercase; opacity: 0.8; display: block; padding: 15px; background: #444; color: white; font-weight: 100; font-size: 20px; line-height:20px; text-align: center; -webkit-transition: opacity 0.25s; transition: opacity 0.25s;');
	freeboard.addStyle('.button-widget-button:hover', 'opacity: 1; text-decoration: none; color: white;');

	// ## Basic button
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

	// ## Spark Button
	freeboard.loadWidgetPlugin({
		"type_name"   : "mb_buttons_sparkbutton",
		"display_name": "Button (Spark)",
		"settings"    : [
            {
                "name": "text",
                "display_name": "Text",
                "type": "calculated",
				"required"	  : true
            },
            {
                "name": "color",
                "display_name": "Color",
                "type": "calculated",
                "description": "<br /><br /><hr />"
            },
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
			},
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
		],
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