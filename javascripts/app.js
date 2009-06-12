(function($) {
  
  $.easing.def = "easeInOutQuart";
  
  timelines = {};
  
  function Timeline(name, resource, base_params) {
    this.name        = name;
    this.since_id    = null;
    this.max_id      = null;
    this.resource    = resource;
    this.base_params = $.extend({count: 50}, base_params || {});
  }
  
  $.extend(Timeline.prototype, {
    
    load: function(event_context) {
      var timeline    = this;
      if (this.$element().length > 0) {
        event_context.log('timeline exists');
        this.newer(event_context);
      } else {
        event_context.log('timeline is new');
        // create the element
        event_context.trigger('loading');
        var $el = $('<div class="timeline" style="display:none;" id="' + timeline.elementID() + '">');
        $el.appendTo('#main');
        this.resource(this.toParams(), function(tweets) {
          if (tweets.length > 0) {
            timeline.since_id = tweets[0].id;
            timeline.max_id   = tweets[tweets.length - 1].id;
          }
          timeline.renderTweets(event_context, tweets);
        });
      }
    },
    
    newer: function(event_context) {
      var timeline = this;
      event_context.trigger('loading');
      this.resource(this.toParams({since_id: this.since_id}), function(tweets) {
        if (tweets.length > 0) {
          timeline.since_id = tweets[0].id;
        }
        timeline.renderTweets(event_context, tweets);
      });
    },
    
    older: function(event_context) {
      var timeline = this;
      event_context.trigger('loading');
      this.resource(this.toParams({max_id: this.max_id}), function(tweets) {
        if (tweets.length > 0) {
          timeline.max_id = tweets[0].id;
        }
        timeline.renderTweets(event_context, tweets);
      });
    },
    
    toParams: function(params) {
      return $.extend({}, this.base_params, params);
    },
    
    elementID: function() {
      return 'timeline-' + this.name.replace('/','-');
    },
    
    $element: function() {
      return $('#' + this.elementID());
    },
    
    show: function() {
      // hide the other ones
      var width = $(window).width();
      $('.timeline:visible').animate({queue: false, left: "-" + width}, 400);
      this.$element().css({left: width}).animate({left: '0px', width: width}, 400).show();
    },
    
    renderTweets: function(event_context, tweets) {
      var timeline = this;
      var destination = this.$element();
      event_context.log('rendering tweets', destination, tweets);
      event_context.partial('templates/tweets.html.erb', {tweets: tweets}, function(html) {
        event_context.log('rendering partial for tweets');
        $(html).prependTo(destination).show('slow');
        event_context.trigger('rebuild-timelines');
        event_context.trigger('done-loading');
        timeline.show();
      });
    }
    
  });
  
  var app = $.sammy(function() { with(this) {
    
    // debug = true;

		var user, connecting = null;
    
    var timeline = function(name, resource, base_params) {
      if (!timelines[name]) {
        timelines[name] = new Timeline(name, resource, base_params);
      } 
      return timelines[name];
    }
        
    helpers({
      autolink: function(text) {
        return text
                // #hashtags
                .replace(/\#([^\s]+)/g, '<a href="#/search/$1">#$1</a>')
                // links
                .replace(/(http\:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>')
                // screenames
                .replace(/\@([^\s]+)/g, '<a href="#/user/$1">@$1</a>');
      }
    });
    
    before(function() { with(this) {
      if (!user && !connecting) {
				var back = app.currentLocation();
				if (back.hash.match(/login/)) {
					back.hash = '#/';
				}
				log('back', back);
				redirect('#/login');
				connecting = true;
        Twitter.account.verify_credentials(function(user) {
          app.user = user;
          log('Loaded user:', user)
          $('#login').html('Hey <a href="#/me">' + user.screen_name + '</a>');
          redirect(back.hash);
					connecting = false;
				});
				return false;
      } else if(user) {
        $('#login_warning').hide();
      }
    }});
        
    get('#/', function() { with(this) {
    	redirect('#/friends');
    }});
    
    get('#/login', function() { with(this) {
      $('#main').html('<div id="login_warning" class="warning">Sorry, You need to log in first.</div>');
    }});
    
    get('#/friends', function() { with(this) {
      timeline('friends', Twitter.statuses.friends_timeline).load(this);
    }});
    
    get('#/user/:screen_name', function() { with(this) {
      timeline('user/' + this.params.screen_name, Twitter.statuses.user_timeline, {screen_name: this.params.screen_name}).load(this);
    }});
    
    get(/\#\/kill_timeline\/(.*)$/, function() { with(this) {
      delete timelines[params['splat']];
      trigger('rebuild-timelines');
      redirect('#/friends');
    }});
    
    post('#/update', function() { with(this) {
      
    }});
    
    bind('loading', function() { with(this) {
      log('loading');
      $('.loading').show();
    }});
    
    bind('done-loading', function() { with(this) {
      log('done-loading');
      $('.loading').hide();
    }});
    
    bind('rebuild-timelines', function() { with(this) {
      var context = this;
      log('rebuild-timelines');
      var $timelines = $('#timelines ul');
      $timelines.html('');
      $.each(timelines, function(name, timeline) {
        $timelines.append('<li><a class="timeline-name" href="#/' + timeline.name + '">' + timeline.name + '</a><a class="kill" href="#/kill_timeline/'+ timeline.name +'">x</a></li>');
      });
    }});
    
    bind('run', function() { with(this) {
      var context = this;
      $('#timelines li a').live('click', function() {
        if (context.app.currentLocation().hash == $(this).attr('href')) {
          timelines[$(this).attr('href').replace('#/', '')].newer(context);
        }
      });
    }});
    
  }});
  
  $(function() {
		//app.debug = true;
    $.extend(Twitter.ajaxOptions, {
      error: function() {
        app.trigger('error', arguments);
      }
    });
    app.run('#/login');
  });
  
})(jQuery);