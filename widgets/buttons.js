// # Button Widgets
//
// A selection of button widgets
//
// -------------------

// Best to encapsulate your plugin in a closure, although not required.
(function()
{
	// ## Toggle Button Widget Plugin
	freeboard.loadWidgetPlugin({
		"type_name"   : "mb_buttons_togglebutton",
		"display_name": "Toggle Button",
        "description" : "A toggle button with status",
		"settings"    : [
			{
				"name"        : "title",
				"display_name": "Title",
				"type"        : "text"
			},
			{
				"name"        : "value",
				"display_name": "Value",
				"type"        : "calculated"
			},
            {
                "name": "on_text",
                "display_name": "On Text",
                "type": "calculated"
            },
            {
                "name": "off_text",
                "display_name": "Off Text",
                "type": "calculated"
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
                        value: "get"
                    },
                    {
                        name: "POST",
                        value: "post"
                    },
                    {
                        name: "PUT",
                        value: "put"
                    },
                    {
                        name: "DELETE",
                        value: "delete"
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
                "type": "array"
            },
		],
		newInstance   : function(settings, newInstanceCallback)
		{
			newInstanceCallback(new toggleButtonWidget(settings));
		}
	});

	// ### Toggle Button Wwidget
	var toggleButtonWidget = function(settings)
	{
		var self = this;
		var currentSettings = settings;

		var titleElement = $('<h2 class="section-title"></h2>');
		var buttonElement = $("<span></span>");

		self.render = function(containerElement)
		{
			$(containerElement).append(titleElement).append(buttonElement);
		}

		self.getHeight = function()
		{
			return 1;
		}

		self.onSettingsChanged = function(newSettings)
		{
			// Store settings
			currentSettings = newSettings;

			// Update non-calculated elements
			$(titleElement).html(currentSettings.title);
		}

		self.onCalculatedValueChanged = function(settingName, newValue)
		{
			// Remember we defined "the_text" up above in our settings.
			//if(settingName == "the_text")
			//{
				// Here we do the actual update of the value that's displayed in on the screen.
			//	$(buttonElement).html(newValue);
			//}
		}

		self.onDispose = function()
		{
		}
	}
}());