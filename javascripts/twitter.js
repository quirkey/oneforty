(function($) {

  // Timeline Methods
  // 
  
  var methods = {
    
    statuses: {
      public_timeline: 'get',
      friends_timeline: 'get',
      user_timeline: 'get',
      mentions: 'get',
      show: 'get',
      update: 'post',
      destroy: 'post',
      friends: 'get',
      followers: 'get'
    },
    
    users: {
      show: 'get'
    },
    
    direct_messages: {
      '': 'get',
      'new': 'post',
      sent: 'get',
      destroy: 'post'
    },
    
    friendships: {
      create: 'post',
      destroy: 'post',
      exists: 'get'
    },
    
    account: {
      verify_credentials: 'get',
      end_session: 'post'
    },
    
    favorites: {
      '': 'get',
      create: 'post',
      destroy: 'post'
    },
    
    help: {
      test: 'get'
    }
  };
  
  Twitter = {
    base_url: 'http://twitter.com/',
    ajaxOptions: {   
      dataType: 'jsonp'
    }
  };
  
  // base request wrapper
  
  var makeRequest = function(method, url, params, callback, options) {
    console.log(makeRequest, arguments);
    if (typeof options == 'undefined') { options = {}; }
    return $.ajax($.extend({
      type: method,
      url: [Twitter.base_url, url, '.json'].join(''),
      data: params,
      success: callback
    }, Twitter.ajaxOptions, options));
  };
    
  $.each(methods, function(resource, actions) {
    Twitter[resource] = {};
    $.each(actions, function(action, method) {
      var url = [resource, action].join('/')
      Twitter[resource][action] = function(params, callback, options) {
        if ($.isFunction(params)) {
          options  = callback;
          callback = params;
          params   = {};
        }
        return makeRequest(method, url, params, callback, options);
      };
    });
  });
  
})(jQuery);