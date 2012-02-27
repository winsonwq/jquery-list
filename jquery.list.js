/** 
 * jQuery list plug-in 1.1.2
 *
 * Allows easy implementation of an extremely flexible, 
 * extensible, and easily localizable graphical list  
 * interface as a jQuery plugin.
 *
 * @author Phil Taylor, Sam Sehnert, Digital Fusion 2011
 */
 
(function($){
	
	// The name of your plugin. This is used to namespace your
	// plugin methods, object data, and registerd events.
	var plugin_name = 'list';
	var plugin_version = '1.1.2';
	var plugin_logging = true;
	
	// Set up the plugin defaults.
	// These will be stored in $this.data(plugin_name).settings,
	// and can be overwritten by having 'options' passed through
	// as the parameter to the init method.
	var defaults = {
		headerSelector	: 'dt',
		bodySelector	: 'dd',
		zIndex			: 1
	};
	
	var scrollTimeout = null;
	
	// Any private methods that the plugin uses, such as event handlers,
	// or small utility functions for parsing data etc that isn't useful
	// outside the context of the plugin code itself.
	var _private = {
		
		log : function(){
			// SAFELY call console.log without fear of errors
			// also provides an override for turning off all plugin console output.
			if( plugin_logging && window.console && window.console.log ){
				try {
					// IE 8 doesn't implement apply on the console methods.
					window.console.log.apply(console,arguments);
				} catch (e) {
					// Because IE8 doesn't implement apply for console methods,
					// we simply pass the arguments directly to the log.
					window.console.log( arguments );
				}
			}
		},
		
		/**
		 * Get the scrollbar width so we know how much space to allocate.
		 *
		 * @return int : Returns the width of the scrollbars in pixels.
		 */
		scrollbarSize : function() {
			
			// Use the cached version if exists.
			if (_private._scrollbarSize===false) {
			
				var $doc = $(document.body),
				
				// Set the overflow to hidden, scroll and measure difference.
				w =$doc.css({overflow:'hidden'}).width();
				w-=$doc.css({overflow:'scroll'}).width();
				
				// Add support for IE in Standards mode.
				if(!w) w=$doc.width()-$doc[0].clientWidth;
				
				// Restore the overflow setting.
				$doc.css({overflow:''});
				
				// Cache the scrollbar width.
				_private._scrollbarSize = w;
			}
			
			// Return the width.
			return _private._scrollbarSize;
		},
		
		// Cache the scrollbar size here.
		_scrollbarSize : false,
		
		/**
		 * Gets all computed styles for the current element.
		 */
		getStyles : function(){
		    var dom = $(this).get(0);
		    var style;
		    var returns = {};
		    if(window.getComputedStyle){
		        var camelize = function(a,b){
		            return b.toUpperCase();
		        };
		        _private.log( dom, window.getComputedStyle(dom, null) );
		        style = window.getComputedStyle(dom, null);
		        for(var i = 0, l = style.length; i < l; i++){
		            var prop = style[i],
		            	camel = prop.toString().replace(/\-([a-z])/g, camelize),
		            	val = style.getPropertyValue(prop);
		            returns[camel] = val;
		        };
		        return returns;
		    };
		    if(style = dom.currentStyle){
		        for(var prop in style){
		            returns[prop] = style[prop];
		        };
		        return returns;
		    };
		    if(style = dom.style){
		      for(var prop in style){
		        if(typeof style[prop] != 'function'){
		          returns[prop] = style[prop];
		        };
		      };
		      return returns;
		    };
		    return returns;
		},
		
		// Contains events for this plugin.
		events : {
			
			/**
			 * Window resize (should also be called when resizing the target element).
			 */
			resize : function(){
				var $this = $(this),data = $this.data(plugin_name);
				
				if( data ){
					data.fakeHeader.width(data.headers.width()-_private.scrollbarSize());
				}
			},
			
			/**
			 * List element scroll handler event. Called to animate and substitute heading blocks.
			 */
			scroll : function(){
				var $this = $(this),data = $this.data(plugin_name);
				
				if( data ){
					
					var newHeader		= null,
						currentHeader	= data.headers.eq( data.currentHeader ),
						nextHeader		= data.currentHeader >= data.headers.length ? null : data.headers.eq( data.currentHeader+1 ),
						prevHeader		= data.currentHeader <= 0 ? null : data.headers.eq( data.currentHeader-1 ),
						trigger			= false;
					
					// Make sure the container top position is fresh.
					data.borderTop		= parseInt($this.css('borderTopWidth'),10)
					data.containerTop	= $this.offset().top + parseInt($this.css('marginTop'),10) + data.borderTop;
					data.fakeHeader.css('top',data.borderTop);
					
					// Check the position of the current header rather than the previous header.
					if( prevHeader !== null ){
						
					 	var top		= currentHeader.offset().top,
					 		height	= currentHeader.outerHeight();
					 	
					 	if( top > data.containerTop ){
					 		
					 		data.fakeHeader.css('top',(top-height)-data.containerTop+data.borderTop);
					 		data.fakeHeader.html(prevHeader.html());
					 		data.currentHeader = data.currentHeader-1;
					 		trigger = true;
					 	}
					 	
					 	if( (top-height) > data.containerTop ){
					 		
					 		data.fakeHeader.css('top',data.borderTop);
					 		newHeader = data.currentHeader-1;
					 	}
					 	
					}
					
					// Check the position of the next header element.
					if( nextHeader !== null ){
					 	
					 	var top		= nextHeader.offset().top,
					 		height	= nextHeader.outerHeight();
					 	
					 	if( (top-height) < data.containerTop ){
					 		
					 		data.fakeHeader.css('top',(top-height)-data.containerTop+data.borderTop);
					 	}
					 	
					 	if( top < data.containerTop ){
					 		
					 		data.fakeHeader.css('top',data.borderTop);
					 		newHeader = data.currentHeader+1;
					 	}
					}
							
					// Now assign the contents of the previous header.
					if( newHeader !== null ){
						
						var $header = data.headers.eq(newHeader);
						
						data.currentHeader = newHeader;
						data.fakeHeader.html($header.html());
						trigger = true;
					}
					
					if( trigger ){
						// Trigger the headingChange event.
						$this.trigger('headingChange',[data.currentHeader,data.headers.eq(data.currentHeader)]);
					}
					
					// Save the new data.
					$this.data(plugin_name,data);
				}
			}
		}
	}
	
	// The methods array will allow you to define public methods that
	// can be called using the plugin function using the following syntax;
	//
	// $('.selector').plugin_name( 'my_method'/*, optional arguments */);
	//
	// The 'init' method is special, and will be called when the user calls;
	//
	// $('.selector').plugin_name(/*{ options object }*/);
	var methods = {
		
		/**
		 * Initialises the plugin.
		 * 
		 * @param options object : An object containing any overrides to the default settings.
		 *
		 * @return collection : Returns the jQuery collection
		 */
		init : function( options ){
			
			// Loop through each passed element.
			return $(this).each(function(){
				
				// Settings to the defaults.
				var settings = $.extend({},defaults);
				
				// If options exist, lets merge them
				// with our default settings.
				if( typeof options == 'object' ) $.extend( settings, options );
				
				// Create shortcuts, and get any existing data.
				var $this = $(this), data = $this.data(plugin_name);
				
				// If the plugin hasn't been initialized yet
				if ( ! data ) {
					
					// Create the data object.
					data = {
						target			: $this,			// This element.
						settings		: settings,			// The settings for this plugin.
						headers			: [],
						containerTop	: 0,
						currentHeader	: 0,
						fakeHeader		: null,
						borderLeft		: parseInt( $this.css("borderLeftWidth"), 10 ),
						borderTop		: parseInt( $this.css("borderTopWidth"), 10 ),
						scrolllist		: []
					}
					
					// Add the container class, and the base HTML structure
					$this.addClass('-'+plugin_name+'-container');
					
					// Grab some variables to set up the list.
				    data.headers		= $this.find(data.settings.headerSelector);
				    data.containerTop	= $this.offset().top + parseInt($this.css('marginTop'),10) + data.borderTop;
				    data.fakeHeader		= data.headers.eq(0).clone().removeAttr('id').addClass('-'+plugin_name+'-fakeheader');
				    
				    // bind a scroll event and change the text of the fake heading
				    $this.bind('scroll.'+plugin_name,_private.events.scroll);
				    $(window).bind('resize.'+plugin_name,$.proxy(_private.events.resize,$this));
				    				    			
					// Set the fake headers
				    data.fakeHeader.css($.extend(_private.getStyles.apply(data.headers),{
				    	position	: 'absolute',
				    	top			: data.borderTop,
				    	left		: data.borderLeft,
				    	zIndex		: data.settings.zIndex
				    }));
				   
				    // Add the fake header before all other children, and set the HTML.
				    $this.data(plugin_name,data).wrap('<div class="ui-'+plugin_name+'" style="overflow: hidden; position: relative;" />').before( data.fakeHeader );
				}
			});
		},
		
		/**
		 * Retrieves the current header index that the user is scrolled to.
		 *
		 * @return int : The index position of the header (relative to the headers collection).
		 */
		header : function(){
			
			var $this = $(this),
				data = $this.data(plugin_name);
			
			// Only bother if we've set this up before.
			if( data ){
				return data.currentHeader;
			}
		},
		
		/**
		 * Used to scroll to a new header element, or to retrieve the currently set header.
		 *
		 * @param int newHeader			: The index position of the header (relative to the headers collection).
		 * @param mixed speed			: The animation speed of scrolling to the new header.
		 * @param mixed easing			: The animation easing to use.
		 * @param function completion	: The animation completion function to call.
		 *
		 * @return collection : The collection that this was called with
		 */
		scrollTo : function( newHeader, speed, easing, completion ){
			
			return this.each(function(){
				
				var $this = $(this),
					data = $this.data(plugin_name);
				
				// Only bother if we've set this up before.
				if( data ){
					
					// If we've got the header, and its a number
					if( newHeader !== undefined && !isNaN( newHeader ) && newHeader >= 0 && newHeader < data.headers.length ){
						
						// Get the new header.
						$header = data.headers.eq(newHeader);
						
						var scrollTo = $header.position().top + $this.scrollTop() + data.borderTop;
						
						// If we're not animating, we need to set the element directly.
						if( speed == undefined ){
							
							$this.scrollTop( scrollTo );
													
							// Set as the current header.
							data.currentHeader = newHeader;
							data.fakeHeader.html($header.html());
							
							// Trigger the headingChange event.
							$this.trigger('headingChange',[newHeader,$header]);
							
							// Store the new header data.
							$this.data(plugin_name,data);
							
						} else {
							// If we are animating, the scroll event will fire... maybe.
							$this.animate({scrollTop:scrollTo},speed,easing,completion);
						}
					}
				}
			});
		},
		
		/**
		 * Used to modify settings after initialisation has taken place.
		 * an example switch construct has been written to show how you
		 * might fire off an update procedure for certain defaults.
		 * Should only be called on one element at a time.
		 * 
		 * @param key string	: The option name that you want to update.
		 * @param value mixed	: (opt) The value that you want to set the option to.
		 *
		 * @return mixed : If no value is passed, will return the value for the passed key, otherwise, returns the jQuery collection.
		 */
		option : function( key, value ){
			
			var $this = $(this),
				data = $this.data(plugin_name);
			
			// Only bother if we've set this up before.
			if( data ){

				// Return settings array if no key is provided.
				if( typeof key == 'undefined' ) return data.settings;
			
				// The key has to exist, otherwise its invalid.
				if( !key in data.settings ) return false;
				
				// Check if we're adding or updating.
				if( typeof value == 'undefined' ){
					return data.settings[key];
				} else {
					data.settings[key] = value;
					return $this;
				}
			}			
		},
		
		
		/**
		 * Get the current name and version number of this plugin.
		 *
		 * @param num bool : Whether to return the version number, or string.
		 *
		 * @return string | number : The version string or version number.
		 */
		version : function( num ){
			// Returns the version string for this plugin.
			if( num ){
				// Calculate the version number.
				var v		= plugin_version.split('.'),
					major	= ( Number( v[0] ) || 1 )+'',
					minor	= ( Number( v[1] ) || 0 )+'',
					bugfix	= ( Number( v[2] ) || 0 )+'',
					fill	= '000';
				
				// Return the version as a comparable number.
				return Number( fill.slice(0,3-major.length)+major+fill.slice(0,3-minor.length)+minor+fill.slice(0,3-bugfix.length)+bugfix );
				
			} else {
				// Return the version string for this plugin.
				return plugin_name+' v'+plugin_version;
			}
		},
		
		/**
		 * Remove all data and events associated with the plugin, and restore
		 * the status of any manipulated elmenets to pre-plugin state.
		 *
		 * @return collection : Returns the jQuery collection.
		 */
		destroy: function(){
			/* Remove the ui plugin from these elements that have it */
			
			return this.each(function(){

				var $this = $(this),
					data = $this.data(plugin_name);
				
				// Only bother if we've set this up before.
				if( data ){
					// Now, remove all data, etc, then
					// reattach this element to its parent, then delete list div.
					$this.removeData(plugin_name)
						 .removeClass('-'+plugin_name+'-container')
				    	 .unbind('.'+plugin_name)
						 .parent().after($this);
					$this.siblings('.ui-'+plugin_name).remove();
				}
			});
		}
	};
	
	/**
	 * Plugin method calling handler.
	 *
	 * @param method string : (opt) Calls the defined method (or init function if omitted).
	 * @param arguments		: Any remaining arguments will be passed as arguments to the recieving method. 
	 *
	 * @return mixed : Returns the result of the called method.
	 */
	$.fn[plugin_name] = function( method ){
		// Method calling logic
		if ( methods[method] ) {
			return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
		} else if ( typeof method === 'object' || ! method ) {
			return methods.init.apply( this, arguments );
		} else {
			$.error( 'Method ' +  method + ' does not exist on jQuery.' + plugin_name );
		}	
	}
	
	// Initialise $.plugin_name for methods below.
	$[plugin_name] = {};
	
	/**
	 * Allow console logging from this plugin?
	 * 
	 * @param l bool : (opt) Turn logging on or off...
	 *
	 * @return bool : Whether this plugin will print to the log or not.
	 */
	$[plugin_name].log = function(l){ if(l!==undefined){ plugin_logging=l; } return plugin_logging; };
		
})(jQuery);