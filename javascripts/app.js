(function($) {

  timelines = {};
  
  function Timeline(name, resource, base_params) {
    this.name        = name;
    this.since_id    = null;
    this.max_id      = null;
    this.resource    = resource;
    this.base_params = base_params;
  }
  
  $.extend(Timeline.prototype, {
    
    load: function(callback) {
      var timeline = this;
      this.resource(this.toParams(), function(tweets) {
        if (tweets.length > 0) {
          timeline.since_id = tweets[0].id;
          timeline.max_id   = tweets[tweets.length - 1].id;
        }
        callback(tweets);
      });
    },
    
    newer: function(callback) {
      var timeline = this;
      this.resource(this.toParams({since_id: this.since_id}), function(tweets) {
        if (tweets.length > 0) {
          timeline.since_id = tweets[0].id;
        }
        callback(tweets);
      });
    },
    
    older: function(callback) {
      var timeline = this;
      this.resource(this.toParams({max_id: this.max_id}), function(tweets) {
        if (tweets.length > 0) {
          timeline.max_id = tweets[0].id;
        }
        callback(tweets);
      });
    },
    
    toParams: function(params) {
      return $.extend({}, this.base_params, params);
    }
    
  });
  
  var app = $.sammy(function() { with(this) {
        
    var user = null;
    
    var timeline = function(name, resource, base_params) {
      if (!timelines[name]) {
        timelines[name] = new Timeline(name, resource, base_params);
      } 
      return timelines[name];
    }
    
    var renderTweets = function(destination, context) {
      return function(tweets) {
         context.partial('templates/tweets.html.erb', {tweets: tweets}, function(html) {
           $(html).prependTo(destination).show('slow');
           context.trigger('rebuild-timelines');
         });
       };
    };
    
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
      if (!user) {
        Twitter.account.verify_credentials(function(user) {
          app.user = user;
          log('Loaded user:', user)
          $('#login').html('Hey <a href="#/me">' + user.screen_name + '</a>');
          redirect('#/friends');
        }); 
      }
    }});
    
    get('#/login', function() { with(this) {
      $('#main').html('<div class="warning">You need to log in first</div>');
    }});
    
    get('#/friends', function() { with(this) {
      $('#main').html('');
      timeline('friends', Twitter.statuses.friends_timeline).load(renderTweets('#main', this));
    }});
    
    get('#/user/:screen_name', function() { with(this) {
      $('#main').html('');
      timeline('user/' + this.params.screen_name, Twitter.statuses.user_timeline, {screen_name: this.params.screen_name}).load(renderTweets('#main', this));
    }});
        
    post('#/update', function() { with(this) {
      
    }});
    
    bind('loading', function() { with(this) {
      $('.loading').show();
    }});
    
    bind('done-loading', function() { with(this) {
      $('.loading').hide();
    }});
    
    bind('rebuild-timelines', function() { with(this) {
      log('rebuild-timelines');
      var $timelines = $('#timelines');
      $('#timelines').html('');
      $.each(timelines, function(name, timeline) {
        $timelines.append('<li><a href="#/' + timeline.name + '">' + timeline.name + '</a></li>');
      });
    }});
    
    bind('run', function() { with(this) {
      var context = this;
      $('#timelines li a').live('click', function() {
        if (context.app.currentLocation().hash == $(this).attr('href')) {
          timelines[$(this).attr('href').replace('#/', '')].newer(renderTweets('#main', context));
        }
      });
    }});
    
  }});
  
  $(function() {
    $.extend(Twitter.ajaxOptions, {
      beforeSend: function(xhr) {
        app.trigger('loading');
      },
      error: function() {
        app.trigger('error', arguments);
      },
      complete: function() {
        app.trigger('done-loading');
      }
    });
    app.run('#/login');
  });
  
})(jQuery);