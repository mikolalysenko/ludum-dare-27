;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict"

var WebSocket   = require("ws")()
var request     = require("browser-request")
var persona     = require("persona-id")({ route: "/_profile" })
var parsedURL   = require("parsed-url")

var loginStatus = document.getElementById("loginmsg")
var identify    = document.getElementById("identify")
var chatLog     = document.getElementById("chatlog")
var chatBox     = document.getElementById("chatbox")
var betAmount   = document.getElementById("betamount")
var betLeft     = document.getElementById("betleft")
var betRight    = document.getElementById("betright")
var canvas      = document.getElementById("gamefield")

var context     = canvas.getContext("2d")

var loggedIn = false
var email = ""
var socket = null

context.fillStyle = "rgba(0,0,0,1.0)"
context.fillRect(0, 0, 800, 800)

function checkState() {
  request({url: "/_profile", json: true}, function(err, resp, profile) {
    console.log(profile)
    if(profile) {
      if(loggedIn) {
        return
      }
      loggedIn = true
      email = profile.email
      socket = new WebSocket("ws://" + parsedURL.host)
      chatBox.disabled = false
      identify.value = "unidentify"
      loginStatus.innerHTML = "Logged in as " + email
      
      socket.onopen = function() {
        console.log("SOCKET OPEN")
      }
      
      socket.onmessage = function(data, flags) {
        var parsed = JSON.parse(data.data)
        if(parsed.chat) {
          var textNode = document.createElement("p")
          textNode.className = "chatItem"
          var userNode = document.createElement("div")
          userNode.appendChild(document.createTextNode(parsed.user))
          userNode.className = "chatUser"
          var chatNode = document.createTextNode(parsed.chat)
          textNode.appendChild(userNode)
          textNode.appendChild(chatNode)
          chatLog.appendChild(textNode)
          chatLog.scrollTop = chatLog.scrollHeight
        }
        console.log("DATA", data)
      }
      
      socket.onerror = function(evt) {
        console.log("SOCKET ERROR", evt)
      }
    } else {
      if(socket) {
        socket.close()
      }
      if(!loggedIn) {
        return
      }
      loggedIn = false
      email = ""
      socket = null
      identify.value = "identify"
      chatBox.disabled = true
      loginStatus.innerHTML = "Not logged in"
    }
  })
}

persona.on("login", function(id) {
  checkState()
})

persona.on("logout", function() {
  checkState()
})

identify.addEventListener("click", function () {
  if(loggedIn) {
    persona.unidentify()
  } else {
    persona.identify()
  }
})

chatBox.addEventListener("keydown", function(evt) {
  if(evt.keyCode === 13) {
    var str = chatBox.value
    chatBox.value = ""
    if(socket) {
      socket.send(['{"chat":"', str.replace(/\\/g, "\\\\").replace(/"/g, "\\\""), '"}'].join(""))
    }
  }
})


checkState()

},{"browser-request":2,"parsed-url":27,"persona-id":28,"ws":31}],2:[function(require,module,exports){
// Browser Request
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var XHR = XMLHttpRequest
if (!XHR) throw new Error('missing XMLHttpRequest')

module.exports = request
request.log = {
  'trace': noop, 'debug': noop, 'info': noop, 'warn': noop, 'error': noop
}

var DEFAULT_TIMEOUT = 3 * 60 * 1000 // 3 minutes

//
// request
//

function request(options, callback) {
  // The entry-point to the API: prep the options object and pass the real work to run_xhr.
  if(typeof callback !== 'function')
    throw new Error('Bad callback given: ' + callback)

  if(!options)
    throw new Error('No options given')

  var options_onResponse = options.onResponse; // Save this for later.

  if(typeof options === 'string')
    options = {'uri':options};
  else
    options = JSON.parse(JSON.stringify(options)); // Use a duplicate for mutating.

  options.onResponse = options_onResponse // And put it back.

  if (options.verbose) request.log = getLogger();

  if(options.url) {
    options.uri = options.url;
    delete options.url;
  }

  if(!options.uri && options.uri !== "")
    throw new Error("options.uri is a required argument");

  if(typeof options.uri != "string")
    throw new Error("options.uri must be a string");

  var unsupported_options = ['proxy', '_redirectsFollowed', 'maxRedirects', 'followRedirect']
  for (var i = 0; i < unsupported_options.length; i++)
    if(options[ unsupported_options[i] ])
      throw new Error("options." + unsupported_options[i] + " is not supported")

  options.callback = callback
  options.method = options.method || 'GET';
  options.headers = options.headers || {};
  options.body    = options.body || null
  options.timeout = options.timeout || request.DEFAULT_TIMEOUT

  if(options.headers.host)
    throw new Error("Options.headers.host is not supported");

  if(options.json) {
    options.headers.accept = options.headers.accept || 'application/json'
    if(options.method !== 'GET')
      options.headers['content-type'] = 'application/json'

    if(typeof options.json !== 'boolean')
      options.body = JSON.stringify(options.json)
    else if(typeof options.body !== 'string')
      options.body = JSON.stringify(options.body)
  }

  // If onResponse is boolean true, call back immediately when the response is known,
  // not when the full request is complete.
  options.onResponse = options.onResponse || noop
  if(options.onResponse === true) {
    options.onResponse = callback
    options.callback = noop
  }

  // XXX Browsers do not like this.
  //if(options.body)
  //  options.headers['content-length'] = options.body.length;

  // HTTP basic authentication
  if(!options.headers.authorization && options.auth)
    options.headers.authorization = 'Basic ' + b64_enc(options.auth.username + ':' + options.auth.password);

  return run_xhr(options)
}

var req_seq = 0
function run_xhr(options) {
  var xhr = new XHR
    , timed_out = false
    , is_cors = is_crossDomain(options.uri)
    , supports_cors = ('withCredentials' in xhr)

  req_seq += 1
  xhr.seq_id = req_seq
  xhr.id = req_seq + ': ' + options.method + ' ' + options.uri
  xhr._id = xhr.id // I know I will type "_id" from habit all the time.

  if(is_cors && !supports_cors) {
    var cors_err = new Error('Browser does not support cross-origin request: ' + options.uri)
    cors_err.cors = 'unsupported'
    return options.callback(cors_err, xhr)
  }

  xhr.timeoutTimer = setTimeout(too_late, options.timeout)
  function too_late() {
    timed_out = true
    var er = new Error('ETIMEDOUT')
    er.code = 'ETIMEDOUT'
    er.duration = options.timeout

    request.log.error('Timeout', { 'id':xhr._id, 'milliseconds':options.timeout })
    return options.callback(er, xhr)
  }

  // Some states can be skipped over, so remember what is still incomplete.
  var did = {'response':false, 'loading':false, 'end':false}

  xhr.onreadystatechange = on_state_change
  xhr.open(options.method, options.uri, true) // asynchronous
  if(is_cors)
    xhr.withCredentials = !! options.withCredentials
  xhr.send(options.body)
  return xhr

  function on_state_change(event) {
    if(timed_out)
      return request.log.debug('Ignoring timed out state change', {'state':xhr.readyState, 'id':xhr.id})

    request.log.debug('State change', {'state':xhr.readyState, 'id':xhr.id, 'timed_out':timed_out})

    if(xhr.readyState === XHR.OPENED) {
      request.log.debug('Request started', {'id':xhr.id})
      for (var key in options.headers)
        xhr.setRequestHeader(key, options.headers[key])
    }

    else if(xhr.readyState === XHR.HEADERS_RECEIVED)
      on_response()

    else if(xhr.readyState === XHR.LOADING) {
      on_response()
      on_loading()
    }

    else if(xhr.readyState === XHR.DONE) {
      on_response()
      on_loading()
      on_end()
    }
  }

  function on_response() {
    if(did.response)
      return

    did.response = true
    request.log.debug('Got response', {'id':xhr.id, 'status':xhr.status})
    clearTimeout(xhr.timeoutTimer)
    xhr.statusCode = xhr.status // Node request compatibility

    // Detect failed CORS requests.
    if(is_cors && xhr.statusCode == 0) {
      var cors_err = new Error('CORS request rejected: ' + options.uri)
      cors_err.cors = 'rejected'

      // Do not process this request further.
      did.loading = true
      did.end = true

      return options.callback(cors_err, xhr)
    }

    options.onResponse(null, xhr)
  }

  function on_loading() {
    if(did.loading)
      return

    did.loading = true
    request.log.debug('Response body loading', {'id':xhr.id})
    // TODO: Maybe simulate "data" events by watching xhr.responseText
  }

  function on_end() {
    if(did.end)
      return

    did.end = true
    request.log.debug('Request done', {'id':xhr.id})

    xhr.body = xhr.responseText
    if(options.json) {
      try        { xhr.body = JSON.parse(xhr.responseText) }
      catch (er) { return options.callback(er, xhr)        }
    }

    options.callback(null, xhr, xhr.body)
  }

} // request

request.withCredentials = false;
request.DEFAULT_TIMEOUT = DEFAULT_TIMEOUT;

//
// HTTP method shortcuts
//

var shortcuts = [ 'get', 'put', 'post', 'head' ];
shortcuts.forEach(function(shortcut) {
  var method = shortcut.toUpperCase();
  var func   = shortcut.toLowerCase();

  request[func] = function(opts) {
    if(typeof opts === 'string')
      opts = {'method':method, 'uri':opts};
    else {
      opts = JSON.parse(JSON.stringify(opts));
      opts.method = method;
    }

    var args = [opts].concat(Array.prototype.slice.apply(arguments, [1]));
    return request.apply(this, args);
  }
})

//
// CouchDB shortcut
//

request.couch = function(options, callback) {
  if(typeof options === 'string')
    options = {'uri':options}

  // Just use the request API to do JSON.
  options.json = true
  if(options.body)
    options.json = options.body
  delete options.body

  callback = callback || noop

  var xhr = request(options, couch_handler)
  return xhr

  function couch_handler(er, resp, body) {
    if(er)
      return callback(er, resp, body)

    if((resp.statusCode < 200 || resp.statusCode > 299) && body.error) {
      // The body is a Couch JSON object indicating the error.
      er = new Error('CouchDB error: ' + (body.error.reason || body.error.error))
      for (var key in body)
        er[key] = body[key]
      return callback(er, resp, body);
    }

    return callback(er, resp, body);
  }
}

//
// Utility
//

function noop() {}

function getLogger() {
  var logger = {}
    , levels = ['trace', 'debug', 'info', 'warn', 'error']
    , level, i

  for(i = 0; i < levels.length; i++) {
    level = levels[i]

    logger[level] = noop
    if(typeof console !== 'undefined' && console && console[level])
      logger[level] = formatted(console, level)
  }

  return logger
}

function formatted(obj, method) {
  return formatted_logger

  function formatted_logger(str, context) {
    if(typeof context === 'object')
      str += ' ' + JSON.stringify(context)

    return obj[method].call(obj, str)
  }
}

// Return whether a URL is a cross-domain request.
function is_crossDomain(url) {
  var rurl = /^([\w\+\.\-]+:)(?:\/\/([^\/?#:]*)(?::(\d+))?)?/

  // jQuery #8138, IE may throw an exception when accessing
  // a field from window.location if document.domain has been set
  var ajaxLocation
  try { ajaxLocation = location.href }
  catch (e) {
    // Use the href attribute of an A element since IE will modify it given document.location
    ajaxLocation = document.createElement( "a" );
    ajaxLocation.href = "";
    ajaxLocation = ajaxLocation.href;
  }

  var ajaxLocParts = rurl.exec(ajaxLocation.toLowerCase()) || []
    , parts = rurl.exec(url.toLowerCase() )

  var result = !!(
    parts &&
    (  parts[1] != ajaxLocParts[1]
    || parts[2] != ajaxLocParts[2]
    || (parts[3] || (parts[1] === "http:" ? 80 : 443)) != (ajaxLocParts[3] || (ajaxLocParts[1] === "http:" ? 80 : 443))
    )
  )

  //console.debug('is_crossDomain('+url+') -> ' + result)
  return result
}

// MIT License from http://phpjs.org/functions/base64_encode:358
function b64_enc (data) {
    // Encodes string using MIME base64 algorithm
    var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, enc="", tmp_arr = [];

    if (!data) {
        return data;
    }

    // assume utf8 data
    // data = this.utf8_encode(data+'');

    do { // pack three octets into four hexets
        o1 = data.charCodeAt(i++);
        o2 = data.charCodeAt(i++);
        o3 = data.charCodeAt(i++);

        bits = o1<<16 | o2<<8 | o3;

        h1 = bits>>18 & 0x3f;
        h2 = bits>>12 & 0x3f;
        h3 = bits>>6 & 0x3f;
        h4 = bits & 0x3f;

        // use hexets to index into b64, and append result to encoded string
        tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
    } while (i < data.length);

    enc = tmp_arr.join('');

    switch (data.length % 3) {
        case 1:
            enc = enc.slice(0, -2) + '==';
        break;
        case 2:
            enc = enc.slice(0, -1) + '=';
        break;
    }

    return enc;
}

},{}],3:[function(require,module,exports){
var process=require("__browserify_process");if (!process.EventEmitter) process.EventEmitter = function () {};

var EventEmitter = exports.EventEmitter = process.EventEmitter;
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.prototype.toString.call(xs) === '[object Array]'
    }
;
function indexOf (xs, x) {
    if (xs.indexOf) return xs.indexOf(x);
    for (var i = 0; i < xs.length; i++) {
        if (x === xs[i]) return i;
    }
    return -1;
}

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
var defaultMaxListeners = 10;
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!this._events) this._events = {};
  this._events.maxListeners = n;
};


EventEmitter.prototype.emit = function(type) {
  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events || !this._events.error ||
        (isArray(this._events.error) && !this._events.error.length))
    {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }

  if (!this._events) return false;
  var handler = this._events[type];
  if (!handler) return false;

  if (typeof handler == 'function') {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        var args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    var args = Array.prototype.slice.call(arguments, 1);

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } else {
    return false;
  }
};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
EventEmitter.prototype.addListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) this._events = {};

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {

    // Check for listener leak
    if (!this._events[type].warned) {
      var m;
      if (this._events.maxListeners !== undefined) {
        m = this._events.maxListeners;
      } else {
        m = defaultMaxListeners;
      }

      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      this._events[type].length);
        console.trace();
      }
    }

    // If we've already got an array, just append.
    this._events[type].push(listener);
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  var self = this;
  self.on(type, function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  });

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var i = indexOf(list, listener);
    if (i < 0) return this;
    list.splice(i, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (this._events[type] === listener) {
    delete this._events[type];
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  if (arguments.length === 0) {
    this._events = {};
    return this;
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events) this._events = {};
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (typeof emitter._events[type] === 'function')
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

},{"__browserify_process":26}],4:[function(require,module,exports){

/**
 * Object#toString() ref for stringify().
 */

var toString = Object.prototype.toString;

/**
 * Array#indexOf shim.
 */

var indexOf = typeof Array.prototype.indexOf === 'function'
  ? function(arr, el) { return arr.indexOf(el); }
  : function(arr, el) {
      for (var i = 0; i < arr.length; i++) {
        if (arr[i] === el) return i;
      }
      return -1;
    };

/**
 * Array.isArray shim.
 */

var isArray = Array.isArray || function(arr) {
  return toString.call(arr) == '[object Array]';
};

/**
 * Object.keys shim.
 */

var objectKeys = Object.keys || function(obj) {
  var ret = [];
  for (var key in obj) ret.push(key);
  return ret;
};

/**
 * Array#forEach shim.
 */

var forEach = typeof Array.prototype.forEach === 'function'
  ? function(arr, fn) { return arr.forEach(fn); }
  : function(arr, fn) {
      for (var i = 0; i < arr.length; i++) fn(arr[i]);
    };

/**
 * Array#reduce shim.
 */

var reduce = function(arr, fn, initial) {
  if (typeof arr.reduce === 'function') return arr.reduce(fn, initial);
  var res = initial;
  for (var i = 0; i < arr.length; i++) res = fn(res, arr[i]);
  return res;
};

/**
 * Cache non-integer test regexp.
 */

var isint = /^[0-9]+$/;

function promote(parent, key) {
  if (parent[key].length == 0) return parent[key] = {};
  var t = {};
  for (var i in parent[key]) t[i] = parent[key][i];
  parent[key] = t;
  return t;
}

function parse(parts, parent, key, val) {
  var part = parts.shift();
  // end
  if (!part) {
    if (isArray(parent[key])) {
      parent[key].push(val);
    } else if ('object' == typeof parent[key]) {
      parent[key] = val;
    } else if ('undefined' == typeof parent[key]) {
      parent[key] = val;
    } else {
      parent[key] = [parent[key], val];
    }
    // array
  } else {
    var obj = parent[key] = parent[key] || [];
    if (']' == part) {
      if (isArray(obj)) {
        if ('' != val) obj.push(val);
      } else if ('object' == typeof obj) {
        obj[objectKeys(obj).length] = val;
      } else {
        obj = parent[key] = [parent[key], val];
      }
      // prop
    } else if (~indexOf(part, ']')) {
      part = part.substr(0, part.length - 1);
      if (!isint.test(part) && isArray(obj)) obj = promote(parent, key);
      parse(parts, obj, part, val);
      // key
    } else {
      if (!isint.test(part) && isArray(obj)) obj = promote(parent, key);
      parse(parts, obj, part, val);
    }
  }
}

/**
 * Merge parent key/val pair.
 */

function merge(parent, key, val){
  if (~indexOf(key, ']')) {
    var parts = key.split('[')
      , len = parts.length
      , last = len - 1;
    parse(parts, parent, 'base', val);
    // optimize
  } else {
    if (!isint.test(key) && isArray(parent.base)) {
      var t = {};
      for (var k in parent.base) t[k] = parent.base[k];
      parent.base = t;
    }
    set(parent.base, key, val);
  }

  return parent;
}

/**
 * Parse the given obj.
 */

function parseObject(obj){
  var ret = { base: {} };
  forEach(objectKeys(obj), function(name){
    merge(ret, name, obj[name]);
  });
  return ret.base;
}

/**
 * Parse the given str.
 */

function parseString(str){
  return reduce(String(str).split('&'), function(ret, pair){
    var eql = indexOf(pair, '=')
      , brace = lastBraceInKey(pair)
      , key = pair.substr(0, brace || eql)
      , val = pair.substr(brace || eql, pair.length)
      , val = val.substr(indexOf(val, '=') + 1, val.length);

    // ?foo
    if ('' == key) key = pair, val = '';
    if ('' == key) return ret;

    return merge(ret, decode(key), decode(val));
  }, { base: {} }).base;
}

/**
 * Parse the given query `str` or `obj`, returning an object.
 *
 * @param {String} str | {Object} obj
 * @return {Object}
 * @api public
 */

exports.parse = function(str){
  if (null == str || '' == str) return {};
  return 'object' == typeof str
    ? parseObject(str)
    : parseString(str);
};

/**
 * Turn the given `obj` into a query string
 *
 * @param {Object} obj
 * @return {String}
 * @api public
 */

var stringify = exports.stringify = function(obj, prefix) {
  if (isArray(obj)) {
    return stringifyArray(obj, prefix);
  } else if ('[object Object]' == toString.call(obj)) {
    return stringifyObject(obj, prefix);
  } else if ('string' == typeof obj) {
    return stringifyString(obj, prefix);
  } else {
    return prefix + '=' + encodeURIComponent(String(obj));
  }
};

/**
 * Stringify the given `str`.
 *
 * @param {String} str
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyString(str, prefix) {
  if (!prefix) throw new TypeError('stringify expects an object');
  return prefix + '=' + encodeURIComponent(str);
}

/**
 * Stringify the given `arr`.
 *
 * @param {Array} arr
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyArray(arr, prefix) {
  var ret = [];
  if (!prefix) throw new TypeError('stringify expects an object');
  for (var i = 0; i < arr.length; i++) {
    ret.push(stringify(arr[i], prefix + '[' + i + ']'));
  }
  return ret.join('&');
}

/**
 * Stringify the given `obj`.
 *
 * @param {Object} obj
 * @param {String} prefix
 * @return {String}
 * @api private
 */

function stringifyObject(obj, prefix) {
  var ret = []
    , keys = objectKeys(obj)
    , key;

  for (var i = 0, len = keys.length; i < len; ++i) {
    key = keys[i];
    if (null == obj[key]) {
      ret.push(encodeURIComponent(key) + '=');
    } else {
      ret.push(stringify(obj[key], prefix
        ? prefix + '[' + encodeURIComponent(key) + ']'
        : encodeURIComponent(key)));
    }
  }

  return ret.join('&');
}

/**
 * Set `obj`'s `key` to `val` respecting
 * the weird and wonderful syntax of a qs,
 * where "foo=bar&foo=baz" becomes an array.
 *
 * @param {Object} obj
 * @param {String} key
 * @param {String} val
 * @api private
 */

function set(obj, key, val) {
  var v = obj[key];
  if (undefined === v) {
    obj[key] = val;
  } else if (isArray(v)) {
    v.push(val);
  } else {
    obj[key] = [v, val];
  }
}

/**
 * Locate last brace in `str` within the key.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function lastBraceInKey(str) {
  var len = str.length
    , brace
    , c;
  for (var i = 0; i < len; ++i) {
    c = str[i];
    if (']' == c) brace = false;
    if ('[' == c) brace = true;
    if ('=' == c && !brace) return i;
  }
}

/**
 * Decode `str`.
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

function decode(str) {
  try {
    return decodeURIComponent(str.replace(/\+/g, ' '));
  } catch (err) {
    return str;
  }
}

},{}],5:[function(require,module,exports){
var events = require('events');
var util = require('util');

function Stream() {
  events.EventEmitter.call(this);
}
util.inherits(Stream, events.EventEmitter);
module.exports = Stream;
// Backwards-compat with node 0.4.x
Stream.Stream = Stream;

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once, and
  // only when all sources have ended.
  if (!dest._isStdio && (!options || options.end !== false)) {
    dest._pipeCount = dest._pipeCount || 0;
    dest._pipeCount++;

    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest._pipeCount--;

    // remove the listeners
    cleanup();

    if (dest._pipeCount > 0) {
      // waiting for other incoming streams to end.
      return;
    }

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest._pipeCount--;

    // remove the listeners
    cleanup();

    if (dest._pipeCount > 0) {
      // waiting for other incoming streams to end.
      return;
    }

    dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (this.listeners('error').length === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('end', cleanup);
    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('end', cleanup);
  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"events":3,"util":7}],6:[function(require,module,exports){
var punycode = { encode : function (s) { return s } };

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

function arrayIndexOf(array, subject) {
    for (var i = 0, j = array.length; i < j; i++) {
        if(array[i] == subject) return i;
    }
    return -1;
}

var objectKeys = Object.keys || function objectKeys(object) {
    if (object !== Object(object)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in object) if (object.hasOwnProperty(key)) keys[keys.length] = key;
    return keys;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]+$/,
    // RFC 2396: characters reserved for delimiting URLs.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],
    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '~', '[', ']', '`'].concat(delims),
    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''],
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#']
      .concat(unwise).concat(autoEscape),
    nonAuthChars = ['/', '@', '?', '#'].concat(delims),
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[a-zA-Z0-9][a-z0-9A-Z_-]{0,62}$/,
    hostnamePartStart = /^([a-zA-Z0-9][a-z0-9A-Z_-]{0,62})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always have a path component.
    pathedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && typeof(url) === 'object' && url.href) return url;

  if (typeof url !== 'string') {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  var out = {},
      rest = url;

  // cut off any delimiters.
  // This is to support parse stuff like "<http://foo.com>"
  for (var i = 0, l = rest.length; i < l; i++) {
    if (arrayIndexOf(delims, rest.charAt(i)) === -1) break;
  }
  if (i !== 0) rest = rest.substr(i);


  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    out.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      out.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {
    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    // don't enforce full RFC correctness, just be unstupid about it.

    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the first @ sign, unless some non-auth character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    var atSign = arrayIndexOf(rest, '@');
    if (atSign !== -1) {
      // there *may be* an auth
      var hasAuth = true;
      for (var i = 0, l = nonAuthChars.length; i < l; i++) {
        var index = arrayIndexOf(rest, nonAuthChars[i]);
        if (index !== -1 && index < atSign) {
          // not a valid auth.  Something like http://foo.com/bar@baz/
          hasAuth = false;
          break;
        }
      }
      if (hasAuth) {
        // pluck off the auth portion.
        out.auth = rest.substr(0, atSign);
        rest = rest.substr(atSign + 1);
      }
    }

    var firstNonHost = -1;
    for (var i = 0, l = nonHostChars.length; i < l; i++) {
      var index = arrayIndexOf(rest, nonHostChars[i]);
      if (index !== -1 &&
          (firstNonHost < 0 || index < firstNonHost)) firstNonHost = index;
    }

    if (firstNonHost !== -1) {
      out.host = rest.substr(0, firstNonHost);
      rest = rest.substr(firstNonHost);
    } else {
      out.host = rest;
      rest = '';
    }

    // pull out port.
    var p = parseHost(out.host);
    var keys = objectKeys(p);
    for (var i = 0, l = keys.length; i < l; i++) {
      var key = keys[i];
      out[key] = p[key];
    }

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    out.hostname = out.hostname || '';

    // validate a little.
    if (out.hostname.length > hostnameMaxLen) {
      out.hostname = '';
    } else {
      var hostparts = out.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            out.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    // hostnames are always lower case.
    out.hostname = out.hostname.toLowerCase();

    // IDNA Support: Returns a puny coded representation of "domain".
    // It only converts the part of the domain name that
    // has non ASCII characters. I.e. it dosent matter if
    // you call it with a domain that already is in ASCII.
    var domainArray = out.hostname.split('.');
    var newOut = [];
    for (var i = 0; i < domainArray.length; ++i) {
      var s = domainArray[i];
      newOut.push(s.match(/[^A-Za-z0-9_-]/) ?
          'xn--' + punycode.encode(s) : s);
    }
    out.hostname = newOut.join('.');

    out.host = (out.hostname || '') +
        ((out.port) ? ':' + out.port : '');
    out.href += out.host;
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }

    // Now make sure that delims never appear in a url.
    var chop = rest.length;
    for (var i = 0, l = delims.length; i < l; i++) {
      var c = arrayIndexOf(rest, delims[i]);
      if (c !== -1) {
        chop = Math.min(c, chop);
      }
    }
    rest = rest.substr(0, chop);
  }


  // chop off from the tail first.
  var hash = arrayIndexOf(rest, '#');
  if (hash !== -1) {
    // got a fragment string.
    out.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = arrayIndexOf(rest, '?');
  if (qm !== -1) {
    out.search = rest.substr(qm);
    out.query = rest.substr(qm + 1);
    if (parseQueryString) {
      out.query = querystring.parse(out.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    out.search = '';
    out.query = {};
  }
  if (rest) out.pathname = rest;
  if (slashedProtocol[proto] &&
      out.hostname && !out.pathname) {
    out.pathname = '/';
  }

  //to support http.request
  if (out.pathname || out.search) {
    out.path = (out.pathname ? out.pathname : '') +
               (out.search ? out.search : '');
  }

  // finally, reconstruct the href based on what has been validated.
  out.href = urlFormat(out);
  return out;
}

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (typeof(obj) === 'string') obj = urlParse(obj);

  var auth = obj.auth || '';
  if (auth) {
    auth = auth.split('@').join('%40');
    for (var i = 0, l = nonAuthChars.length; i < l; i++) {
      var nAC = nonAuthChars[i];
      auth = auth.split(nAC).join(encodeURIComponent(nAC));
    }
    auth += '@';
  }

  var protocol = obj.protocol || '',
      host = (obj.host !== undefined) ? auth + obj.host :
          obj.hostname !== undefined ? (
              auth + obj.hostname +
              (obj.port ? ':' + obj.port : '')
          ) :
          false,
      pathname = obj.pathname || '',
      query = obj.query &&
              ((typeof obj.query === 'object' &&
                objectKeys(obj.query).length) ?
                 querystring.stringify(obj.query) :
                 '') || '',
      search = obj.search || (query && ('?' + query)) || '',
      hash = obj.hash || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (obj.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  return protocol + host + pathname + search + hash;
}

function urlResolve(source, relative) {
  return urlFormat(urlResolveObject(source, relative));
}

function urlResolveObject(source, relative) {
  if (!source) return relative;

  source = urlParse(urlFormat(source), false, true);
  relative = urlParse(urlFormat(relative), false, true);

  // hash is always overridden, no matter what.
  source.hash = relative.hash;

  if (relative.href === '') {
    source.href = urlFormat(source);
    return source;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    relative.protocol = source.protocol;
    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[relative.protocol] &&
        relative.hostname && !relative.pathname) {
      relative.path = relative.pathname = '/';
    }
    relative.href = urlFormat(relative);
    return relative;
  }

  if (relative.protocol && relative.protocol !== source.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      relative.href = urlFormat(relative);
      return relative;
    }
    source.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      relative.pathname = relPath.join('/');
    }
    source.pathname = relative.pathname;
    source.search = relative.search;
    source.query = relative.query;
    source.host = relative.host || '';
    source.auth = relative.auth;
    source.hostname = relative.hostname || relative.host;
    source.port = relative.port;
    //to support http.request
    if (source.pathname !== undefined || source.search !== undefined) {
      source.path = (source.pathname ? source.pathname : '') +
                    (source.search ? source.search : '');
    }
    source.slashes = source.slashes || relative.slashes;
    source.href = urlFormat(source);
    return source;
  }

  var isSourceAbs = (source.pathname && source.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host !== undefined ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (source.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = source.pathname && source.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = source.protocol &&
          !slashedProtocol[source.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // source.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {

    delete source.hostname;
    delete source.port;
    if (source.host) {
      if (srcPath[0] === '') srcPath[0] = source.host;
      else srcPath.unshift(source.host);
    }
    delete source.host;
    if (relative.protocol) {
      delete relative.hostname;
      delete relative.port;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      delete relative.host;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    source.host = (relative.host || relative.host === '') ?
                      relative.host : source.host;
    source.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : source.hostname;
    source.search = relative.search;
    source.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    source.search = relative.search;
    source.query = relative.query;
  } else if ('search' in relative) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      source.hostname = source.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especialy happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = source.host && arrayIndexOf(source.host, '@') > 0 ?
                       source.host.split('@') : false;
      if (authInHost) {
        source.auth = authInHost.shift();
        source.host = source.hostname = authInHost.shift();
      }
    }
    source.search = relative.search;
    source.query = relative.query;
    //to support http.request
    if (source.pathname !== undefined || source.search !== undefined) {
      source.path = (source.pathname ? source.pathname : '') +
                    (source.search ? source.search : '');
    }
    source.href = urlFormat(source);
    return source;
  }
  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    delete source.pathname;
    //to support http.request
    if (!source.search) {
      source.path = '/' + source.search;
    } else {
      delete source.path;
    }
    source.href = urlFormat(source);
    return source;
  }
  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (source.host || relative.host) && (last === '.' || last === '..') ||
      last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last == '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    source.hostname = source.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especialy happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = source.host && arrayIndexOf(source.host, '@') > 0 ?
                     source.host.split('@') : false;
    if (authInHost) {
      source.auth = authInHost.shift();
      source.host = source.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (source.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  source.pathname = srcPath.join('/');
  //to support request.http
  if (source.pathname !== undefined || source.search !== undefined) {
    source.path = (source.pathname ? source.pathname : '') +
                  (source.search ? source.search : '');
  }
  source.auth = relative.auth || source.auth;
  source.slashes = source.slashes || relative.slashes;
  source.href = urlFormat(source);
  return source;
}

function parseHost(host) {
  var out = {};
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    out.port = port.substr(1);
    host = host.substr(0, host.length - port.length);
  }
  if (host) out.hostname = host;
  return out;
}

},{"querystring":4}],7:[function(require,module,exports){
var events = require('events');

exports.isArray = isArray;
exports.isDate = function(obj){return Object.prototype.toString.call(obj) === '[object Date]'};
exports.isRegExp = function(obj){return Object.prototype.toString.call(obj) === '[object RegExp]'};


exports.print = function () {};
exports.puts = function () {};
exports.debug = function() {};

exports.inspect = function(obj, showHidden, depth, colors) {
  var seen = [];

  var stylize = function(str, styleType) {
    // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
    var styles =
        { 'bold' : [1, 22],
          'italic' : [3, 23],
          'underline' : [4, 24],
          'inverse' : [7, 27],
          'white' : [37, 39],
          'grey' : [90, 39],
          'black' : [30, 39],
          'blue' : [34, 39],
          'cyan' : [36, 39],
          'green' : [32, 39],
          'magenta' : [35, 39],
          'red' : [31, 39],
          'yellow' : [33, 39] };

    var style =
        { 'special': 'cyan',
          'number': 'blue',
          'boolean': 'yellow',
          'undefined': 'grey',
          'null': 'bold',
          'string': 'green',
          'date': 'magenta',
          // "name": intentionally not styling
          'regexp': 'red' }[styleType];

    if (style) {
      return '\u001b[' + styles[style][0] + 'm' + str +
             '\u001b[' + styles[style][1] + 'm';
    } else {
      return str;
    }
  };
  if (! colors) {
    stylize = function(str, styleType) { return str; };
  }

  function format(value, recurseTimes) {
    // Provide a hook for user-specified inspect functions.
    // Check that value is an object with an inspect function on it
    if (value && typeof value.inspect === 'function' &&
        // Filter out the util module, it's inspect function is special
        value !== exports &&
        // Also filter out any prototype objects using the circular check.
        !(value.constructor && value.constructor.prototype === value)) {
      return value.inspect(recurseTimes);
    }

    // Primitive types cannot have properties
    switch (typeof value) {
      case 'undefined':
        return stylize('undefined', 'undefined');

      case 'string':
        var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                                 .replace(/'/g, "\\'")
                                                 .replace(/\\"/g, '"') + '\'';
        return stylize(simple, 'string');

      case 'number':
        return stylize('' + value, 'number');

      case 'boolean':
        return stylize('' + value, 'boolean');
    }
    // For some reason typeof null is "object", so special case here.
    if (value === null) {
      return stylize('null', 'null');
    }

    // Look up the keys of the object.
    var visible_keys = Object_keys(value);
    var keys = showHidden ? Object_getOwnPropertyNames(value) : visible_keys;

    // Functions without properties can be shortcutted.
    if (typeof value === 'function' && keys.length === 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        var name = value.name ? ': ' + value.name : '';
        return stylize('[Function' + name + ']', 'special');
      }
    }

    // Dates without properties can be shortcutted
    if (isDate(value) && keys.length === 0) {
      return stylize(value.toUTCString(), 'date');
    }

    var base, type, braces;
    // Determine the object type
    if (isArray(value)) {
      type = 'Array';
      braces = ['[', ']'];
    } else {
      type = 'Object';
      braces = ['{', '}'];
    }

    // Make functions say that they are functions
    if (typeof value === 'function') {
      var n = value.name ? ': ' + value.name : '';
      base = (isRegExp(value)) ? ' ' + value : ' [Function' + n + ']';
    } else {
      base = '';
    }

    // Make dates with properties first say the date
    if (isDate(value)) {
      base = ' ' + value.toUTCString();
    }

    if (keys.length === 0) {
      return braces[0] + base + braces[1];
    }

    if (recurseTimes < 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        return stylize('[Object]', 'special');
      }
    }

    seen.push(value);

    var output = keys.map(function(key) {
      var name, str;
      if (value.__lookupGetter__) {
        if (value.__lookupGetter__(key)) {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Getter/Setter]', 'special');
          } else {
            str = stylize('[Getter]', 'special');
          }
        } else {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Setter]', 'special');
          }
        }
      }
      if (visible_keys.indexOf(key) < 0) {
        name = '[' + key + ']';
      }
      if (!str) {
        if (seen.indexOf(value[key]) < 0) {
          if (recurseTimes === null) {
            str = format(value[key]);
          } else {
            str = format(value[key], recurseTimes - 1);
          }
          if (str.indexOf('\n') > -1) {
            if (isArray(value)) {
              str = str.split('\n').map(function(line) {
                return '  ' + line;
              }).join('\n').substr(2);
            } else {
              str = '\n' + str.split('\n').map(function(line) {
                return '   ' + line;
              }).join('\n');
            }
          }
        } else {
          str = stylize('[Circular]', 'special');
        }
      }
      if (typeof name === 'undefined') {
        if (type === 'Array' && key.match(/^\d+$/)) {
          return str;
        }
        name = JSON.stringify('' + key);
        if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
          name = name.substr(1, name.length - 2);
          name = stylize(name, 'name');
        } else {
          name = name.replace(/'/g, "\\'")
                     .replace(/\\"/g, '"')
                     .replace(/(^"|"$)/g, "'");
          name = stylize(name, 'string');
        }
      }

      return name + ': ' + str;
    });

    seen.pop();

    var numLinesEst = 0;
    var length = output.reduce(function(prev, cur) {
      numLinesEst++;
      if (cur.indexOf('\n') >= 0) numLinesEst++;
      return prev + cur.length + 1;
    }, 0);

    if (length > 50) {
      output = braces[0] +
               (base === '' ? '' : base + '\n ') +
               ' ' +
               output.join(',\n  ') +
               ' ' +
               braces[1];

    } else {
      output = braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
    }

    return output;
  }
  return format(obj, (typeof depth === 'undefined' ? 2 : depth));
};


function isArray(ar) {
  return Array.isArray(ar) ||
         (typeof ar === 'object' && Object.prototype.toString.call(ar) === '[object Array]');
}


function isRegExp(re) {
  typeof re === 'object' && Object.prototype.toString.call(re) === '[object RegExp]';
}


function isDate(d) {
  return typeof d === 'object' && Object.prototype.toString.call(d) === '[object Date]';
}

function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}

var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}

exports.log = function (msg) {};

exports.pump = null;

var Object_keys = Object.keys || function (obj) {
    var res = [];
    for (var key in obj) res.push(key);
    return res;
};

var Object_getOwnPropertyNames = Object.getOwnPropertyNames || function (obj) {
    var res = [];
    for (var key in obj) {
        if (Object.hasOwnProperty.call(obj, key)) res.push(key);
    }
    return res;
};

var Object_create = Object.create || function (prototype, properties) {
    // from es5-shim
    var object;
    if (prototype === null) {
        object = { '__proto__' : null };
    }
    else {
        if (typeof prototype !== 'object') {
            throw new TypeError(
                'typeof prototype[' + (typeof prototype) + '] != \'object\''
            );
        }
        var Type = function () {};
        Type.prototype = prototype;
        object = new Type();
        object.__proto__ = prototype;
    }
    if (typeof properties !== 'undefined' && Object.defineProperties) {
        Object.defineProperties(object, properties);
    }
    return object;
};

exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object_create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (typeof f !== 'string') {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(exports.inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j': return JSON.stringify(args[i++]);
      default:
        return x;
    }
  });
  for(var x = args[i]; i < len; x = args[++i]){
    if (x === null || typeof x !== 'object') {
      str += ' ' + x;
    } else {
      str += ' ' + exports.inspect(x);
    }
  }
  return str;
};

},{"events":3}],8:[function(require,module,exports){
var http = module.exports;
var EventEmitter = require('events').EventEmitter;
var Request = require('./lib/request');

http.request = function (params, cb) {
    if (!params) params = {};
    if (!params.host) params.host = window.location.host.split(':')[0];
    if (!params.port) params.port = window.location.port;
    if (!params.scheme) params.scheme = window.location.protocol.split(':')[0];
    
    var req = new Request(new xhrHttp, params);
    if (cb) req.on('response', cb);
    return req;
};

http.get = function (params, cb) {
    params.method = 'GET';
    var req = http.request(params, cb);
    req.end();
    return req;
};

http.Agent = function () {};
http.Agent.defaultMaxSockets = 4;

var xhrHttp = (function () {
    if (typeof window === 'undefined') {
        throw new Error('no window object present');
    }
    else if (window.XMLHttpRequest) {
        return window.XMLHttpRequest;
    }
    else if (window.ActiveXObject) {
        var axs = [
            'Msxml2.XMLHTTP.6.0',
            'Msxml2.XMLHTTP.3.0',
            'Microsoft.XMLHTTP'
        ];
        for (var i = 0; i < axs.length; i++) {
            try {
                var ax = new(window.ActiveXObject)(axs[i]);
                return function () {
                    if (ax) {
                        var ax_ = ax;
                        ax = null;
                        return ax_;
                    }
                    else {
                        return new(window.ActiveXObject)(axs[i]);
                    }
                };
            }
            catch (e) {}
        }
        throw new Error('ajax not supported in this browser')
    }
    else {
        throw new Error('ajax not supported in this browser');
    }
})();

},{"./lib/request":9,"events":3}],9:[function(require,module,exports){
var Stream = require('stream');
var Response = require('./response');
var concatStream = require('concat-stream');
var Base64 = require('Base64');

var Request = module.exports = function (xhr, params) {
    var self = this;
    self.writable = true;
    self.xhr = xhr;
    self.body = concatStream()
    
    var uri = params.host
        + (params.port ? ':' + params.port : '')
        + (params.path || '/')
    ;
    
    xhr.open(
        params.method || 'GET',
        (params.scheme || 'http') + '://' + uri,
        true
    );
    
    if (params.headers) {
        var keys = objectKeys(params.headers);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            if (!self.isSafeRequestHeader(key)) continue;
            var value = params.headers[key];
            if (isArray(value)) {
                for (var j = 0; j < value.length; j++) {
                    xhr.setRequestHeader(key, value[j]);
                }
            }
            else xhr.setRequestHeader(key, value)
        }
    }
    
    if (params.auth) {
        //basic auth
        this.setHeader('Authorization', 'Basic ' + Base64.btoa(params.auth));
    }

    var res = new Response;
    res.on('close', function () {
        self.emit('close');
    });
    
    res.on('ready', function () {
        self.emit('response', res);
    });
    
    xhr.onreadystatechange = function () {
        res.handle(xhr);
    };
};

Request.prototype = new Stream;

Request.prototype.setHeader = function (key, value) {
    if (isArray(value)) {
        for (var i = 0; i < value.length; i++) {
            this.xhr.setRequestHeader(key, value[i]);
        }
    }
    else {
        this.xhr.setRequestHeader(key, value);
    }
};

Request.prototype.write = function (s) {
    this.body.write(s);
};

Request.prototype.destroy = function (s) {
    this.xhr.abort();
    this.emit('close');
};

Request.prototype.end = function (s) {
    if (s !== undefined) this.body.write(s);
    this.body.end()
    this.xhr.send(this.body.getBody());
};

// Taken from http://dxr.mozilla.org/mozilla/mozilla-central/content/base/src/nsXMLHttpRequest.cpp.html
Request.unsafeHeaders = [
    "accept-charset",
    "accept-encoding",
    "access-control-request-headers",
    "access-control-request-method",
    "connection",
    "content-length",
    "cookie",
    "cookie2",
    "content-transfer-encoding",
    "date",
    "expect",
    "host",
    "keep-alive",
    "origin",
    "referer",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "user-agent",
    "via"
];

Request.prototype.isSafeRequestHeader = function (headerName) {
    if (!headerName) return false;
    return indexOf(Request.unsafeHeaders, headerName.toLowerCase()) === -1;
};

var objectKeys = Object.keys || function (obj) {
    var keys = [];
    for (var key in obj) keys.push(key);
    return keys;
};

var isArray = Array.isArray || function (xs) {
    return Object.prototype.toString.call(xs) === '[object Array]';
};

var indexOf = function (xs, x) {
    if (xs.indexOf) return xs.indexOf(x);
    for (var i = 0; i < xs.length; i++) {
        if (xs[i] === x) return i;
    }
    return -1;
};

},{"./response":10,"Base64":11,"concat-stream":12,"stream":5}],10:[function(require,module,exports){
var Stream = require('stream');

var Response = module.exports = function (res) {
    this.offset = 0;
    this.readable = true;
};

Response.prototype = new Stream;

var capable = {
    streaming : true,
    status2 : true
};

function parseHeaders (res) {
    var lines = res.getAllResponseHeaders().split(/\r?\n/);
    var headers = {};
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line === '') continue;
        
        var m = line.match(/^([^:]+):\s*(.*)/);
        if (m) {
            var key = m[1].toLowerCase(), value = m[2];
            
            if (headers[key] !== undefined) {
            
                if (isArray(headers[key])) {
                    headers[key].push(value);
                }
                else {
                    headers[key] = [ headers[key], value ];
                }
            }
            else {
                headers[key] = value;
            }
        }
        else {
            headers[line] = true;
        }
    }
    return headers;
}

Response.prototype.getResponse = function (xhr) {
    var respType = String(xhr.responseType).toLowerCase();
    if (respType === 'blob') return xhr.responseBlob || xhr.response;
    if (respType === 'arraybuffer') return xhr.response;
    return xhr.responseText;
}

Response.prototype.getHeader = function (key) {
    return this.headers[key.toLowerCase()];
};

Response.prototype.handle = function (res) {
    if (res.readyState === 2 && capable.status2) {
        try {
            this.statusCode = res.status;
            this.headers = parseHeaders(res);
        }
        catch (err) {
            capable.status2 = false;
        }
        
        if (capable.status2) {
            this.emit('ready');
        }
    }
    else if (capable.streaming && res.readyState === 3) {
        try {
            if (!this.statusCode) {
                this.statusCode = res.status;
                this.headers = parseHeaders(res);
                this.emit('ready');
            }
        }
        catch (err) {}
        
        try {
            this._emitData(res);
        }
        catch (err) {
            capable.streaming = false;
        }
    }
    else if (res.readyState === 4) {
        if (!this.statusCode) {
            this.statusCode = res.status;
            this.emit('ready');
        }
        this._emitData(res);
        
        if (res.error) {
            this.emit('error', this.getResponse(res));
        }
        else this.emit('end');
        
        this.emit('close');
    }
};

Response.prototype._emitData = function (res) {
    var respBody = this.getResponse(res);
    if (respBody.toString().match(/ArrayBuffer/)) {
        this.emit('data', new Uint8Array(respBody, this.offset));
        this.offset = respBody.byteLength;
        return;
    }
    if (respBody.length > this.offset) {
        this.emit('data', respBody.slice(this.offset));
        this.offset = respBody.length;
    }
};

var isArray = Array.isArray || function (xs) {
    return Object.prototype.toString.call(xs) === '[object Array]';
};

},{"stream":5}],11:[function(require,module,exports){
;(function () {

  var
    object = typeof window != 'undefined' ? window : exports,
    chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
    INVALID_CHARACTER_ERR = (function () {
      // fabricate a suitable error object
      try { document.createElement('$'); }
      catch (error) { return error; }}());

  // encoder
  // [https://gist.github.com/999166] by [https://github.com/nignag]
  object.btoa || (
  object.btoa = function (input) {
    for (
      // initialize result and counter
      var block, charCode, idx = 0, map = chars, output = '';
      // if the next input index does not exist:
      //   change the mapping table to "="
      //   check if d has no fractional digits
      input.charAt(idx | 0) || (map = '=', idx % 1);
      // "8 - idx % 1 * 8" generates the sequence 2, 4, 6, 8
      output += map.charAt(63 & block >> 8 - idx % 1 * 8)
    ) {
      charCode = input.charCodeAt(idx += 3/4);
      if (charCode > 0xFF) throw INVALID_CHARACTER_ERR;
      block = block << 8 | charCode;
    }
    return output;
  });

  // decoder
  // [https://gist.github.com/1020396] by [https://github.com/atk]
  object.atob || (
  object.atob = function (input) {
    input = input.replace(/=+$/, '')
    if (input.length % 4 == 1) throw INVALID_CHARACTER_ERR;
    for (
      // initialize result and counters
      var bc = 0, bs, buffer, idx = 0, output = '';
      // get next character
      buffer = input.charAt(idx++);
      // character found in table? initialize bit storage and add its ascii value;
      ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
        // and if not first of each 4 characters,
        // convert the first 8 bits to one ascii character
        bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
    ) {
      // try to find character in table (0-63, not found => -1)
      buffer = chars.indexOf(buffer);
    }
    return output;
  });

}());

},{}],12:[function(require,module,exports){
var stream = require('stream')
var bops = require('bops')
var util = require('util')

function ConcatStream(cb) {
  stream.Stream.call(this)
  this.writable = true
  if (cb) this.cb = cb
  this.body = []
  this.on('error', function(err) {
    // no-op
  })
}

util.inherits(ConcatStream, stream.Stream)

ConcatStream.prototype.write = function(chunk) {
  this.body.push(chunk)
}

ConcatStream.prototype.destroy = function() {}

ConcatStream.prototype.arrayConcat = function(arrs) {
  if (arrs.length === 0) return []
  if (arrs.length === 1) return arrs[0]
  return arrs.reduce(function (a, b) { return a.concat(b) })
}

ConcatStream.prototype.isArray = function(arr) {
  return Array.isArray(arr)
}

ConcatStream.prototype.getBody = function () {
  if (this.body.length === 0) return
  if (typeof(this.body[0]) === "string") return this.body.join('')
  if (this.isArray(this.body[0])) return this.arrayConcat(this.body)
  if (bops.is(this.body[0])) return bops.join(this.body)
  return this.body
}

ConcatStream.prototype.end = function() {
  if (this.cb) this.cb(this.getBody())
}

module.exports = function(cb) {
  return new ConcatStream(cb)
}

module.exports.ConcatStream = ConcatStream

},{"bops":13,"stream":5,"util":7}],13:[function(require,module,exports){
var proto = {}
module.exports = proto

proto.from = require('./from.js')
proto.to = require('./to.js')
proto.is = require('./is.js')
proto.subarray = require('./subarray.js')
proto.join = require('./join.js')
proto.copy = require('./copy.js')
proto.create = require('./create.js')

mix(require('./read.js'), proto)
mix(require('./write.js'), proto)

function mix(from, into) {
  for(var key in from) {
    into[key] = from[key]
  }
}

},{"./copy.js":16,"./create.js":17,"./from.js":18,"./is.js":19,"./join.js":20,"./read.js":22,"./subarray.js":23,"./to.js":24,"./write.js":25}],14:[function(require,module,exports){
(function (exports) {
	'use strict';

	var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	function b64ToByteArray(b64) {
		var i, j, l, tmp, placeHolders, arr;
	
		if (b64.length % 4 > 0) {
			throw 'Invalid string. Length must be a multiple of 4';
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		placeHolders = b64.indexOf('=');
		placeHolders = placeHolders > 0 ? b64.length - placeHolders : 0;

		// base64 is 4/3 + up to two characters of the original data
		arr = [];//new Uint8Array(b64.length * 3 / 4 - placeHolders);

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length;

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (lookup.indexOf(b64[i]) << 18) | (lookup.indexOf(b64[i + 1]) << 12) | (lookup.indexOf(b64[i + 2]) << 6) | lookup.indexOf(b64[i + 3]);
			arr.push((tmp & 0xFF0000) >> 16);
			arr.push((tmp & 0xFF00) >> 8);
			arr.push(tmp & 0xFF);
		}

		if (placeHolders === 2) {
			tmp = (lookup.indexOf(b64[i]) << 2) | (lookup.indexOf(b64[i + 1]) >> 4);
			arr.push(tmp & 0xFF);
		} else if (placeHolders === 1) {
			tmp = (lookup.indexOf(b64[i]) << 10) | (lookup.indexOf(b64[i + 1]) << 4) | (lookup.indexOf(b64[i + 2]) >> 2);
			arr.push((tmp >> 8) & 0xFF);
			arr.push(tmp & 0xFF);
		}

		return arr;
	}

	function uint8ToBase64(uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length;

		function tripletToBase64 (num) {
			return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F];
		};

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
			output += tripletToBase64(temp);
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1];
				output += lookup[temp >> 2];
				output += lookup[(temp << 4) & 0x3F];
				output += '==';
				break;
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1]);
				output += lookup[temp >> 10];
				output += lookup[(temp >> 4) & 0x3F];
				output += lookup[(temp << 2) & 0x3F];
				output += '=';
				break;
		}

		return output;
	}

	module.exports.toByteArray = b64ToByteArray;
	module.exports.fromByteArray = uint8ToBase64;
}());

},{}],15:[function(require,module,exports){
module.exports = to_utf8

var out = []
  , col = []
  , fcc = String.fromCharCode
  , mask = [0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01]
  , unmask = [
      0x00
    , 0x01
    , 0x02 | 0x01
    , 0x04 | 0x02 | 0x01
    , 0x08 | 0x04 | 0x02 | 0x01
    , 0x10 | 0x08 | 0x04 | 0x02 | 0x01
    , 0x20 | 0x10 | 0x08 | 0x04 | 0x02 | 0x01
    , 0x40 | 0x20 | 0x10 | 0x08 | 0x04 | 0x02 | 0x01
  ]

function to_utf8(bytes, start, end) {
  start = start === undefined ? 0 : start
  end = end === undefined ? bytes.length : end

  var idx = 0
    , hi = 0x80
    , collecting = 0
    , pos
    , by

  col.length =
  out.length = 0

  while(idx < bytes.length) {
    by = bytes[idx]
    if(!collecting && by & hi) {
      pos = find_pad_position(by)
      collecting += pos
      if(pos < 8) {
        col[col.length] = by & unmask[6 - pos]
      }
    } else if(collecting) {
      col[col.length] = by & unmask[6]
      --collecting
      if(!collecting && col.length) {
        out[out.length] = fcc(reduced(col, pos))
        col.length = 0
      }
    } else { 
      out[out.length] = fcc(by)
    }
    ++idx
  }
  if(col.length && !collecting) {
    out[out.length] = fcc(reduced(col, pos))
    col.length = 0
  }
  return out.join('')
}

function find_pad_position(byt) {
  for(var i = 0; i < 7; ++i) {
    if(!(byt & mask[i])) {
      break
    }
  }
  return i
}

function reduced(list) {
  var out = 0
  for(var i = 0, len = list.length; i < len; ++i) {
    out |= list[i] << ((len - i - 1) * 6)
  }
  return out
}

},{}],16:[function(require,module,exports){
module.exports = copy

var slice = [].slice

function copy(source, target, target_start, source_start, source_end) {
  target_start = arguments.length < 3 ? 0 : target_start
  source_start = arguments.length < 4 ? 0 : source_start
  source_end = arguments.length < 5 ? source.length : source_end

  if(source_end === source_start) {
    return
  }

  if(target.length === 0 || source.length === 0) {
    return
  }

  if(source_end > source.length) {
    source_end = source.length
  }

  if(target.length - target_start < source_end - source_start) {
    source_end = target.length - target_start + start
  }

  if(source.buffer !== target.buffer) {
    return fast_copy(source, target, target_start, source_start, source_end)
  }
  return slow_copy(source, target, target_start, source_start, source_end)
}

function fast_copy(source, target, target_start, source_start, source_end) {
  var len = (source_end - source_start) + target_start

  for(var i = target_start, j = source_start;
      i < len;
      ++i,
      ++j) {
    target[i] = source[j]
  }
}

function slow_copy(from, to, j, i, jend) {
  // the buffers could overlap.
  var iend = jend + i
    , tmp = new Uint8Array(slice.call(from, i, iend))
    , x = 0

  for(; i < iend; ++i, ++x) {
    to[j++] = tmp[x]
  }
}

},{}],17:[function(require,module,exports){
module.exports = function(size) {
  return new Uint8Array(size)
}

},{}],18:[function(require,module,exports){
module.exports = from

var base64 = require('base64-js')

var decoders = {
    hex: from_hex
  , utf8: from_utf
  , base64: from_base64
}

function from(source, encoding) {
  if(Array.isArray(source)) {
    return new Uint8Array(source)
  }

  return decoders[encoding || 'utf8'](source)
}

function from_hex(str) {
  var size = str.length / 2
    , buf = new Uint8Array(size)
    , character = ''

  for(var i = 0, len = str.length; i < len; ++i) {
    character += str.charAt(i)

    if(i > 0 && (i % 2) === 1) {
      buf[i>>>1] = parseInt(character, 16)
      character = '' 
    }
  }

  return buf 
}

function from_utf(str) {
  var bytes = []
    , tmp
    , ch

  for(var i = 0, len = str.length; i < len; ++i) {
    ch = str.charCodeAt(i)
    if(ch & 0x80) {
      tmp = encodeURIComponent(str.charAt(i)).substr(1).split('%')
      for(var j = 0, jlen = tmp.length; j < jlen; ++j) {
        bytes[bytes.length] = parseInt(tmp[j], 16)
      }
    } else {
      bytes[bytes.length] = ch 
    }
  }

  return new Uint8Array(bytes)
}

function from_base64(str) {
  return new Uint8Array(base64.toByteArray(str)) 
}

},{"base64-js":14}],19:[function(require,module,exports){

module.exports = function(buffer) {
  return buffer instanceof Uint8Array;
}

},{}],20:[function(require,module,exports){
module.exports = join

function join(targets, hint) {
  if(!targets.length) {
    return new Uint8Array(0)
  }

  var len = hint !== undefined ? hint : get_length(targets)
    , out = new Uint8Array(len)
    , cur = targets[0]
    , curlen = cur.length
    , curidx = 0
    , curoff = 0
    , i = 0

  while(i < len) {
    if(curoff === curlen) {
      curoff = 0
      ++curidx
      cur = targets[curidx]
      curlen = cur && cur.length
      continue
    }
    out[i++] = cur[curoff++] 
  }

  return out
}

function get_length(targets) {
  var size = 0
  for(var i = 0, len = targets.length; i < len; ++i) {
    size += targets[i].byteLength
  }
  return size
}

},{}],21:[function(require,module,exports){
var proto
  , map

module.exports = proto = {}

map = typeof WeakMap === 'undefined' ? null : new WeakMap

proto.get = !map ? no_weakmap_get : get

function no_weakmap_get(target) {
  return new DataView(target.buffer, 0)
}

function get(target) {
  var out = map.get(target.buffer)
  if(!out) {
    map.set(target.buffer, out = new DataView(target.buffer, 0))
  }
  return out
}

},{}],22:[function(require,module,exports){
module.exports = {
    readUInt8:      read_uint8
  , readInt8:       read_int8
  , readUInt16LE:   read_uint16_le
  , readUInt32LE:   read_uint32_le
  , readInt16LE:    read_int16_le
  , readInt32LE:    read_int32_le
  , readFloatLE:    read_float_le
  , readDoubleLE:   read_double_le
  , readUInt16BE:   read_uint16_be
  , readUInt32BE:   read_uint32_be
  , readInt16BE:    read_int16_be
  , readInt32BE:    read_int32_be
  , readFloatBE:    read_float_be
  , readDoubleBE:   read_double_be
}

var map = require('./mapped.js')

function read_uint8(target, at) {
  return target[at]
}

function read_int8(target, at) {
  var v = target[at];
  return v < 0x80 ? v : v - 0x100
}

function read_uint16_le(target, at) {
  var dv = map.get(target);
  return dv.getUint16(at + target.byteOffset, true)
}

function read_uint32_le(target, at) {
  var dv = map.get(target);
  return dv.getUint32(at + target.byteOffset, true)
}

function read_int16_le(target, at) {
  var dv = map.get(target);
  return dv.getInt16(at + target.byteOffset, true)
}

function read_int32_le(target, at) {
  var dv = map.get(target);
  return dv.getInt32(at + target.byteOffset, true)
}

function read_float_le(target, at) {
  var dv = map.get(target);
  return dv.getFloat32(at + target.byteOffset, true)
}

function read_double_le(target, at) {
  var dv = map.get(target);
  return dv.getFloat64(at + target.byteOffset, true)
}

function read_uint16_be(target, at) {
  var dv = map.get(target);
  return dv.getUint16(at + target.byteOffset, false)
}

function read_uint32_be(target, at) {
  var dv = map.get(target);
  return dv.getUint32(at + target.byteOffset, false)
}

function read_int16_be(target, at) {
  var dv = map.get(target);
  return dv.getInt16(at + target.byteOffset, false)
}

function read_int32_be(target, at) {
  var dv = map.get(target);
  return dv.getInt32(at + target.byteOffset, false)
}

function read_float_be(target, at) {
  var dv = map.get(target);
  return dv.getFloat32(at + target.byteOffset, false)
}

function read_double_be(target, at) {
  var dv = map.get(target);
  return dv.getFloat64(at + target.byteOffset, false)
}

},{"./mapped.js":21}],23:[function(require,module,exports){
module.exports = subarray

function subarray(buf, from, to) {
  return buf.subarray(from || 0, to || buf.length)
}

},{}],24:[function(require,module,exports){
module.exports = to

var base64 = require('base64-js')
  , toutf8 = require('to-utf8')

var encoders = {
    hex: to_hex
  , utf8: to_utf
  , base64: to_base64
}

function to(buf, encoding) {
  return encoders[encoding || 'utf8'](buf)
}

function to_hex(buf) {
  var str = ''
    , byt

  for(var i = 0, len = buf.length; i < len; ++i) {
    byt = buf[i]
    str += ((byt & 0xF0) >>> 4).toString(16)
    str += (byt & 0x0F).toString(16)
  }

  return str
}

function to_utf(buf) {
  return toutf8(buf)
}

function to_base64(buf) {
  return base64.fromByteArray(buf)
}


},{"base64-js":14,"to-utf8":15}],25:[function(require,module,exports){
module.exports = {
    writeUInt8:      write_uint8
  , writeInt8:       write_int8
  , writeUInt16LE:   write_uint16_le
  , writeUInt32LE:   write_uint32_le
  , writeInt16LE:    write_int16_le
  , writeInt32LE:    write_int32_le
  , writeFloatLE:    write_float_le
  , writeDoubleLE:   write_double_le
  , writeUInt16BE:   write_uint16_be
  , writeUInt32BE:   write_uint32_be
  , writeInt16BE:    write_int16_be
  , writeInt32BE:    write_int32_be
  , writeFloatBE:    write_float_be
  , writeDoubleBE:   write_double_be
}

var map = require('./mapped.js')

function write_uint8(target, value, at) {
  return target[at] = value
}

function write_int8(target, value, at) {
  return target[at] = value < 0 ? value + 0x100 : value
}

function write_uint16_le(target, value, at) {
  var dv = map.get(target);
  return dv.setUint16(at + target.byteOffset, value, true)
}

function write_uint32_le(target, value, at) {
  var dv = map.get(target);
  return dv.setUint32(at + target.byteOffset, value, true)
}

function write_int16_le(target, value, at) {
  var dv = map.get(target);
  return dv.setInt16(at + target.byteOffset, value, true)
}

function write_int32_le(target, value, at) {
  var dv = map.get(target);
  return dv.setInt32(at + target.byteOffset, value, true)
}

function write_float_le(target, value, at) {
  var dv = map.get(target);
  return dv.setFloat32(at + target.byteOffset, value, true)
}

function write_double_le(target, value, at) {
  var dv = map.get(target);
  return dv.setFloat64(at + target.byteOffset, value, true)
}

function write_uint16_be(target, value, at) {
  var dv = map.get(target);
  return dv.setUint16(at + target.byteOffset, value, false)
}

function write_uint32_be(target, value, at) {
  var dv = map.get(target);
  return dv.setUint32(at + target.byteOffset, value, false)
}

function write_int16_be(target, value, at) {
  var dv = map.get(target);
  return dv.setInt16(at + target.byteOffset, value, false)
}

function write_int32_be(target, value, at) {
  var dv = map.get(target);
  return dv.setInt32(at + target.byteOffset, value, false)
}

function write_float_be(target, value, at) {
  var dv = map.get(target);
  return dv.setFloat32(at + target.byteOffset, value, false)
}

function write_double_be(target, value, at) {
  var dv = map.get(target);
  return dv.setFloat64(at + target.byteOffset, value, false)
}

},{"./mapped.js":21}],26:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],27:[function(require,module,exports){
module.exports=require("url").parse(window.location.href, true)
},{"url":6}],28:[function(require,module,exports){
var http = require('http');
var inherits = require('inherits');
var EventEmitter = require('events').EventEmitter;
var url = require('url');
var qs = require('querystring');
var navId = require('./vendor/persona.js');

module.exports = function (opts) { return new Persona(opts) };

function Persona (opts) {
    var self = this;
    
    if (!opts) opts = { route: '/_persona' };
    if (typeof opts === 'string') opts = { route: opts };
    
    self.routes = {};
    if (typeof opts.route === 'string') {
        self.routes.login = opts.route + '/login';
        self.routes.logout = opts.route + '/logout';
    }
    if (opts.login) self.routes.login = opts.login;
    if (opts.logout) self.routes.logout = opts.logout;
}
inherits(Persona, EventEmitter);

Persona.prototype.set = function (id) {
    this.id = id;
    if (id) this.emit('login', id)
    else this.emit('logout')
};

Persona.prototype.identify = function () {
    this._watch(null);
    navId.request();
};

Persona.prototype.unidentify = function () {
    navId.logout();
    this._logout();
};

Persona.prototype._watch = function (user) {
    var self = this;
    navId.watch({
        loggedInUser: user,
        onlogin: function (assertion) { self._login(assertion) },
        onlogout: function () { self._logout() }
    });
};

Persona.prototype._login = function (assertion) {
    var self = this;
    var uri = self.routes.login;
    
    var u = typeof uri === 'object' ? uri : url.parse(uri);
    var req = http.request({
        method: 'POST',
        host: u.hostname || window.location.hostname,
        port: u.port || window.location.port,
        path: u.path
    });
    req.on('response', function (res) {
        var body = '';
        res.on('data', function (buf) { body += buf });
        
        if (!/^2\d\d\b/.test(res.statusCode)) {
            self.id = null;
            res.on('end', function () {
                self.emit('error', new Error(
                    'error code ' + res.statusCode + ': ' + body
                ));
            });
            navId.logout();
        }
        else {
            res.on('end', function () {
                try { var m = JSON.parse(body) }
                catch (err) { return self.emit('error', err) }
                if (!m || typeof m !== 'object') {
                    return self.emit('error',
                        'unexpected response ' + typeof m
                    );
                }
                
                if (m && m.cookie) {
                    for (var key in m.cookie) {
                        document.cookie = key + '=' + m.cookie[key];
                    }
                }
                if (m && m.id) {
                    self.id = m.id;
                    self.emit('login', m.id);
                }
            });
        }
    });
    req.end(JSON.stringify({ assertion: assertion }));
};

Persona.prototype._logout = function () {
    var self = this;
    var uri = self.routes.logout;
    self.id = null;
    
    var u = typeof uri === 'object' ? uri : url.parse(uri);
    var req = http.request({
        method: 'POST',
        host: u.hostname || window.location.hostname,
        port: u.port || window.location.port,
        path: u.path
    });
    req.on('response', function (res) {
        if (!/^2\d\d\b/.test(res.statusCode)) {
            var body = '';
            res.on('data', function (buf) { body += buf });
            res.on('end', function () {
                self.emit('error', new Error(
                    'error code ' + res.statusCode + ': ' + body
                ));
            });
        }
        else self.emit('logout');
    });
    req.end();
};

},{"./vendor/persona.js":30,"events":3,"http":8,"inherits":29,"querystring":4,"url":6}],29:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],30:[function(require,module,exports){
var navigator = { userAgent: window.navigator.userAgent };
if (window.navigator.id) navigator.id = window.navigator.id;

/**
 * Uncompressed source can be found at https://login.persona.org/include.orig.js
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function(){var a=function(){function e(a){return Array.isArray?Array.isArray(a):a.constructor.toString().indexOf("Array")!=-1}function d(a,c,d){var e=b[c][d];for(var f=0;f<e.length;f++)e[f].win===a&&e.splice(f,1);b[c][d].length===0&&delete b[c][d]}function c(a,c,d,e){function f(b){for(var c=0;c<b.length;c++)if(b[c].win===a)return!0;return!1}var g=!1;if(c==="*")for(var h in b){if(!b.hasOwnProperty(h))continue;if(h==="*")continue;if(typeof b[h][d]=="object"){g=f(b[h][d]);if(g)break}}else b["*"]&&b["*"][d]&&(g=f(b["*"][d])),!g&&b[c]&&b[c][d]&&(g=f(b[c][d]));if(g)throw"A channel is already bound to the same window which overlaps with origin '"+c+"' and has scope '"+d+"'";typeof b[c]!="object"&&(b[c]={}),typeof b[c][d]!="object"&&(b[c][d]=[]),b[c][d].push({win:a,handler:e})}"use strict";var a=Math.floor(Math.random()*1000001),b={},f={},g=function(a){try{var c=JSON.parse(a.data);if(typeof c!="object"||c===null)throw"malformed"}catch(a){return}var d=a.source,e=a.origin,g,h,i;if(typeof c.method=="string"){var j=c.method.split("::");j.length==2?(g=j[0],i=j[1]):i=c.method}typeof c.id!="undefined"&&(h=c.id);if(typeof i=="string"){var k=!1;if(b[e]&&b[e][g])for(var l=0;l<b[e][g].length;l++)if(b[e][g][l].win===d){b[e][g][l].handler(e,i,c),k=!0;break}if(!k&&b["*"]&&b["*"][g])for(var l=0;l<b["*"][g].length;l++)if(b["*"][g][l].win===d){b["*"][g][l].handler(e,i,c);break}}else typeof h!="undefined"&&f[h]&&f[h](e,i,c)};window.addEventListener?window.addEventListener("message",g,!1):window.attachEvent&&window.attachEvent("onmessage",g);return{build:function(b){var g=function(a){if(b.debugOutput&&window.console&&window.console.log){try{typeof a!="string"&&(a=JSON.stringify(a))}catch(c){}console.log("["+j+"] "+a)}};if(!window.postMessage)throw"jschannel cannot run this browser, no postMessage";if(!window.JSON||!window.JSON.stringify||!window.JSON.parse)throw"jschannel cannot run this browser, no JSON parsing/serialization";if(typeof b!="object")throw"Channel build invoked without a proper object argument";if(!b.window||!b.window.postMessage)throw"Channel.build() called without a valid window argument";if(window===b.window)throw"target window is same as present window -- not allowed";var h=!1;if(typeof b.origin=="string"){var i;b.origin==="*"?h=!0:null!==(i=b.origin.match(/^https?:\/\/(?:[-a-zA-Z0-9_\.])+(?::\d+)?/))&&(b.origin=i[0].toLowerCase(),h=!0)}if(!h)throw"Channel.build() called with an invalid origin";if(typeof b.scope!="undefined"){if(typeof b.scope!="string")throw"scope, when specified, must be a string";if(b.scope.split("::").length>1)throw"scope may not contain double colons: '::'"}var j=function(){var a="",b="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";for(var c=0;c<5;c++)a+=b.charAt(Math.floor(Math.random()*b.length));return a}(),k={},l={},m={},n=!1,o=[],p=function(a,b,c){var d=!1,e=!1;return{origin:b,invoke:function(b,d){if(!m[a])throw"attempting to invoke a callback of a nonexistent transaction: "+a;var e=!1;for(var f=0;f<c.length;f++)if(b===c[f]){e=!0;break}if(!e)throw"request supports no such callback '"+b+"'";t({id:a,callback:b,params:d})},error:function(b,c){e=!0;if(!m[a])throw"error called for nonexistent message: "+a;delete m[a],t({id:a,error:b,message:c})},complete:function(b){e=!0;if(!m[a])throw"complete called for nonexistent message: "+a;delete m[a],t({id:a,result:b})},delayReturn:function(a){typeof a=="boolean"&&(d=a===!0);return d},completed:function(){return e}}},q=function(a,b,c){return window.setTimeout(function(){if(l[a]){var d="timeout ("+b+"ms) exceeded on method '"+c+"'";(1,l[a].error)("timeout_error",d),delete l[a],delete f[a]}},b)},r=function(a,c,d){if(typeof b.gotMessageObserver=="function")try{b.gotMessageObserver(a,d)}catch(h){g("gotMessageObserver() raised an exception: "+h.toString())}if(d.id&&c){if(k[c]){var i=p(d.id,a,d.callbacks?d.callbacks:[]);m[d.id]={};try{if(d.callbacks&&e(d.callbacks)&&d.callbacks.length>0)for(var j=0;j<d.callbacks.length;j++){var n=d.callbacks[j],o=d.params,q=n.split("/");for(var r=0;r<q.length-1;r++){var s=q[r];typeof o[s]!="object"&&(o[s]={}),o=o[s]}o[q[q.length-1]]=function(){var a=n;return function(b){return i.invoke(a,b)}}()}var t=k[c](i,d.params);!i.delayReturn()&&!i.completed()&&i.complete(t)}catch(h){var u="runtime_error",v=null;typeof h=="string"?v=h:typeof h=="object"&&(h&&e(h)&&h.length==2?(u=h[0],v=h[1]):typeof h.error=="string"&&(u=h.error,h.message?typeof h.message=="string"?v=h.message:h=h.message:v=""));if(v===null)try{v=JSON.stringify(h),typeof v=="undefined"&&(v=h.toString())}catch(w){v=h.toString()}i.error(u,v)}}}else d.id&&d.callback?!l[d.id]||!l[d.id].callbacks||!l[d.id].callbacks[d.callback]?g("ignoring invalid callback, id:"+d.id+" ("+d.callback+")"):l[d.id].callbacks[d.callback](d.params):d.id?l[d.id]?(d.error?(1,l[d.id].error)(d.error,d.message):d.result!==undefined?(1,l[d.id].success)(d.result):(1,l[d.id].success)(),delete l[d.id],delete f[d.id]):g("ignoring invalid response: "+d.id):c&&k[c]&&k[c]({origin:a},d.params)};c(b.window,b.origin,typeof b.scope=="string"?b.scope:"",r);var s=function(a){typeof b.scope=="string"&&b.scope.length&&(a=[b.scope,a].join("::"));return a},t=function(a,c){if(!a)throw"postMessage called with null message";var d=n?"post  ":"queue ";g(d+" message: "+JSON.stringify(a));if(!c&&!n)o.push(a);else{if(typeof b.postMessageObserver=="function")try{b.postMessageObserver(b.origin,a)}catch(e){g("postMessageObserver() raised an exception: "+e.toString())}b.window.postMessage(JSON.stringify(a),b.origin)}},u=function(a,c){g("ready msg received");if(n)throw"received ready message while in ready state.  help!";c==="ping"?j+="-R":j+="-L",v.unbind("__ready"),n=!0,g("ready msg accepted."),c==="ping"&&v.notify({method:"__ready",params:"pong"});while(o.length)t(o.pop());typeof b.onReady=="function"&&b.onReady(v)},v={unbind:function(a){if(k[a]){if(delete k[a])return!0;throw"can't delete method: "+a}return!1},bind:function(a,b){if(!a||typeof a!="string")throw"'method' argument to bind must be string";if(!b||typeof b!="function")throw"callback missing from bind params";if(k[a])throw"method '"+a+"' is already bound!";k[a]=b;return this},call:function(b){if(!b)throw"missing arguments to call function";if(!b.method||typeof b.method!="string")throw"'method' argument to call must be string";if(!b.success||typeof b.success!="function")throw"'success' callback missing from call";var c={},d=[],e=function(a,b){if(typeof b=="object")for(var f in b){if(!b.hasOwnProperty(f))continue;var g=a+(a.length?"/":"")+f;typeof b[f]=="function"?(c[g]=b[f],d.push(g),delete b[f]):typeof b[f]=="object"&&e(g,b[f])}};e("",b.params);var g={id:a,method:s(b.method),params:b.params};d.length&&(g.callbacks=d),b.timeout&&q(a,b.timeout,s(b.method)),l[a]={callbacks:c,error:b.error,success:b.success},f[a]=r,a++,t(g)},notify:function(a){if(!a)throw"missing arguments to notify function";if(!a.method||typeof a.method!="string")throw"'method' argument to notify must be string";t({method:s(a.method),params:a.params})},destroy:function(){d(b.window,b.origin,typeof b.scope=="string"?b.scope:""),window.removeEventListener?window.removeEventListener("message",r,!1):window.detachEvent&&window.detachEvent("onmessage",r),n=!1,k={},m={},l={},b.origin=null,o=[],g("channel destroyed"),j=""}};v.bind("__ready",u),setTimeout(function(){},0);return v}}}();WinChan=function(){function i(){var b=window.location,c=window.opener.frames,d=b.protocol+"//"+b.host;for(var e=c.length-1;e>=0;e--)try{if(c[e].location.href.indexOf(d)===0&&c[e].name===a)return c[e]}catch(f){}return}function h(a){/^https?:\/\//.test(a)||(a=window.location.href);var b=/^(https?:\/\/[\-_a-zA-Z\.0-9:]+)/.exec(a);return b?b[1]:a}function g(){return window.JSON&&window.JSON.stringify&&window.JSON.parse&&window.postMessage}function f(){try{var a=navigator.userAgent;return a.indexOf("Fennec/")!=-1||a.indexOf("Firefox/")!=-1&&a.indexOf("Android")!=-1}catch(b){}return!1}function e(){var a=-1;if(navigator.appName==="Microsoft Internet Explorer"){var b=navigator.userAgent,c=new RegExp("MSIE ([0-9]{1,}[.0-9]{0,})");c.exec(b)!=null&&(a=parseFloat(RegExp.$1))}return a>=8}function d(a,b,c){a.detachEvent?a.detachEvent("on"+b,c):a.removeEventListener&&a.removeEventListener(b,c,!1)}function c(a,b,c){a.attachEvent?a.attachEvent("on"+b,c):a.addEventListener&&a.addEventListener(b,c,!1)}var a="__winchan_relay_frame",b="die",j=e();return g()?{open:function(e,g){function q(a){try{var b=JSON.parse(a.data);b.a==="ready"?m.postMessage(o,l):b.a==="error"?g&&(g(b.d),g=null):b.a==="response"&&(d(window,"message",q),d(window,"unload",p),p(),g&&(g(null,b.d),g=null))}catch(c){}}function p(){k&&document.body.removeChild(k),k=undefined;if(n)try{n.close()}catch(a){m.postMessage(b,l)}n=m=undefined}if(!g)throw"missing required callback argument";var i;e.url||(i="missing required 'url' parameter"),e.relay_url||(i="missing required 'relay_url' parameter"),i&&setTimeout(function(){g(i)},0),e.window_name||(e.window_name=null);if(!e.window_features||f())e.window_features=undefined;var k,l=h(e.url);if(l!==h(e.relay_url))return setTimeout(function(){g("invalid arguments: origin of url and relay_url must match")},0);var m;j&&(k=document.createElement("iframe"),k.setAttribute("src",e.relay_url),k.style.display="none",k.setAttribute("name",a),document.body.appendChild(k),m=k.contentWindow);var n=window.open(e.url,e.window_name,e.window_features);m||(m=n);var o=JSON.stringify({a:"request",d:e.params});c(window,"unload",p),c(window,"message",q);return{close:p,focus:function(){if(n)try{n.focus()}catch(a){}}}}}:{open:function(a,b,c,d){setTimeout(function(){d("unsupported browser")},0)}}}();var b=function(){function l(){return c}function k(){c=g()||h()||i()||j();return!c}function j(){if(!(window.JSON&&window.JSON.stringify&&window.JSON.parse))return"JSON_NOT_SUPPORTED"}function i(){if(!a.postMessage)return"POSTMESSAGE_NOT_SUPPORTED"}function h(){try{var b="localStorage"in a&&a.localStorage!==null;if(b)a.localStorage.setItem("test","true"),a.localStorage.removeItem("test");else return"LOCALSTORAGE_NOT_SUPPORTED"}catch(c){return"LOCALSTORAGE_DISABLED"}}function g(){return f()}function f(){var a=e(),b=a>-1&&a<8;if(b)return"BAD_IE_VERSION"}function e(){var a=-1;if(b.appName=="Microsoft Internet Explorer"){var c=b.userAgent,d=new RegExp("MSIE ([0-9]{1,}[.0-9]{0,})");d.exec(c)!=null&&(a=parseFloat(RegExp.$1))}return a}function d(c,d){b=c,a=d}var a=window,b=navigator,c;return{setTestEnv:d,isSupported:k,getNoSupportReason:l}}();navigator.id||(navigator.id={},navigator.mozId?navigator.id=navigator.mozId:navigator.id={});if(!navigator.id.request||navigator.id._shimmed){var c="https://login.persona.org",d=navigator.userAgent,e=d.indexOf("Fennec/")!=-1||d.indexOf("Firefox/")!=-1&&d.indexOf("Android")!=-1,f=e?undefined:"menubar=0,location=1,resizable=1,scrollbars=1,status=0,width=700,height=375",g,h={login:null,logout:null,match:null,ready:null},i,j=undefined;function k(a){a!==!0;if(j===undefined)j=a;else if(j!=a)throw new Error("you cannot combine the navigator.id.watch() API with navigator.id.getVerifiedEmail() or navigator.id.get()this site should instead use navigator.id.request() and navigator.id.watch()")}var l,m=!1,n=b.isSupported();function o(a){document.addEventListener?document.addEventListener("DOMContentLoaded",function b(){document.removeEventListener("DOMContentLoaded",b),a()},!1):document.attachEvent&&document.readyState&&document.attachEvent("onreadystatechange",function c(){var b=document.readyState;if(b==="loaded"||b==="complete"||b==="interactive")document.detachEvent("onreadystatechange",c),a()})}function p(){if(!!n){var b=window.document;if(!b.body){m||(o(p),m=!0);return}try{if(!l){var d=b.createElement("iframe");d.style.display="none",b.body.appendChild(d),d.src=c+"/communication_iframe",l=a.build({window:d.contentWindow,origin:c,scope:"mozid_ni",onReady:function(){l.call({method:"loaded",success:function(){h.ready&&h.ready()},error:function(){}})}}),l.bind("logout",function(a,b){h.logout&&h.logout()}),l.bind("login",function(a,b){h.login&&h.login(b)}),l.bind("match",function(a,b){h.match&&h.match()}),q(i)&&l.notify({method:"loggedInUser",params:i})}}catch(e){l=undefined}}}function q(a){return typeof a!="undefined"}function r(a){try{console.warn(a)}catch(b){}}function s(a,b){if(q(a[b])){r(b+" has been deprecated");return!0}}function t(a,b,c){if(q(a[b])&&q(a[c]))throw new Error("you cannot supply *both* "+b+" and "+c);s(a,b)&&(a[c]=a[b],delete a[b])}function u(a){if(typeof a=="object"){if(a.onlogin&&typeof a.onlogin!="function"||a.onlogout&&typeof a.onlogout!="function"||a.onmatch&&typeof a.onmatch!="function"||a.onready&&typeof a.onready!="function")throw new Error("non-function where function expected in parameters to navigator.id.watch()");if(!a.onlogin)throw new Error("'onlogin' is a required argument to navigator.id.watch()");if(!a.onlogout)throw new Error("'onlogout' is a required argument to navigator.id.watch()");h.login=a.onlogin||null,h.logout=a.onlogout||null,h.match=a.onmatch||null,h.ready=a.onready||null,t(a,"loggedInEmail","loggedInUser"),i=a.loggedInUser,p()}}var v;function w(){var a=v;a==="request"&&(h.ready?a="watch_with_onready":a="watch_without_onready");return a}function x(a){s(a,"requiredEmail"),t(a,"tosURL","termsOfService"),t(a,"privacyURL","privacyPolicy"),a.termsOfService&&!a.privacyPolicy&&r("termsOfService ignored unless privacyPolicy also defined"),a.privacyPolicy&&!a.termsOfService&&r("privacyPolicy ignored unless termsOfService also defined"),a.rp_api=w(),v=null,a.start_time=(new Date).getTime();if(g)try{g.focus()}catch(d){}else{if(!b.isSupported()){var e=b.getNoSupportReason(),i="unsupported_dialog";e==="LOCALSTORAGE_DISABLED"&&(i="cookies_disabled"),g=window.open(c+"/"+i,null,f);return}l&&l.notify({method:"dialog_running"}),g=WinChan.open({url:c+"/sign_in",relay_url:c+"/relay",window_features:f,window_name:"__persona_dialog",params:{method:"get",params:a}},function(b,c){l&&(!b&&c&&c.email&&l.notify({method:"loggedInUser",params:c.email}),l.notify({method:"dialog_complete"})),g=undefined;if(!b&&c&&c.assertion)try{h.login&&h.login(c.assertion)}catch(d){}if(b==="client closed window"||!c)a&&a.oncancel&&a.oncancel(),delete a.oncancel})}}navigator.id={request:function(a){if(this!=navigator.id)throw new Error("all navigator.id calls must be made on the navigator.id object");if(!h.login)throw new Error("navigator.id.watch must be called before navigator.id.request");a=a||{},k(!1),v="request",a.returnTo||(a.returnTo=document.location.pathname);return x(a)},watch:function(a){if(this!=navigator.id)throw new Error("all navigator.id calls must be made on the navigator.id object");k(!1),u(a)},logout:function(a){if(this!=navigator.id)throw new Error("all navigator.id calls must be made on the navigator.id object");p(),l&&l.notify({method:"logout"}),typeof a=="function"&&(r("navigator.id.logout callback argument has been deprecated."),setTimeout(a,0))},get:function(a,b){var c={};b=b||{},c.privacyPolicy=b.privacyPolicy||undefined,c.termsOfService=b.termsOfService||undefined,c.privacyURL=b.privacyURL||undefined,c.tosURL=b.tosURL||undefined,c.siteName=b.siteName||undefined,c.siteLogo=b.siteLogo||undefined,v=v||"get";s(b,"silent")?a&&setTimeout(function(){a(null)},0):(k(!0),u({onlogin:function(b){a&&(a(b),a=null)},onlogout:function(){}}),c.oncancel=function(){a&&(a(null),a=null),h.login=h.logout=h.match=h.ready=null},x(c))},getVerifiedEmail:function(a){r("navigator.id.getVerifiedEmail has been deprecated"),k(!0),v="getVerifiedEmail",navigator.id.get(a)},_shimmed:!0}}})()
module.exports = navigator.id;

},{}],31:[function(require,module,exports){
var global=self;/// shim for browser packaging

module.exports = function() {
  return global.WebSocket || global.MozWebSocket;
}

},{}]},{},[1])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvbWlrb2xhbHlzZW5rby9HaXRIdWIvbHVkdW0tZGFyZS0yNy9jbGllbnQuanMiLCIvVXNlcnMvbWlrb2xhbHlzZW5rby9HaXRIdWIvbHVkdW0tZGFyZS0yNy9ub2RlX21vZHVsZXMvYnJvd3Nlci1yZXF1ZXN0L2luZGV4LmpzIiwiL1VzZXJzL21pa29sYWx5c2Vua28vR2l0SHViL2x1ZHVtLWRhcmUtMjcvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItYnVpbHRpbnMvYnVpbHRpbi9ldmVudHMuanMiLCIvVXNlcnMvbWlrb2xhbHlzZW5rby9HaXRIdWIvbHVkdW0tZGFyZS0yNy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1idWlsdGlucy9idWlsdGluL3F1ZXJ5c3RyaW5nLmpzIiwiL1VzZXJzL21pa29sYWx5c2Vua28vR2l0SHViL2x1ZHVtLWRhcmUtMjcvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItYnVpbHRpbnMvYnVpbHRpbi9zdHJlYW0uanMiLCIvVXNlcnMvbWlrb2xhbHlzZW5rby9HaXRIdWIvbHVkdW0tZGFyZS0yNy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1idWlsdGlucy9idWlsdGluL3VybC5qcyIsIi9Vc2Vycy9taWtvbGFseXNlbmtvL0dpdEh1Yi9sdWR1bS1kYXJlLTI3L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLWJ1aWx0aW5zL2J1aWx0aW4vdXRpbC5qcyIsIi9Vc2Vycy9taWtvbGFseXNlbmtvL0dpdEh1Yi9sdWR1bS1kYXJlLTI3L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLWJ1aWx0aW5zL25vZGVfbW9kdWxlcy9odHRwLWJyb3dzZXJpZnkvaW5kZXguanMiLCIvVXNlcnMvbWlrb2xhbHlzZW5rby9HaXRIdWIvbHVkdW0tZGFyZS0yNy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1idWlsdGlucy9ub2RlX21vZHVsZXMvaHR0cC1icm93c2VyaWZ5L2xpYi9yZXF1ZXN0LmpzIiwiL1VzZXJzL21pa29sYWx5c2Vua28vR2l0SHViL2x1ZHVtLWRhcmUtMjcvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItYnVpbHRpbnMvbm9kZV9tb2R1bGVzL2h0dHAtYnJvd3NlcmlmeS9saWIvcmVzcG9uc2UuanMiLCIvVXNlcnMvbWlrb2xhbHlzZW5rby9HaXRIdWIvbHVkdW0tZGFyZS0yNy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1idWlsdGlucy9ub2RlX21vZHVsZXMvaHR0cC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9CYXNlNjQvYmFzZTY0LmpzIiwiL1VzZXJzL21pa29sYWx5c2Vua28vR2l0SHViL2x1ZHVtLWRhcmUtMjcvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2NvbmNhdC1zdHJlYW0vaW5kZXguanMiLCIvVXNlcnMvbWlrb2xhbHlzZW5rby9HaXRIdWIvbHVkdW0tZGFyZS0yNy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvY29uY2F0LXN0cmVhbS9ub2RlX21vZHVsZXMvYm9wcy9pbmRleC5qcyIsIi9Vc2Vycy9taWtvbGFseXNlbmtvL0dpdEh1Yi9sdWR1bS1kYXJlLTI3L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9jb25jYXQtc3RyZWFtL25vZGVfbW9kdWxlcy9ib3BzL25vZGVfbW9kdWxlcy9iYXNlNjQtanMvbGliL2I2NC5qcyIsIi9Vc2Vycy9taWtvbGFseXNlbmtvL0dpdEh1Yi9sdWR1bS1kYXJlLTI3L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9jb25jYXQtc3RyZWFtL25vZGVfbW9kdWxlcy9ib3BzL25vZGVfbW9kdWxlcy90by11dGY4L2luZGV4LmpzIiwiL1VzZXJzL21pa29sYWx5c2Vua28vR2l0SHViL2x1ZHVtLWRhcmUtMjcvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2NvbmNhdC1zdHJlYW0vbm9kZV9tb2R1bGVzL2JvcHMvdHlwZWRhcnJheS9jb3B5LmpzIiwiL1VzZXJzL21pa29sYWx5c2Vua28vR2l0SHViL2x1ZHVtLWRhcmUtMjcvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2NvbmNhdC1zdHJlYW0vbm9kZV9tb2R1bGVzL2JvcHMvdHlwZWRhcnJheS9jcmVhdGUuanMiLCIvVXNlcnMvbWlrb2xhbHlzZW5rby9HaXRIdWIvbHVkdW0tZGFyZS0yNy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvY29uY2F0LXN0cmVhbS9ub2RlX21vZHVsZXMvYm9wcy90eXBlZGFycmF5L2Zyb20uanMiLCIvVXNlcnMvbWlrb2xhbHlzZW5rby9HaXRIdWIvbHVkdW0tZGFyZS0yNy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvY29uY2F0LXN0cmVhbS9ub2RlX21vZHVsZXMvYm9wcy90eXBlZGFycmF5L2lzLmpzIiwiL1VzZXJzL21pa29sYWx5c2Vua28vR2l0SHViL2x1ZHVtLWRhcmUtMjcvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2NvbmNhdC1zdHJlYW0vbm9kZV9tb2R1bGVzL2JvcHMvdHlwZWRhcnJheS9qb2luLmpzIiwiL1VzZXJzL21pa29sYWx5c2Vua28vR2l0SHViL2x1ZHVtLWRhcmUtMjcvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2NvbmNhdC1zdHJlYW0vbm9kZV9tb2R1bGVzL2JvcHMvdHlwZWRhcnJheS9tYXBwZWQuanMiLCIvVXNlcnMvbWlrb2xhbHlzZW5rby9HaXRIdWIvbHVkdW0tZGFyZS0yNy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvY29uY2F0LXN0cmVhbS9ub2RlX21vZHVsZXMvYm9wcy90eXBlZGFycmF5L3JlYWQuanMiLCIvVXNlcnMvbWlrb2xhbHlzZW5rby9HaXRIdWIvbHVkdW0tZGFyZS0yNy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvY29uY2F0LXN0cmVhbS9ub2RlX21vZHVsZXMvYm9wcy90eXBlZGFycmF5L3N1YmFycmF5LmpzIiwiL1VzZXJzL21pa29sYWx5c2Vua28vR2l0SHViL2x1ZHVtLWRhcmUtMjcvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2NvbmNhdC1zdHJlYW0vbm9kZV9tb2R1bGVzL2JvcHMvdHlwZWRhcnJheS90by5qcyIsIi9Vc2Vycy9taWtvbGFseXNlbmtvL0dpdEh1Yi9sdWR1bS1kYXJlLTI3L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9jb25jYXQtc3RyZWFtL25vZGVfbW9kdWxlcy9ib3BzL3R5cGVkYXJyYXkvd3JpdGUuanMiLCIvVXNlcnMvbWlrb2xhbHlzZW5rby9HaXRIdWIvbHVkdW0tZGFyZS0yNy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvaW5zZXJ0LW1vZHVsZS1nbG9iYWxzL25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIvVXNlcnMvbWlrb2xhbHlzZW5rby9HaXRIdWIvbHVkdW0tZGFyZS0yNy9ub2RlX21vZHVsZXMvcGFyc2VkLXVybC90aGV1cmwuanMiLCIvVXNlcnMvbWlrb2xhbHlzZW5rby9HaXRIdWIvbHVkdW0tZGFyZS0yNy9ub2RlX21vZHVsZXMvcGVyc29uYS1pZC9icm93c2VyLmpzIiwiL1VzZXJzL21pa29sYWx5c2Vua28vR2l0SHViL2x1ZHVtLWRhcmUtMjcvbm9kZV9tb2R1bGVzL3BlcnNvbmEtaWQvbm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiLCIvVXNlcnMvbWlrb2xhbHlzZW5rby9HaXRIdWIvbHVkdW0tZGFyZS0yNy9ub2RlX21vZHVsZXMvcGVyc29uYS1pZC92ZW5kb3IvcGVyc29uYS5qcyIsIi9Vc2Vycy9taWtvbGFseXNlbmtvL0dpdEh1Yi9sdWR1bS1kYXJlLTI3L25vZGVfbW9kdWxlcy93cy9saWIvYnJvd3Nlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3VEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDelZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCJcblxudmFyIFdlYlNvY2tldCAgID0gcmVxdWlyZShcIndzXCIpKClcbnZhciByZXF1ZXN0ICAgICA9IHJlcXVpcmUoXCJicm93c2VyLXJlcXVlc3RcIilcbnZhciBwZXJzb25hICAgICA9IHJlcXVpcmUoXCJwZXJzb25hLWlkXCIpKHsgcm91dGU6IFwiL19wcm9maWxlXCIgfSlcbnZhciBwYXJzZWRVUkwgICA9IHJlcXVpcmUoXCJwYXJzZWQtdXJsXCIpXG5cbnZhciBsb2dpblN0YXR1cyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibG9naW5tc2dcIilcbnZhciBpZGVudGlmeSAgICA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaWRlbnRpZnlcIilcbnZhciBjaGF0TG9nICAgICA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY2hhdGxvZ1wiKVxudmFyIGNoYXRCb3ggICAgID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjaGF0Ym94XCIpXG52YXIgYmV0QW1vdW50ICAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImJldGFtb3VudFwiKVxudmFyIGJldExlZnQgICAgID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJiZXRsZWZ0XCIpXG52YXIgYmV0UmlnaHQgICAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImJldHJpZ2h0XCIpXG52YXIgY2FudmFzICAgICAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImdhbWVmaWVsZFwiKVxuXG52YXIgY29udGV4dCAgICAgPSBjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpXG5cbnZhciBsb2dnZWRJbiA9IGZhbHNlXG52YXIgZW1haWwgPSBcIlwiXG52YXIgc29ja2V0ID0gbnVsbFxuXG5jb250ZXh0LmZpbGxTdHlsZSA9IFwicmdiYSgwLDAsMCwxLjApXCJcbmNvbnRleHQuZmlsbFJlY3QoMCwgMCwgODAwLCA4MDApXG5cbmZ1bmN0aW9uIGNoZWNrU3RhdGUoKSB7XG4gIHJlcXVlc3Qoe3VybDogXCIvX3Byb2ZpbGVcIiwganNvbjogdHJ1ZX0sIGZ1bmN0aW9uKGVyciwgcmVzcCwgcHJvZmlsZSkge1xuICAgIGNvbnNvbGUubG9nKHByb2ZpbGUpXG4gICAgaWYocHJvZmlsZSkge1xuICAgICAgaWYobG9nZ2VkSW4pIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBsb2dnZWRJbiA9IHRydWVcbiAgICAgIGVtYWlsID0gcHJvZmlsZS5lbWFpbFxuICAgICAgc29ja2V0ID0gbmV3IFdlYlNvY2tldChcIndzOi8vXCIgKyBwYXJzZWRVUkwuaG9zdClcbiAgICAgIGNoYXRCb3guZGlzYWJsZWQgPSBmYWxzZVxuICAgICAgaWRlbnRpZnkudmFsdWUgPSBcInVuaWRlbnRpZnlcIlxuICAgICAgbG9naW5TdGF0dXMuaW5uZXJIVE1MID0gXCJMb2dnZWQgaW4gYXMgXCIgKyBlbWFpbFxuICAgICAgXG4gICAgICBzb2NrZXQub25vcGVuID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiU09DS0VUIE9QRU5cIilcbiAgICAgIH1cbiAgICAgIFxuICAgICAgc29ja2V0Lm9ubWVzc2FnZSA9IGZ1bmN0aW9uKGRhdGEsIGZsYWdzKSB7XG4gICAgICAgIHZhciBwYXJzZWQgPSBKU09OLnBhcnNlKGRhdGEuZGF0YSlcbiAgICAgICAgaWYocGFyc2VkLmNoYXQpIHtcbiAgICAgICAgICB2YXIgdGV4dE5vZGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwicFwiKVxuICAgICAgICAgIHRleHROb2RlLmNsYXNzTmFtZSA9IFwiY2hhdEl0ZW1cIlxuICAgICAgICAgIHZhciB1c2VyTm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIilcbiAgICAgICAgICB1c2VyTm9kZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShwYXJzZWQudXNlcikpXG4gICAgICAgICAgdXNlck5vZGUuY2xhc3NOYW1lID0gXCJjaGF0VXNlclwiXG4gICAgICAgICAgdmFyIGNoYXROb2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUocGFyc2VkLmNoYXQpXG4gICAgICAgICAgdGV4dE5vZGUuYXBwZW5kQ2hpbGQodXNlck5vZGUpXG4gICAgICAgICAgdGV4dE5vZGUuYXBwZW5kQ2hpbGQoY2hhdE5vZGUpXG4gICAgICAgICAgY2hhdExvZy5hcHBlbmRDaGlsZCh0ZXh0Tm9kZSlcbiAgICAgICAgICBjaGF0TG9nLnNjcm9sbFRvcCA9IGNoYXRMb2cuc2Nyb2xsSGVpZ2h0XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS5sb2coXCJEQVRBXCIsIGRhdGEpXG4gICAgICB9XG4gICAgICBcbiAgICAgIHNvY2tldC5vbmVycm9yID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiU09DS0VUIEVSUk9SXCIsIGV2dClcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYoc29ja2V0KSB7XG4gICAgICAgIHNvY2tldC5jbG9zZSgpXG4gICAgICB9XG4gICAgICBpZighbG9nZ2VkSW4pIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBsb2dnZWRJbiA9IGZhbHNlXG4gICAgICBlbWFpbCA9IFwiXCJcbiAgICAgIHNvY2tldCA9IG51bGxcbiAgICAgIGlkZW50aWZ5LnZhbHVlID0gXCJpZGVudGlmeVwiXG4gICAgICBjaGF0Qm94LmRpc2FibGVkID0gdHJ1ZVxuICAgICAgbG9naW5TdGF0dXMuaW5uZXJIVE1MID0gXCJOb3QgbG9nZ2VkIGluXCJcbiAgICB9XG4gIH0pXG59XG5cbnBlcnNvbmEub24oXCJsb2dpblwiLCBmdW5jdGlvbihpZCkge1xuICBjaGVja1N0YXRlKClcbn0pXG5cbnBlcnNvbmEub24oXCJsb2dvdXRcIiwgZnVuY3Rpb24oKSB7XG4gIGNoZWNrU3RhdGUoKVxufSlcblxuaWRlbnRpZnkuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uICgpIHtcbiAgaWYobG9nZ2VkSW4pIHtcbiAgICBwZXJzb25hLnVuaWRlbnRpZnkoKVxuICB9IGVsc2Uge1xuICAgIHBlcnNvbmEuaWRlbnRpZnkoKVxuICB9XG59KVxuXG5jaGF0Qm94LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGZ1bmN0aW9uKGV2dCkge1xuICBpZihldnQua2V5Q29kZSA9PT0gMTMpIHtcbiAgICB2YXIgc3RyID0gY2hhdEJveC52YWx1ZVxuICAgIGNoYXRCb3gudmFsdWUgPSBcIlwiXG4gICAgaWYoc29ja2V0KSB7XG4gICAgICBzb2NrZXQuc2VuZChbJ3tcImNoYXRcIjpcIicsIHN0ci5yZXBsYWNlKC9cXFxcL2csIFwiXFxcXFxcXFxcIikucmVwbGFjZSgvXCIvZywgXCJcXFxcXFxcIlwiKSwgJ1wifSddLmpvaW4oXCJcIikpXG4gICAgfVxuICB9XG59KVxuXG5cbmNoZWNrU3RhdGUoKVxuIiwiLy8gQnJvd3NlciBSZXF1ZXN0XG4vL1xuLy8gTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbi8vIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbi8vIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4vLyBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4vLyBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbi8vIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbi8vIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG52YXIgWEhSID0gWE1MSHR0cFJlcXVlc3RcbmlmICghWEhSKSB0aHJvdyBuZXcgRXJyb3IoJ21pc3NpbmcgWE1MSHR0cFJlcXVlc3QnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IHJlcXVlc3RcbnJlcXVlc3QubG9nID0ge1xuICAndHJhY2UnOiBub29wLCAnZGVidWcnOiBub29wLCAnaW5mbyc6IG5vb3AsICd3YXJuJzogbm9vcCwgJ2Vycm9yJzogbm9vcFxufVxuXG52YXIgREVGQVVMVF9USU1FT1VUID0gMyAqIDYwICogMTAwMCAvLyAzIG1pbnV0ZXNcblxuLy9cbi8vIHJlcXVlc3Rcbi8vXG5cbmZ1bmN0aW9uIHJlcXVlc3Qob3B0aW9ucywgY2FsbGJhY2spIHtcbiAgLy8gVGhlIGVudHJ5LXBvaW50IHRvIHRoZSBBUEk6IHByZXAgdGhlIG9wdGlvbnMgb2JqZWN0IGFuZCBwYXNzIHRoZSByZWFsIHdvcmsgdG8gcnVuX3hoci5cbiAgaWYodHlwZW9mIGNhbGxiYWNrICE9PSAnZnVuY3Rpb24nKVxuICAgIHRocm93IG5ldyBFcnJvcignQmFkIGNhbGxiYWNrIGdpdmVuOiAnICsgY2FsbGJhY2spXG5cbiAgaWYoIW9wdGlvbnMpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdObyBvcHRpb25zIGdpdmVuJylcblxuICB2YXIgb3B0aW9uc19vblJlc3BvbnNlID0gb3B0aW9ucy5vblJlc3BvbnNlOyAvLyBTYXZlIHRoaXMgZm9yIGxhdGVyLlxuXG4gIGlmKHR5cGVvZiBvcHRpb25zID09PSAnc3RyaW5nJylcbiAgICBvcHRpb25zID0geyd1cmknOm9wdGlvbnN9O1xuICBlbHNlXG4gICAgb3B0aW9ucyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkob3B0aW9ucykpOyAvLyBVc2UgYSBkdXBsaWNhdGUgZm9yIG11dGF0aW5nLlxuXG4gIG9wdGlvbnMub25SZXNwb25zZSA9IG9wdGlvbnNfb25SZXNwb25zZSAvLyBBbmQgcHV0IGl0IGJhY2suXG5cbiAgaWYgKG9wdGlvbnMudmVyYm9zZSkgcmVxdWVzdC5sb2cgPSBnZXRMb2dnZXIoKTtcblxuICBpZihvcHRpb25zLnVybCkge1xuICAgIG9wdGlvbnMudXJpID0gb3B0aW9ucy51cmw7XG4gICAgZGVsZXRlIG9wdGlvbnMudXJsO1xuICB9XG5cbiAgaWYoIW9wdGlvbnMudXJpICYmIG9wdGlvbnMudXJpICE9PSBcIlwiKVxuICAgIHRocm93IG5ldyBFcnJvcihcIm9wdGlvbnMudXJpIGlzIGEgcmVxdWlyZWQgYXJndW1lbnRcIik7XG5cbiAgaWYodHlwZW9mIG9wdGlvbnMudXJpICE9IFwic3RyaW5nXCIpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwib3B0aW9ucy51cmkgbXVzdCBiZSBhIHN0cmluZ1wiKTtcblxuICB2YXIgdW5zdXBwb3J0ZWRfb3B0aW9ucyA9IFsncHJveHknLCAnX3JlZGlyZWN0c0ZvbGxvd2VkJywgJ21heFJlZGlyZWN0cycsICdmb2xsb3dSZWRpcmVjdCddXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdW5zdXBwb3J0ZWRfb3B0aW9ucy5sZW5ndGg7IGkrKylcbiAgICBpZihvcHRpb25zWyB1bnN1cHBvcnRlZF9vcHRpb25zW2ldIF0pXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJvcHRpb25zLlwiICsgdW5zdXBwb3J0ZWRfb3B0aW9uc1tpXSArIFwiIGlzIG5vdCBzdXBwb3J0ZWRcIilcblxuICBvcHRpb25zLmNhbGxiYWNrID0gY2FsbGJhY2tcbiAgb3B0aW9ucy5tZXRob2QgPSBvcHRpb25zLm1ldGhvZCB8fCAnR0VUJztcbiAgb3B0aW9ucy5oZWFkZXJzID0gb3B0aW9ucy5oZWFkZXJzIHx8IHt9O1xuICBvcHRpb25zLmJvZHkgICAgPSBvcHRpb25zLmJvZHkgfHwgbnVsbFxuICBvcHRpb25zLnRpbWVvdXQgPSBvcHRpb25zLnRpbWVvdXQgfHwgcmVxdWVzdC5ERUZBVUxUX1RJTUVPVVRcblxuICBpZihvcHRpb25zLmhlYWRlcnMuaG9zdClcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJPcHRpb25zLmhlYWRlcnMuaG9zdCBpcyBub3Qgc3VwcG9ydGVkXCIpO1xuXG4gIGlmKG9wdGlvbnMuanNvbikge1xuICAgIG9wdGlvbnMuaGVhZGVycy5hY2NlcHQgPSBvcHRpb25zLmhlYWRlcnMuYWNjZXB0IHx8ICdhcHBsaWNhdGlvbi9qc29uJ1xuICAgIGlmKG9wdGlvbnMubWV0aG9kICE9PSAnR0VUJylcbiAgICAgIG9wdGlvbnMuaGVhZGVyc1snY29udGVudC10eXBlJ10gPSAnYXBwbGljYXRpb24vanNvbidcblxuICAgIGlmKHR5cGVvZiBvcHRpb25zLmpzb24gIT09ICdib29sZWFuJylcbiAgICAgIG9wdGlvbnMuYm9keSA9IEpTT04uc3RyaW5naWZ5KG9wdGlvbnMuanNvbilcbiAgICBlbHNlIGlmKHR5cGVvZiBvcHRpb25zLmJvZHkgIT09ICdzdHJpbmcnKVxuICAgICAgb3B0aW9ucy5ib2R5ID0gSlNPTi5zdHJpbmdpZnkob3B0aW9ucy5ib2R5KVxuICB9XG5cbiAgLy8gSWYgb25SZXNwb25zZSBpcyBib29sZWFuIHRydWUsIGNhbGwgYmFjayBpbW1lZGlhdGVseSB3aGVuIHRoZSByZXNwb25zZSBpcyBrbm93bixcbiAgLy8gbm90IHdoZW4gdGhlIGZ1bGwgcmVxdWVzdCBpcyBjb21wbGV0ZS5cbiAgb3B0aW9ucy5vblJlc3BvbnNlID0gb3B0aW9ucy5vblJlc3BvbnNlIHx8IG5vb3BcbiAgaWYob3B0aW9ucy5vblJlc3BvbnNlID09PSB0cnVlKSB7XG4gICAgb3B0aW9ucy5vblJlc3BvbnNlID0gY2FsbGJhY2tcbiAgICBvcHRpb25zLmNhbGxiYWNrID0gbm9vcFxuICB9XG5cbiAgLy8gWFhYIEJyb3dzZXJzIGRvIG5vdCBsaWtlIHRoaXMuXG4gIC8vaWYob3B0aW9ucy5ib2R5KVxuICAvLyAgb3B0aW9ucy5oZWFkZXJzWydjb250ZW50LWxlbmd0aCddID0gb3B0aW9ucy5ib2R5Lmxlbmd0aDtcblxuICAvLyBIVFRQIGJhc2ljIGF1dGhlbnRpY2F0aW9uXG4gIGlmKCFvcHRpb25zLmhlYWRlcnMuYXV0aG9yaXphdGlvbiAmJiBvcHRpb25zLmF1dGgpXG4gICAgb3B0aW9ucy5oZWFkZXJzLmF1dGhvcml6YXRpb24gPSAnQmFzaWMgJyArIGI2NF9lbmMob3B0aW9ucy5hdXRoLnVzZXJuYW1lICsgJzonICsgb3B0aW9ucy5hdXRoLnBhc3N3b3JkKTtcblxuICByZXR1cm4gcnVuX3hocihvcHRpb25zKVxufVxuXG52YXIgcmVxX3NlcSA9IDBcbmZ1bmN0aW9uIHJ1bl94aHIob3B0aW9ucykge1xuICB2YXIgeGhyID0gbmV3IFhIUlxuICAgICwgdGltZWRfb3V0ID0gZmFsc2VcbiAgICAsIGlzX2NvcnMgPSBpc19jcm9zc0RvbWFpbihvcHRpb25zLnVyaSlcbiAgICAsIHN1cHBvcnRzX2NvcnMgPSAoJ3dpdGhDcmVkZW50aWFscycgaW4geGhyKVxuXG4gIHJlcV9zZXEgKz0gMVxuICB4aHIuc2VxX2lkID0gcmVxX3NlcVxuICB4aHIuaWQgPSByZXFfc2VxICsgJzogJyArIG9wdGlvbnMubWV0aG9kICsgJyAnICsgb3B0aW9ucy51cmlcbiAgeGhyLl9pZCA9IHhoci5pZCAvLyBJIGtub3cgSSB3aWxsIHR5cGUgXCJfaWRcIiBmcm9tIGhhYml0IGFsbCB0aGUgdGltZS5cblxuICBpZihpc19jb3JzICYmICFzdXBwb3J0c19jb3JzKSB7XG4gICAgdmFyIGNvcnNfZXJyID0gbmV3IEVycm9yKCdCcm93c2VyIGRvZXMgbm90IHN1cHBvcnQgY3Jvc3Mtb3JpZ2luIHJlcXVlc3Q6ICcgKyBvcHRpb25zLnVyaSlcbiAgICBjb3JzX2Vyci5jb3JzID0gJ3Vuc3VwcG9ydGVkJ1xuICAgIHJldHVybiBvcHRpb25zLmNhbGxiYWNrKGNvcnNfZXJyLCB4aHIpXG4gIH1cblxuICB4aHIudGltZW91dFRpbWVyID0gc2V0VGltZW91dCh0b29fbGF0ZSwgb3B0aW9ucy50aW1lb3V0KVxuICBmdW5jdGlvbiB0b29fbGF0ZSgpIHtcbiAgICB0aW1lZF9vdXQgPSB0cnVlXG4gICAgdmFyIGVyID0gbmV3IEVycm9yKCdFVElNRURPVVQnKVxuICAgIGVyLmNvZGUgPSAnRVRJTUVET1VUJ1xuICAgIGVyLmR1cmF0aW9uID0gb3B0aW9ucy50aW1lb3V0XG5cbiAgICByZXF1ZXN0LmxvZy5lcnJvcignVGltZW91dCcsIHsgJ2lkJzp4aHIuX2lkLCAnbWlsbGlzZWNvbmRzJzpvcHRpb25zLnRpbWVvdXQgfSlcbiAgICByZXR1cm4gb3B0aW9ucy5jYWxsYmFjayhlciwgeGhyKVxuICB9XG5cbiAgLy8gU29tZSBzdGF0ZXMgY2FuIGJlIHNraXBwZWQgb3Zlciwgc28gcmVtZW1iZXIgd2hhdCBpcyBzdGlsbCBpbmNvbXBsZXRlLlxuICB2YXIgZGlkID0geydyZXNwb25zZSc6ZmFsc2UsICdsb2FkaW5nJzpmYWxzZSwgJ2VuZCc6ZmFsc2V9XG5cbiAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IG9uX3N0YXRlX2NoYW5nZVxuICB4aHIub3BlbihvcHRpb25zLm1ldGhvZCwgb3B0aW9ucy51cmksIHRydWUpIC8vIGFzeW5jaHJvbm91c1xuICBpZihpc19jb3JzKVxuICAgIHhoci53aXRoQ3JlZGVudGlhbHMgPSAhISBvcHRpb25zLndpdGhDcmVkZW50aWFsc1xuICB4aHIuc2VuZChvcHRpb25zLmJvZHkpXG4gIHJldHVybiB4aHJcblxuICBmdW5jdGlvbiBvbl9zdGF0ZV9jaGFuZ2UoZXZlbnQpIHtcbiAgICBpZih0aW1lZF9vdXQpXG4gICAgICByZXR1cm4gcmVxdWVzdC5sb2cuZGVidWcoJ0lnbm9yaW5nIHRpbWVkIG91dCBzdGF0ZSBjaGFuZ2UnLCB7J3N0YXRlJzp4aHIucmVhZHlTdGF0ZSwgJ2lkJzp4aHIuaWR9KVxuXG4gICAgcmVxdWVzdC5sb2cuZGVidWcoJ1N0YXRlIGNoYW5nZScsIHsnc3RhdGUnOnhoci5yZWFkeVN0YXRlLCAnaWQnOnhoci5pZCwgJ3RpbWVkX291dCc6dGltZWRfb3V0fSlcblxuICAgIGlmKHhoci5yZWFkeVN0YXRlID09PSBYSFIuT1BFTkVEKSB7XG4gICAgICByZXF1ZXN0LmxvZy5kZWJ1ZygnUmVxdWVzdCBzdGFydGVkJywgeydpZCc6eGhyLmlkfSlcbiAgICAgIGZvciAodmFyIGtleSBpbiBvcHRpb25zLmhlYWRlcnMpXG4gICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKGtleSwgb3B0aW9ucy5oZWFkZXJzW2tleV0pXG4gICAgfVxuXG4gICAgZWxzZSBpZih4aHIucmVhZHlTdGF0ZSA9PT0gWEhSLkhFQURFUlNfUkVDRUlWRUQpXG4gICAgICBvbl9yZXNwb25zZSgpXG5cbiAgICBlbHNlIGlmKHhoci5yZWFkeVN0YXRlID09PSBYSFIuTE9BRElORykge1xuICAgICAgb25fcmVzcG9uc2UoKVxuICAgICAgb25fbG9hZGluZygpXG4gICAgfVxuXG4gICAgZWxzZSBpZih4aHIucmVhZHlTdGF0ZSA9PT0gWEhSLkRPTkUpIHtcbiAgICAgIG9uX3Jlc3BvbnNlKClcbiAgICAgIG9uX2xvYWRpbmcoKVxuICAgICAgb25fZW5kKClcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBvbl9yZXNwb25zZSgpIHtcbiAgICBpZihkaWQucmVzcG9uc2UpXG4gICAgICByZXR1cm5cblxuICAgIGRpZC5yZXNwb25zZSA9IHRydWVcbiAgICByZXF1ZXN0LmxvZy5kZWJ1ZygnR290IHJlc3BvbnNlJywgeydpZCc6eGhyLmlkLCAnc3RhdHVzJzp4aHIuc3RhdHVzfSlcbiAgICBjbGVhclRpbWVvdXQoeGhyLnRpbWVvdXRUaW1lcilcbiAgICB4aHIuc3RhdHVzQ29kZSA9IHhoci5zdGF0dXMgLy8gTm9kZSByZXF1ZXN0IGNvbXBhdGliaWxpdHlcblxuICAgIC8vIERldGVjdCBmYWlsZWQgQ09SUyByZXF1ZXN0cy5cbiAgICBpZihpc19jb3JzICYmIHhoci5zdGF0dXNDb2RlID09IDApIHtcbiAgICAgIHZhciBjb3JzX2VyciA9IG5ldyBFcnJvcignQ09SUyByZXF1ZXN0IHJlamVjdGVkOiAnICsgb3B0aW9ucy51cmkpXG4gICAgICBjb3JzX2Vyci5jb3JzID0gJ3JlamVjdGVkJ1xuXG4gICAgICAvLyBEbyBub3QgcHJvY2VzcyB0aGlzIHJlcXVlc3QgZnVydGhlci5cbiAgICAgIGRpZC5sb2FkaW5nID0gdHJ1ZVxuICAgICAgZGlkLmVuZCA9IHRydWVcblxuICAgICAgcmV0dXJuIG9wdGlvbnMuY2FsbGJhY2soY29yc19lcnIsIHhocilcbiAgICB9XG5cbiAgICBvcHRpb25zLm9uUmVzcG9uc2UobnVsbCwgeGhyKVxuICB9XG5cbiAgZnVuY3Rpb24gb25fbG9hZGluZygpIHtcbiAgICBpZihkaWQubG9hZGluZylcbiAgICAgIHJldHVyblxuXG4gICAgZGlkLmxvYWRpbmcgPSB0cnVlXG4gICAgcmVxdWVzdC5sb2cuZGVidWcoJ1Jlc3BvbnNlIGJvZHkgbG9hZGluZycsIHsnaWQnOnhoci5pZH0pXG4gICAgLy8gVE9ETzogTWF5YmUgc2ltdWxhdGUgXCJkYXRhXCIgZXZlbnRzIGJ5IHdhdGNoaW5nIHhoci5yZXNwb25zZVRleHRcbiAgfVxuXG4gIGZ1bmN0aW9uIG9uX2VuZCgpIHtcbiAgICBpZihkaWQuZW5kKVxuICAgICAgcmV0dXJuXG5cbiAgICBkaWQuZW5kID0gdHJ1ZVxuICAgIHJlcXVlc3QubG9nLmRlYnVnKCdSZXF1ZXN0IGRvbmUnLCB7J2lkJzp4aHIuaWR9KVxuXG4gICAgeGhyLmJvZHkgPSB4aHIucmVzcG9uc2VUZXh0XG4gICAgaWYob3B0aW9ucy5qc29uKSB7XG4gICAgICB0cnkgICAgICAgIHsgeGhyLmJvZHkgPSBKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpIH1cbiAgICAgIGNhdGNoIChlcikgeyByZXR1cm4gb3B0aW9ucy5jYWxsYmFjayhlciwgeGhyKSAgICAgICAgfVxuICAgIH1cblxuICAgIG9wdGlvbnMuY2FsbGJhY2sobnVsbCwgeGhyLCB4aHIuYm9keSlcbiAgfVxuXG59IC8vIHJlcXVlc3RcblxucmVxdWVzdC53aXRoQ3JlZGVudGlhbHMgPSBmYWxzZTtcbnJlcXVlc3QuREVGQVVMVF9USU1FT1VUID0gREVGQVVMVF9USU1FT1VUO1xuXG4vL1xuLy8gSFRUUCBtZXRob2Qgc2hvcnRjdXRzXG4vL1xuXG52YXIgc2hvcnRjdXRzID0gWyAnZ2V0JywgJ3B1dCcsICdwb3N0JywgJ2hlYWQnIF07XG5zaG9ydGN1dHMuZm9yRWFjaChmdW5jdGlvbihzaG9ydGN1dCkge1xuICB2YXIgbWV0aG9kID0gc2hvcnRjdXQudG9VcHBlckNhc2UoKTtcbiAgdmFyIGZ1bmMgICA9IHNob3J0Y3V0LnRvTG93ZXJDYXNlKCk7XG5cbiAgcmVxdWVzdFtmdW5jXSA9IGZ1bmN0aW9uKG9wdHMpIHtcbiAgICBpZih0eXBlb2Ygb3B0cyA9PT0gJ3N0cmluZycpXG4gICAgICBvcHRzID0geydtZXRob2QnOm1ldGhvZCwgJ3VyaSc6b3B0c307XG4gICAgZWxzZSB7XG4gICAgICBvcHRzID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShvcHRzKSk7XG4gICAgICBvcHRzLm1ldGhvZCA9IG1ldGhvZDtcbiAgICB9XG5cbiAgICB2YXIgYXJncyA9IFtvcHRzXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmFwcGx5KGFyZ3VtZW50cywgWzFdKSk7XG4gICAgcmV0dXJuIHJlcXVlc3QuYXBwbHkodGhpcywgYXJncyk7XG4gIH1cbn0pXG5cbi8vXG4vLyBDb3VjaERCIHNob3J0Y3V0XG4vL1xuXG5yZXF1ZXN0LmNvdWNoID0gZnVuY3Rpb24ob3B0aW9ucywgY2FsbGJhY2spIHtcbiAgaWYodHlwZW9mIG9wdGlvbnMgPT09ICdzdHJpbmcnKVxuICAgIG9wdGlvbnMgPSB7J3VyaSc6b3B0aW9uc31cblxuICAvLyBKdXN0IHVzZSB0aGUgcmVxdWVzdCBBUEkgdG8gZG8gSlNPTi5cbiAgb3B0aW9ucy5qc29uID0gdHJ1ZVxuICBpZihvcHRpb25zLmJvZHkpXG4gICAgb3B0aW9ucy5qc29uID0gb3B0aW9ucy5ib2R5XG4gIGRlbGV0ZSBvcHRpb25zLmJvZHlcblxuICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IG5vb3BcblxuICB2YXIgeGhyID0gcmVxdWVzdChvcHRpb25zLCBjb3VjaF9oYW5kbGVyKVxuICByZXR1cm4geGhyXG5cbiAgZnVuY3Rpb24gY291Y2hfaGFuZGxlcihlciwgcmVzcCwgYm9keSkge1xuICAgIGlmKGVyKVxuICAgICAgcmV0dXJuIGNhbGxiYWNrKGVyLCByZXNwLCBib2R5KVxuXG4gICAgaWYoKHJlc3Auc3RhdHVzQ29kZSA8IDIwMCB8fCByZXNwLnN0YXR1c0NvZGUgPiAyOTkpICYmIGJvZHkuZXJyb3IpIHtcbiAgICAgIC8vIFRoZSBib2R5IGlzIGEgQ291Y2ggSlNPTiBvYmplY3QgaW5kaWNhdGluZyB0aGUgZXJyb3IuXG4gICAgICBlciA9IG5ldyBFcnJvcignQ291Y2hEQiBlcnJvcjogJyArIChib2R5LmVycm9yLnJlYXNvbiB8fCBib2R5LmVycm9yLmVycm9yKSlcbiAgICAgIGZvciAodmFyIGtleSBpbiBib2R5KVxuICAgICAgICBlcltrZXldID0gYm9keVtrZXldXG4gICAgICByZXR1cm4gY2FsbGJhY2soZXIsIHJlc3AsIGJvZHkpO1xuICAgIH1cblxuICAgIHJldHVybiBjYWxsYmFjayhlciwgcmVzcCwgYm9keSk7XG4gIH1cbn1cblxuLy9cbi8vIFV0aWxpdHlcbi8vXG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5mdW5jdGlvbiBnZXRMb2dnZXIoKSB7XG4gIHZhciBsb2dnZXIgPSB7fVxuICAgICwgbGV2ZWxzID0gWyd0cmFjZScsICdkZWJ1ZycsICdpbmZvJywgJ3dhcm4nLCAnZXJyb3InXVxuICAgICwgbGV2ZWwsIGlcblxuICBmb3IoaSA9IDA7IGkgPCBsZXZlbHMubGVuZ3RoOyBpKyspIHtcbiAgICBsZXZlbCA9IGxldmVsc1tpXVxuXG4gICAgbG9nZ2VyW2xldmVsXSA9IG5vb3BcbiAgICBpZih0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcgJiYgY29uc29sZSAmJiBjb25zb2xlW2xldmVsXSlcbiAgICAgIGxvZ2dlcltsZXZlbF0gPSBmb3JtYXR0ZWQoY29uc29sZSwgbGV2ZWwpXG4gIH1cblxuICByZXR1cm4gbG9nZ2VyXG59XG5cbmZ1bmN0aW9uIGZvcm1hdHRlZChvYmosIG1ldGhvZCkge1xuICByZXR1cm4gZm9ybWF0dGVkX2xvZ2dlclxuXG4gIGZ1bmN0aW9uIGZvcm1hdHRlZF9sb2dnZXIoc3RyLCBjb250ZXh0KSB7XG4gICAgaWYodHlwZW9mIGNvbnRleHQgPT09ICdvYmplY3QnKVxuICAgICAgc3RyICs9ICcgJyArIEpTT04uc3RyaW5naWZ5KGNvbnRleHQpXG5cbiAgICByZXR1cm4gb2JqW21ldGhvZF0uY2FsbChvYmosIHN0cilcbiAgfVxufVxuXG4vLyBSZXR1cm4gd2hldGhlciBhIFVSTCBpcyBhIGNyb3NzLWRvbWFpbiByZXF1ZXN0LlxuZnVuY3Rpb24gaXNfY3Jvc3NEb21haW4odXJsKSB7XG4gIHZhciBydXJsID0gL14oW1xcd1xcK1xcLlxcLV0rOikoPzpcXC9cXC8oW15cXC8/IzpdKikoPzo6KFxcZCspKT8pPy9cblxuICAvLyBqUXVlcnkgIzgxMzgsIElFIG1heSB0aHJvdyBhbiBleGNlcHRpb24gd2hlbiBhY2Nlc3NpbmdcbiAgLy8gYSBmaWVsZCBmcm9tIHdpbmRvdy5sb2NhdGlvbiBpZiBkb2N1bWVudC5kb21haW4gaGFzIGJlZW4gc2V0XG4gIHZhciBhamF4TG9jYXRpb25cbiAgdHJ5IHsgYWpheExvY2F0aW9uID0gbG9jYXRpb24uaHJlZiB9XG4gIGNhdGNoIChlKSB7XG4gICAgLy8gVXNlIHRoZSBocmVmIGF0dHJpYnV0ZSBvZiBhbiBBIGVsZW1lbnQgc2luY2UgSUUgd2lsbCBtb2RpZnkgaXQgZ2l2ZW4gZG9jdW1lbnQubG9jYXRpb25cbiAgICBhamF4TG9jYXRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcImFcIiApO1xuICAgIGFqYXhMb2NhdGlvbi5ocmVmID0gXCJcIjtcbiAgICBhamF4TG9jYXRpb24gPSBhamF4TG9jYXRpb24uaHJlZjtcbiAgfVxuXG4gIHZhciBhamF4TG9jUGFydHMgPSBydXJsLmV4ZWMoYWpheExvY2F0aW9uLnRvTG93ZXJDYXNlKCkpIHx8IFtdXG4gICAgLCBwYXJ0cyA9IHJ1cmwuZXhlYyh1cmwudG9Mb3dlckNhc2UoKSApXG5cbiAgdmFyIHJlc3VsdCA9ICEhKFxuICAgIHBhcnRzICYmXG4gICAgKCAgcGFydHNbMV0gIT0gYWpheExvY1BhcnRzWzFdXG4gICAgfHwgcGFydHNbMl0gIT0gYWpheExvY1BhcnRzWzJdXG4gICAgfHwgKHBhcnRzWzNdIHx8IChwYXJ0c1sxXSA9PT0gXCJodHRwOlwiID8gODAgOiA0NDMpKSAhPSAoYWpheExvY1BhcnRzWzNdIHx8IChhamF4TG9jUGFydHNbMV0gPT09IFwiaHR0cDpcIiA/IDgwIDogNDQzKSlcbiAgICApXG4gIClcblxuICAvL2NvbnNvbGUuZGVidWcoJ2lzX2Nyb3NzRG9tYWluKCcrdXJsKycpIC0+ICcgKyByZXN1bHQpXG4gIHJldHVybiByZXN1bHRcbn1cblxuLy8gTUlUIExpY2Vuc2UgZnJvbSBodHRwOi8vcGhwanMub3JnL2Z1bmN0aW9ucy9iYXNlNjRfZW5jb2RlOjM1OFxuZnVuY3Rpb24gYjY0X2VuYyAoZGF0YSkge1xuICAgIC8vIEVuY29kZXMgc3RyaW5nIHVzaW5nIE1JTUUgYmFzZTY0IGFsZ29yaXRobVxuICAgIHZhciBiNjQgPSBcIkFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky89XCI7XG4gICAgdmFyIG8xLCBvMiwgbzMsIGgxLCBoMiwgaDMsIGg0LCBiaXRzLCBpID0gMCwgYWMgPSAwLCBlbmM9XCJcIiwgdG1wX2FyciA9IFtdO1xuXG4gICAgaWYgKCFkYXRhKSB7XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cblxuICAgIC8vIGFzc3VtZSB1dGY4IGRhdGFcbiAgICAvLyBkYXRhID0gdGhpcy51dGY4X2VuY29kZShkYXRhKycnKTtcblxuICAgIGRvIHsgLy8gcGFjayB0aHJlZSBvY3RldHMgaW50byBmb3VyIGhleGV0c1xuICAgICAgICBvMSA9IGRhdGEuY2hhckNvZGVBdChpKyspO1xuICAgICAgICBvMiA9IGRhdGEuY2hhckNvZGVBdChpKyspO1xuICAgICAgICBvMyA9IGRhdGEuY2hhckNvZGVBdChpKyspO1xuXG4gICAgICAgIGJpdHMgPSBvMTw8MTYgfCBvMjw8OCB8IG8zO1xuXG4gICAgICAgIGgxID0gYml0cz4+MTggJiAweDNmO1xuICAgICAgICBoMiA9IGJpdHM+PjEyICYgMHgzZjtcbiAgICAgICAgaDMgPSBiaXRzPj42ICYgMHgzZjtcbiAgICAgICAgaDQgPSBiaXRzICYgMHgzZjtcblxuICAgICAgICAvLyB1c2UgaGV4ZXRzIHRvIGluZGV4IGludG8gYjY0LCBhbmQgYXBwZW5kIHJlc3VsdCB0byBlbmNvZGVkIHN0cmluZ1xuICAgICAgICB0bXBfYXJyW2FjKytdID0gYjY0LmNoYXJBdChoMSkgKyBiNjQuY2hhckF0KGgyKSArIGI2NC5jaGFyQXQoaDMpICsgYjY0LmNoYXJBdChoNCk7XG4gICAgfSB3aGlsZSAoaSA8IGRhdGEubGVuZ3RoKTtcblxuICAgIGVuYyA9IHRtcF9hcnIuam9pbignJyk7XG5cbiAgICBzd2l0Y2ggKGRhdGEubGVuZ3RoICUgMykge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICBlbmMgPSBlbmMuc2xpY2UoMCwgLTIpICsgJz09JztcbiAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgIGVuYyA9IGVuYy5zbGljZSgwLCAtMSkgKyAnPSc7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIHJldHVybiBlbmM7XG59XG4iLCJ2YXIgcHJvY2Vzcz1yZXF1aXJlKFwiX19icm93c2VyaWZ5X3Byb2Nlc3NcIik7aWYgKCFwcm9jZXNzLkV2ZW50RW1pdHRlcikgcHJvY2Vzcy5FdmVudEVtaXR0ZXIgPSBmdW5jdGlvbiAoKSB7fTtcblxudmFyIEV2ZW50RW1pdHRlciA9IGV4cG9ydHMuRXZlbnRFbWl0dGVyID0gcHJvY2Vzcy5FdmVudEVtaXR0ZXI7XG52YXIgaXNBcnJheSA9IHR5cGVvZiBBcnJheS5pc0FycmF5ID09PSAnZnVuY3Rpb24nXG4gICAgPyBBcnJheS5pc0FycmF5XG4gICAgOiBmdW5jdGlvbiAoeHMpIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4cykgPT09ICdbb2JqZWN0IEFycmF5XSdcbiAgICB9XG47XG5mdW5jdGlvbiBpbmRleE9mICh4cywgeCkge1xuICAgIGlmICh4cy5pbmRleE9mKSByZXR1cm4geHMuaW5kZXhPZih4KTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHhzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICh4ID09PSB4c1tpXSkgcmV0dXJuIGk7XG4gICAgfVxuICAgIHJldHVybiAtMTtcbn1cblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhblxuLy8gMTAgbGlzdGVuZXJzIGFyZSBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoXG4vLyBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbi8vXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxudmFyIGRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIXRoaXMuX2V2ZW50cykgdGhpcy5fZXZlbnRzID0ge307XG4gIHRoaXMuX2V2ZW50cy5tYXhMaXN0ZW5lcnMgPSBuO1xufTtcblxuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc0FycmF5KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKVxuICAgIHtcbiAgICAgIGlmIChhcmd1bWVudHNbMV0gaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBhcmd1bWVudHNbMV07IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmNhdWdodCwgdW5zcGVjaWZpZWQgJ2Vycm9yJyBldmVudC5cIik7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpIHJldHVybiBmYWxzZTtcbiAgdmFyIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGlmICghaGFuZGxlcikgcmV0dXJuIGZhbHNlO1xuXG4gIGlmICh0eXBlb2YgaGFuZGxlciA9PSAnZnVuY3Rpb24nKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG5cbiAgfSBlbHNlIGlmIChpc0FycmF5KGhhbmRsZXIpKSB7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuXG4gICAgdmFyIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGxpc3RlbmVycy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG5cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn07XG5cbi8vIEV2ZW50RW1pdHRlciBpcyBkZWZpbmVkIGluIHNyYy9ub2RlX2V2ZW50cy5jY1xuLy8gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0KCkgaXMgYWxzbyBkZWZpbmVkIHRoZXJlLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICgnZnVuY3Rpb24nICE9PSB0eXBlb2YgbGlzdGVuZXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2FkZExpc3RlbmVyIG9ubHkgdGFrZXMgaW5zdGFuY2VzIG9mIEZ1bmN0aW9uJyk7XG4gIH1cblxuICBpZiAoIXRoaXMuX2V2ZW50cykgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PSBcIm5ld0xpc3RlbmVyc1wiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lcnNcIi5cbiAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSkge1xuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICB9IGVsc2UgaWYgKGlzQXJyYXkodGhpcy5fZXZlbnRzW3R5cGVdKSkge1xuXG4gICAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICAgIHZhciBtO1xuICAgICAgaWYgKHRoaXMuX2V2ZW50cy5tYXhMaXN0ZW5lcnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBtID0gdGhpcy5fZXZlbnRzLm1heExpc3RlbmVycztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG0gPSBkZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgICAgfVxuXG4gICAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICB9IGVsc2Uge1xuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5vbih0eXBlLCBmdW5jdGlvbiBnKCkge1xuICAgIHNlbGYucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG4gICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfSk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCdmdW5jdGlvbicgIT09IHR5cGVvZiBsaXN0ZW5lcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncmVtb3ZlTGlzdGVuZXIgb25seSB0YWtlcyBpbnN0YW5jZXMgb2YgRnVuY3Rpb24nKTtcbiAgfVxuXG4gIC8vIGRvZXMgbm90IHVzZSBsaXN0ZW5lcnMoKSwgc28gbm8gc2lkZSBlZmZlY3Qgb2YgY3JlYXRpbmcgX2V2ZW50c1t0eXBlXVxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKSByZXR1cm4gdGhpcztcblxuICB2YXIgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNBcnJheShsaXN0KSkge1xuICAgIHZhciBpID0gaW5kZXhPZihsaXN0LCBsaXN0ZW5lcik7XG4gICAgaWYgKGkgPCAwKSByZXR1cm4gdGhpcztcbiAgICBsaXN0LnNwbGljZShpLCAxKTtcbiAgICBpZiAobGlzdC5sZW5ndGggPT0gMClcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIH0gZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdID09PSBsaXN0ZW5lcikge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZG9lcyBub3QgdXNlIGxpc3RlbmVycygpLCBzbyBubyBzaWRlIGVmZmVjdCBvZiBjcmVhdGluZyBfZXZlbnRzW3R5cGVdXG4gIGlmICh0eXBlICYmIHRoaXMuX2V2ZW50cyAmJiB0aGlzLl9ldmVudHNbdHlwZV0pIHRoaXMuX2V2ZW50c1t0eXBlXSA9IG51bGw7XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIGlmICghdGhpcy5fZXZlbnRzKSB0aGlzLl9ldmVudHMgPSB7fTtcbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFtdO1xuICBpZiAoIWlzQXJyYXkodGhpcy5fZXZlbnRzW3R5cGVdKSkge1xuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICB9XG4gIHJldHVybiB0aGlzLl9ldmVudHNbdHlwZV07XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmICh0eXBlb2YgZW1pdHRlci5fZXZlbnRzW3R5cGVdID09PSAnZnVuY3Rpb24nKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcbiIsIlxuLyoqXG4gKiBPYmplY3QjdG9TdHJpbmcoKSByZWYgZm9yIHN0cmluZ2lmeSgpLlxuICovXG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbi8qKlxuICogQXJyYXkjaW5kZXhPZiBzaGltLlxuICovXG5cbnZhciBpbmRleE9mID0gdHlwZW9mIEFycmF5LnByb3RvdHlwZS5pbmRleE9mID09PSAnZnVuY3Rpb24nXG4gID8gZnVuY3Rpb24oYXJyLCBlbCkgeyByZXR1cm4gYXJyLmluZGV4T2YoZWwpOyB9XG4gIDogZnVuY3Rpb24oYXJyLCBlbCkge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGFycltpXSA9PT0gZWwpIHJldHVybiBpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIC0xO1xuICAgIH07XG5cbi8qKlxuICogQXJyYXkuaXNBcnJheSBzaGltLlxuICovXG5cbnZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbihhcnIpIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwoYXJyKSA9PSAnW29iamVjdCBBcnJheV0nO1xufTtcblxuLyoqXG4gKiBPYmplY3Qua2V5cyBzaGltLlxuICovXG5cbnZhciBvYmplY3RLZXlzID0gT2JqZWN0LmtleXMgfHwgZnVuY3Rpb24ob2JqKSB7XG4gIHZhciByZXQgPSBbXTtcbiAgZm9yICh2YXIga2V5IGluIG9iaikgcmV0LnB1c2goa2V5KTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbi8qKlxuICogQXJyYXkjZm9yRWFjaCBzaGltLlxuICovXG5cbnZhciBmb3JFYWNoID0gdHlwZW9mIEFycmF5LnByb3RvdHlwZS5mb3JFYWNoID09PSAnZnVuY3Rpb24nXG4gID8gZnVuY3Rpb24oYXJyLCBmbikgeyByZXR1cm4gYXJyLmZvckVhY2goZm4pOyB9XG4gIDogZnVuY3Rpb24oYXJyLCBmbikge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnIubGVuZ3RoOyBpKyspIGZuKGFycltpXSk7XG4gICAgfTtcblxuLyoqXG4gKiBBcnJheSNyZWR1Y2Ugc2hpbS5cbiAqL1xuXG52YXIgcmVkdWNlID0gZnVuY3Rpb24oYXJyLCBmbiwgaW5pdGlhbCkge1xuICBpZiAodHlwZW9mIGFyci5yZWR1Y2UgPT09ICdmdW5jdGlvbicpIHJldHVybiBhcnIucmVkdWNlKGZuLCBpbml0aWFsKTtcbiAgdmFyIHJlcyA9IGluaXRpYWw7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSByZXMgPSBmbihyZXMsIGFycltpXSk7XG4gIHJldHVybiByZXM7XG59O1xuXG4vKipcbiAqIENhY2hlIG5vbi1pbnRlZ2VyIHRlc3QgcmVnZXhwLlxuICovXG5cbnZhciBpc2ludCA9IC9eWzAtOV0rJC87XG5cbmZ1bmN0aW9uIHByb21vdGUocGFyZW50LCBrZXkpIHtcbiAgaWYgKHBhcmVudFtrZXldLmxlbmd0aCA9PSAwKSByZXR1cm4gcGFyZW50W2tleV0gPSB7fTtcbiAgdmFyIHQgPSB7fTtcbiAgZm9yICh2YXIgaSBpbiBwYXJlbnRba2V5XSkgdFtpXSA9IHBhcmVudFtrZXldW2ldO1xuICBwYXJlbnRba2V5XSA9IHQ7XG4gIHJldHVybiB0O1xufVxuXG5mdW5jdGlvbiBwYXJzZShwYXJ0cywgcGFyZW50LCBrZXksIHZhbCkge1xuICB2YXIgcGFydCA9IHBhcnRzLnNoaWZ0KCk7XG4gIC8vIGVuZFxuICBpZiAoIXBhcnQpIHtcbiAgICBpZiAoaXNBcnJheShwYXJlbnRba2V5XSkpIHtcbiAgICAgIHBhcmVudFtrZXldLnB1c2godmFsKTtcbiAgICB9IGVsc2UgaWYgKCdvYmplY3QnID09IHR5cGVvZiBwYXJlbnRba2V5XSkge1xuICAgICAgcGFyZW50W2tleV0gPSB2YWw7XG4gICAgfSBlbHNlIGlmICgndW5kZWZpbmVkJyA9PSB0eXBlb2YgcGFyZW50W2tleV0pIHtcbiAgICAgIHBhcmVudFtrZXldID0gdmFsO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYXJlbnRba2V5XSA9IFtwYXJlbnRba2V5XSwgdmFsXTtcbiAgICB9XG4gICAgLy8gYXJyYXlcbiAgfSBlbHNlIHtcbiAgICB2YXIgb2JqID0gcGFyZW50W2tleV0gPSBwYXJlbnRba2V5XSB8fCBbXTtcbiAgICBpZiAoJ10nID09IHBhcnQpIHtcbiAgICAgIGlmIChpc0FycmF5KG9iaikpIHtcbiAgICAgICAgaWYgKCcnICE9IHZhbCkgb2JqLnB1c2godmFsKTtcbiAgICAgIH0gZWxzZSBpZiAoJ29iamVjdCcgPT0gdHlwZW9mIG9iaikge1xuICAgICAgICBvYmpbb2JqZWN0S2V5cyhvYmopLmxlbmd0aF0gPSB2YWw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvYmogPSBwYXJlbnRba2V5XSA9IFtwYXJlbnRba2V5XSwgdmFsXTtcbiAgICAgIH1cbiAgICAgIC8vIHByb3BcbiAgICB9IGVsc2UgaWYgKH5pbmRleE9mKHBhcnQsICddJykpIHtcbiAgICAgIHBhcnQgPSBwYXJ0LnN1YnN0cigwLCBwYXJ0Lmxlbmd0aCAtIDEpO1xuICAgICAgaWYgKCFpc2ludC50ZXN0KHBhcnQpICYmIGlzQXJyYXkob2JqKSkgb2JqID0gcHJvbW90ZShwYXJlbnQsIGtleSk7XG4gICAgICBwYXJzZShwYXJ0cywgb2JqLCBwYXJ0LCB2YWwpO1xuICAgICAgLy8ga2V5XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICghaXNpbnQudGVzdChwYXJ0KSAmJiBpc0FycmF5KG9iaikpIG9iaiA9IHByb21vdGUocGFyZW50LCBrZXkpO1xuICAgICAgcGFyc2UocGFydHMsIG9iaiwgcGFydCwgdmFsKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBNZXJnZSBwYXJlbnQga2V5L3ZhbCBwYWlyLlxuICovXG5cbmZ1bmN0aW9uIG1lcmdlKHBhcmVudCwga2V5LCB2YWwpe1xuICBpZiAofmluZGV4T2Yoa2V5LCAnXScpKSB7XG4gICAgdmFyIHBhcnRzID0ga2V5LnNwbGl0KCdbJylcbiAgICAgICwgbGVuID0gcGFydHMubGVuZ3RoXG4gICAgICAsIGxhc3QgPSBsZW4gLSAxO1xuICAgIHBhcnNlKHBhcnRzLCBwYXJlbnQsICdiYXNlJywgdmFsKTtcbiAgICAvLyBvcHRpbWl6ZVxuICB9IGVsc2Uge1xuICAgIGlmICghaXNpbnQudGVzdChrZXkpICYmIGlzQXJyYXkocGFyZW50LmJhc2UpKSB7XG4gICAgICB2YXIgdCA9IHt9O1xuICAgICAgZm9yICh2YXIgayBpbiBwYXJlbnQuYmFzZSkgdFtrXSA9IHBhcmVudC5iYXNlW2tdO1xuICAgICAgcGFyZW50LmJhc2UgPSB0O1xuICAgIH1cbiAgICBzZXQocGFyZW50LmJhc2UsIGtleSwgdmFsKTtcbiAgfVxuXG4gIHJldHVybiBwYXJlbnQ7XG59XG5cbi8qKlxuICogUGFyc2UgdGhlIGdpdmVuIG9iai5cbiAqL1xuXG5mdW5jdGlvbiBwYXJzZU9iamVjdChvYmope1xuICB2YXIgcmV0ID0geyBiYXNlOiB7fSB9O1xuICBmb3JFYWNoKG9iamVjdEtleXMob2JqKSwgZnVuY3Rpb24obmFtZSl7XG4gICAgbWVyZ2UocmV0LCBuYW1lLCBvYmpbbmFtZV0pO1xuICB9KTtcbiAgcmV0dXJuIHJldC5iYXNlO1xufVxuXG4vKipcbiAqIFBhcnNlIHRoZSBnaXZlbiBzdHIuXG4gKi9cblxuZnVuY3Rpb24gcGFyc2VTdHJpbmcoc3RyKXtcbiAgcmV0dXJuIHJlZHVjZShTdHJpbmcoc3RyKS5zcGxpdCgnJicpLCBmdW5jdGlvbihyZXQsIHBhaXIpe1xuICAgIHZhciBlcWwgPSBpbmRleE9mKHBhaXIsICc9JylcbiAgICAgICwgYnJhY2UgPSBsYXN0QnJhY2VJbktleShwYWlyKVxuICAgICAgLCBrZXkgPSBwYWlyLnN1YnN0cigwLCBicmFjZSB8fCBlcWwpXG4gICAgICAsIHZhbCA9IHBhaXIuc3Vic3RyKGJyYWNlIHx8IGVxbCwgcGFpci5sZW5ndGgpXG4gICAgICAsIHZhbCA9IHZhbC5zdWJzdHIoaW5kZXhPZih2YWwsICc9JykgKyAxLCB2YWwubGVuZ3RoKTtcblxuICAgIC8vID9mb29cbiAgICBpZiAoJycgPT0ga2V5KSBrZXkgPSBwYWlyLCB2YWwgPSAnJztcbiAgICBpZiAoJycgPT0ga2V5KSByZXR1cm4gcmV0O1xuXG4gICAgcmV0dXJuIG1lcmdlKHJldCwgZGVjb2RlKGtleSksIGRlY29kZSh2YWwpKTtcbiAgfSwgeyBiYXNlOiB7fSB9KS5iYXNlO1xufVxuXG4vKipcbiAqIFBhcnNlIHRoZSBnaXZlbiBxdWVyeSBgc3RyYCBvciBgb2JqYCwgcmV0dXJuaW5nIGFuIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyIHwge09iamVjdH0gb2JqXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmV4cG9ydHMucGFyc2UgPSBmdW5jdGlvbihzdHIpe1xuICBpZiAobnVsbCA9PSBzdHIgfHwgJycgPT0gc3RyKSByZXR1cm4ge307XG4gIHJldHVybiAnb2JqZWN0JyA9PSB0eXBlb2Ygc3RyXG4gICAgPyBwYXJzZU9iamVjdChzdHIpXG4gICAgOiBwYXJzZVN0cmluZyhzdHIpO1xufTtcblxuLyoqXG4gKiBUdXJuIHRoZSBnaXZlbiBgb2JqYCBpbnRvIGEgcXVlcnkgc3RyaW5nXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG52YXIgc3RyaW5naWZ5ID0gZXhwb3J0cy5zdHJpbmdpZnkgPSBmdW5jdGlvbihvYmosIHByZWZpeCkge1xuICBpZiAoaXNBcnJheShvYmopKSB7XG4gICAgcmV0dXJuIHN0cmluZ2lmeUFycmF5KG9iaiwgcHJlZml4KTtcbiAgfSBlbHNlIGlmICgnW29iamVjdCBPYmplY3RdJyA9PSB0b1N0cmluZy5jYWxsKG9iaikpIHtcbiAgICByZXR1cm4gc3RyaW5naWZ5T2JqZWN0KG9iaiwgcHJlZml4KTtcbiAgfSBlbHNlIGlmICgnc3RyaW5nJyA9PSB0eXBlb2Ygb2JqKSB7XG4gICAgcmV0dXJuIHN0cmluZ2lmeVN0cmluZyhvYmosIHByZWZpeCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHByZWZpeCArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudChTdHJpbmcob2JqKSk7XG4gIH1cbn07XG5cbi8qKlxuICogU3RyaW5naWZ5IHRoZSBnaXZlbiBgc3RyYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyXG4gKiBAcGFyYW0ge1N0cmluZ30gcHJlZml4XG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBzdHJpbmdpZnlTdHJpbmcoc3RyLCBwcmVmaXgpIHtcbiAgaWYgKCFwcmVmaXgpIHRocm93IG5ldyBUeXBlRXJyb3IoJ3N0cmluZ2lmeSBleHBlY3RzIGFuIG9iamVjdCcpO1xuICByZXR1cm4gcHJlZml4ICsgJz0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHN0cik7XG59XG5cbi8qKlxuICogU3RyaW5naWZ5IHRoZSBnaXZlbiBgYXJyYC5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBhcnJcbiAqIEBwYXJhbSB7U3RyaW5nfSBwcmVmaXhcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIHN0cmluZ2lmeUFycmF5KGFyciwgcHJlZml4KSB7XG4gIHZhciByZXQgPSBbXTtcbiAgaWYgKCFwcmVmaXgpIHRocm93IG5ldyBUeXBlRXJyb3IoJ3N0cmluZ2lmeSBleHBlY3RzIGFuIG9iamVjdCcpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykge1xuICAgIHJldC5wdXNoKHN0cmluZ2lmeShhcnJbaV0sIHByZWZpeCArICdbJyArIGkgKyAnXScpKTtcbiAgfVxuICByZXR1cm4gcmV0LmpvaW4oJyYnKTtcbn1cblxuLyoqXG4gKiBTdHJpbmdpZnkgdGhlIGdpdmVuIGBvYmpgLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwcmVmaXhcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIHN0cmluZ2lmeU9iamVjdChvYmosIHByZWZpeCkge1xuICB2YXIgcmV0ID0gW11cbiAgICAsIGtleXMgPSBvYmplY3RLZXlzKG9iailcbiAgICAsIGtleTtcblxuICBmb3IgKHZhciBpID0gMCwgbGVuID0ga2V5cy5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgIGtleSA9IGtleXNbaV07XG4gICAgaWYgKG51bGwgPT0gb2JqW2tleV0pIHtcbiAgICAgIHJldC5wdXNoKGVuY29kZVVSSUNvbXBvbmVudChrZXkpICsgJz0nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0LnB1c2goc3RyaW5naWZ5KG9ialtrZXldLCBwcmVmaXhcbiAgICAgICAgPyBwcmVmaXggKyAnWycgKyBlbmNvZGVVUklDb21wb25lbnQoa2V5KSArICddJ1xuICAgICAgICA6IGVuY29kZVVSSUNvbXBvbmVudChrZXkpKSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJldC5qb2luKCcmJyk7XG59XG5cbi8qKlxuICogU2V0IGBvYmpgJ3MgYGtleWAgdG8gYHZhbGAgcmVzcGVjdGluZ1xuICogdGhlIHdlaXJkIGFuZCB3b25kZXJmdWwgc3ludGF4IG9mIGEgcXMsXG4gKiB3aGVyZSBcImZvbz1iYXImZm9vPWJhelwiIGJlY29tZXMgYW4gYXJyYXkuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHBhcmFtIHtTdHJpbmd9IGtleVxuICogQHBhcmFtIHtTdHJpbmd9IHZhbFxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gc2V0KG9iaiwga2V5LCB2YWwpIHtcbiAgdmFyIHYgPSBvYmpba2V5XTtcbiAgaWYgKHVuZGVmaW5lZCA9PT0gdikge1xuICAgIG9ialtrZXldID0gdmFsO1xuICB9IGVsc2UgaWYgKGlzQXJyYXkodikpIHtcbiAgICB2LnB1c2godmFsKTtcbiAgfSBlbHNlIHtcbiAgICBvYmpba2V5XSA9IFt2LCB2YWxdO1xuICB9XG59XG5cbi8qKlxuICogTG9jYXRlIGxhc3QgYnJhY2UgaW4gYHN0cmAgd2l0aGluIHRoZSBrZXkuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHN0clxuICogQHJldHVybiB7TnVtYmVyfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gbGFzdEJyYWNlSW5LZXkoc3RyKSB7XG4gIHZhciBsZW4gPSBzdHIubGVuZ3RoXG4gICAgLCBicmFjZVxuICAgICwgYztcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgIGMgPSBzdHJbaV07XG4gICAgaWYgKCddJyA9PSBjKSBicmFjZSA9IGZhbHNlO1xuICAgIGlmICgnWycgPT0gYykgYnJhY2UgPSB0cnVlO1xuICAgIGlmICgnPScgPT0gYyAmJiAhYnJhY2UpIHJldHVybiBpO1xuICB9XG59XG5cbi8qKlxuICogRGVjb2RlIGBzdHJgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEByZXR1cm4ge1N0cmluZ31cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIGRlY29kZShzdHIpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHN0ci5yZXBsYWNlKC9cXCsvZywgJyAnKSk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIHJldHVybiBzdHI7XG4gIH1cbn1cbiIsInZhciBldmVudHMgPSByZXF1aXJlKCdldmVudHMnKTtcbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpO1xuXG5mdW5jdGlvbiBTdHJlYW0oKSB7XG4gIGV2ZW50cy5FdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcbn1cbnV0aWwuaW5oZXJpdHMoU3RyZWFtLCBldmVudHMuRXZlbnRFbWl0dGVyKTtcbm1vZHVsZS5leHBvcnRzID0gU3RyZWFtO1xuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC40LnhcblN0cmVhbS5TdHJlYW0gPSBTdHJlYW07XG5cblN0cmVhbS5wcm90b3R5cGUucGlwZSA9IGZ1bmN0aW9uKGRlc3QsIG9wdGlvbnMpIHtcbiAgdmFyIHNvdXJjZSA9IHRoaXM7XG5cbiAgZnVuY3Rpb24gb25kYXRhKGNodW5rKSB7XG4gICAgaWYgKGRlc3Qud3JpdGFibGUpIHtcbiAgICAgIGlmIChmYWxzZSA9PT0gZGVzdC53cml0ZShjaHVuaykgJiYgc291cmNlLnBhdXNlKSB7XG4gICAgICAgIHNvdXJjZS5wYXVzZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHNvdXJjZS5vbignZGF0YScsIG9uZGF0YSk7XG5cbiAgZnVuY3Rpb24gb25kcmFpbigpIHtcbiAgICBpZiAoc291cmNlLnJlYWRhYmxlICYmIHNvdXJjZS5yZXN1bWUpIHtcbiAgICAgIHNvdXJjZS5yZXN1bWUoKTtcbiAgICB9XG4gIH1cblxuICBkZXN0Lm9uKCdkcmFpbicsIG9uZHJhaW4pO1xuXG4gIC8vIElmIHRoZSAnZW5kJyBvcHRpb24gaXMgbm90IHN1cHBsaWVkLCBkZXN0LmVuZCgpIHdpbGwgYmUgY2FsbGVkIHdoZW5cbiAgLy8gc291cmNlIGdldHMgdGhlICdlbmQnIG9yICdjbG9zZScgZXZlbnRzLiAgT25seSBkZXN0LmVuZCgpIG9uY2UsIGFuZFxuICAvLyBvbmx5IHdoZW4gYWxsIHNvdXJjZXMgaGF2ZSBlbmRlZC5cbiAgaWYgKCFkZXN0Ll9pc1N0ZGlvICYmICghb3B0aW9ucyB8fCBvcHRpb25zLmVuZCAhPT0gZmFsc2UpKSB7XG4gICAgZGVzdC5fcGlwZUNvdW50ID0gZGVzdC5fcGlwZUNvdW50IHx8IDA7XG4gICAgZGVzdC5fcGlwZUNvdW50Kys7XG5cbiAgICBzb3VyY2Uub24oJ2VuZCcsIG9uZW5kKTtcbiAgICBzb3VyY2Uub24oJ2Nsb3NlJywgb25jbG9zZSk7XG4gIH1cblxuICB2YXIgZGlkT25FbmQgPSBmYWxzZTtcbiAgZnVuY3Rpb24gb25lbmQoKSB7XG4gICAgaWYgKGRpZE9uRW5kKSByZXR1cm47XG4gICAgZGlkT25FbmQgPSB0cnVlO1xuXG4gICAgZGVzdC5fcGlwZUNvdW50LS07XG5cbiAgICAvLyByZW1vdmUgdGhlIGxpc3RlbmVyc1xuICAgIGNsZWFudXAoKTtcblxuICAgIGlmIChkZXN0Ll9waXBlQ291bnQgPiAwKSB7XG4gICAgICAvLyB3YWl0aW5nIGZvciBvdGhlciBpbmNvbWluZyBzdHJlYW1zIHRvIGVuZC5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBkZXN0LmVuZCgpO1xuICB9XG5cblxuICBmdW5jdGlvbiBvbmNsb3NlKCkge1xuICAgIGlmIChkaWRPbkVuZCkgcmV0dXJuO1xuICAgIGRpZE9uRW5kID0gdHJ1ZTtcblxuICAgIGRlc3QuX3BpcGVDb3VudC0tO1xuXG4gICAgLy8gcmVtb3ZlIHRoZSBsaXN0ZW5lcnNcbiAgICBjbGVhbnVwKCk7XG5cbiAgICBpZiAoZGVzdC5fcGlwZUNvdW50ID4gMCkge1xuICAgICAgLy8gd2FpdGluZyBmb3Igb3RoZXIgaW5jb21pbmcgc3RyZWFtcyB0byBlbmQuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZGVzdC5kZXN0cm95KCk7XG4gIH1cblxuICAvLyBkb24ndCBsZWF2ZSBkYW5nbGluZyBwaXBlcyB3aGVuIHRoZXJlIGFyZSBlcnJvcnMuXG4gIGZ1bmN0aW9uIG9uZXJyb3IoZXIpIHtcbiAgICBjbGVhbnVwKCk7XG4gICAgaWYgKHRoaXMubGlzdGVuZXJzKCdlcnJvcicpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCBzdHJlYW0gZXJyb3IgaW4gcGlwZS5cbiAgICB9XG4gIH1cblxuICBzb3VyY2Uub24oJ2Vycm9yJywgb25lcnJvcik7XG4gIGRlc3Qub24oJ2Vycm9yJywgb25lcnJvcik7XG5cbiAgLy8gcmVtb3ZlIGFsbCB0aGUgZXZlbnQgbGlzdGVuZXJzIHRoYXQgd2VyZSBhZGRlZC5cbiAgZnVuY3Rpb24gY2xlYW51cCgpIHtcbiAgICBzb3VyY2UucmVtb3ZlTGlzdGVuZXIoJ2RhdGEnLCBvbmRhdGEpO1xuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2RyYWluJywgb25kcmFpbik7XG5cbiAgICBzb3VyY2UucmVtb3ZlTGlzdGVuZXIoJ2VuZCcsIG9uZW5kKTtcbiAgICBzb3VyY2UucmVtb3ZlTGlzdGVuZXIoJ2Nsb3NlJywgb25jbG9zZSk7XG5cbiAgICBzb3VyY2UucmVtb3ZlTGlzdGVuZXIoJ2Vycm9yJywgb25lcnJvcik7XG4gICAgZGVzdC5yZW1vdmVMaXN0ZW5lcignZXJyb3InLCBvbmVycm9yKTtcblxuICAgIHNvdXJjZS5yZW1vdmVMaXN0ZW5lcignZW5kJywgY2xlYW51cCk7XG4gICAgc291cmNlLnJlbW92ZUxpc3RlbmVyKCdjbG9zZScsIGNsZWFudXApO1xuXG4gICAgZGVzdC5yZW1vdmVMaXN0ZW5lcignZW5kJywgY2xlYW51cCk7XG4gICAgZGVzdC5yZW1vdmVMaXN0ZW5lcignY2xvc2UnLCBjbGVhbnVwKTtcbiAgfVxuXG4gIHNvdXJjZS5vbignZW5kJywgY2xlYW51cCk7XG4gIHNvdXJjZS5vbignY2xvc2UnLCBjbGVhbnVwKTtcblxuICBkZXN0Lm9uKCdlbmQnLCBjbGVhbnVwKTtcbiAgZGVzdC5vbignY2xvc2UnLCBjbGVhbnVwKTtcblxuICBkZXN0LmVtaXQoJ3BpcGUnLCBzb3VyY2UpO1xuXG4gIC8vIEFsbG93IGZvciB1bml4LWxpa2UgdXNhZ2U6IEEucGlwZShCKS5waXBlKEMpXG4gIHJldHVybiBkZXN0O1xufTtcbiIsInZhciBwdW55Y29kZSA9IHsgZW5jb2RlIDogZnVuY3Rpb24gKHMpIHsgcmV0dXJuIHMgfSB9O1xuXG5leHBvcnRzLnBhcnNlID0gdXJsUGFyc2U7XG5leHBvcnRzLnJlc29sdmUgPSB1cmxSZXNvbHZlO1xuZXhwb3J0cy5yZXNvbHZlT2JqZWN0ID0gdXJsUmVzb2x2ZU9iamVjdDtcbmV4cG9ydHMuZm9ybWF0ID0gdXJsRm9ybWF0O1xuXG5mdW5jdGlvbiBhcnJheUluZGV4T2YoYXJyYXksIHN1YmplY3QpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgaiA9IGFycmF5Lmxlbmd0aDsgaSA8IGo7IGkrKykge1xuICAgICAgICBpZihhcnJheVtpXSA9PSBzdWJqZWN0KSByZXR1cm4gaTtcbiAgICB9XG4gICAgcmV0dXJuIC0xO1xufVxuXG52YXIgb2JqZWN0S2V5cyA9IE9iamVjdC5rZXlzIHx8IGZ1bmN0aW9uIG9iamVjdEtleXMob2JqZWN0KSB7XG4gICAgaWYgKG9iamVjdCAhPT0gT2JqZWN0KG9iamVjdCkpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgb2JqZWN0Jyk7XG4gICAgdmFyIGtleXMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqZWN0KSBpZiAob2JqZWN0Lmhhc093blByb3BlcnR5KGtleSkpIGtleXNba2V5cy5sZW5ndGhdID0ga2V5O1xuICAgIHJldHVybiBrZXlzO1xufVxuXG4vLyBSZWZlcmVuY2U6IFJGQyAzOTg2LCBSRkMgMTgwOCwgUkZDIDIzOTZcblxuLy8gZGVmaW5lIHRoZXNlIGhlcmUgc28gYXQgbGVhc3QgdGhleSBvbmx5IGhhdmUgdG8gYmVcbi8vIGNvbXBpbGVkIG9uY2Ugb24gdGhlIGZpcnN0IG1vZHVsZSBsb2FkLlxudmFyIHByb3RvY29sUGF0dGVybiA9IC9eKFthLXowLTkuKy1dKzopL2ksXG4gICAgcG9ydFBhdHRlcm4gPSAvOlswLTldKyQvLFxuICAgIC8vIFJGQyAyMzk2OiBjaGFyYWN0ZXJzIHJlc2VydmVkIGZvciBkZWxpbWl0aW5nIFVSTHMuXG4gICAgZGVsaW1zID0gWyc8JywgJz4nLCAnXCInLCAnYCcsICcgJywgJ1xccicsICdcXG4nLCAnXFx0J10sXG4gICAgLy8gUkZDIDIzOTY6IGNoYXJhY3RlcnMgbm90IGFsbG93ZWQgZm9yIHZhcmlvdXMgcmVhc29ucy5cbiAgICB1bndpc2UgPSBbJ3snLCAnfScsICd8JywgJ1xcXFwnLCAnXicsICd+JywgJ1snLCAnXScsICdgJ10uY29uY2F0KGRlbGltcyksXG4gICAgLy8gQWxsb3dlZCBieSBSRkNzLCBidXQgY2F1c2Ugb2YgWFNTIGF0dGFja3MuICBBbHdheXMgZXNjYXBlIHRoZXNlLlxuICAgIGF1dG9Fc2NhcGUgPSBbJ1xcJyddLFxuICAgIC8vIENoYXJhY3RlcnMgdGhhdCBhcmUgbmV2ZXIgZXZlciBhbGxvd2VkIGluIGEgaG9zdG5hbWUuXG4gICAgLy8gTm90ZSB0aGF0IGFueSBpbnZhbGlkIGNoYXJzIGFyZSBhbHNvIGhhbmRsZWQsIGJ1dCB0aGVzZVxuICAgIC8vIGFyZSB0aGUgb25lcyB0aGF0IGFyZSAqZXhwZWN0ZWQqIHRvIGJlIHNlZW4sIHNvIHdlIGZhc3QtcGF0aFxuICAgIC8vIHRoZW0uXG4gICAgbm9uSG9zdENoYXJzID0gWyclJywgJy8nLCAnPycsICc7JywgJyMnXVxuICAgICAgLmNvbmNhdCh1bndpc2UpLmNvbmNhdChhdXRvRXNjYXBlKSxcbiAgICBub25BdXRoQ2hhcnMgPSBbJy8nLCAnQCcsICc/JywgJyMnXS5jb25jYXQoZGVsaW1zKSxcbiAgICBob3N0bmFtZU1heExlbiA9IDI1NSxcbiAgICBob3N0bmFtZVBhcnRQYXR0ZXJuID0gL15bYS16QS1aMC05XVthLXowLTlBLVpfLV17MCw2Mn0kLyxcbiAgICBob3N0bmFtZVBhcnRTdGFydCA9IC9eKFthLXpBLVowLTldW2EtejAtOUEtWl8tXXswLDYyfSkoLiopJC8sXG4gICAgLy8gcHJvdG9jb2xzIHRoYXQgY2FuIGFsbG93IFwidW5zYWZlXCIgYW5kIFwidW53aXNlXCIgY2hhcnMuXG4gICAgdW5zYWZlUHJvdG9jb2wgPSB7XG4gICAgICAnamF2YXNjcmlwdCc6IHRydWUsXG4gICAgICAnamF2YXNjcmlwdDonOiB0cnVlXG4gICAgfSxcbiAgICAvLyBwcm90b2NvbHMgdGhhdCBuZXZlciBoYXZlIGEgaG9zdG5hbWUuXG4gICAgaG9zdGxlc3NQcm90b2NvbCA9IHtcbiAgICAgICdqYXZhc2NyaXB0JzogdHJ1ZSxcbiAgICAgICdqYXZhc2NyaXB0Oic6IHRydWVcbiAgICB9LFxuICAgIC8vIHByb3RvY29scyB0aGF0IGFsd2F5cyBoYXZlIGEgcGF0aCBjb21wb25lbnQuXG4gICAgcGF0aGVkUHJvdG9jb2wgPSB7XG4gICAgICAnaHR0cCc6IHRydWUsXG4gICAgICAnaHR0cHMnOiB0cnVlLFxuICAgICAgJ2Z0cCc6IHRydWUsXG4gICAgICAnZ29waGVyJzogdHJ1ZSxcbiAgICAgICdmaWxlJzogdHJ1ZSxcbiAgICAgICdodHRwOic6IHRydWUsXG4gICAgICAnZnRwOic6IHRydWUsXG4gICAgICAnZ29waGVyOic6IHRydWUsXG4gICAgICAnZmlsZTonOiB0cnVlXG4gICAgfSxcbiAgICAvLyBwcm90b2NvbHMgdGhhdCBhbHdheXMgY29udGFpbiBhIC8vIGJpdC5cbiAgICBzbGFzaGVkUHJvdG9jb2wgPSB7XG4gICAgICAnaHR0cCc6IHRydWUsXG4gICAgICAnaHR0cHMnOiB0cnVlLFxuICAgICAgJ2Z0cCc6IHRydWUsXG4gICAgICAnZ29waGVyJzogdHJ1ZSxcbiAgICAgICdmaWxlJzogdHJ1ZSxcbiAgICAgICdodHRwOic6IHRydWUsXG4gICAgICAnaHR0cHM6JzogdHJ1ZSxcbiAgICAgICdmdHA6JzogdHJ1ZSxcbiAgICAgICdnb3BoZXI6JzogdHJ1ZSxcbiAgICAgICdmaWxlOic6IHRydWVcbiAgICB9LFxuICAgIHF1ZXJ5c3RyaW5nID0gcmVxdWlyZSgncXVlcnlzdHJpbmcnKTtcblxuZnVuY3Rpb24gdXJsUGFyc2UodXJsLCBwYXJzZVF1ZXJ5U3RyaW5nLCBzbGFzaGVzRGVub3RlSG9zdCkge1xuICBpZiAodXJsICYmIHR5cGVvZih1cmwpID09PSAnb2JqZWN0JyAmJiB1cmwuaHJlZikgcmV0dXJuIHVybDtcblxuICBpZiAodHlwZW9mIHVybCAhPT0gJ3N0cmluZycpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiUGFyYW1ldGVyICd1cmwnIG11c3QgYmUgYSBzdHJpbmcsIG5vdCBcIiArIHR5cGVvZiB1cmwpO1xuICB9XG5cbiAgdmFyIG91dCA9IHt9LFxuICAgICAgcmVzdCA9IHVybDtcblxuICAvLyBjdXQgb2ZmIGFueSBkZWxpbWl0ZXJzLlxuICAvLyBUaGlzIGlzIHRvIHN1cHBvcnQgcGFyc2Ugc3R1ZmYgbGlrZSBcIjxodHRwOi8vZm9vLmNvbT5cIlxuICBmb3IgKHZhciBpID0gMCwgbCA9IHJlc3QubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaWYgKGFycmF5SW5kZXhPZihkZWxpbXMsIHJlc3QuY2hhckF0KGkpKSA9PT0gLTEpIGJyZWFrO1xuICB9XG4gIGlmIChpICE9PSAwKSByZXN0ID0gcmVzdC5zdWJzdHIoaSk7XG5cblxuICB2YXIgcHJvdG8gPSBwcm90b2NvbFBhdHRlcm4uZXhlYyhyZXN0KTtcbiAgaWYgKHByb3RvKSB7XG4gICAgcHJvdG8gPSBwcm90b1swXTtcbiAgICB2YXIgbG93ZXJQcm90byA9IHByb3RvLnRvTG93ZXJDYXNlKCk7XG4gICAgb3V0LnByb3RvY29sID0gbG93ZXJQcm90bztcbiAgICByZXN0ID0gcmVzdC5zdWJzdHIocHJvdG8ubGVuZ3RoKTtcbiAgfVxuXG4gIC8vIGZpZ3VyZSBvdXQgaWYgaXQncyBnb3QgYSBob3N0XG4gIC8vIHVzZXJAc2VydmVyIGlzICphbHdheXMqIGludGVycHJldGVkIGFzIGEgaG9zdG5hbWUsIGFuZCB1cmxcbiAgLy8gcmVzb2x1dGlvbiB3aWxsIHRyZWF0IC8vZm9vL2JhciBhcyBob3N0PWZvbyxwYXRoPWJhciBiZWNhdXNlIHRoYXQnc1xuICAvLyBob3cgdGhlIGJyb3dzZXIgcmVzb2x2ZXMgcmVsYXRpdmUgVVJMcy5cbiAgaWYgKHNsYXNoZXNEZW5vdGVIb3N0IHx8IHByb3RvIHx8IHJlc3QubWF0Y2goL15cXC9cXC9bXkBcXC9dK0BbXkBcXC9dKy8pKSB7XG4gICAgdmFyIHNsYXNoZXMgPSByZXN0LnN1YnN0cigwLCAyKSA9PT0gJy8vJztcbiAgICBpZiAoc2xhc2hlcyAmJiAhKHByb3RvICYmIGhvc3RsZXNzUHJvdG9jb2xbcHJvdG9dKSkge1xuICAgICAgcmVzdCA9IHJlc3Quc3Vic3RyKDIpO1xuICAgICAgb3V0LnNsYXNoZXMgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIGlmICghaG9zdGxlc3NQcm90b2NvbFtwcm90b10gJiZcbiAgICAgIChzbGFzaGVzIHx8IChwcm90byAmJiAhc2xhc2hlZFByb3RvY29sW3Byb3RvXSkpKSB7XG4gICAgLy8gdGhlcmUncyBhIGhvc3RuYW1lLlxuICAgIC8vIHRoZSBmaXJzdCBpbnN0YW5jZSBvZiAvLCA/LCA7LCBvciAjIGVuZHMgdGhlIGhvc3QuXG4gICAgLy8gZG9uJ3QgZW5mb3JjZSBmdWxsIFJGQyBjb3JyZWN0bmVzcywganVzdCBiZSB1bnN0dXBpZCBhYm91dCBpdC5cblxuICAgIC8vIElmIHRoZXJlIGlzIGFuIEAgaW4gdGhlIGhvc3RuYW1lLCB0aGVuIG5vbi1ob3N0IGNoYXJzICphcmUqIGFsbG93ZWRcbiAgICAvLyB0byB0aGUgbGVmdCBvZiB0aGUgZmlyc3QgQCBzaWduLCB1bmxlc3Mgc29tZSBub24tYXV0aCBjaGFyYWN0ZXJcbiAgICAvLyBjb21lcyAqYmVmb3JlKiB0aGUgQC1zaWduLlxuICAgIC8vIFVSTHMgYXJlIG9ibm94aW91cy5cbiAgICB2YXIgYXRTaWduID0gYXJyYXlJbmRleE9mKHJlc3QsICdAJyk7XG4gICAgaWYgKGF0U2lnbiAhPT0gLTEpIHtcbiAgICAgIC8vIHRoZXJlICptYXkgYmUqIGFuIGF1dGhcbiAgICAgIHZhciBoYXNBdXRoID0gdHJ1ZTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gbm9uQXV0aENoYXJzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB2YXIgaW5kZXggPSBhcnJheUluZGV4T2YocmVzdCwgbm9uQXV0aENoYXJzW2ldKTtcbiAgICAgICAgaWYgKGluZGV4ICE9PSAtMSAmJiBpbmRleCA8IGF0U2lnbikge1xuICAgICAgICAgIC8vIG5vdCBhIHZhbGlkIGF1dGguICBTb21ldGhpbmcgbGlrZSBodHRwOi8vZm9vLmNvbS9iYXJAYmF6L1xuICAgICAgICAgIGhhc0F1dGggPSBmYWxzZTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGhhc0F1dGgpIHtcbiAgICAgICAgLy8gcGx1Y2sgb2ZmIHRoZSBhdXRoIHBvcnRpb24uXG4gICAgICAgIG91dC5hdXRoID0gcmVzdC5zdWJzdHIoMCwgYXRTaWduKTtcbiAgICAgICAgcmVzdCA9IHJlc3Quc3Vic3RyKGF0U2lnbiArIDEpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBmaXJzdE5vbkhvc3QgPSAtMTtcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IG5vbkhvc3RDaGFycy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIHZhciBpbmRleCA9IGFycmF5SW5kZXhPZihyZXN0LCBub25Ib3N0Q2hhcnNbaV0pO1xuICAgICAgaWYgKGluZGV4ICE9PSAtMSAmJlxuICAgICAgICAgIChmaXJzdE5vbkhvc3QgPCAwIHx8IGluZGV4IDwgZmlyc3ROb25Ib3N0KSkgZmlyc3ROb25Ib3N0ID0gaW5kZXg7XG4gICAgfVxuXG4gICAgaWYgKGZpcnN0Tm9uSG9zdCAhPT0gLTEpIHtcbiAgICAgIG91dC5ob3N0ID0gcmVzdC5zdWJzdHIoMCwgZmlyc3ROb25Ib3N0KTtcbiAgICAgIHJlc3QgPSByZXN0LnN1YnN0cihmaXJzdE5vbkhvc3QpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQuaG9zdCA9IHJlc3Q7XG4gICAgICByZXN0ID0gJyc7XG4gICAgfVxuXG4gICAgLy8gcHVsbCBvdXQgcG9ydC5cbiAgICB2YXIgcCA9IHBhcnNlSG9zdChvdXQuaG9zdCk7XG4gICAgdmFyIGtleXMgPSBvYmplY3RLZXlzKHApO1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0ga2V5cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgICAgb3V0W2tleV0gPSBwW2tleV07XG4gICAgfVxuXG4gICAgLy8gd2UndmUgaW5kaWNhdGVkIHRoYXQgdGhlcmUgaXMgYSBob3N0bmFtZSxcbiAgICAvLyBzbyBldmVuIGlmIGl0J3MgZW1wdHksIGl0IGhhcyB0byBiZSBwcmVzZW50LlxuICAgIG91dC5ob3N0bmFtZSA9IG91dC5ob3N0bmFtZSB8fCAnJztcblxuICAgIC8vIHZhbGlkYXRlIGEgbGl0dGxlLlxuICAgIGlmIChvdXQuaG9zdG5hbWUubGVuZ3RoID4gaG9zdG5hbWVNYXhMZW4pIHtcbiAgICAgIG91dC5ob3N0bmFtZSA9ICcnO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgaG9zdHBhcnRzID0gb3V0Lmhvc3RuYW1lLnNwbGl0KC9cXC4vKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gaG9zdHBhcnRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB2YXIgcGFydCA9IGhvc3RwYXJ0c1tpXTtcbiAgICAgICAgaWYgKCFwYXJ0KSBjb250aW51ZTtcbiAgICAgICAgaWYgKCFwYXJ0Lm1hdGNoKGhvc3RuYW1lUGFydFBhdHRlcm4pKSB7XG4gICAgICAgICAgdmFyIG5ld3BhcnQgPSAnJztcbiAgICAgICAgICBmb3IgKHZhciBqID0gMCwgayA9IHBhcnQubGVuZ3RoOyBqIDwgazsgaisrKSB7XG4gICAgICAgICAgICBpZiAocGFydC5jaGFyQ29kZUF0KGopID4gMTI3KSB7XG4gICAgICAgICAgICAgIC8vIHdlIHJlcGxhY2Ugbm9uLUFTQ0lJIGNoYXIgd2l0aCBhIHRlbXBvcmFyeSBwbGFjZWhvbGRlclxuICAgICAgICAgICAgICAvLyB3ZSBuZWVkIHRoaXMgdG8gbWFrZSBzdXJlIHNpemUgb2YgaG9zdG5hbWUgaXMgbm90XG4gICAgICAgICAgICAgIC8vIGJyb2tlbiBieSByZXBsYWNpbmcgbm9uLUFTQ0lJIGJ5IG5vdGhpbmdcbiAgICAgICAgICAgICAgbmV3cGFydCArPSAneCc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBuZXdwYXJ0ICs9IHBhcnRbal07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIHdlIHRlc3QgYWdhaW4gd2l0aCBBU0NJSSBjaGFyIG9ubHlcbiAgICAgICAgICBpZiAoIW5ld3BhcnQubWF0Y2goaG9zdG5hbWVQYXJ0UGF0dGVybikpIHtcbiAgICAgICAgICAgIHZhciB2YWxpZFBhcnRzID0gaG9zdHBhcnRzLnNsaWNlKDAsIGkpO1xuICAgICAgICAgICAgdmFyIG5vdEhvc3QgPSBob3N0cGFydHMuc2xpY2UoaSArIDEpO1xuICAgICAgICAgICAgdmFyIGJpdCA9IHBhcnQubWF0Y2goaG9zdG5hbWVQYXJ0U3RhcnQpO1xuICAgICAgICAgICAgaWYgKGJpdCkge1xuICAgICAgICAgICAgICB2YWxpZFBhcnRzLnB1c2goYml0WzFdKTtcbiAgICAgICAgICAgICAgbm90SG9zdC51bnNoaWZ0KGJpdFsyXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobm90SG9zdC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgcmVzdCA9ICcvJyArIG5vdEhvc3Quam9pbignLicpICsgcmVzdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG91dC5ob3N0bmFtZSA9IHZhbGlkUGFydHMuam9pbignLicpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gaG9zdG5hbWVzIGFyZSBhbHdheXMgbG93ZXIgY2FzZS5cbiAgICBvdXQuaG9zdG5hbWUgPSBvdXQuaG9zdG5hbWUudG9Mb3dlckNhc2UoKTtcblxuICAgIC8vIElETkEgU3VwcG9ydDogUmV0dXJucyBhIHB1bnkgY29kZWQgcmVwcmVzZW50YXRpb24gb2YgXCJkb21haW5cIi5cbiAgICAvLyBJdCBvbmx5IGNvbnZlcnRzIHRoZSBwYXJ0IG9mIHRoZSBkb21haW4gbmFtZSB0aGF0XG4gICAgLy8gaGFzIG5vbiBBU0NJSSBjaGFyYWN0ZXJzLiBJLmUuIGl0IGRvc2VudCBtYXR0ZXIgaWZcbiAgICAvLyB5b3UgY2FsbCBpdCB3aXRoIGEgZG9tYWluIHRoYXQgYWxyZWFkeSBpcyBpbiBBU0NJSS5cbiAgICB2YXIgZG9tYWluQXJyYXkgPSBvdXQuaG9zdG5hbWUuc3BsaXQoJy4nKTtcbiAgICB2YXIgbmV3T3V0ID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkb21haW5BcnJheS5sZW5ndGg7ICsraSkge1xuICAgICAgdmFyIHMgPSBkb21haW5BcnJheVtpXTtcbiAgICAgIG5ld091dC5wdXNoKHMubWF0Y2goL1teQS1aYS16MC05Xy1dLykgP1xuICAgICAgICAgICd4bi0tJyArIHB1bnljb2RlLmVuY29kZShzKSA6IHMpO1xuICAgIH1cbiAgICBvdXQuaG9zdG5hbWUgPSBuZXdPdXQuam9pbignLicpO1xuXG4gICAgb3V0Lmhvc3QgPSAob3V0Lmhvc3RuYW1lIHx8ICcnKSArXG4gICAgICAgICgob3V0LnBvcnQpID8gJzonICsgb3V0LnBvcnQgOiAnJyk7XG4gICAgb3V0LmhyZWYgKz0gb3V0Lmhvc3Q7XG4gIH1cblxuICAvLyBub3cgcmVzdCBpcyBzZXQgdG8gdGhlIHBvc3QtaG9zdCBzdHVmZi5cbiAgLy8gY2hvcCBvZmYgYW55IGRlbGltIGNoYXJzLlxuICBpZiAoIXVuc2FmZVByb3RvY29sW2xvd2VyUHJvdG9dKSB7XG5cbiAgICAvLyBGaXJzdCwgbWFrZSAxMDAlIHN1cmUgdGhhdCBhbnkgXCJhdXRvRXNjYXBlXCIgY2hhcnMgZ2V0XG4gICAgLy8gZXNjYXBlZCwgZXZlbiBpZiBlbmNvZGVVUklDb21wb25lbnQgZG9lc24ndCB0aGluayB0aGV5XG4gICAgLy8gbmVlZCB0byBiZS5cbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGF1dG9Fc2NhcGUubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICB2YXIgYWUgPSBhdXRvRXNjYXBlW2ldO1xuICAgICAgdmFyIGVzYyA9IGVuY29kZVVSSUNvbXBvbmVudChhZSk7XG4gICAgICBpZiAoZXNjID09PSBhZSkge1xuICAgICAgICBlc2MgPSBlc2NhcGUoYWUpO1xuICAgICAgfVxuICAgICAgcmVzdCA9IHJlc3Quc3BsaXQoYWUpLmpvaW4oZXNjKTtcbiAgICB9XG5cbiAgICAvLyBOb3cgbWFrZSBzdXJlIHRoYXQgZGVsaW1zIG5ldmVyIGFwcGVhciBpbiBhIHVybC5cbiAgICB2YXIgY2hvcCA9IHJlc3QubGVuZ3RoO1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gZGVsaW1zLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgdmFyIGMgPSBhcnJheUluZGV4T2YocmVzdCwgZGVsaW1zW2ldKTtcbiAgICAgIGlmIChjICE9PSAtMSkge1xuICAgICAgICBjaG9wID0gTWF0aC5taW4oYywgY2hvcCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJlc3QgPSByZXN0LnN1YnN0cigwLCBjaG9wKTtcbiAgfVxuXG5cbiAgLy8gY2hvcCBvZmYgZnJvbSB0aGUgdGFpbCBmaXJzdC5cbiAgdmFyIGhhc2ggPSBhcnJheUluZGV4T2YocmVzdCwgJyMnKTtcbiAgaWYgKGhhc2ggIT09IC0xKSB7XG4gICAgLy8gZ290IGEgZnJhZ21lbnQgc3RyaW5nLlxuICAgIG91dC5oYXNoID0gcmVzdC5zdWJzdHIoaGFzaCk7XG4gICAgcmVzdCA9IHJlc3Quc2xpY2UoMCwgaGFzaCk7XG4gIH1cbiAgdmFyIHFtID0gYXJyYXlJbmRleE9mKHJlc3QsICc/Jyk7XG4gIGlmIChxbSAhPT0gLTEpIHtcbiAgICBvdXQuc2VhcmNoID0gcmVzdC5zdWJzdHIocW0pO1xuICAgIG91dC5xdWVyeSA9IHJlc3Quc3Vic3RyKHFtICsgMSk7XG4gICAgaWYgKHBhcnNlUXVlcnlTdHJpbmcpIHtcbiAgICAgIG91dC5xdWVyeSA9IHF1ZXJ5c3RyaW5nLnBhcnNlKG91dC5xdWVyeSk7XG4gICAgfVxuICAgIHJlc3QgPSByZXN0LnNsaWNlKDAsIHFtKTtcbiAgfSBlbHNlIGlmIChwYXJzZVF1ZXJ5U3RyaW5nKSB7XG4gICAgLy8gbm8gcXVlcnkgc3RyaW5nLCBidXQgcGFyc2VRdWVyeVN0cmluZyBzdGlsbCByZXF1ZXN0ZWRcbiAgICBvdXQuc2VhcmNoID0gJyc7XG4gICAgb3V0LnF1ZXJ5ID0ge307XG4gIH1cbiAgaWYgKHJlc3QpIG91dC5wYXRobmFtZSA9IHJlc3Q7XG4gIGlmIChzbGFzaGVkUHJvdG9jb2xbcHJvdG9dICYmXG4gICAgICBvdXQuaG9zdG5hbWUgJiYgIW91dC5wYXRobmFtZSkge1xuICAgIG91dC5wYXRobmFtZSA9ICcvJztcbiAgfVxuXG4gIC8vdG8gc3VwcG9ydCBodHRwLnJlcXVlc3RcbiAgaWYgKG91dC5wYXRobmFtZSB8fCBvdXQuc2VhcmNoKSB7XG4gICAgb3V0LnBhdGggPSAob3V0LnBhdGhuYW1lID8gb3V0LnBhdGhuYW1lIDogJycpICtcbiAgICAgICAgICAgICAgIChvdXQuc2VhcmNoID8gb3V0LnNlYXJjaCA6ICcnKTtcbiAgfVxuXG4gIC8vIGZpbmFsbHksIHJlY29uc3RydWN0IHRoZSBocmVmIGJhc2VkIG9uIHdoYXQgaGFzIGJlZW4gdmFsaWRhdGVkLlxuICBvdXQuaHJlZiA9IHVybEZvcm1hdChvdXQpO1xuICByZXR1cm4gb3V0O1xufVxuXG4vLyBmb3JtYXQgYSBwYXJzZWQgb2JqZWN0IGludG8gYSB1cmwgc3RyaW5nXG5mdW5jdGlvbiB1cmxGb3JtYXQob2JqKSB7XG4gIC8vIGVuc3VyZSBpdCdzIGFuIG9iamVjdCwgYW5kIG5vdCBhIHN0cmluZyB1cmwuXG4gIC8vIElmIGl0J3MgYW4gb2JqLCB0aGlzIGlzIGEgbm8tb3AuXG4gIC8vIHRoaXMgd2F5LCB5b3UgY2FuIGNhbGwgdXJsX2Zvcm1hdCgpIG9uIHN0cmluZ3NcbiAgLy8gdG8gY2xlYW4gdXAgcG90ZW50aWFsbHkgd29ua3kgdXJscy5cbiAgaWYgKHR5cGVvZihvYmopID09PSAnc3RyaW5nJykgb2JqID0gdXJsUGFyc2Uob2JqKTtcblxuICB2YXIgYXV0aCA9IG9iai5hdXRoIHx8ICcnO1xuICBpZiAoYXV0aCkge1xuICAgIGF1dGggPSBhdXRoLnNwbGl0KCdAJykuam9pbignJTQwJyk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBub25BdXRoQ2hhcnMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICB2YXIgbkFDID0gbm9uQXV0aENoYXJzW2ldO1xuICAgICAgYXV0aCA9IGF1dGguc3BsaXQobkFDKS5qb2luKGVuY29kZVVSSUNvbXBvbmVudChuQUMpKTtcbiAgICB9XG4gICAgYXV0aCArPSAnQCc7XG4gIH1cblxuICB2YXIgcHJvdG9jb2wgPSBvYmoucHJvdG9jb2wgfHwgJycsXG4gICAgICBob3N0ID0gKG9iai5ob3N0ICE9PSB1bmRlZmluZWQpID8gYXV0aCArIG9iai5ob3N0IDpcbiAgICAgICAgICBvYmouaG9zdG5hbWUgIT09IHVuZGVmaW5lZCA/IChcbiAgICAgICAgICAgICAgYXV0aCArIG9iai5ob3N0bmFtZSArXG4gICAgICAgICAgICAgIChvYmoucG9ydCA/ICc6JyArIG9iai5wb3J0IDogJycpXG4gICAgICAgICAgKSA6XG4gICAgICAgICAgZmFsc2UsXG4gICAgICBwYXRobmFtZSA9IG9iai5wYXRobmFtZSB8fCAnJyxcbiAgICAgIHF1ZXJ5ID0gb2JqLnF1ZXJ5ICYmXG4gICAgICAgICAgICAgICgodHlwZW9mIG9iai5xdWVyeSA9PT0gJ29iamVjdCcgJiZcbiAgICAgICAgICAgICAgICBvYmplY3RLZXlzKG9iai5xdWVyeSkubGVuZ3RoKSA/XG4gICAgICAgICAgICAgICAgIHF1ZXJ5c3RyaW5nLnN0cmluZ2lmeShvYmoucXVlcnkpIDpcbiAgICAgICAgICAgICAgICAgJycpIHx8ICcnLFxuICAgICAgc2VhcmNoID0gb2JqLnNlYXJjaCB8fCAocXVlcnkgJiYgKCc/JyArIHF1ZXJ5KSkgfHwgJycsXG4gICAgICBoYXNoID0gb2JqLmhhc2ggfHwgJyc7XG5cbiAgaWYgKHByb3RvY29sICYmIHByb3RvY29sLnN1YnN0cigtMSkgIT09ICc6JykgcHJvdG9jb2wgKz0gJzonO1xuXG4gIC8vIG9ubHkgdGhlIHNsYXNoZWRQcm90b2NvbHMgZ2V0IHRoZSAvLy4gIE5vdCBtYWlsdG86LCB4bXBwOiwgZXRjLlxuICAvLyB1bmxlc3MgdGhleSBoYWQgdGhlbSB0byBiZWdpbiB3aXRoLlxuICBpZiAob2JqLnNsYXNoZXMgfHxcbiAgICAgICghcHJvdG9jb2wgfHwgc2xhc2hlZFByb3RvY29sW3Byb3RvY29sXSkgJiYgaG9zdCAhPT0gZmFsc2UpIHtcbiAgICBob3N0ID0gJy8vJyArIChob3N0IHx8ICcnKTtcbiAgICBpZiAocGF0aG5hbWUgJiYgcGF0aG5hbWUuY2hhckF0KDApICE9PSAnLycpIHBhdGhuYW1lID0gJy8nICsgcGF0aG5hbWU7XG4gIH0gZWxzZSBpZiAoIWhvc3QpIHtcbiAgICBob3N0ID0gJyc7XG4gIH1cblxuICBpZiAoaGFzaCAmJiBoYXNoLmNoYXJBdCgwKSAhPT0gJyMnKSBoYXNoID0gJyMnICsgaGFzaDtcbiAgaWYgKHNlYXJjaCAmJiBzZWFyY2guY2hhckF0KDApICE9PSAnPycpIHNlYXJjaCA9ICc/JyArIHNlYXJjaDtcblxuICByZXR1cm4gcHJvdG9jb2wgKyBob3N0ICsgcGF0aG5hbWUgKyBzZWFyY2ggKyBoYXNoO1xufVxuXG5mdW5jdGlvbiB1cmxSZXNvbHZlKHNvdXJjZSwgcmVsYXRpdmUpIHtcbiAgcmV0dXJuIHVybEZvcm1hdCh1cmxSZXNvbHZlT2JqZWN0KHNvdXJjZSwgcmVsYXRpdmUpKTtcbn1cblxuZnVuY3Rpb24gdXJsUmVzb2x2ZU9iamVjdChzb3VyY2UsIHJlbGF0aXZlKSB7XG4gIGlmICghc291cmNlKSByZXR1cm4gcmVsYXRpdmU7XG5cbiAgc291cmNlID0gdXJsUGFyc2UodXJsRm9ybWF0KHNvdXJjZSksIGZhbHNlLCB0cnVlKTtcbiAgcmVsYXRpdmUgPSB1cmxQYXJzZSh1cmxGb3JtYXQocmVsYXRpdmUpLCBmYWxzZSwgdHJ1ZSk7XG5cbiAgLy8gaGFzaCBpcyBhbHdheXMgb3ZlcnJpZGRlbiwgbm8gbWF0dGVyIHdoYXQuXG4gIHNvdXJjZS5oYXNoID0gcmVsYXRpdmUuaGFzaDtcblxuICBpZiAocmVsYXRpdmUuaHJlZiA9PT0gJycpIHtcbiAgICBzb3VyY2UuaHJlZiA9IHVybEZvcm1hdChzb3VyY2UpO1xuICAgIHJldHVybiBzb3VyY2U7XG4gIH1cblxuICAvLyBocmVmcyBsaWtlIC8vZm9vL2JhciBhbHdheXMgY3V0IHRvIHRoZSBwcm90b2NvbC5cbiAgaWYgKHJlbGF0aXZlLnNsYXNoZXMgJiYgIXJlbGF0aXZlLnByb3RvY29sKSB7XG4gICAgcmVsYXRpdmUucHJvdG9jb2wgPSBzb3VyY2UucHJvdG9jb2w7XG4gICAgLy91cmxQYXJzZSBhcHBlbmRzIHRyYWlsaW5nIC8gdG8gdXJscyBsaWtlIGh0dHA6Ly93d3cuZXhhbXBsZS5jb21cbiAgICBpZiAoc2xhc2hlZFByb3RvY29sW3JlbGF0aXZlLnByb3RvY29sXSAmJlxuICAgICAgICByZWxhdGl2ZS5ob3N0bmFtZSAmJiAhcmVsYXRpdmUucGF0aG5hbWUpIHtcbiAgICAgIHJlbGF0aXZlLnBhdGggPSByZWxhdGl2ZS5wYXRobmFtZSA9ICcvJztcbiAgICB9XG4gICAgcmVsYXRpdmUuaHJlZiA9IHVybEZvcm1hdChyZWxhdGl2ZSk7XG4gICAgcmV0dXJuIHJlbGF0aXZlO1xuICB9XG5cbiAgaWYgKHJlbGF0aXZlLnByb3RvY29sICYmIHJlbGF0aXZlLnByb3RvY29sICE9PSBzb3VyY2UucHJvdG9jb2wpIHtcbiAgICAvLyBpZiBpdCdzIGEga25vd24gdXJsIHByb3RvY29sLCB0aGVuIGNoYW5naW5nXG4gICAgLy8gdGhlIHByb3RvY29sIGRvZXMgd2VpcmQgdGhpbmdzXG4gICAgLy8gZmlyc3QsIGlmIGl0J3Mgbm90IGZpbGU6LCB0aGVuIHdlIE1VU1QgaGF2ZSBhIGhvc3QsXG4gICAgLy8gYW5kIGlmIHRoZXJlIHdhcyBhIHBhdGhcbiAgICAvLyB0byBiZWdpbiB3aXRoLCB0aGVuIHdlIE1VU1QgaGF2ZSBhIHBhdGguXG4gICAgLy8gaWYgaXQgaXMgZmlsZTosIHRoZW4gdGhlIGhvc3QgaXMgZHJvcHBlZCxcbiAgICAvLyBiZWNhdXNlIHRoYXQncyBrbm93biB0byBiZSBob3N0bGVzcy5cbiAgICAvLyBhbnl0aGluZyBlbHNlIGlzIGFzc3VtZWQgdG8gYmUgYWJzb2x1dGUuXG4gICAgaWYgKCFzbGFzaGVkUHJvdG9jb2xbcmVsYXRpdmUucHJvdG9jb2xdKSB7XG4gICAgICByZWxhdGl2ZS5ocmVmID0gdXJsRm9ybWF0KHJlbGF0aXZlKTtcbiAgICAgIHJldHVybiByZWxhdGl2ZTtcbiAgICB9XG4gICAgc291cmNlLnByb3RvY29sID0gcmVsYXRpdmUucHJvdG9jb2w7XG4gICAgaWYgKCFyZWxhdGl2ZS5ob3N0ICYmICFob3N0bGVzc1Byb3RvY29sW3JlbGF0aXZlLnByb3RvY29sXSkge1xuICAgICAgdmFyIHJlbFBhdGggPSAocmVsYXRpdmUucGF0aG5hbWUgfHwgJycpLnNwbGl0KCcvJyk7XG4gICAgICB3aGlsZSAocmVsUGF0aC5sZW5ndGggJiYgIShyZWxhdGl2ZS5ob3N0ID0gcmVsUGF0aC5zaGlmdCgpKSk7XG4gICAgICBpZiAoIXJlbGF0aXZlLmhvc3QpIHJlbGF0aXZlLmhvc3QgPSAnJztcbiAgICAgIGlmICghcmVsYXRpdmUuaG9zdG5hbWUpIHJlbGF0aXZlLmhvc3RuYW1lID0gJyc7XG4gICAgICBpZiAocmVsUGF0aFswXSAhPT0gJycpIHJlbFBhdGgudW5zaGlmdCgnJyk7XG4gICAgICBpZiAocmVsUGF0aC5sZW5ndGggPCAyKSByZWxQYXRoLnVuc2hpZnQoJycpO1xuICAgICAgcmVsYXRpdmUucGF0aG5hbWUgPSByZWxQYXRoLmpvaW4oJy8nKTtcbiAgICB9XG4gICAgc291cmNlLnBhdGhuYW1lID0gcmVsYXRpdmUucGF0aG5hbWU7XG4gICAgc291cmNlLnNlYXJjaCA9IHJlbGF0aXZlLnNlYXJjaDtcbiAgICBzb3VyY2UucXVlcnkgPSByZWxhdGl2ZS5xdWVyeTtcbiAgICBzb3VyY2UuaG9zdCA9IHJlbGF0aXZlLmhvc3QgfHwgJyc7XG4gICAgc291cmNlLmF1dGggPSByZWxhdGl2ZS5hdXRoO1xuICAgIHNvdXJjZS5ob3N0bmFtZSA9IHJlbGF0aXZlLmhvc3RuYW1lIHx8IHJlbGF0aXZlLmhvc3Q7XG4gICAgc291cmNlLnBvcnQgPSByZWxhdGl2ZS5wb3J0O1xuICAgIC8vdG8gc3VwcG9ydCBodHRwLnJlcXVlc3RcbiAgICBpZiAoc291cmNlLnBhdGhuYW1lICE9PSB1bmRlZmluZWQgfHwgc291cmNlLnNlYXJjaCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBzb3VyY2UucGF0aCA9IChzb3VyY2UucGF0aG5hbWUgPyBzb3VyY2UucGF0aG5hbWUgOiAnJykgK1xuICAgICAgICAgICAgICAgICAgICAoc291cmNlLnNlYXJjaCA/IHNvdXJjZS5zZWFyY2ggOiAnJyk7XG4gICAgfVxuICAgIHNvdXJjZS5zbGFzaGVzID0gc291cmNlLnNsYXNoZXMgfHwgcmVsYXRpdmUuc2xhc2hlcztcbiAgICBzb3VyY2UuaHJlZiA9IHVybEZvcm1hdChzb3VyY2UpO1xuICAgIHJldHVybiBzb3VyY2U7XG4gIH1cblxuICB2YXIgaXNTb3VyY2VBYnMgPSAoc291cmNlLnBhdGhuYW1lICYmIHNvdXJjZS5wYXRobmFtZS5jaGFyQXQoMCkgPT09ICcvJyksXG4gICAgICBpc1JlbEFicyA9IChcbiAgICAgICAgICByZWxhdGl2ZS5ob3N0ICE9PSB1bmRlZmluZWQgfHxcbiAgICAgICAgICByZWxhdGl2ZS5wYXRobmFtZSAmJiByZWxhdGl2ZS5wYXRobmFtZS5jaGFyQXQoMCkgPT09ICcvJ1xuICAgICAgKSxcbiAgICAgIG11c3RFbmRBYnMgPSAoaXNSZWxBYnMgfHwgaXNTb3VyY2VBYnMgfHxcbiAgICAgICAgICAgICAgICAgICAgKHNvdXJjZS5ob3N0ICYmIHJlbGF0aXZlLnBhdGhuYW1lKSksXG4gICAgICByZW1vdmVBbGxEb3RzID0gbXVzdEVuZEFicyxcbiAgICAgIHNyY1BhdGggPSBzb3VyY2UucGF0aG5hbWUgJiYgc291cmNlLnBhdGhuYW1lLnNwbGl0KCcvJykgfHwgW10sXG4gICAgICByZWxQYXRoID0gcmVsYXRpdmUucGF0aG5hbWUgJiYgcmVsYXRpdmUucGF0aG5hbWUuc3BsaXQoJy8nKSB8fCBbXSxcbiAgICAgIHBzeWNob3RpYyA9IHNvdXJjZS5wcm90b2NvbCAmJlxuICAgICAgICAgICFzbGFzaGVkUHJvdG9jb2xbc291cmNlLnByb3RvY29sXTtcblxuICAvLyBpZiB0aGUgdXJsIGlzIGEgbm9uLXNsYXNoZWQgdXJsLCB0aGVuIHJlbGF0aXZlXG4gIC8vIGxpbmtzIGxpa2UgLi4vLi4gc2hvdWxkIGJlIGFibGVcbiAgLy8gdG8gY3Jhd2wgdXAgdG8gdGhlIGhvc3RuYW1lLCBhcyB3ZWxsLiAgVGhpcyBpcyBzdHJhbmdlLlxuICAvLyBzb3VyY2UucHJvdG9jb2wgaGFzIGFscmVhZHkgYmVlbiBzZXQgYnkgbm93LlxuICAvLyBMYXRlciBvbiwgcHV0IHRoZSBmaXJzdCBwYXRoIHBhcnQgaW50byB0aGUgaG9zdCBmaWVsZC5cbiAgaWYgKHBzeWNob3RpYykge1xuXG4gICAgZGVsZXRlIHNvdXJjZS5ob3N0bmFtZTtcbiAgICBkZWxldGUgc291cmNlLnBvcnQ7XG4gICAgaWYgKHNvdXJjZS5ob3N0KSB7XG4gICAgICBpZiAoc3JjUGF0aFswXSA9PT0gJycpIHNyY1BhdGhbMF0gPSBzb3VyY2UuaG9zdDtcbiAgICAgIGVsc2Ugc3JjUGF0aC51bnNoaWZ0KHNvdXJjZS5ob3N0KTtcbiAgICB9XG4gICAgZGVsZXRlIHNvdXJjZS5ob3N0O1xuICAgIGlmIChyZWxhdGl2ZS5wcm90b2NvbCkge1xuICAgICAgZGVsZXRlIHJlbGF0aXZlLmhvc3RuYW1lO1xuICAgICAgZGVsZXRlIHJlbGF0aXZlLnBvcnQ7XG4gICAgICBpZiAocmVsYXRpdmUuaG9zdCkge1xuICAgICAgICBpZiAocmVsUGF0aFswXSA9PT0gJycpIHJlbFBhdGhbMF0gPSByZWxhdGl2ZS5ob3N0O1xuICAgICAgICBlbHNlIHJlbFBhdGgudW5zaGlmdChyZWxhdGl2ZS5ob3N0KTtcbiAgICAgIH1cbiAgICAgIGRlbGV0ZSByZWxhdGl2ZS5ob3N0O1xuICAgIH1cbiAgICBtdXN0RW5kQWJzID0gbXVzdEVuZEFicyAmJiAocmVsUGF0aFswXSA9PT0gJycgfHwgc3JjUGF0aFswXSA9PT0gJycpO1xuICB9XG5cbiAgaWYgKGlzUmVsQWJzKSB7XG4gICAgLy8gaXQncyBhYnNvbHV0ZS5cbiAgICBzb3VyY2UuaG9zdCA9IChyZWxhdGl2ZS5ob3N0IHx8IHJlbGF0aXZlLmhvc3QgPT09ICcnKSA/XG4gICAgICAgICAgICAgICAgICAgICAgcmVsYXRpdmUuaG9zdCA6IHNvdXJjZS5ob3N0O1xuICAgIHNvdXJjZS5ob3N0bmFtZSA9IChyZWxhdGl2ZS5ob3N0bmFtZSB8fCByZWxhdGl2ZS5ob3N0bmFtZSA9PT0gJycpID9cbiAgICAgICAgICAgICAgICAgICAgICByZWxhdGl2ZS5ob3N0bmFtZSA6IHNvdXJjZS5ob3N0bmFtZTtcbiAgICBzb3VyY2Uuc2VhcmNoID0gcmVsYXRpdmUuc2VhcmNoO1xuICAgIHNvdXJjZS5xdWVyeSA9IHJlbGF0aXZlLnF1ZXJ5O1xuICAgIHNyY1BhdGggPSByZWxQYXRoO1xuICAgIC8vIGZhbGwgdGhyb3VnaCB0byB0aGUgZG90LWhhbmRsaW5nIGJlbG93LlxuICB9IGVsc2UgaWYgKHJlbFBhdGgubGVuZ3RoKSB7XG4gICAgLy8gaXQncyByZWxhdGl2ZVxuICAgIC8vIHRocm93IGF3YXkgdGhlIGV4aXN0aW5nIGZpbGUsIGFuZCB0YWtlIHRoZSBuZXcgcGF0aCBpbnN0ZWFkLlxuICAgIGlmICghc3JjUGF0aCkgc3JjUGF0aCA9IFtdO1xuICAgIHNyY1BhdGgucG9wKCk7XG4gICAgc3JjUGF0aCA9IHNyY1BhdGguY29uY2F0KHJlbFBhdGgpO1xuICAgIHNvdXJjZS5zZWFyY2ggPSByZWxhdGl2ZS5zZWFyY2g7XG4gICAgc291cmNlLnF1ZXJ5ID0gcmVsYXRpdmUucXVlcnk7XG4gIH0gZWxzZSBpZiAoJ3NlYXJjaCcgaW4gcmVsYXRpdmUpIHtcbiAgICAvLyBqdXN0IHB1bGwgb3V0IHRoZSBzZWFyY2guXG4gICAgLy8gbGlrZSBocmVmPSc/Zm9vJy5cbiAgICAvLyBQdXQgdGhpcyBhZnRlciB0aGUgb3RoZXIgdHdvIGNhc2VzIGJlY2F1c2UgaXQgc2ltcGxpZmllcyB0aGUgYm9vbGVhbnNcbiAgICBpZiAocHN5Y2hvdGljKSB7XG4gICAgICBzb3VyY2UuaG9zdG5hbWUgPSBzb3VyY2UuaG9zdCA9IHNyY1BhdGguc2hpZnQoKTtcbiAgICAgIC8vb2NjYXRpb25hbHkgdGhlIGF1dGggY2FuIGdldCBzdHVjayBvbmx5IGluIGhvc3RcbiAgICAgIC8vdGhpcyBlc3BlY2lhbHkgaGFwcGVucyBpbiBjYXNlcyBsaWtlXG4gICAgICAvL3VybC5yZXNvbHZlT2JqZWN0KCdtYWlsdG86bG9jYWwxQGRvbWFpbjEnLCAnbG9jYWwyQGRvbWFpbjInKVxuICAgICAgdmFyIGF1dGhJbkhvc3QgPSBzb3VyY2UuaG9zdCAmJiBhcnJheUluZGV4T2Yoc291cmNlLmhvc3QsICdAJykgPiAwID9cbiAgICAgICAgICAgICAgICAgICAgICAgc291cmNlLmhvc3Quc3BsaXQoJ0AnKSA6IGZhbHNlO1xuICAgICAgaWYgKGF1dGhJbkhvc3QpIHtcbiAgICAgICAgc291cmNlLmF1dGggPSBhdXRoSW5Ib3N0LnNoaWZ0KCk7XG4gICAgICAgIHNvdXJjZS5ob3N0ID0gc291cmNlLmhvc3RuYW1lID0gYXV0aEluSG9zdC5zaGlmdCgpO1xuICAgICAgfVxuICAgIH1cbiAgICBzb3VyY2Uuc2VhcmNoID0gcmVsYXRpdmUuc2VhcmNoO1xuICAgIHNvdXJjZS5xdWVyeSA9IHJlbGF0aXZlLnF1ZXJ5O1xuICAgIC8vdG8gc3VwcG9ydCBodHRwLnJlcXVlc3RcbiAgICBpZiAoc291cmNlLnBhdGhuYW1lICE9PSB1bmRlZmluZWQgfHwgc291cmNlLnNlYXJjaCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBzb3VyY2UucGF0aCA9IChzb3VyY2UucGF0aG5hbWUgPyBzb3VyY2UucGF0aG5hbWUgOiAnJykgK1xuICAgICAgICAgICAgICAgICAgICAoc291cmNlLnNlYXJjaCA/IHNvdXJjZS5zZWFyY2ggOiAnJyk7XG4gICAgfVxuICAgIHNvdXJjZS5ocmVmID0gdXJsRm9ybWF0KHNvdXJjZSk7XG4gICAgcmV0dXJuIHNvdXJjZTtcbiAgfVxuICBpZiAoIXNyY1BhdGgubGVuZ3RoKSB7XG4gICAgLy8gbm8gcGF0aCBhdCBhbGwuICBlYXN5LlxuICAgIC8vIHdlJ3ZlIGFscmVhZHkgaGFuZGxlZCB0aGUgb3RoZXIgc3R1ZmYgYWJvdmUuXG4gICAgZGVsZXRlIHNvdXJjZS5wYXRobmFtZTtcbiAgICAvL3RvIHN1cHBvcnQgaHR0cC5yZXF1ZXN0XG4gICAgaWYgKCFzb3VyY2Uuc2VhcmNoKSB7XG4gICAgICBzb3VyY2UucGF0aCA9ICcvJyArIHNvdXJjZS5zZWFyY2g7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlbGV0ZSBzb3VyY2UucGF0aDtcbiAgICB9XG4gICAgc291cmNlLmhyZWYgPSB1cmxGb3JtYXQoc291cmNlKTtcbiAgICByZXR1cm4gc291cmNlO1xuICB9XG4gIC8vIGlmIGEgdXJsIEVORHMgaW4gLiBvciAuLiwgdGhlbiBpdCBtdXN0IGdldCBhIHRyYWlsaW5nIHNsYXNoLlxuICAvLyBob3dldmVyLCBpZiBpdCBlbmRzIGluIGFueXRoaW5nIGVsc2Ugbm9uLXNsYXNoeSxcbiAgLy8gdGhlbiBpdCBtdXN0IE5PVCBnZXQgYSB0cmFpbGluZyBzbGFzaC5cbiAgdmFyIGxhc3QgPSBzcmNQYXRoLnNsaWNlKC0xKVswXTtcbiAgdmFyIGhhc1RyYWlsaW5nU2xhc2ggPSAoXG4gICAgICAoc291cmNlLmhvc3QgfHwgcmVsYXRpdmUuaG9zdCkgJiYgKGxhc3QgPT09ICcuJyB8fCBsYXN0ID09PSAnLi4nKSB8fFxuICAgICAgbGFzdCA9PT0gJycpO1xuXG4gIC8vIHN0cmlwIHNpbmdsZSBkb3RzLCByZXNvbHZlIGRvdWJsZSBkb3RzIHRvIHBhcmVudCBkaXJcbiAgLy8gaWYgdGhlIHBhdGggdHJpZXMgdG8gZ28gYWJvdmUgdGhlIHJvb3QsIGB1cGAgZW5kcyB1cCA+IDBcbiAgdmFyIHVwID0gMDtcbiAgZm9yICh2YXIgaSA9IHNyY1BhdGgubGVuZ3RoOyBpID49IDA7IGktLSkge1xuICAgIGxhc3QgPSBzcmNQYXRoW2ldO1xuICAgIGlmIChsYXN0ID09ICcuJykge1xuICAgICAgc3JjUGF0aC5zcGxpY2UoaSwgMSk7XG4gICAgfSBlbHNlIGlmIChsYXN0ID09PSAnLi4nKSB7XG4gICAgICBzcmNQYXRoLnNwbGljZShpLCAxKTtcbiAgICAgIHVwKys7XG4gICAgfSBlbHNlIGlmICh1cCkge1xuICAgICAgc3JjUGF0aC5zcGxpY2UoaSwgMSk7XG4gICAgICB1cC0tO1xuICAgIH1cbiAgfVxuXG4gIC8vIGlmIHRoZSBwYXRoIGlzIGFsbG93ZWQgdG8gZ28gYWJvdmUgdGhlIHJvb3QsIHJlc3RvcmUgbGVhZGluZyAuLnNcbiAgaWYgKCFtdXN0RW5kQWJzICYmICFyZW1vdmVBbGxEb3RzKSB7XG4gICAgZm9yICg7IHVwLS07IHVwKSB7XG4gICAgICBzcmNQYXRoLnVuc2hpZnQoJy4uJyk7XG4gICAgfVxuICB9XG5cbiAgaWYgKG11c3RFbmRBYnMgJiYgc3JjUGF0aFswXSAhPT0gJycgJiZcbiAgICAgICghc3JjUGF0aFswXSB8fCBzcmNQYXRoWzBdLmNoYXJBdCgwKSAhPT0gJy8nKSkge1xuICAgIHNyY1BhdGgudW5zaGlmdCgnJyk7XG4gIH1cblxuICBpZiAoaGFzVHJhaWxpbmdTbGFzaCAmJiAoc3JjUGF0aC5qb2luKCcvJykuc3Vic3RyKC0xKSAhPT0gJy8nKSkge1xuICAgIHNyY1BhdGgucHVzaCgnJyk7XG4gIH1cblxuICB2YXIgaXNBYnNvbHV0ZSA9IHNyY1BhdGhbMF0gPT09ICcnIHx8XG4gICAgICAoc3JjUGF0aFswXSAmJiBzcmNQYXRoWzBdLmNoYXJBdCgwKSA9PT0gJy8nKTtcblxuICAvLyBwdXQgdGhlIGhvc3QgYmFja1xuICBpZiAocHN5Y2hvdGljKSB7XG4gICAgc291cmNlLmhvc3RuYW1lID0gc291cmNlLmhvc3QgPSBpc0Fic29sdXRlID8gJycgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3JjUGF0aC5sZW5ndGggPyBzcmNQYXRoLnNoaWZ0KCkgOiAnJztcbiAgICAvL29jY2F0aW9uYWx5IHRoZSBhdXRoIGNhbiBnZXQgc3R1Y2sgb25seSBpbiBob3N0XG4gICAgLy90aGlzIGVzcGVjaWFseSBoYXBwZW5zIGluIGNhc2VzIGxpa2VcbiAgICAvL3VybC5yZXNvbHZlT2JqZWN0KCdtYWlsdG86bG9jYWwxQGRvbWFpbjEnLCAnbG9jYWwyQGRvbWFpbjInKVxuICAgIHZhciBhdXRoSW5Ib3N0ID0gc291cmNlLmhvc3QgJiYgYXJyYXlJbmRleE9mKHNvdXJjZS5ob3N0LCAnQCcpID4gMCA/XG4gICAgICAgICAgICAgICAgICAgICBzb3VyY2UuaG9zdC5zcGxpdCgnQCcpIDogZmFsc2U7XG4gICAgaWYgKGF1dGhJbkhvc3QpIHtcbiAgICAgIHNvdXJjZS5hdXRoID0gYXV0aEluSG9zdC5zaGlmdCgpO1xuICAgICAgc291cmNlLmhvc3QgPSBzb3VyY2UuaG9zdG5hbWUgPSBhdXRoSW5Ib3N0LnNoaWZ0KCk7XG4gICAgfVxuICB9XG5cbiAgbXVzdEVuZEFicyA9IG11c3RFbmRBYnMgfHwgKHNvdXJjZS5ob3N0ICYmIHNyY1BhdGgubGVuZ3RoKTtcblxuICBpZiAobXVzdEVuZEFicyAmJiAhaXNBYnNvbHV0ZSkge1xuICAgIHNyY1BhdGgudW5zaGlmdCgnJyk7XG4gIH1cblxuICBzb3VyY2UucGF0aG5hbWUgPSBzcmNQYXRoLmpvaW4oJy8nKTtcbiAgLy90byBzdXBwb3J0IHJlcXVlc3QuaHR0cFxuICBpZiAoc291cmNlLnBhdGhuYW1lICE9PSB1bmRlZmluZWQgfHwgc291cmNlLnNlYXJjaCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgc291cmNlLnBhdGggPSAoc291cmNlLnBhdGhuYW1lID8gc291cmNlLnBhdGhuYW1lIDogJycpICtcbiAgICAgICAgICAgICAgICAgIChzb3VyY2Uuc2VhcmNoID8gc291cmNlLnNlYXJjaCA6ICcnKTtcbiAgfVxuICBzb3VyY2UuYXV0aCA9IHJlbGF0aXZlLmF1dGggfHwgc291cmNlLmF1dGg7XG4gIHNvdXJjZS5zbGFzaGVzID0gc291cmNlLnNsYXNoZXMgfHwgcmVsYXRpdmUuc2xhc2hlcztcbiAgc291cmNlLmhyZWYgPSB1cmxGb3JtYXQoc291cmNlKTtcbiAgcmV0dXJuIHNvdXJjZTtcbn1cblxuZnVuY3Rpb24gcGFyc2VIb3N0KGhvc3QpIHtcbiAgdmFyIG91dCA9IHt9O1xuICB2YXIgcG9ydCA9IHBvcnRQYXR0ZXJuLmV4ZWMoaG9zdCk7XG4gIGlmIChwb3J0KSB7XG4gICAgcG9ydCA9IHBvcnRbMF07XG4gICAgb3V0LnBvcnQgPSBwb3J0LnN1YnN0cigxKTtcbiAgICBob3N0ID0gaG9zdC5zdWJzdHIoMCwgaG9zdC5sZW5ndGggLSBwb3J0Lmxlbmd0aCk7XG4gIH1cbiAgaWYgKGhvc3QpIG91dC5ob3N0bmFtZSA9IGhvc3Q7XG4gIHJldHVybiBvdXQ7XG59XG4iLCJ2YXIgZXZlbnRzID0gcmVxdWlyZSgnZXZlbnRzJyk7XG5cbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5leHBvcnRzLmlzRGF0ZSA9IGZ1bmN0aW9uKG9iail7cmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBEYXRlXSd9O1xuZXhwb3J0cy5pc1JlZ0V4cCA9IGZ1bmN0aW9uKG9iail7cmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBSZWdFeHBdJ307XG5cblxuZXhwb3J0cy5wcmludCA9IGZ1bmN0aW9uICgpIHt9O1xuZXhwb3J0cy5wdXRzID0gZnVuY3Rpb24gKCkge307XG5leHBvcnRzLmRlYnVnID0gZnVuY3Rpb24oKSB7fTtcblxuZXhwb3J0cy5pbnNwZWN0ID0gZnVuY3Rpb24ob2JqLCBzaG93SGlkZGVuLCBkZXB0aCwgY29sb3JzKSB7XG4gIHZhciBzZWVuID0gW107XG5cbiAgdmFyIHN0eWxpemUgPSBmdW5jdGlvbihzdHIsIHN0eWxlVHlwZSkge1xuICAgIC8vIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQU5TSV9lc2NhcGVfY29kZSNncmFwaGljc1xuICAgIHZhciBzdHlsZXMgPVxuICAgICAgICB7ICdib2xkJyA6IFsxLCAyMl0sXG4gICAgICAgICAgJ2l0YWxpYycgOiBbMywgMjNdLFxuICAgICAgICAgICd1bmRlcmxpbmUnIDogWzQsIDI0XSxcbiAgICAgICAgICAnaW52ZXJzZScgOiBbNywgMjddLFxuICAgICAgICAgICd3aGl0ZScgOiBbMzcsIDM5XSxcbiAgICAgICAgICAnZ3JleScgOiBbOTAsIDM5XSxcbiAgICAgICAgICAnYmxhY2snIDogWzMwLCAzOV0sXG4gICAgICAgICAgJ2JsdWUnIDogWzM0LCAzOV0sXG4gICAgICAgICAgJ2N5YW4nIDogWzM2LCAzOV0sXG4gICAgICAgICAgJ2dyZWVuJyA6IFszMiwgMzldLFxuICAgICAgICAgICdtYWdlbnRhJyA6IFszNSwgMzldLFxuICAgICAgICAgICdyZWQnIDogWzMxLCAzOV0sXG4gICAgICAgICAgJ3llbGxvdycgOiBbMzMsIDM5XSB9O1xuXG4gICAgdmFyIHN0eWxlID1cbiAgICAgICAgeyAnc3BlY2lhbCc6ICdjeWFuJyxcbiAgICAgICAgICAnbnVtYmVyJzogJ2JsdWUnLFxuICAgICAgICAgICdib29sZWFuJzogJ3llbGxvdycsXG4gICAgICAgICAgJ3VuZGVmaW5lZCc6ICdncmV5JyxcbiAgICAgICAgICAnbnVsbCc6ICdib2xkJyxcbiAgICAgICAgICAnc3RyaW5nJzogJ2dyZWVuJyxcbiAgICAgICAgICAnZGF0ZSc6ICdtYWdlbnRhJyxcbiAgICAgICAgICAvLyBcIm5hbWVcIjogaW50ZW50aW9uYWxseSBub3Qgc3R5bGluZ1xuICAgICAgICAgICdyZWdleHAnOiAncmVkJyB9W3N0eWxlVHlwZV07XG5cbiAgICBpZiAoc3R5bGUpIHtcbiAgICAgIHJldHVybiAnXFx1MDAxYlsnICsgc3R5bGVzW3N0eWxlXVswXSArICdtJyArIHN0ciArXG4gICAgICAgICAgICAgJ1xcdTAwMWJbJyArIHN0eWxlc1tzdHlsZV1bMV0gKyAnbSc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuICB9O1xuICBpZiAoISBjb2xvcnMpIHtcbiAgICBzdHlsaXplID0gZnVuY3Rpb24oc3RyLCBzdHlsZVR5cGUpIHsgcmV0dXJuIHN0cjsgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZvcm1hdCh2YWx1ZSwgcmVjdXJzZVRpbWVzKSB7XG4gICAgLy8gUHJvdmlkZSBhIGhvb2sgZm9yIHVzZXItc3BlY2lmaWVkIGluc3BlY3QgZnVuY3Rpb25zLlxuICAgIC8vIENoZWNrIHRoYXQgdmFsdWUgaXMgYW4gb2JqZWN0IHdpdGggYW4gaW5zcGVjdCBmdW5jdGlvbiBvbiBpdFxuICAgIGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUuaW5zcGVjdCA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgICAgICAvLyBGaWx0ZXIgb3V0IHRoZSB1dGlsIG1vZHVsZSwgaXQncyBpbnNwZWN0IGZ1bmN0aW9uIGlzIHNwZWNpYWxcbiAgICAgICAgdmFsdWUgIT09IGV4cG9ydHMgJiZcbiAgICAgICAgLy8gQWxzbyBmaWx0ZXIgb3V0IGFueSBwcm90b3R5cGUgb2JqZWN0cyB1c2luZyB0aGUgY2lyY3VsYXIgY2hlY2suXG4gICAgICAgICEodmFsdWUuY29uc3RydWN0b3IgJiYgdmFsdWUuY29uc3RydWN0b3IucHJvdG90eXBlID09PSB2YWx1ZSkpIHtcbiAgICAgIHJldHVybiB2YWx1ZS5pbnNwZWN0KHJlY3Vyc2VUaW1lcyk7XG4gICAgfVxuXG4gICAgLy8gUHJpbWl0aXZlIHR5cGVzIGNhbm5vdCBoYXZlIHByb3BlcnRpZXNcbiAgICBzd2l0Y2ggKHR5cGVvZiB2YWx1ZSkge1xuICAgICAgY2FzZSAndW5kZWZpbmVkJzpcbiAgICAgICAgcmV0dXJuIHN0eWxpemUoJ3VuZGVmaW5lZCcsICd1bmRlZmluZWQnKTtcblxuICAgICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgICAgdmFyIHNpbXBsZSA9ICdcXCcnICsgSlNPTi5zdHJpbmdpZnkodmFsdWUpLnJlcGxhY2UoL15cInxcIiQvZywgJycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJykgKyAnXFwnJztcbiAgICAgICAgcmV0dXJuIHN0eWxpemUoc2ltcGxlLCAnc3RyaW5nJyk7XG5cbiAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgIHJldHVybiBzdHlsaXplKCcnICsgdmFsdWUsICdudW1iZXInKTtcblxuICAgICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICAgIHJldHVybiBzdHlsaXplKCcnICsgdmFsdWUsICdib29sZWFuJyk7XG4gICAgfVxuICAgIC8vIEZvciBzb21lIHJlYXNvbiB0eXBlb2YgbnVsbCBpcyBcIm9iamVjdFwiLCBzbyBzcGVjaWFsIGNhc2UgaGVyZS5cbiAgICBpZiAodmFsdWUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBzdHlsaXplKCdudWxsJywgJ251bGwnKTtcbiAgICB9XG5cbiAgICAvLyBMb29rIHVwIHRoZSBrZXlzIG9mIHRoZSBvYmplY3QuXG4gICAgdmFyIHZpc2libGVfa2V5cyA9IE9iamVjdF9rZXlzKHZhbHVlKTtcbiAgICB2YXIga2V5cyA9IHNob3dIaWRkZW4gPyBPYmplY3RfZ2V0T3duUHJvcGVydHlOYW1lcyh2YWx1ZSkgOiB2aXNpYmxlX2tleXM7XG5cbiAgICAvLyBGdW5jdGlvbnMgd2l0aG91dCBwcm9wZXJ0aWVzIGNhbiBiZSBzaG9ydGN1dHRlZC5cbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nICYmIGtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICAgIHJldHVybiBzdHlsaXplKCcnICsgdmFsdWUsICdyZWdleHAnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBuYW1lID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgICAgIHJldHVybiBzdHlsaXplKCdbRnVuY3Rpb24nICsgbmFtZSArICddJywgJ3NwZWNpYWwnKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBEYXRlcyB3aXRob3V0IHByb3BlcnRpZXMgY2FuIGJlIHNob3J0Y3V0dGVkXG4gICAgaWYgKGlzRGF0ZSh2YWx1ZSkgJiYga2V5cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBzdHlsaXplKHZhbHVlLnRvVVRDU3RyaW5nKCksICdkYXRlJyk7XG4gICAgfVxuXG4gICAgdmFyIGJhc2UsIHR5cGUsIGJyYWNlcztcbiAgICAvLyBEZXRlcm1pbmUgdGhlIG9iamVjdCB0eXBlXG4gICAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgICB0eXBlID0gJ0FycmF5JztcbiAgICAgIGJyYWNlcyA9IFsnWycsICddJ107XG4gICAgfSBlbHNlIHtcbiAgICAgIHR5cGUgPSAnT2JqZWN0JztcbiAgICAgIGJyYWNlcyA9IFsneycsICd9J107XG4gICAgfVxuXG4gICAgLy8gTWFrZSBmdW5jdGlvbnMgc2F5IHRoYXQgdGhleSBhcmUgZnVuY3Rpb25zXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdmFyIG4gPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICAgIGJhc2UgPSAoaXNSZWdFeHAodmFsdWUpKSA/ICcgJyArIHZhbHVlIDogJyBbRnVuY3Rpb24nICsgbiArICddJztcbiAgICB9IGVsc2Uge1xuICAgICAgYmFzZSA9ICcnO1xuICAgIH1cblxuICAgIC8vIE1ha2UgZGF0ZXMgd2l0aCBwcm9wZXJ0aWVzIGZpcnN0IHNheSB0aGUgZGF0ZVxuICAgIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgICBiYXNlID0gJyAnICsgdmFsdWUudG9VVENTdHJpbmcoKTtcbiAgICB9XG5cbiAgICBpZiAoa2V5cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgYnJhY2VzWzFdO1xuICAgIH1cblxuICAgIGlmIChyZWN1cnNlVGltZXMgPCAwKSB7XG4gICAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICAgIHJldHVybiBzdHlsaXplKCcnICsgdmFsdWUsICdyZWdleHAnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBzdHlsaXplKCdbT2JqZWN0XScsICdzcGVjaWFsJyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgc2Vlbi5wdXNoKHZhbHVlKTtcblxuICAgIHZhciBvdXRwdXQgPSBrZXlzLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICAgIHZhciBuYW1lLCBzdHI7XG4gICAgICBpZiAodmFsdWUuX19sb29rdXBHZXR0ZXJfXykge1xuICAgICAgICBpZiAodmFsdWUuX19sb29rdXBHZXR0ZXJfXyhrZXkpKSB7XG4gICAgICAgICAgaWYgKHZhbHVlLl9fbG9va3VwU2V0dGVyX18oa2V5KSkge1xuICAgICAgICAgICAgc3RyID0gc3R5bGl6ZSgnW0dldHRlci9TZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3RyID0gc3R5bGl6ZSgnW0dldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAodmFsdWUuX19sb29rdXBTZXR0ZXJfXyhrZXkpKSB7XG4gICAgICAgICAgICBzdHIgPSBzdHlsaXplKCdbU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAodmlzaWJsZV9rZXlzLmluZGV4T2Yoa2V5KSA8IDApIHtcbiAgICAgICAgbmFtZSA9ICdbJyArIGtleSArICddJztcbiAgICAgIH1cbiAgICAgIGlmICghc3RyKSB7XG4gICAgICAgIGlmIChzZWVuLmluZGV4T2YodmFsdWVba2V5XSkgPCAwKSB7XG4gICAgICAgICAgaWYgKHJlY3Vyc2VUaW1lcyA9PT0gbnVsbCkge1xuICAgICAgICAgICAgc3RyID0gZm9ybWF0KHZhbHVlW2tleV0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdHIgPSBmb3JtYXQodmFsdWVba2V5XSwgcmVjdXJzZVRpbWVzIC0gMSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzdHIuaW5kZXhPZignXFxuJykgPiAtMSkge1xuICAgICAgICAgICAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgICAgICAgIHN0ciA9IHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJyAgJyArIGxpbmU7XG4gICAgICAgICAgICAgIH0pLmpvaW4oJ1xcbicpLnN1YnN0cigyKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHN0ciA9ICdcXG4nICsgc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAnICAgJyArIGxpbmU7XG4gICAgICAgICAgICAgIH0pLmpvaW4oJ1xcbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdHIgPSBzdHlsaXplKCdbQ2lyY3VsYXJdJywgJ3NwZWNpYWwnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiBuYW1lID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICBpZiAodHlwZSA9PT0gJ0FycmF5JyAmJiBrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICAgICAgcmV0dXJuIHN0cjtcbiAgICAgICAgfVxuICAgICAgICBuYW1lID0gSlNPTi5zdHJpbmdpZnkoJycgKyBrZXkpO1xuICAgICAgICBpZiAobmFtZS5tYXRjaCgvXlwiKFthLXpBLVpfXVthLXpBLVpfMC05XSopXCIkLykpIHtcbiAgICAgICAgICBuYW1lID0gbmFtZS5zdWJzdHIoMSwgbmFtZS5sZW5ndGggLSAyKTtcbiAgICAgICAgICBuYW1lID0gc3R5bGl6ZShuYW1lLCAnbmFtZScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKVxuICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLyheXCJ8XCIkKS9nLCBcIidcIik7XG4gICAgICAgICAgbmFtZSA9IHN0eWxpemUobmFtZSwgJ3N0cmluZycpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBuYW1lICsgJzogJyArIHN0cjtcbiAgICB9KTtcblxuICAgIHNlZW4ucG9wKCk7XG5cbiAgICB2YXIgbnVtTGluZXNFc3QgPSAwO1xuICAgIHZhciBsZW5ndGggPSBvdXRwdXQucmVkdWNlKGZ1bmN0aW9uKHByZXYsIGN1cikge1xuICAgICAgbnVtTGluZXNFc3QrKztcbiAgICAgIGlmIChjdXIuaW5kZXhPZignXFxuJykgPj0gMCkgbnVtTGluZXNFc3QrKztcbiAgICAgIHJldHVybiBwcmV2ICsgY3VyLmxlbmd0aCArIDE7XG4gICAgfSwgMCk7XG5cbiAgICBpZiAobGVuZ3RoID4gNTApIHtcbiAgICAgIG91dHB1dCA9IGJyYWNlc1swXSArXG4gICAgICAgICAgICAgICAoYmFzZSA9PT0gJycgPyAnJyA6IGJhc2UgKyAnXFxuICcpICtcbiAgICAgICAgICAgICAgICcgJyArXG4gICAgICAgICAgICAgICBvdXRwdXQuam9pbignLFxcbiAgJykgK1xuICAgICAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgICAgIGJyYWNlc1sxXTtcblxuICAgIH0gZWxzZSB7XG4gICAgICBvdXRwdXQgPSBicmFjZXNbMF0gKyBiYXNlICsgJyAnICsgb3V0cHV0LmpvaW4oJywgJykgKyAnICcgKyBicmFjZXNbMV07XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dHB1dDtcbiAgfVxuICByZXR1cm4gZm9ybWF0KG9iaiwgKHR5cGVvZiBkZXB0aCA9PT0gJ3VuZGVmaW5lZCcgPyAyIDogZGVwdGgpKTtcbn07XG5cblxuZnVuY3Rpb24gaXNBcnJheShhcikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShhcikgfHxcbiAgICAgICAgICh0eXBlb2YgYXIgPT09ICdvYmplY3QnICYmIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhcikgPT09ICdbb2JqZWN0IEFycmF5XScpO1xufVxuXG5cbmZ1bmN0aW9uIGlzUmVnRXhwKHJlKSB7XG4gIHR5cGVvZiByZSA9PT0gJ29iamVjdCcgJiYgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHJlKSA9PT0gJ1tvYmplY3QgUmVnRXhwXSc7XG59XG5cblxuZnVuY3Rpb24gaXNEYXRlKGQpIHtcbiAgcmV0dXJuIHR5cGVvZiBkID09PSAnb2JqZWN0JyAmJiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZCkgPT09ICdbb2JqZWN0IERhdGVdJztcbn1cblxuZnVuY3Rpb24gcGFkKG4pIHtcbiAgcmV0dXJuIG4gPCAxMCA/ICcwJyArIG4udG9TdHJpbmcoMTApIDogbi50b1N0cmluZygxMCk7XG59XG5cbnZhciBtb250aHMgPSBbJ0phbicsICdGZWInLCAnTWFyJywgJ0FwcicsICdNYXknLCAnSnVuJywgJ0p1bCcsICdBdWcnLCAnU2VwJyxcbiAgICAgICAgICAgICAgJ09jdCcsICdOb3YnLCAnRGVjJ107XG5cbi8vIDI2IEZlYiAxNjoxOTozNFxuZnVuY3Rpb24gdGltZXN0YW1wKCkge1xuICB2YXIgZCA9IG5ldyBEYXRlKCk7XG4gIHZhciB0aW1lID0gW3BhZChkLmdldEhvdXJzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRNaW51dGVzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRTZWNvbmRzKCkpXS5qb2luKCc6Jyk7XG4gIHJldHVybiBbZC5nZXREYXRlKCksIG1vbnRoc1tkLmdldE1vbnRoKCldLCB0aW1lXS5qb2luKCcgJyk7XG59XG5cbmV4cG9ydHMubG9nID0gZnVuY3Rpb24gKG1zZykge307XG5cbmV4cG9ydHMucHVtcCA9IG51bGw7XG5cbnZhciBPYmplY3Rfa2V5cyA9IE9iamVjdC5rZXlzIHx8IGZ1bmN0aW9uIChvYmopIHtcbiAgICB2YXIgcmVzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikgcmVzLnB1c2goa2V5KTtcbiAgICByZXR1cm4gcmVzO1xufTtcblxudmFyIE9iamVjdF9nZXRPd25Qcm9wZXJ0eU5hbWVzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMgfHwgZnVuY3Rpb24gKG9iaikge1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICAgIGlmIChPYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIHJlcy5wdXNoKGtleSk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59O1xuXG52YXIgT2JqZWN0X2NyZWF0ZSA9IE9iamVjdC5jcmVhdGUgfHwgZnVuY3Rpb24gKHByb3RvdHlwZSwgcHJvcGVydGllcykge1xuICAgIC8vIGZyb20gZXM1LXNoaW1cbiAgICB2YXIgb2JqZWN0O1xuICAgIGlmIChwcm90b3R5cGUgPT09IG51bGwpIHtcbiAgICAgICAgb2JqZWN0ID0geyAnX19wcm90b19fJyA6IG51bGwgfTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGlmICh0eXBlb2YgcHJvdG90eXBlICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgICAgICAgICAndHlwZW9mIHByb3RvdHlwZVsnICsgKHR5cGVvZiBwcm90b3R5cGUpICsgJ10gIT0gXFwnb2JqZWN0XFwnJ1xuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgVHlwZSA9IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICBUeXBlLnByb3RvdHlwZSA9IHByb3RvdHlwZTtcbiAgICAgICAgb2JqZWN0ID0gbmV3IFR5cGUoKTtcbiAgICAgICAgb2JqZWN0Ll9fcHJvdG9fXyA9IHByb3RvdHlwZTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBwcm9wZXJ0aWVzICE9PSAndW5kZWZpbmVkJyAmJiBPYmplY3QuZGVmaW5lUHJvcGVydGllcykge1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhvYmplY3QsIHByb3BlcnRpZXMpO1xuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0O1xufTtcblxuZXhwb3J0cy5pbmhlcml0cyA9IGZ1bmN0aW9uKGN0b3IsIHN1cGVyQ3Rvcikge1xuICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvcjtcbiAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3RfY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgfVxuICB9KTtcbn07XG5cbnZhciBmb3JtYXRSZWdFeHAgPSAvJVtzZGolXS9nO1xuZXhwb3J0cy5mb3JtYXQgPSBmdW5jdGlvbihmKSB7XG4gIGlmICh0eXBlb2YgZiAhPT0gJ3N0cmluZycpIHtcbiAgICB2YXIgb2JqZWN0cyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBvYmplY3RzLnB1c2goZXhwb3J0cy5pbnNwZWN0KGFyZ3VtZW50c1tpXSkpO1xuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0cy5qb2luKCcgJyk7XG4gIH1cblxuICB2YXIgaSA9IDE7XG4gIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICB2YXIgbGVuID0gYXJncy5sZW5ndGg7XG4gIHZhciBzdHIgPSBTdHJpbmcoZikucmVwbGFjZShmb3JtYXRSZWdFeHAsIGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoeCA9PT0gJyUlJykgcmV0dXJuICclJztcbiAgICBpZiAoaSA+PSBsZW4pIHJldHVybiB4O1xuICAgIHN3aXRjaCAoeCkge1xuICAgICAgY2FzZSAnJXMnOiByZXR1cm4gU3RyaW5nKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclZCc6IHJldHVybiBOdW1iZXIoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVqJzogcmV0dXJuIEpTT04uc3RyaW5naWZ5KGFyZ3NbaSsrXSk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4geDtcbiAgICB9XG4gIH0pO1xuICBmb3IodmFyIHggPSBhcmdzW2ldOyBpIDwgbGVuOyB4ID0gYXJnc1srK2ldKXtcbiAgICBpZiAoeCA9PT0gbnVsbCB8fCB0eXBlb2YgeCAhPT0gJ29iamVjdCcpIHtcbiAgICAgIHN0ciArPSAnICcgKyB4O1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgKz0gJyAnICsgZXhwb3J0cy5pbnNwZWN0KHgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3RyO1xufTtcbiIsInZhciBodHRwID0gbW9kdWxlLmV4cG9ydHM7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xudmFyIFJlcXVlc3QgPSByZXF1aXJlKCcuL2xpYi9yZXF1ZXN0Jyk7XG5cbmh0dHAucmVxdWVzdCA9IGZ1bmN0aW9uIChwYXJhbXMsIGNiKSB7XG4gICAgaWYgKCFwYXJhbXMpIHBhcmFtcyA9IHt9O1xuICAgIGlmICghcGFyYW1zLmhvc3QpIHBhcmFtcy5ob3N0ID0gd2luZG93LmxvY2F0aW9uLmhvc3Quc3BsaXQoJzonKVswXTtcbiAgICBpZiAoIXBhcmFtcy5wb3J0KSBwYXJhbXMucG9ydCA9IHdpbmRvdy5sb2NhdGlvbi5wb3J0O1xuICAgIGlmICghcGFyYW1zLnNjaGVtZSkgcGFyYW1zLnNjaGVtZSA9IHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbC5zcGxpdCgnOicpWzBdO1xuICAgIFxuICAgIHZhciByZXEgPSBuZXcgUmVxdWVzdChuZXcgeGhySHR0cCwgcGFyYW1zKTtcbiAgICBpZiAoY2IpIHJlcS5vbigncmVzcG9uc2UnLCBjYik7XG4gICAgcmV0dXJuIHJlcTtcbn07XG5cbmh0dHAuZ2V0ID0gZnVuY3Rpb24gKHBhcmFtcywgY2IpIHtcbiAgICBwYXJhbXMubWV0aG9kID0gJ0dFVCc7XG4gICAgdmFyIHJlcSA9IGh0dHAucmVxdWVzdChwYXJhbXMsIGNiKTtcbiAgICByZXEuZW5kKCk7XG4gICAgcmV0dXJuIHJlcTtcbn07XG5cbmh0dHAuQWdlbnQgPSBmdW5jdGlvbiAoKSB7fTtcbmh0dHAuQWdlbnQuZGVmYXVsdE1heFNvY2tldHMgPSA0O1xuXG52YXIgeGhySHR0cCA9IChmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignbm8gd2luZG93IG9iamVjdCBwcmVzZW50Jyk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHdpbmRvdy5YTUxIdHRwUmVxdWVzdCkge1xuICAgICAgICByZXR1cm4gd2luZG93LlhNTEh0dHBSZXF1ZXN0O1xuICAgIH1cbiAgICBlbHNlIGlmICh3aW5kb3cuQWN0aXZlWE9iamVjdCkge1xuICAgICAgICB2YXIgYXhzID0gW1xuICAgICAgICAgICAgJ01zeG1sMi5YTUxIVFRQLjYuMCcsXG4gICAgICAgICAgICAnTXN4bWwyLlhNTEhUVFAuMy4wJyxcbiAgICAgICAgICAgICdNaWNyb3NvZnQuWE1MSFRUUCdcbiAgICAgICAgXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBheHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdmFyIGF4ID0gbmV3KHdpbmRvdy5BY3RpdmVYT2JqZWN0KShheHNbaV0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChheCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGF4XyA9IGF4O1xuICAgICAgICAgICAgICAgICAgICAgICAgYXggPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGF4XztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcod2luZG93LkFjdGl2ZVhPYmplY3QpKGF4c1tpXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2F0Y2ggKGUpIHt9XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdhamF4IG5vdCBzdXBwb3J0ZWQgaW4gdGhpcyBicm93c2VyJylcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYWpheCBub3Qgc3VwcG9ydGVkIGluIHRoaXMgYnJvd3NlcicpO1xuICAgIH1cbn0pKCk7XG4iLCJ2YXIgU3RyZWFtID0gcmVxdWlyZSgnc3RyZWFtJyk7XG52YXIgUmVzcG9uc2UgPSByZXF1aXJlKCcuL3Jlc3BvbnNlJyk7XG52YXIgY29uY2F0U3RyZWFtID0gcmVxdWlyZSgnY29uY2F0LXN0cmVhbScpO1xudmFyIEJhc2U2NCA9IHJlcXVpcmUoJ0Jhc2U2NCcpO1xuXG52YXIgUmVxdWVzdCA9IG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKHhociwgcGFyYW1zKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHNlbGYud3JpdGFibGUgPSB0cnVlO1xuICAgIHNlbGYueGhyID0geGhyO1xuICAgIHNlbGYuYm9keSA9IGNvbmNhdFN0cmVhbSgpXG4gICAgXG4gICAgdmFyIHVyaSA9IHBhcmFtcy5ob3N0XG4gICAgICAgICsgKHBhcmFtcy5wb3J0ID8gJzonICsgcGFyYW1zLnBvcnQgOiAnJylcbiAgICAgICAgKyAocGFyYW1zLnBhdGggfHwgJy8nKVxuICAgIDtcbiAgICBcbiAgICB4aHIub3BlbihcbiAgICAgICAgcGFyYW1zLm1ldGhvZCB8fCAnR0VUJyxcbiAgICAgICAgKHBhcmFtcy5zY2hlbWUgfHwgJ2h0dHAnKSArICc6Ly8nICsgdXJpLFxuICAgICAgICB0cnVlXG4gICAgKTtcbiAgICBcbiAgICBpZiAocGFyYW1zLmhlYWRlcnMpIHtcbiAgICAgICAgdmFyIGtleXMgPSBvYmplY3RLZXlzKHBhcmFtcy5oZWFkZXJzKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIga2V5ID0ga2V5c1tpXTtcbiAgICAgICAgICAgIGlmICghc2VsZi5pc1NhZmVSZXF1ZXN0SGVhZGVyKGtleSkpIGNvbnRpbnVlO1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gcGFyYW1zLmhlYWRlcnNba2V5XTtcbiAgICAgICAgICAgIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgdmFsdWUubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoa2V5LCB2YWx1ZVtqXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB4aHIuc2V0UmVxdWVzdEhlYWRlcihrZXksIHZhbHVlKVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIGlmIChwYXJhbXMuYXV0aCkge1xuICAgICAgICAvL2Jhc2ljIGF1dGhcbiAgICAgICAgdGhpcy5zZXRIZWFkZXIoJ0F1dGhvcml6YXRpb24nLCAnQmFzaWMgJyArIEJhc2U2NC5idG9hKHBhcmFtcy5hdXRoKSk7XG4gICAgfVxuXG4gICAgdmFyIHJlcyA9IG5ldyBSZXNwb25zZTtcbiAgICByZXMub24oJ2Nsb3NlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBzZWxmLmVtaXQoJ2Nsb3NlJyk7XG4gICAgfSk7XG4gICAgXG4gICAgcmVzLm9uKCdyZWFkeScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2VsZi5lbWl0KCdyZXNwb25zZScsIHJlcyk7XG4gICAgfSk7XG4gICAgXG4gICAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmVzLmhhbmRsZSh4aHIpO1xuICAgIH07XG59O1xuXG5SZXF1ZXN0LnByb3RvdHlwZSA9IG5ldyBTdHJlYW07XG5cblJlcXVlc3QucHJvdG90eXBlLnNldEhlYWRlciA9IGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XG4gICAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmFsdWUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMueGhyLnNldFJlcXVlc3RIZWFkZXIoa2V5LCB2YWx1ZVtpXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMueGhyLnNldFJlcXVlc3RIZWFkZXIoa2V5LCB2YWx1ZSk7XG4gICAgfVxufTtcblxuUmVxdWVzdC5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiAocykge1xuICAgIHRoaXMuYm9keS53cml0ZShzKTtcbn07XG5cblJlcXVlc3QucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiAocykge1xuICAgIHRoaXMueGhyLmFib3J0KCk7XG4gICAgdGhpcy5lbWl0KCdjbG9zZScpO1xufTtcblxuUmVxdWVzdC5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24gKHMpIHtcbiAgICBpZiAocyAhPT0gdW5kZWZpbmVkKSB0aGlzLmJvZHkud3JpdGUocyk7XG4gICAgdGhpcy5ib2R5LmVuZCgpXG4gICAgdGhpcy54aHIuc2VuZCh0aGlzLmJvZHkuZ2V0Qm9keSgpKTtcbn07XG5cbi8vIFRha2VuIGZyb20gaHR0cDovL2R4ci5tb3ppbGxhLm9yZy9tb3ppbGxhL21vemlsbGEtY2VudHJhbC9jb250ZW50L2Jhc2Uvc3JjL25zWE1MSHR0cFJlcXVlc3QuY3BwLmh0bWxcblJlcXVlc3QudW5zYWZlSGVhZGVycyA9IFtcbiAgICBcImFjY2VwdC1jaGFyc2V0XCIsXG4gICAgXCJhY2NlcHQtZW5jb2RpbmdcIixcbiAgICBcImFjY2Vzcy1jb250cm9sLXJlcXVlc3QtaGVhZGVyc1wiLFxuICAgIFwiYWNjZXNzLWNvbnRyb2wtcmVxdWVzdC1tZXRob2RcIixcbiAgICBcImNvbm5lY3Rpb25cIixcbiAgICBcImNvbnRlbnQtbGVuZ3RoXCIsXG4gICAgXCJjb29raWVcIixcbiAgICBcImNvb2tpZTJcIixcbiAgICBcImNvbnRlbnQtdHJhbnNmZXItZW5jb2RpbmdcIixcbiAgICBcImRhdGVcIixcbiAgICBcImV4cGVjdFwiLFxuICAgIFwiaG9zdFwiLFxuICAgIFwia2VlcC1hbGl2ZVwiLFxuICAgIFwib3JpZ2luXCIsXG4gICAgXCJyZWZlcmVyXCIsXG4gICAgXCJ0ZVwiLFxuICAgIFwidHJhaWxlclwiLFxuICAgIFwidHJhbnNmZXItZW5jb2RpbmdcIixcbiAgICBcInVwZ3JhZGVcIixcbiAgICBcInVzZXItYWdlbnRcIixcbiAgICBcInZpYVwiXG5dO1xuXG5SZXF1ZXN0LnByb3RvdHlwZS5pc1NhZmVSZXF1ZXN0SGVhZGVyID0gZnVuY3Rpb24gKGhlYWRlck5hbWUpIHtcbiAgICBpZiAoIWhlYWRlck5hbWUpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gaW5kZXhPZihSZXF1ZXN0LnVuc2FmZUhlYWRlcnMsIGhlYWRlck5hbWUudG9Mb3dlckNhc2UoKSkgPT09IC0xO1xufTtcblxudmFyIG9iamVjdEtleXMgPSBPYmplY3Qua2V5cyB8fCBmdW5jdGlvbiAob2JqKSB7XG4gICAgdmFyIGtleXMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSBrZXlzLnB1c2goa2V5KTtcbiAgICByZXR1cm4ga2V5cztcbn07XG5cbnZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoeHMpIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHhzKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbn07XG5cbnZhciBpbmRleE9mID0gZnVuY3Rpb24gKHhzLCB4KSB7XG4gICAgaWYgKHhzLmluZGV4T2YpIHJldHVybiB4cy5pbmRleE9mKHgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKHhzW2ldID09PSB4KSByZXR1cm4gaTtcbiAgICB9XG4gICAgcmV0dXJuIC0xO1xufTtcbiIsInZhciBTdHJlYW0gPSByZXF1aXJlKCdzdHJlYW0nKTtcblxudmFyIFJlc3BvbnNlID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAocmVzKSB7XG4gICAgdGhpcy5vZmZzZXQgPSAwO1xuICAgIHRoaXMucmVhZGFibGUgPSB0cnVlO1xufTtcblxuUmVzcG9uc2UucHJvdG90eXBlID0gbmV3IFN0cmVhbTtcblxudmFyIGNhcGFibGUgPSB7XG4gICAgc3RyZWFtaW5nIDogdHJ1ZSxcbiAgICBzdGF0dXMyIDogdHJ1ZVxufTtcblxuZnVuY3Rpb24gcGFyc2VIZWFkZXJzIChyZXMpIHtcbiAgICB2YXIgbGluZXMgPSByZXMuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkuc3BsaXQoL1xccj9cXG4vKTtcbiAgICB2YXIgaGVhZGVycyA9IHt9O1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGxpbmUgPSBsaW5lc1tpXTtcbiAgICAgICAgaWYgKGxpbmUgPT09ICcnKSBjb250aW51ZTtcbiAgICAgICAgXG4gICAgICAgIHZhciBtID0gbGluZS5tYXRjaCgvXihbXjpdKyk6XFxzKiguKikvKTtcbiAgICAgICAgaWYgKG0pIHtcbiAgICAgICAgICAgIHZhciBrZXkgPSBtWzFdLnRvTG93ZXJDYXNlKCksIHZhbHVlID0gbVsyXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGhlYWRlcnNba2V5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoaXNBcnJheShoZWFkZXJzW2tleV0pKSB7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcnNba2V5XS5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcnNba2V5XSA9IFsgaGVhZGVyc1trZXldLCB2YWx1ZSBdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGhlYWRlcnNba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaGVhZGVyc1tsaW5lXSA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGhlYWRlcnM7XG59XG5cblJlc3BvbnNlLnByb3RvdHlwZS5nZXRSZXNwb25zZSA9IGZ1bmN0aW9uICh4aHIpIHtcbiAgICB2YXIgcmVzcFR5cGUgPSBTdHJpbmcoeGhyLnJlc3BvbnNlVHlwZSkudG9Mb3dlckNhc2UoKTtcbiAgICBpZiAocmVzcFR5cGUgPT09ICdibG9iJykgcmV0dXJuIHhoci5yZXNwb25zZUJsb2IgfHwgeGhyLnJlc3BvbnNlO1xuICAgIGlmIChyZXNwVHlwZSA9PT0gJ2FycmF5YnVmZmVyJykgcmV0dXJuIHhoci5yZXNwb25zZTtcbiAgICByZXR1cm4geGhyLnJlc3BvbnNlVGV4dDtcbn1cblxuUmVzcG9uc2UucHJvdG90eXBlLmdldEhlYWRlciA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICByZXR1cm4gdGhpcy5oZWFkZXJzW2tleS50b0xvd2VyQ2FzZSgpXTtcbn07XG5cblJlc3BvbnNlLnByb3RvdHlwZS5oYW5kbGUgPSBmdW5jdGlvbiAocmVzKSB7XG4gICAgaWYgKHJlcy5yZWFkeVN0YXRlID09PSAyICYmIGNhcGFibGUuc3RhdHVzMikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy5zdGF0dXNDb2RlID0gcmVzLnN0YXR1cztcbiAgICAgICAgICAgIHRoaXMuaGVhZGVycyA9IHBhcnNlSGVhZGVycyhyZXMpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIGNhcGFibGUuc3RhdHVzMiA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoY2FwYWJsZS5zdGF0dXMyKSB7XG4gICAgICAgICAgICB0aGlzLmVtaXQoJ3JlYWR5Jyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAoY2FwYWJsZS5zdHJlYW1pbmcgJiYgcmVzLnJlYWR5U3RhdGUgPT09IDMpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlmICghdGhpcy5zdGF0dXNDb2RlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0dXNDb2RlID0gcmVzLnN0YXR1cztcbiAgICAgICAgICAgICAgICB0aGlzLmhlYWRlcnMgPSBwYXJzZUhlYWRlcnMocmVzKTtcbiAgICAgICAgICAgICAgICB0aGlzLmVtaXQoJ3JlYWR5Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycikge31cbiAgICAgICAgXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLl9lbWl0RGF0YShyZXMpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIGNhcGFibGUuc3RyZWFtaW5nID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAocmVzLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgaWYgKCF0aGlzLnN0YXR1c0NvZGUpIHtcbiAgICAgICAgICAgIHRoaXMuc3RhdHVzQ29kZSA9IHJlcy5zdGF0dXM7XG4gICAgICAgICAgICB0aGlzLmVtaXQoJ3JlYWR5Jyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fZW1pdERhdGEocmVzKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChyZXMuZXJyb3IpIHtcbiAgICAgICAgICAgIHRoaXMuZW1pdCgnZXJyb3InLCB0aGlzLmdldFJlc3BvbnNlKHJlcykpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgdGhpcy5lbWl0KCdlbmQnKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuZW1pdCgnY2xvc2UnKTtcbiAgICB9XG59O1xuXG5SZXNwb25zZS5wcm90b3R5cGUuX2VtaXREYXRhID0gZnVuY3Rpb24gKHJlcykge1xuICAgIHZhciByZXNwQm9keSA9IHRoaXMuZ2V0UmVzcG9uc2UocmVzKTtcbiAgICBpZiAocmVzcEJvZHkudG9TdHJpbmcoKS5tYXRjaCgvQXJyYXlCdWZmZXIvKSkge1xuICAgICAgICB0aGlzLmVtaXQoJ2RhdGEnLCBuZXcgVWludDhBcnJheShyZXNwQm9keSwgdGhpcy5vZmZzZXQpKTtcbiAgICAgICAgdGhpcy5vZmZzZXQgPSByZXNwQm9keS5ieXRlTGVuZ3RoO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChyZXNwQm9keS5sZW5ndGggPiB0aGlzLm9mZnNldCkge1xuICAgICAgICB0aGlzLmVtaXQoJ2RhdGEnLCByZXNwQm9keS5zbGljZSh0aGlzLm9mZnNldCkpO1xuICAgICAgICB0aGlzLm9mZnNldCA9IHJlc3BCb2R5Lmxlbmd0aDtcbiAgICB9XG59O1xuXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKHhzKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh4cykgPT09ICdbb2JqZWN0IEFycmF5XSc7XG59O1xuIiwiOyhmdW5jdGlvbiAoKSB7XG5cbiAgdmFyXG4gICAgb2JqZWN0ID0gdHlwZW9mIHdpbmRvdyAhPSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IGV4cG9ydHMsXG4gICAgY2hhcnMgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLz0nLFxuICAgIElOVkFMSURfQ0hBUkFDVEVSX0VSUiA9IChmdW5jdGlvbiAoKSB7XG4gICAgICAvLyBmYWJyaWNhdGUgYSBzdWl0YWJsZSBlcnJvciBvYmplY3RcbiAgICAgIHRyeSB7IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJyQnKTsgfVxuICAgICAgY2F0Y2ggKGVycm9yKSB7IHJldHVybiBlcnJvcjsgfX0oKSk7XG5cbiAgLy8gZW5jb2RlclxuICAvLyBbaHR0cHM6Ly9naXN0LmdpdGh1Yi5jb20vOTk5MTY2XSBieSBbaHR0cHM6Ly9naXRodWIuY29tL25pZ25hZ11cbiAgb2JqZWN0LmJ0b2EgfHwgKFxuICBvYmplY3QuYnRvYSA9IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgIGZvciAoXG4gICAgICAvLyBpbml0aWFsaXplIHJlc3VsdCBhbmQgY291bnRlclxuICAgICAgdmFyIGJsb2NrLCBjaGFyQ29kZSwgaWR4ID0gMCwgbWFwID0gY2hhcnMsIG91dHB1dCA9ICcnO1xuICAgICAgLy8gaWYgdGhlIG5leHQgaW5wdXQgaW5kZXggZG9lcyBub3QgZXhpc3Q6XG4gICAgICAvLyAgIGNoYW5nZSB0aGUgbWFwcGluZyB0YWJsZSB0byBcIj1cIlxuICAgICAgLy8gICBjaGVjayBpZiBkIGhhcyBubyBmcmFjdGlvbmFsIGRpZ2l0c1xuICAgICAgaW5wdXQuY2hhckF0KGlkeCB8IDApIHx8IChtYXAgPSAnPScsIGlkeCAlIDEpO1xuICAgICAgLy8gXCI4IC0gaWR4ICUgMSAqIDhcIiBnZW5lcmF0ZXMgdGhlIHNlcXVlbmNlIDIsIDQsIDYsIDhcbiAgICAgIG91dHB1dCArPSBtYXAuY2hhckF0KDYzICYgYmxvY2sgPj4gOCAtIGlkeCAlIDEgKiA4KVxuICAgICkge1xuICAgICAgY2hhckNvZGUgPSBpbnB1dC5jaGFyQ29kZUF0KGlkeCArPSAzLzQpO1xuICAgICAgaWYgKGNoYXJDb2RlID4gMHhGRikgdGhyb3cgSU5WQUxJRF9DSEFSQUNURVJfRVJSO1xuICAgICAgYmxvY2sgPSBibG9jayA8PCA4IHwgY2hhckNvZGU7XG4gICAgfVxuICAgIHJldHVybiBvdXRwdXQ7XG4gIH0pO1xuXG4gIC8vIGRlY29kZXJcbiAgLy8gW2h0dHBzOi8vZ2lzdC5naXRodWIuY29tLzEwMjAzOTZdIGJ5IFtodHRwczovL2dpdGh1Yi5jb20vYXRrXVxuICBvYmplY3QuYXRvYiB8fCAoXG4gIG9iamVjdC5hdG9iID0gZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgaW5wdXQgPSBpbnB1dC5yZXBsYWNlKC89KyQvLCAnJylcbiAgICBpZiAoaW5wdXQubGVuZ3RoICUgNCA9PSAxKSB0aHJvdyBJTlZBTElEX0NIQVJBQ1RFUl9FUlI7XG4gICAgZm9yIChcbiAgICAgIC8vIGluaXRpYWxpemUgcmVzdWx0IGFuZCBjb3VudGVyc1xuICAgICAgdmFyIGJjID0gMCwgYnMsIGJ1ZmZlciwgaWR4ID0gMCwgb3V0cHV0ID0gJyc7XG4gICAgICAvLyBnZXQgbmV4dCBjaGFyYWN0ZXJcbiAgICAgIGJ1ZmZlciA9IGlucHV0LmNoYXJBdChpZHgrKyk7XG4gICAgICAvLyBjaGFyYWN0ZXIgZm91bmQgaW4gdGFibGU/IGluaXRpYWxpemUgYml0IHN0b3JhZ2UgYW5kIGFkZCBpdHMgYXNjaWkgdmFsdWU7XG4gICAgICB+YnVmZmVyICYmIChicyA9IGJjICUgNCA/IGJzICogNjQgKyBidWZmZXIgOiBidWZmZXIsXG4gICAgICAgIC8vIGFuZCBpZiBub3QgZmlyc3Qgb2YgZWFjaCA0IGNoYXJhY3RlcnMsXG4gICAgICAgIC8vIGNvbnZlcnQgdGhlIGZpcnN0IDggYml0cyB0byBvbmUgYXNjaWkgY2hhcmFjdGVyXG4gICAgICAgIGJjKysgJSA0KSA/IG91dHB1dCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKDI1NSAmIGJzID4+ICgtMiAqIGJjICYgNikpIDogMFxuICAgICkge1xuICAgICAgLy8gdHJ5IHRvIGZpbmQgY2hhcmFjdGVyIGluIHRhYmxlICgwLTYzLCBub3QgZm91bmQgPT4gLTEpXG4gICAgICBidWZmZXIgPSBjaGFycy5pbmRleE9mKGJ1ZmZlcik7XG4gICAgfVxuICAgIHJldHVybiBvdXRwdXQ7XG4gIH0pO1xuXG59KCkpO1xuIiwidmFyIHN0cmVhbSA9IHJlcXVpcmUoJ3N0cmVhbScpXG52YXIgYm9wcyA9IHJlcXVpcmUoJ2JvcHMnKVxudmFyIHV0aWwgPSByZXF1aXJlKCd1dGlsJylcblxuZnVuY3Rpb24gQ29uY2F0U3RyZWFtKGNiKSB7XG4gIHN0cmVhbS5TdHJlYW0uY2FsbCh0aGlzKVxuICB0aGlzLndyaXRhYmxlID0gdHJ1ZVxuICBpZiAoY2IpIHRoaXMuY2IgPSBjYlxuICB0aGlzLmJvZHkgPSBbXVxuICB0aGlzLm9uKCdlcnJvcicsIGZ1bmN0aW9uKGVycikge1xuICAgIC8vIG5vLW9wXG4gIH0pXG59XG5cbnV0aWwuaW5oZXJpdHMoQ29uY2F0U3RyZWFtLCBzdHJlYW0uU3RyZWFtKVxuXG5Db25jYXRTdHJlYW0ucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24oY2h1bmspIHtcbiAgdGhpcy5ib2R5LnB1c2goY2h1bmspXG59XG5cbkNvbmNhdFN0cmVhbS5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uKCkge31cblxuQ29uY2F0U3RyZWFtLnByb3RvdHlwZS5hcnJheUNvbmNhdCA9IGZ1bmN0aW9uKGFycnMpIHtcbiAgaWYgKGFycnMubGVuZ3RoID09PSAwKSByZXR1cm4gW11cbiAgaWYgKGFycnMubGVuZ3RoID09PSAxKSByZXR1cm4gYXJyc1swXVxuICByZXR1cm4gYXJycy5yZWR1Y2UoZnVuY3Rpb24gKGEsIGIpIHsgcmV0dXJuIGEuY29uY2F0KGIpIH0pXG59XG5cbkNvbmNhdFN0cmVhbS5wcm90b3R5cGUuaXNBcnJheSA9IGZ1bmN0aW9uKGFycikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShhcnIpXG59XG5cbkNvbmNhdFN0cmVhbS5wcm90b3R5cGUuZ2V0Qm9keSA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMuYm9keS5sZW5ndGggPT09IDApIHJldHVyblxuICBpZiAodHlwZW9mKHRoaXMuYm9keVswXSkgPT09IFwic3RyaW5nXCIpIHJldHVybiB0aGlzLmJvZHkuam9pbignJylcbiAgaWYgKHRoaXMuaXNBcnJheSh0aGlzLmJvZHlbMF0pKSByZXR1cm4gdGhpcy5hcnJheUNvbmNhdCh0aGlzLmJvZHkpXG4gIGlmIChib3BzLmlzKHRoaXMuYm9keVswXSkpIHJldHVybiBib3BzLmpvaW4odGhpcy5ib2R5KVxuICByZXR1cm4gdGhpcy5ib2R5XG59XG5cbkNvbmNhdFN0cmVhbS5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLmNiKSB0aGlzLmNiKHRoaXMuZ2V0Qm9keSgpKVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNiKSB7XG4gIHJldHVybiBuZXcgQ29uY2F0U3RyZWFtKGNiKVxufVxuXG5tb2R1bGUuZXhwb3J0cy5Db25jYXRTdHJlYW0gPSBDb25jYXRTdHJlYW1cbiIsInZhciBwcm90byA9IHt9XG5tb2R1bGUuZXhwb3J0cyA9IHByb3RvXG5cbnByb3RvLmZyb20gPSByZXF1aXJlKCcuL2Zyb20uanMnKVxucHJvdG8udG8gPSByZXF1aXJlKCcuL3RvLmpzJylcbnByb3RvLmlzID0gcmVxdWlyZSgnLi9pcy5qcycpXG5wcm90by5zdWJhcnJheSA9IHJlcXVpcmUoJy4vc3ViYXJyYXkuanMnKVxucHJvdG8uam9pbiA9IHJlcXVpcmUoJy4vam9pbi5qcycpXG5wcm90by5jb3B5ID0gcmVxdWlyZSgnLi9jb3B5LmpzJylcbnByb3RvLmNyZWF0ZSA9IHJlcXVpcmUoJy4vY3JlYXRlLmpzJylcblxubWl4KHJlcXVpcmUoJy4vcmVhZC5qcycpLCBwcm90bylcbm1peChyZXF1aXJlKCcuL3dyaXRlLmpzJyksIHByb3RvKVxuXG5mdW5jdGlvbiBtaXgoZnJvbSwgaW50bykge1xuICBmb3IodmFyIGtleSBpbiBmcm9tKSB7XG4gICAgaW50b1trZXldID0gZnJvbVtrZXldXG4gIH1cbn1cbiIsIihmdW5jdGlvbiAoZXhwb3J0cykge1xuXHQndXNlIHN0cmljdCc7XG5cblx0dmFyIGxvb2t1cCA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJztcblxuXHRmdW5jdGlvbiBiNjRUb0J5dGVBcnJheShiNjQpIHtcblx0XHR2YXIgaSwgaiwgbCwgdG1wLCBwbGFjZUhvbGRlcnMsIGFycjtcblx0XG5cdFx0aWYgKGI2NC5sZW5ndGggJSA0ID4gMCkge1xuXHRcdFx0dGhyb3cgJ0ludmFsaWQgc3RyaW5nLiBMZW5ndGggbXVzdCBiZSBhIG11bHRpcGxlIG9mIDQnO1xuXHRcdH1cblxuXHRcdC8vIHRoZSBudW1iZXIgb2YgZXF1YWwgc2lnbnMgKHBsYWNlIGhvbGRlcnMpXG5cdFx0Ly8gaWYgdGhlcmUgYXJlIHR3byBwbGFjZWhvbGRlcnMsIHRoYW4gdGhlIHR3byBjaGFyYWN0ZXJzIGJlZm9yZSBpdFxuXHRcdC8vIHJlcHJlc2VudCBvbmUgYnl0ZVxuXHRcdC8vIGlmIHRoZXJlIGlzIG9ubHkgb25lLCB0aGVuIHRoZSB0aHJlZSBjaGFyYWN0ZXJzIGJlZm9yZSBpdCByZXByZXNlbnQgMiBieXRlc1xuXHRcdC8vIHRoaXMgaXMganVzdCBhIGNoZWFwIGhhY2sgdG8gbm90IGRvIGluZGV4T2YgdHdpY2Vcblx0XHRwbGFjZUhvbGRlcnMgPSBiNjQuaW5kZXhPZignPScpO1xuXHRcdHBsYWNlSG9sZGVycyA9IHBsYWNlSG9sZGVycyA+IDAgPyBiNjQubGVuZ3RoIC0gcGxhY2VIb2xkZXJzIDogMDtcblxuXHRcdC8vIGJhc2U2NCBpcyA0LzMgKyB1cCB0byB0d28gY2hhcmFjdGVycyBvZiB0aGUgb3JpZ2luYWwgZGF0YVxuXHRcdGFyciA9IFtdOy8vbmV3IFVpbnQ4QXJyYXkoYjY0Lmxlbmd0aCAqIDMgLyA0IC0gcGxhY2VIb2xkZXJzKTtcblxuXHRcdC8vIGlmIHRoZXJlIGFyZSBwbGFjZWhvbGRlcnMsIG9ubHkgZ2V0IHVwIHRvIHRoZSBsYXN0IGNvbXBsZXRlIDQgY2hhcnNcblx0XHRsID0gcGxhY2VIb2xkZXJzID4gMCA/IGI2NC5sZW5ndGggLSA0IDogYjY0Lmxlbmd0aDtcblxuXHRcdGZvciAoaSA9IDAsIGogPSAwOyBpIDwgbDsgaSArPSA0LCBqICs9IDMpIHtcblx0XHRcdHRtcCA9IChsb29rdXAuaW5kZXhPZihiNjRbaV0pIDw8IDE4KSB8IChsb29rdXAuaW5kZXhPZihiNjRbaSArIDFdKSA8PCAxMikgfCAobG9va3VwLmluZGV4T2YoYjY0W2kgKyAyXSkgPDwgNikgfCBsb29rdXAuaW5kZXhPZihiNjRbaSArIDNdKTtcblx0XHRcdGFyci5wdXNoKCh0bXAgJiAweEZGMDAwMCkgPj4gMTYpO1xuXHRcdFx0YXJyLnB1c2goKHRtcCAmIDB4RkYwMCkgPj4gOCk7XG5cdFx0XHRhcnIucHVzaCh0bXAgJiAweEZGKTtcblx0XHR9XG5cblx0XHRpZiAocGxhY2VIb2xkZXJzID09PSAyKSB7XG5cdFx0XHR0bXAgPSAobG9va3VwLmluZGV4T2YoYjY0W2ldKSA8PCAyKSB8IChsb29rdXAuaW5kZXhPZihiNjRbaSArIDFdKSA+PiA0KTtcblx0XHRcdGFyci5wdXNoKHRtcCAmIDB4RkYpO1xuXHRcdH0gZWxzZSBpZiAocGxhY2VIb2xkZXJzID09PSAxKSB7XG5cdFx0XHR0bXAgPSAobG9va3VwLmluZGV4T2YoYjY0W2ldKSA8PCAxMCkgfCAobG9va3VwLmluZGV4T2YoYjY0W2kgKyAxXSkgPDwgNCkgfCAobG9va3VwLmluZGV4T2YoYjY0W2kgKyAyXSkgPj4gMik7XG5cdFx0XHRhcnIucHVzaCgodG1wID4+IDgpICYgMHhGRik7XG5cdFx0XHRhcnIucHVzaCh0bXAgJiAweEZGKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gYXJyO1xuXHR9XG5cblx0ZnVuY3Rpb24gdWludDhUb0Jhc2U2NCh1aW50OCkge1xuXHRcdHZhciBpLFxuXHRcdFx0ZXh0cmFCeXRlcyA9IHVpbnQ4Lmxlbmd0aCAlIDMsIC8vIGlmIHdlIGhhdmUgMSBieXRlIGxlZnQsIHBhZCAyIGJ5dGVzXG5cdFx0XHRvdXRwdXQgPSBcIlwiLFxuXHRcdFx0dGVtcCwgbGVuZ3RoO1xuXG5cdFx0ZnVuY3Rpb24gdHJpcGxldFRvQmFzZTY0IChudW0pIHtcblx0XHRcdHJldHVybiBsb29rdXBbbnVtID4+IDE4ICYgMHgzRl0gKyBsb29rdXBbbnVtID4+IDEyICYgMHgzRl0gKyBsb29rdXBbbnVtID4+IDYgJiAweDNGXSArIGxvb2t1cFtudW0gJiAweDNGXTtcblx0XHR9O1xuXG5cdFx0Ly8gZ28gdGhyb3VnaCB0aGUgYXJyYXkgZXZlcnkgdGhyZWUgYnl0ZXMsIHdlJ2xsIGRlYWwgd2l0aCB0cmFpbGluZyBzdHVmZiBsYXRlclxuXHRcdGZvciAoaSA9IDAsIGxlbmd0aCA9IHVpbnQ4Lmxlbmd0aCAtIGV4dHJhQnl0ZXM7IGkgPCBsZW5ndGg7IGkgKz0gMykge1xuXHRcdFx0dGVtcCA9ICh1aW50OFtpXSA8PCAxNikgKyAodWludDhbaSArIDFdIDw8IDgpICsgKHVpbnQ4W2kgKyAyXSk7XG5cdFx0XHRvdXRwdXQgKz0gdHJpcGxldFRvQmFzZTY0KHRlbXApO1xuXHRcdH1cblxuXHRcdC8vIHBhZCB0aGUgZW5kIHdpdGggemVyb3MsIGJ1dCBtYWtlIHN1cmUgdG8gbm90IGZvcmdldCB0aGUgZXh0cmEgYnl0ZXNcblx0XHRzd2l0Y2ggKGV4dHJhQnl0ZXMpIHtcblx0XHRcdGNhc2UgMTpcblx0XHRcdFx0dGVtcCA9IHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDFdO1xuXHRcdFx0XHRvdXRwdXQgKz0gbG9va3VwW3RlbXAgPj4gMl07XG5cdFx0XHRcdG91dHB1dCArPSBsb29rdXBbKHRlbXAgPDwgNCkgJiAweDNGXTtcblx0XHRcdFx0b3V0cHV0ICs9ICc9PSc7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAyOlxuXHRcdFx0XHR0ZW1wID0gKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDJdIDw8IDgpICsgKHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDFdKTtcblx0XHRcdFx0b3V0cHV0ICs9IGxvb2t1cFt0ZW1wID4+IDEwXTtcblx0XHRcdFx0b3V0cHV0ICs9IGxvb2t1cFsodGVtcCA+PiA0KSAmIDB4M0ZdO1xuXHRcdFx0XHRvdXRwdXQgKz0gbG9va3VwWyh0ZW1wIDw8IDIpICYgMHgzRl07XG5cdFx0XHRcdG91dHB1dCArPSAnPSc7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblxuXHRcdHJldHVybiBvdXRwdXQ7XG5cdH1cblxuXHRtb2R1bGUuZXhwb3J0cy50b0J5dGVBcnJheSA9IGI2NFRvQnl0ZUFycmF5O1xuXHRtb2R1bGUuZXhwb3J0cy5mcm9tQnl0ZUFycmF5ID0gdWludDhUb0Jhc2U2NDtcbn0oKSk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHRvX3V0ZjhcblxudmFyIG91dCA9IFtdXG4gICwgY29sID0gW11cbiAgLCBmY2MgPSBTdHJpbmcuZnJvbUNoYXJDb2RlXG4gICwgbWFzayA9IFsweDQwLCAweDIwLCAweDEwLCAweDA4LCAweDA0LCAweDAyLCAweDAxXVxuICAsIHVubWFzayA9IFtcbiAgICAgIDB4MDBcbiAgICAsIDB4MDFcbiAgICAsIDB4MDIgfCAweDAxXG4gICAgLCAweDA0IHwgMHgwMiB8IDB4MDFcbiAgICAsIDB4MDggfCAweDA0IHwgMHgwMiB8IDB4MDFcbiAgICAsIDB4MTAgfCAweDA4IHwgMHgwNCB8IDB4MDIgfCAweDAxXG4gICAgLCAweDIwIHwgMHgxMCB8IDB4MDggfCAweDA0IHwgMHgwMiB8IDB4MDFcbiAgICAsIDB4NDAgfCAweDIwIHwgMHgxMCB8IDB4MDggfCAweDA0IHwgMHgwMiB8IDB4MDFcbiAgXVxuXG5mdW5jdGlvbiB0b191dGY4KGJ5dGVzLCBzdGFydCwgZW5kKSB7XG4gIHN0YXJ0ID0gc3RhcnQgPT09IHVuZGVmaW5lZCA/IDAgOiBzdGFydFxuICBlbmQgPSBlbmQgPT09IHVuZGVmaW5lZCA/IGJ5dGVzLmxlbmd0aCA6IGVuZFxuXG4gIHZhciBpZHggPSAwXG4gICAgLCBoaSA9IDB4ODBcbiAgICAsIGNvbGxlY3RpbmcgPSAwXG4gICAgLCBwb3NcbiAgICAsIGJ5XG5cbiAgY29sLmxlbmd0aCA9XG4gIG91dC5sZW5ndGggPSAwXG5cbiAgd2hpbGUoaWR4IDwgYnl0ZXMubGVuZ3RoKSB7XG4gICAgYnkgPSBieXRlc1tpZHhdXG4gICAgaWYoIWNvbGxlY3RpbmcgJiYgYnkgJiBoaSkge1xuICAgICAgcG9zID0gZmluZF9wYWRfcG9zaXRpb24oYnkpXG4gICAgICBjb2xsZWN0aW5nICs9IHBvc1xuICAgICAgaWYocG9zIDwgOCkge1xuICAgICAgICBjb2xbY29sLmxlbmd0aF0gPSBieSAmIHVubWFza1s2IC0gcG9zXVxuICAgICAgfVxuICAgIH0gZWxzZSBpZihjb2xsZWN0aW5nKSB7XG4gICAgICBjb2xbY29sLmxlbmd0aF0gPSBieSAmIHVubWFza1s2XVxuICAgICAgLS1jb2xsZWN0aW5nXG4gICAgICBpZighY29sbGVjdGluZyAmJiBjb2wubGVuZ3RoKSB7XG4gICAgICAgIG91dFtvdXQubGVuZ3RoXSA9IGZjYyhyZWR1Y2VkKGNvbCwgcG9zKSlcbiAgICAgICAgY29sLmxlbmd0aCA9IDBcbiAgICAgIH1cbiAgICB9IGVsc2UgeyBcbiAgICAgIG91dFtvdXQubGVuZ3RoXSA9IGZjYyhieSlcbiAgICB9XG4gICAgKytpZHhcbiAgfVxuICBpZihjb2wubGVuZ3RoICYmICFjb2xsZWN0aW5nKSB7XG4gICAgb3V0W291dC5sZW5ndGhdID0gZmNjKHJlZHVjZWQoY29sLCBwb3MpKVxuICAgIGNvbC5sZW5ndGggPSAwXG4gIH1cbiAgcmV0dXJuIG91dC5qb2luKCcnKVxufVxuXG5mdW5jdGlvbiBmaW5kX3BhZF9wb3NpdGlvbihieXQpIHtcbiAgZm9yKHZhciBpID0gMDsgaSA8IDc7ICsraSkge1xuICAgIGlmKCEoYnl0ICYgbWFza1tpXSkpIHtcbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIHJlZHVjZWQobGlzdCkge1xuICB2YXIgb3V0ID0gMFxuICBmb3IodmFyIGkgPSAwLCBsZW4gPSBsaXN0Lmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgb3V0IHw9IGxpc3RbaV0gPDwgKChsZW4gLSBpIC0gMSkgKiA2KVxuICB9XG4gIHJldHVybiBvdXRcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gY29weVxuXG52YXIgc2xpY2UgPSBbXS5zbGljZVxuXG5mdW5jdGlvbiBjb3B5KHNvdXJjZSwgdGFyZ2V0LCB0YXJnZXRfc3RhcnQsIHNvdXJjZV9zdGFydCwgc291cmNlX2VuZCkge1xuICB0YXJnZXRfc3RhcnQgPSBhcmd1bWVudHMubGVuZ3RoIDwgMyA/IDAgOiB0YXJnZXRfc3RhcnRcbiAgc291cmNlX3N0YXJ0ID0gYXJndW1lbnRzLmxlbmd0aCA8IDQgPyAwIDogc291cmNlX3N0YXJ0XG4gIHNvdXJjZV9lbmQgPSBhcmd1bWVudHMubGVuZ3RoIDwgNSA/IHNvdXJjZS5sZW5ndGggOiBzb3VyY2VfZW5kXG5cbiAgaWYoc291cmNlX2VuZCA9PT0gc291cmNlX3N0YXJ0KSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICBpZih0YXJnZXQubGVuZ3RoID09PSAwIHx8IHNvdXJjZS5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIGlmKHNvdXJjZV9lbmQgPiBzb3VyY2UubGVuZ3RoKSB7XG4gICAgc291cmNlX2VuZCA9IHNvdXJjZS5sZW5ndGhcbiAgfVxuXG4gIGlmKHRhcmdldC5sZW5ndGggLSB0YXJnZXRfc3RhcnQgPCBzb3VyY2VfZW5kIC0gc291cmNlX3N0YXJ0KSB7XG4gICAgc291cmNlX2VuZCA9IHRhcmdldC5sZW5ndGggLSB0YXJnZXRfc3RhcnQgKyBzdGFydFxuICB9XG5cbiAgaWYoc291cmNlLmJ1ZmZlciAhPT0gdGFyZ2V0LmJ1ZmZlcikge1xuICAgIHJldHVybiBmYXN0X2NvcHkoc291cmNlLCB0YXJnZXQsIHRhcmdldF9zdGFydCwgc291cmNlX3N0YXJ0LCBzb3VyY2VfZW5kKVxuICB9XG4gIHJldHVybiBzbG93X2NvcHkoc291cmNlLCB0YXJnZXQsIHRhcmdldF9zdGFydCwgc291cmNlX3N0YXJ0LCBzb3VyY2VfZW5kKVxufVxuXG5mdW5jdGlvbiBmYXN0X2NvcHkoc291cmNlLCB0YXJnZXQsIHRhcmdldF9zdGFydCwgc291cmNlX3N0YXJ0LCBzb3VyY2VfZW5kKSB7XG4gIHZhciBsZW4gPSAoc291cmNlX2VuZCAtIHNvdXJjZV9zdGFydCkgKyB0YXJnZXRfc3RhcnRcblxuICBmb3IodmFyIGkgPSB0YXJnZXRfc3RhcnQsIGogPSBzb3VyY2Vfc3RhcnQ7XG4gICAgICBpIDwgbGVuO1xuICAgICAgKytpLFxuICAgICAgKytqKSB7XG4gICAgdGFyZ2V0W2ldID0gc291cmNlW2pdXG4gIH1cbn1cblxuZnVuY3Rpb24gc2xvd19jb3B5KGZyb20sIHRvLCBqLCBpLCBqZW5kKSB7XG4gIC8vIHRoZSBidWZmZXJzIGNvdWxkIG92ZXJsYXAuXG4gIHZhciBpZW5kID0gamVuZCArIGlcbiAgICAsIHRtcCA9IG5ldyBVaW50OEFycmF5KHNsaWNlLmNhbGwoZnJvbSwgaSwgaWVuZCkpXG4gICAgLCB4ID0gMFxuXG4gIGZvcig7IGkgPCBpZW5kOyArK2ksICsreCkge1xuICAgIHRvW2orK10gPSB0bXBbeF1cbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzaXplKSB7XG4gIHJldHVybiBuZXcgVWludDhBcnJheShzaXplKVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBmcm9tXG5cbnZhciBiYXNlNjQgPSByZXF1aXJlKCdiYXNlNjQtanMnKVxuXG52YXIgZGVjb2RlcnMgPSB7XG4gICAgaGV4OiBmcm9tX2hleFxuICAsIHV0Zjg6IGZyb21fdXRmXG4gICwgYmFzZTY0OiBmcm9tX2Jhc2U2NFxufVxuXG5mdW5jdGlvbiBmcm9tKHNvdXJjZSwgZW5jb2RpbmcpIHtcbiAgaWYoQXJyYXkuaXNBcnJheShzb3VyY2UpKSB7XG4gICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KHNvdXJjZSlcbiAgfVxuXG4gIHJldHVybiBkZWNvZGVyc1tlbmNvZGluZyB8fCAndXRmOCddKHNvdXJjZSlcbn1cblxuZnVuY3Rpb24gZnJvbV9oZXgoc3RyKSB7XG4gIHZhciBzaXplID0gc3RyLmxlbmd0aCAvIDJcbiAgICAsIGJ1ZiA9IG5ldyBVaW50OEFycmF5KHNpemUpXG4gICAgLCBjaGFyYWN0ZXIgPSAnJ1xuXG4gIGZvcih2YXIgaSA9IDAsIGxlbiA9IHN0ci5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgIGNoYXJhY3RlciArPSBzdHIuY2hhckF0KGkpXG5cbiAgICBpZihpID4gMCAmJiAoaSAlIDIpID09PSAxKSB7XG4gICAgICBidWZbaT4+PjFdID0gcGFyc2VJbnQoY2hhcmFjdGVyLCAxNilcbiAgICAgIGNoYXJhY3RlciA9ICcnIFxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBidWYgXG59XG5cbmZ1bmN0aW9uIGZyb21fdXRmKHN0cikge1xuICB2YXIgYnl0ZXMgPSBbXVxuICAgICwgdG1wXG4gICAgLCBjaFxuXG4gIGZvcih2YXIgaSA9IDAsIGxlbiA9IHN0ci5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgIGNoID0gc3RyLmNoYXJDb2RlQXQoaSlcbiAgICBpZihjaCAmIDB4ODApIHtcbiAgICAgIHRtcCA9IGVuY29kZVVSSUNvbXBvbmVudChzdHIuY2hhckF0KGkpKS5zdWJzdHIoMSkuc3BsaXQoJyUnKVxuICAgICAgZm9yKHZhciBqID0gMCwgamxlbiA9IHRtcC5sZW5ndGg7IGogPCBqbGVuOyArK2opIHtcbiAgICAgICAgYnl0ZXNbYnl0ZXMubGVuZ3RoXSA9IHBhcnNlSW50KHRtcFtqXSwgMTYpXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGJ5dGVzW2J5dGVzLmxlbmd0aF0gPSBjaCBcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoYnl0ZXMpXG59XG5cbmZ1bmN0aW9uIGZyb21fYmFzZTY0KHN0cikge1xuICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoYmFzZTY0LnRvQnl0ZUFycmF5KHN0cikpIFxufVxuIiwiXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICByZXR1cm4gYnVmZmVyIGluc3RhbmNlb2YgVWludDhBcnJheTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gam9pblxuXG5mdW5jdGlvbiBqb2luKHRhcmdldHMsIGhpbnQpIHtcbiAgaWYoIXRhcmdldHMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KDApXG4gIH1cblxuICB2YXIgbGVuID0gaGludCAhPT0gdW5kZWZpbmVkID8gaGludCA6IGdldF9sZW5ndGgodGFyZ2V0cylcbiAgICAsIG91dCA9IG5ldyBVaW50OEFycmF5KGxlbilcbiAgICAsIGN1ciA9IHRhcmdldHNbMF1cbiAgICAsIGN1cmxlbiA9IGN1ci5sZW5ndGhcbiAgICAsIGN1cmlkeCA9IDBcbiAgICAsIGN1cm9mZiA9IDBcbiAgICAsIGkgPSAwXG5cbiAgd2hpbGUoaSA8IGxlbikge1xuICAgIGlmKGN1cm9mZiA9PT0gY3VybGVuKSB7XG4gICAgICBjdXJvZmYgPSAwXG4gICAgICArK2N1cmlkeFxuICAgICAgY3VyID0gdGFyZ2V0c1tjdXJpZHhdXG4gICAgICBjdXJsZW4gPSBjdXIgJiYgY3VyLmxlbmd0aFxuICAgICAgY29udGludWVcbiAgICB9XG4gICAgb3V0W2krK10gPSBjdXJbY3Vyb2ZmKytdIFxuICB9XG5cbiAgcmV0dXJuIG91dFxufVxuXG5mdW5jdGlvbiBnZXRfbGVuZ3RoKHRhcmdldHMpIHtcbiAgdmFyIHNpemUgPSAwXG4gIGZvcih2YXIgaSA9IDAsIGxlbiA9IHRhcmdldHMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICBzaXplICs9IHRhcmdldHNbaV0uYnl0ZUxlbmd0aFxuICB9XG4gIHJldHVybiBzaXplXG59XG4iLCJ2YXIgcHJvdG9cbiAgLCBtYXBcblxubW9kdWxlLmV4cG9ydHMgPSBwcm90byA9IHt9XG5cbm1hcCA9IHR5cGVvZiBXZWFrTWFwID09PSAndW5kZWZpbmVkJyA/IG51bGwgOiBuZXcgV2Vha01hcFxuXG5wcm90by5nZXQgPSAhbWFwID8gbm9fd2Vha21hcF9nZXQgOiBnZXRcblxuZnVuY3Rpb24gbm9fd2Vha21hcF9nZXQodGFyZ2V0KSB7XG4gIHJldHVybiBuZXcgRGF0YVZpZXcodGFyZ2V0LmJ1ZmZlciwgMClcbn1cblxuZnVuY3Rpb24gZ2V0KHRhcmdldCkge1xuICB2YXIgb3V0ID0gbWFwLmdldCh0YXJnZXQuYnVmZmVyKVxuICBpZighb3V0KSB7XG4gICAgbWFwLnNldCh0YXJnZXQuYnVmZmVyLCBvdXQgPSBuZXcgRGF0YVZpZXcodGFyZ2V0LmJ1ZmZlciwgMCkpXG4gIH1cbiAgcmV0dXJuIG91dFxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgcmVhZFVJbnQ4OiAgICAgIHJlYWRfdWludDhcbiAgLCByZWFkSW50ODogICAgICAgcmVhZF9pbnQ4XG4gICwgcmVhZFVJbnQxNkxFOiAgIHJlYWRfdWludDE2X2xlXG4gICwgcmVhZFVJbnQzMkxFOiAgIHJlYWRfdWludDMyX2xlXG4gICwgcmVhZEludDE2TEU6ICAgIHJlYWRfaW50MTZfbGVcbiAgLCByZWFkSW50MzJMRTogICAgcmVhZF9pbnQzMl9sZVxuICAsIHJlYWRGbG9hdExFOiAgICByZWFkX2Zsb2F0X2xlXG4gICwgcmVhZERvdWJsZUxFOiAgIHJlYWRfZG91YmxlX2xlXG4gICwgcmVhZFVJbnQxNkJFOiAgIHJlYWRfdWludDE2X2JlXG4gICwgcmVhZFVJbnQzMkJFOiAgIHJlYWRfdWludDMyX2JlXG4gICwgcmVhZEludDE2QkU6ICAgIHJlYWRfaW50MTZfYmVcbiAgLCByZWFkSW50MzJCRTogICAgcmVhZF9pbnQzMl9iZVxuICAsIHJlYWRGbG9hdEJFOiAgICByZWFkX2Zsb2F0X2JlXG4gICwgcmVhZERvdWJsZUJFOiAgIHJlYWRfZG91YmxlX2JlXG59XG5cbnZhciBtYXAgPSByZXF1aXJlKCcuL21hcHBlZC5qcycpXG5cbmZ1bmN0aW9uIHJlYWRfdWludDgodGFyZ2V0LCBhdCkge1xuICByZXR1cm4gdGFyZ2V0W2F0XVxufVxuXG5mdW5jdGlvbiByZWFkX2ludDgodGFyZ2V0LCBhdCkge1xuICB2YXIgdiA9IHRhcmdldFthdF07XG4gIHJldHVybiB2IDwgMHg4MCA/IHYgOiB2IC0gMHgxMDBcbn1cblxuZnVuY3Rpb24gcmVhZF91aW50MTZfbGUodGFyZ2V0LCBhdCkge1xuICB2YXIgZHYgPSBtYXAuZ2V0KHRhcmdldCk7XG4gIHJldHVybiBkdi5nZXRVaW50MTYoYXQgKyB0YXJnZXQuYnl0ZU9mZnNldCwgdHJ1ZSlcbn1cblxuZnVuY3Rpb24gcmVhZF91aW50MzJfbGUodGFyZ2V0LCBhdCkge1xuICB2YXIgZHYgPSBtYXAuZ2V0KHRhcmdldCk7XG4gIHJldHVybiBkdi5nZXRVaW50MzIoYXQgKyB0YXJnZXQuYnl0ZU9mZnNldCwgdHJ1ZSlcbn1cblxuZnVuY3Rpb24gcmVhZF9pbnQxNl9sZSh0YXJnZXQsIGF0KSB7XG4gIHZhciBkdiA9IG1hcC5nZXQodGFyZ2V0KTtcbiAgcmV0dXJuIGR2LmdldEludDE2KGF0ICsgdGFyZ2V0LmJ5dGVPZmZzZXQsIHRydWUpXG59XG5cbmZ1bmN0aW9uIHJlYWRfaW50MzJfbGUodGFyZ2V0LCBhdCkge1xuICB2YXIgZHYgPSBtYXAuZ2V0KHRhcmdldCk7XG4gIHJldHVybiBkdi5nZXRJbnQzMihhdCArIHRhcmdldC5ieXRlT2Zmc2V0LCB0cnVlKVxufVxuXG5mdW5jdGlvbiByZWFkX2Zsb2F0X2xlKHRhcmdldCwgYXQpIHtcbiAgdmFyIGR2ID0gbWFwLmdldCh0YXJnZXQpO1xuICByZXR1cm4gZHYuZ2V0RmxvYXQzMihhdCArIHRhcmdldC5ieXRlT2Zmc2V0LCB0cnVlKVxufVxuXG5mdW5jdGlvbiByZWFkX2RvdWJsZV9sZSh0YXJnZXQsIGF0KSB7XG4gIHZhciBkdiA9IG1hcC5nZXQodGFyZ2V0KTtcbiAgcmV0dXJuIGR2LmdldEZsb2F0NjQoYXQgKyB0YXJnZXQuYnl0ZU9mZnNldCwgdHJ1ZSlcbn1cblxuZnVuY3Rpb24gcmVhZF91aW50MTZfYmUodGFyZ2V0LCBhdCkge1xuICB2YXIgZHYgPSBtYXAuZ2V0KHRhcmdldCk7XG4gIHJldHVybiBkdi5nZXRVaW50MTYoYXQgKyB0YXJnZXQuYnl0ZU9mZnNldCwgZmFsc2UpXG59XG5cbmZ1bmN0aW9uIHJlYWRfdWludDMyX2JlKHRhcmdldCwgYXQpIHtcbiAgdmFyIGR2ID0gbWFwLmdldCh0YXJnZXQpO1xuICByZXR1cm4gZHYuZ2V0VWludDMyKGF0ICsgdGFyZ2V0LmJ5dGVPZmZzZXQsIGZhbHNlKVxufVxuXG5mdW5jdGlvbiByZWFkX2ludDE2X2JlKHRhcmdldCwgYXQpIHtcbiAgdmFyIGR2ID0gbWFwLmdldCh0YXJnZXQpO1xuICByZXR1cm4gZHYuZ2V0SW50MTYoYXQgKyB0YXJnZXQuYnl0ZU9mZnNldCwgZmFsc2UpXG59XG5cbmZ1bmN0aW9uIHJlYWRfaW50MzJfYmUodGFyZ2V0LCBhdCkge1xuICB2YXIgZHYgPSBtYXAuZ2V0KHRhcmdldCk7XG4gIHJldHVybiBkdi5nZXRJbnQzMihhdCArIHRhcmdldC5ieXRlT2Zmc2V0LCBmYWxzZSlcbn1cblxuZnVuY3Rpb24gcmVhZF9mbG9hdF9iZSh0YXJnZXQsIGF0KSB7XG4gIHZhciBkdiA9IG1hcC5nZXQodGFyZ2V0KTtcbiAgcmV0dXJuIGR2LmdldEZsb2F0MzIoYXQgKyB0YXJnZXQuYnl0ZU9mZnNldCwgZmFsc2UpXG59XG5cbmZ1bmN0aW9uIHJlYWRfZG91YmxlX2JlKHRhcmdldCwgYXQpIHtcbiAgdmFyIGR2ID0gbWFwLmdldCh0YXJnZXQpO1xuICByZXR1cm4gZHYuZ2V0RmxvYXQ2NChhdCArIHRhcmdldC5ieXRlT2Zmc2V0LCBmYWxzZSlcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gc3ViYXJyYXlcblxuZnVuY3Rpb24gc3ViYXJyYXkoYnVmLCBmcm9tLCB0bykge1xuICByZXR1cm4gYnVmLnN1YmFycmF5KGZyb20gfHwgMCwgdG8gfHwgYnVmLmxlbmd0aClcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gdG9cblxudmFyIGJhc2U2NCA9IHJlcXVpcmUoJ2Jhc2U2NC1qcycpXG4gICwgdG91dGY4ID0gcmVxdWlyZSgndG8tdXRmOCcpXG5cbnZhciBlbmNvZGVycyA9IHtcbiAgICBoZXg6IHRvX2hleFxuICAsIHV0Zjg6IHRvX3V0ZlxuICAsIGJhc2U2NDogdG9fYmFzZTY0XG59XG5cbmZ1bmN0aW9uIHRvKGJ1ZiwgZW5jb2RpbmcpIHtcbiAgcmV0dXJuIGVuY29kZXJzW2VuY29kaW5nIHx8ICd1dGY4J10oYnVmKVxufVxuXG5mdW5jdGlvbiB0b19oZXgoYnVmKSB7XG4gIHZhciBzdHIgPSAnJ1xuICAgICwgYnl0XG5cbiAgZm9yKHZhciBpID0gMCwgbGVuID0gYnVmLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgYnl0ID0gYnVmW2ldXG4gICAgc3RyICs9ICgoYnl0ICYgMHhGMCkgPj4+IDQpLnRvU3RyaW5nKDE2KVxuICAgIHN0ciArPSAoYnl0ICYgMHgwRikudG9TdHJpbmcoMTYpXG4gIH1cblxuICByZXR1cm4gc3RyXG59XG5cbmZ1bmN0aW9uIHRvX3V0ZihidWYpIHtcbiAgcmV0dXJuIHRvdXRmOChidWYpXG59XG5cbmZ1bmN0aW9uIHRvX2Jhc2U2NChidWYpIHtcbiAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1Zilcbn1cblxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgd3JpdGVVSW50ODogICAgICB3cml0ZV91aW50OFxuICAsIHdyaXRlSW50ODogICAgICAgd3JpdGVfaW50OFxuICAsIHdyaXRlVUludDE2TEU6ICAgd3JpdGVfdWludDE2X2xlXG4gICwgd3JpdGVVSW50MzJMRTogICB3cml0ZV91aW50MzJfbGVcbiAgLCB3cml0ZUludDE2TEU6ICAgIHdyaXRlX2ludDE2X2xlXG4gICwgd3JpdGVJbnQzMkxFOiAgICB3cml0ZV9pbnQzMl9sZVxuICAsIHdyaXRlRmxvYXRMRTogICAgd3JpdGVfZmxvYXRfbGVcbiAgLCB3cml0ZURvdWJsZUxFOiAgIHdyaXRlX2RvdWJsZV9sZVxuICAsIHdyaXRlVUludDE2QkU6ICAgd3JpdGVfdWludDE2X2JlXG4gICwgd3JpdGVVSW50MzJCRTogICB3cml0ZV91aW50MzJfYmVcbiAgLCB3cml0ZUludDE2QkU6ICAgIHdyaXRlX2ludDE2X2JlXG4gICwgd3JpdGVJbnQzMkJFOiAgICB3cml0ZV9pbnQzMl9iZVxuICAsIHdyaXRlRmxvYXRCRTogICAgd3JpdGVfZmxvYXRfYmVcbiAgLCB3cml0ZURvdWJsZUJFOiAgIHdyaXRlX2RvdWJsZV9iZVxufVxuXG52YXIgbWFwID0gcmVxdWlyZSgnLi9tYXBwZWQuanMnKVxuXG5mdW5jdGlvbiB3cml0ZV91aW50OCh0YXJnZXQsIHZhbHVlLCBhdCkge1xuICByZXR1cm4gdGFyZ2V0W2F0XSA9IHZhbHVlXG59XG5cbmZ1bmN0aW9uIHdyaXRlX2ludDgodGFyZ2V0LCB2YWx1ZSwgYXQpIHtcbiAgcmV0dXJuIHRhcmdldFthdF0gPSB2YWx1ZSA8IDAgPyB2YWx1ZSArIDB4MTAwIDogdmFsdWVcbn1cblxuZnVuY3Rpb24gd3JpdGVfdWludDE2X2xlKHRhcmdldCwgdmFsdWUsIGF0KSB7XG4gIHZhciBkdiA9IG1hcC5nZXQodGFyZ2V0KTtcbiAgcmV0dXJuIGR2LnNldFVpbnQxNihhdCArIHRhcmdldC5ieXRlT2Zmc2V0LCB2YWx1ZSwgdHJ1ZSlcbn1cblxuZnVuY3Rpb24gd3JpdGVfdWludDMyX2xlKHRhcmdldCwgdmFsdWUsIGF0KSB7XG4gIHZhciBkdiA9IG1hcC5nZXQodGFyZ2V0KTtcbiAgcmV0dXJuIGR2LnNldFVpbnQzMihhdCArIHRhcmdldC5ieXRlT2Zmc2V0LCB2YWx1ZSwgdHJ1ZSlcbn1cblxuZnVuY3Rpb24gd3JpdGVfaW50MTZfbGUodGFyZ2V0LCB2YWx1ZSwgYXQpIHtcbiAgdmFyIGR2ID0gbWFwLmdldCh0YXJnZXQpO1xuICByZXR1cm4gZHYuc2V0SW50MTYoYXQgKyB0YXJnZXQuYnl0ZU9mZnNldCwgdmFsdWUsIHRydWUpXG59XG5cbmZ1bmN0aW9uIHdyaXRlX2ludDMyX2xlKHRhcmdldCwgdmFsdWUsIGF0KSB7XG4gIHZhciBkdiA9IG1hcC5nZXQodGFyZ2V0KTtcbiAgcmV0dXJuIGR2LnNldEludDMyKGF0ICsgdGFyZ2V0LmJ5dGVPZmZzZXQsIHZhbHVlLCB0cnVlKVxufVxuXG5mdW5jdGlvbiB3cml0ZV9mbG9hdF9sZSh0YXJnZXQsIHZhbHVlLCBhdCkge1xuICB2YXIgZHYgPSBtYXAuZ2V0KHRhcmdldCk7XG4gIHJldHVybiBkdi5zZXRGbG9hdDMyKGF0ICsgdGFyZ2V0LmJ5dGVPZmZzZXQsIHZhbHVlLCB0cnVlKVxufVxuXG5mdW5jdGlvbiB3cml0ZV9kb3VibGVfbGUodGFyZ2V0LCB2YWx1ZSwgYXQpIHtcbiAgdmFyIGR2ID0gbWFwLmdldCh0YXJnZXQpO1xuICByZXR1cm4gZHYuc2V0RmxvYXQ2NChhdCArIHRhcmdldC5ieXRlT2Zmc2V0LCB2YWx1ZSwgdHJ1ZSlcbn1cblxuZnVuY3Rpb24gd3JpdGVfdWludDE2X2JlKHRhcmdldCwgdmFsdWUsIGF0KSB7XG4gIHZhciBkdiA9IG1hcC5nZXQodGFyZ2V0KTtcbiAgcmV0dXJuIGR2LnNldFVpbnQxNihhdCArIHRhcmdldC5ieXRlT2Zmc2V0LCB2YWx1ZSwgZmFsc2UpXG59XG5cbmZ1bmN0aW9uIHdyaXRlX3VpbnQzMl9iZSh0YXJnZXQsIHZhbHVlLCBhdCkge1xuICB2YXIgZHYgPSBtYXAuZ2V0KHRhcmdldCk7XG4gIHJldHVybiBkdi5zZXRVaW50MzIoYXQgKyB0YXJnZXQuYnl0ZU9mZnNldCwgdmFsdWUsIGZhbHNlKVxufVxuXG5mdW5jdGlvbiB3cml0ZV9pbnQxNl9iZSh0YXJnZXQsIHZhbHVlLCBhdCkge1xuICB2YXIgZHYgPSBtYXAuZ2V0KHRhcmdldCk7XG4gIHJldHVybiBkdi5zZXRJbnQxNihhdCArIHRhcmdldC5ieXRlT2Zmc2V0LCB2YWx1ZSwgZmFsc2UpXG59XG5cbmZ1bmN0aW9uIHdyaXRlX2ludDMyX2JlKHRhcmdldCwgdmFsdWUsIGF0KSB7XG4gIHZhciBkdiA9IG1hcC5nZXQodGFyZ2V0KTtcbiAgcmV0dXJuIGR2LnNldEludDMyKGF0ICsgdGFyZ2V0LmJ5dGVPZmZzZXQsIHZhbHVlLCBmYWxzZSlcbn1cblxuZnVuY3Rpb24gd3JpdGVfZmxvYXRfYmUodGFyZ2V0LCB2YWx1ZSwgYXQpIHtcbiAgdmFyIGR2ID0gbWFwLmdldCh0YXJnZXQpO1xuICByZXR1cm4gZHYuc2V0RmxvYXQzMihhdCArIHRhcmdldC5ieXRlT2Zmc2V0LCB2YWx1ZSwgZmFsc2UpXG59XG5cbmZ1bmN0aW9uIHdyaXRlX2RvdWJsZV9iZSh0YXJnZXQsIHZhbHVlLCBhdCkge1xuICB2YXIgZHYgPSBtYXAuZ2V0KHRhcmdldCk7XG4gIHJldHVybiBkdi5zZXRGbG9hdDY0KGF0ICsgdGFyZ2V0LmJ5dGVPZmZzZXQsIHZhbHVlLCBmYWxzZSlcbn1cbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICBpZiAoZXYuc291cmNlID09PSB3aW5kb3cgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcInVybFwiKS5wYXJzZSh3aW5kb3cubG9jYXRpb24uaHJlZiwgdHJ1ZSkiLCJ2YXIgaHR0cCA9IHJlcXVpcmUoJ2h0dHAnKTtcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xudmFyIHVybCA9IHJlcXVpcmUoJ3VybCcpO1xudmFyIHFzID0gcmVxdWlyZSgncXVlcnlzdHJpbmcnKTtcbnZhciBuYXZJZCA9IHJlcXVpcmUoJy4vdmVuZG9yL3BlcnNvbmEuanMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAob3B0cykgeyByZXR1cm4gbmV3IFBlcnNvbmEob3B0cykgfTtcblxuZnVuY3Rpb24gUGVyc29uYSAob3B0cykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBcbiAgICBpZiAoIW9wdHMpIG9wdHMgPSB7IHJvdXRlOiAnL19wZXJzb25hJyB9O1xuICAgIGlmICh0eXBlb2Ygb3B0cyA9PT0gJ3N0cmluZycpIG9wdHMgPSB7IHJvdXRlOiBvcHRzIH07XG4gICAgXG4gICAgc2VsZi5yb3V0ZXMgPSB7fTtcbiAgICBpZiAodHlwZW9mIG9wdHMucm91dGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHNlbGYucm91dGVzLmxvZ2luID0gb3B0cy5yb3V0ZSArICcvbG9naW4nO1xuICAgICAgICBzZWxmLnJvdXRlcy5sb2dvdXQgPSBvcHRzLnJvdXRlICsgJy9sb2dvdXQnO1xuICAgIH1cbiAgICBpZiAob3B0cy5sb2dpbikgc2VsZi5yb3V0ZXMubG9naW4gPSBvcHRzLmxvZ2luO1xuICAgIGlmIChvcHRzLmxvZ291dCkgc2VsZi5yb3V0ZXMubG9nb3V0ID0gb3B0cy5sb2dvdXQ7XG59XG5pbmhlcml0cyhQZXJzb25hLCBFdmVudEVtaXR0ZXIpO1xuXG5QZXJzb25hLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICB0aGlzLmlkID0gaWQ7XG4gICAgaWYgKGlkKSB0aGlzLmVtaXQoJ2xvZ2luJywgaWQpXG4gICAgZWxzZSB0aGlzLmVtaXQoJ2xvZ291dCcpXG59O1xuXG5QZXJzb25hLnByb3RvdHlwZS5pZGVudGlmeSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl93YXRjaChudWxsKTtcbiAgICBuYXZJZC5yZXF1ZXN0KCk7XG59O1xuXG5QZXJzb25hLnByb3RvdHlwZS51bmlkZW50aWZ5ID0gZnVuY3Rpb24gKCkge1xuICAgIG5hdklkLmxvZ291dCgpO1xuICAgIHRoaXMuX2xvZ291dCgpO1xufTtcblxuUGVyc29uYS5wcm90b3R5cGUuX3dhdGNoID0gZnVuY3Rpb24gKHVzZXIpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgbmF2SWQud2F0Y2goe1xuICAgICAgICBsb2dnZWRJblVzZXI6IHVzZXIsXG4gICAgICAgIG9ubG9naW46IGZ1bmN0aW9uIChhc3NlcnRpb24pIHsgc2VsZi5fbG9naW4oYXNzZXJ0aW9uKSB9LFxuICAgICAgICBvbmxvZ291dDogZnVuY3Rpb24gKCkgeyBzZWxmLl9sb2dvdXQoKSB9XG4gICAgfSk7XG59O1xuXG5QZXJzb25hLnByb3RvdHlwZS5fbG9naW4gPSBmdW5jdGlvbiAoYXNzZXJ0aW9uKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciB1cmkgPSBzZWxmLnJvdXRlcy5sb2dpbjtcbiAgICBcbiAgICB2YXIgdSA9IHR5cGVvZiB1cmkgPT09ICdvYmplY3QnID8gdXJpIDogdXJsLnBhcnNlKHVyaSk7XG4gICAgdmFyIHJlcSA9IGh0dHAucmVxdWVzdCh7XG4gICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICBob3N0OiB1Lmhvc3RuYW1lIHx8IHdpbmRvdy5sb2NhdGlvbi5ob3N0bmFtZSxcbiAgICAgICAgcG9ydDogdS5wb3J0IHx8IHdpbmRvdy5sb2NhdGlvbi5wb3J0LFxuICAgICAgICBwYXRoOiB1LnBhdGhcbiAgICB9KTtcbiAgICByZXEub24oJ3Jlc3BvbnNlJywgZnVuY3Rpb24gKHJlcykge1xuICAgICAgICB2YXIgYm9keSA9ICcnO1xuICAgICAgICByZXMub24oJ2RhdGEnLCBmdW5jdGlvbiAoYnVmKSB7IGJvZHkgKz0gYnVmIH0pO1xuICAgICAgICBcbiAgICAgICAgaWYgKCEvXjJcXGRcXGRcXGIvLnRlc3QocmVzLnN0YXR1c0NvZGUpKSB7XG4gICAgICAgICAgICBzZWxmLmlkID0gbnVsbDtcbiAgICAgICAgICAgIHJlcy5vbignZW5kJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNlbGYuZW1pdCgnZXJyb3InLCBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgICAgICdlcnJvciBjb2RlICcgKyByZXMuc3RhdHVzQ29kZSArICc6ICcgKyBib2R5XG4gICAgICAgICAgICAgICAgKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIG5hdklkLmxvZ291dCgpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmVzLm9uKCdlbmQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHsgdmFyIG0gPSBKU09OLnBhcnNlKGJvZHkpIH1cbiAgICAgICAgICAgICAgICBjYXRjaCAoZXJyKSB7IHJldHVybiBzZWxmLmVtaXQoJ2Vycm9yJywgZXJyKSB9XG4gICAgICAgICAgICAgICAgaWYgKCFtIHx8IHR5cGVvZiBtICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2VsZi5lbWl0KCdlcnJvcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAndW5leHBlY3RlZCByZXNwb25zZSAnICsgdHlwZW9mIG1cbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKG0gJiYgbS5jb29raWUpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIG0uY29va2llKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5jb29raWUgPSBrZXkgKyAnPScgKyBtLmNvb2tpZVtrZXldO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChtICYmIG0uaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5pZCA9IG0uaWQ7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuZW1pdCgnbG9naW4nLCBtLmlkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJlcS5lbmQoSlNPTi5zdHJpbmdpZnkoeyBhc3NlcnRpb246IGFzc2VydGlvbiB9KSk7XG59O1xuXG5QZXJzb25hLnByb3RvdHlwZS5fbG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgdXJpID0gc2VsZi5yb3V0ZXMubG9nb3V0O1xuICAgIHNlbGYuaWQgPSBudWxsO1xuICAgIFxuICAgIHZhciB1ID0gdHlwZW9mIHVyaSA9PT0gJ29iamVjdCcgPyB1cmkgOiB1cmwucGFyc2UodXJpKTtcbiAgICB2YXIgcmVxID0gaHR0cC5yZXF1ZXN0KHtcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgIGhvc3Q6IHUuaG9zdG5hbWUgfHwgd2luZG93LmxvY2F0aW9uLmhvc3RuYW1lLFxuICAgICAgICBwb3J0OiB1LnBvcnQgfHwgd2luZG93LmxvY2F0aW9uLnBvcnQsXG4gICAgICAgIHBhdGg6IHUucGF0aFxuICAgIH0pO1xuICAgIHJlcS5vbigncmVzcG9uc2UnLCBmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgIGlmICghL14yXFxkXFxkXFxiLy50ZXN0KHJlcy5zdGF0dXNDb2RlKSkge1xuICAgICAgICAgICAgdmFyIGJvZHkgPSAnJztcbiAgICAgICAgICAgIHJlcy5vbignZGF0YScsIGZ1bmN0aW9uIChidWYpIHsgYm9keSArPSBidWYgfSk7XG4gICAgICAgICAgICByZXMub24oJ2VuZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmVtaXQoJ2Vycm9yJywgbmV3IEVycm9yKFxuICAgICAgICAgICAgICAgICAgICAnZXJyb3IgY29kZSAnICsgcmVzLnN0YXR1c0NvZGUgKyAnOiAnICsgYm9keVxuICAgICAgICAgICAgICAgICkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBzZWxmLmVtaXQoJ2xvZ291dCcpO1xuICAgIH0pO1xuICAgIHJlcS5lbmQoKTtcbn07XG4iLCJpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBzdGFuZGFyZCBub2RlLmpzICd1dGlsJyBtb2R1bGVcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn0gZWxzZSB7XG4gIC8vIG9sZCBzY2hvb2wgc2hpbSBmb3Igb2xkIGJyb3dzZXJzXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBUZW1wQ3RvcigpXG4gICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yXG4gIH1cbn1cbiIsInZhciBuYXZpZ2F0b3IgPSB7IHVzZXJBZ2VudDogd2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQgfTtcbmlmICh3aW5kb3cubmF2aWdhdG9yLmlkKSBuYXZpZ2F0b3IuaWQgPSB3aW5kb3cubmF2aWdhdG9yLmlkO1xuXG4vKipcbiAqIFVuY29tcHJlc3NlZCBzb3VyY2UgY2FuIGJlIGZvdW5kIGF0IGh0dHBzOi8vbG9naW4ucGVyc29uYS5vcmcvaW5jbHVkZS5vcmlnLmpzXG4gKlxuICogVGhpcyBTb3VyY2UgQ29kZSBGb3JtIGlzIHN1YmplY3QgdG8gdGhlIHRlcm1zIG9mIHRoZSBNb3ppbGxhIFB1YmxpY1xuICogTGljZW5zZSwgdi4gMi4wLiBJZiBhIGNvcHkgb2YgdGhlIE1QTCB3YXMgbm90IGRpc3RyaWJ1dGVkIHdpdGggdGhpc1xuICogZmlsZSwgWW91IGNhbiBvYnRhaW4gb25lIGF0IGh0dHA6Ly9tb3ppbGxhLm9yZy9NUEwvMi4wLy4gKi9cblxuKGZ1bmN0aW9uKCl7dmFyIGE9ZnVuY3Rpb24oKXtmdW5jdGlvbiBlKGEpe3JldHVybiBBcnJheS5pc0FycmF5P0FycmF5LmlzQXJyYXkoYSk6YS5jb25zdHJ1Y3Rvci50b1N0cmluZygpLmluZGV4T2YoXCJBcnJheVwiKSE9LTF9ZnVuY3Rpb24gZChhLGMsZCl7dmFyIGU9YltjXVtkXTtmb3IodmFyIGY9MDtmPGUubGVuZ3RoO2YrKyllW2ZdLndpbj09PWEmJmUuc3BsaWNlKGYsMSk7YltjXVtkXS5sZW5ndGg9PT0wJiZkZWxldGUgYltjXVtkXX1mdW5jdGlvbiBjKGEsYyxkLGUpe2Z1bmN0aW9uIGYoYil7Zm9yKHZhciBjPTA7YzxiLmxlbmd0aDtjKyspaWYoYltjXS53aW49PT1hKXJldHVybiEwO3JldHVybiExfXZhciBnPSExO2lmKGM9PT1cIipcIilmb3IodmFyIGggaW4gYil7aWYoIWIuaGFzT3duUHJvcGVydHkoaCkpY29udGludWU7aWYoaD09PVwiKlwiKWNvbnRpbnVlO2lmKHR5cGVvZiBiW2hdW2RdPT1cIm9iamVjdFwiKXtnPWYoYltoXVtkXSk7aWYoZylicmVha319ZWxzZSBiW1wiKlwiXSYmYltcIipcIl1bZF0mJihnPWYoYltcIipcIl1bZF0pKSwhZyYmYltjXSYmYltjXVtkXSYmKGc9ZihiW2NdW2RdKSk7aWYoZyl0aHJvd1wiQSBjaGFubmVsIGlzIGFscmVhZHkgYm91bmQgdG8gdGhlIHNhbWUgd2luZG93IHdoaWNoIG92ZXJsYXBzIHdpdGggb3JpZ2luICdcIitjK1wiJyBhbmQgaGFzIHNjb3BlICdcIitkK1wiJ1wiO3R5cGVvZiBiW2NdIT1cIm9iamVjdFwiJiYoYltjXT17fSksdHlwZW9mIGJbY11bZF0hPVwib2JqZWN0XCImJihiW2NdW2RdPVtdKSxiW2NdW2RdLnB1c2goe3dpbjphLGhhbmRsZXI6ZX0pfVwidXNlIHN0cmljdFwiO3ZhciBhPU1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSoxMDAwMDAxKSxiPXt9LGY9e30sZz1mdW5jdGlvbihhKXt0cnl7dmFyIGM9SlNPTi5wYXJzZShhLmRhdGEpO2lmKHR5cGVvZiBjIT1cIm9iamVjdFwifHxjPT09bnVsbCl0aHJvd1wibWFsZm9ybWVkXCJ9Y2F0Y2goYSl7cmV0dXJufXZhciBkPWEuc291cmNlLGU9YS5vcmlnaW4sZyxoLGk7aWYodHlwZW9mIGMubWV0aG9kPT1cInN0cmluZ1wiKXt2YXIgaj1jLm1ldGhvZC5zcGxpdChcIjo6XCIpO2oubGVuZ3RoPT0yPyhnPWpbMF0saT1qWzFdKTppPWMubWV0aG9kfXR5cGVvZiBjLmlkIT1cInVuZGVmaW5lZFwiJiYoaD1jLmlkKTtpZih0eXBlb2YgaT09XCJzdHJpbmdcIil7dmFyIGs9ITE7aWYoYltlXSYmYltlXVtnXSlmb3IodmFyIGw9MDtsPGJbZV1bZ10ubGVuZ3RoO2wrKylpZihiW2VdW2ddW2xdLndpbj09PWQpe2JbZV1bZ11bbF0uaGFuZGxlcihlLGksYyksaz0hMDticmVha31pZighayYmYltcIipcIl0mJmJbXCIqXCJdW2ddKWZvcih2YXIgbD0wO2w8YltcIipcIl1bZ10ubGVuZ3RoO2wrKylpZihiW1wiKlwiXVtnXVtsXS53aW49PT1kKXtiW1wiKlwiXVtnXVtsXS5oYW5kbGVyKGUsaSxjKTticmVha319ZWxzZSB0eXBlb2YgaCE9XCJ1bmRlZmluZWRcIiYmZltoXSYmZltoXShlLGksYyl9O3dpbmRvdy5hZGRFdmVudExpc3RlbmVyP3dpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLGcsITEpOndpbmRvdy5hdHRhY2hFdmVudCYmd2luZG93LmF0dGFjaEV2ZW50KFwib25tZXNzYWdlXCIsZyk7cmV0dXJue2J1aWxkOmZ1bmN0aW9uKGIpe3ZhciBnPWZ1bmN0aW9uKGEpe2lmKGIuZGVidWdPdXRwdXQmJndpbmRvdy5jb25zb2xlJiZ3aW5kb3cuY29uc29sZS5sb2cpe3RyeXt0eXBlb2YgYSE9XCJzdHJpbmdcIiYmKGE9SlNPTi5zdHJpbmdpZnkoYSkpfWNhdGNoKGMpe31jb25zb2xlLmxvZyhcIltcIitqK1wiXSBcIithKX19O2lmKCF3aW5kb3cucG9zdE1lc3NhZ2UpdGhyb3dcImpzY2hhbm5lbCBjYW5ub3QgcnVuIHRoaXMgYnJvd3Nlciwgbm8gcG9zdE1lc3NhZ2VcIjtpZighd2luZG93LkpTT058fCF3aW5kb3cuSlNPTi5zdHJpbmdpZnl8fCF3aW5kb3cuSlNPTi5wYXJzZSl0aHJvd1wianNjaGFubmVsIGNhbm5vdCBydW4gdGhpcyBicm93c2VyLCBubyBKU09OIHBhcnNpbmcvc2VyaWFsaXphdGlvblwiO2lmKHR5cGVvZiBiIT1cIm9iamVjdFwiKXRocm93XCJDaGFubmVsIGJ1aWxkIGludm9rZWQgd2l0aG91dCBhIHByb3BlciBvYmplY3QgYXJndW1lbnRcIjtpZighYi53aW5kb3d8fCFiLndpbmRvdy5wb3N0TWVzc2FnZSl0aHJvd1wiQ2hhbm5lbC5idWlsZCgpIGNhbGxlZCB3aXRob3V0IGEgdmFsaWQgd2luZG93IGFyZ3VtZW50XCI7aWYod2luZG93PT09Yi53aW5kb3cpdGhyb3dcInRhcmdldCB3aW5kb3cgaXMgc2FtZSBhcyBwcmVzZW50IHdpbmRvdyAtLSBub3QgYWxsb3dlZFwiO3ZhciBoPSExO2lmKHR5cGVvZiBiLm9yaWdpbj09XCJzdHJpbmdcIil7dmFyIGk7Yi5vcmlnaW49PT1cIipcIj9oPSEwOm51bGwhPT0oaT1iLm9yaWdpbi5tYXRjaCgvXmh0dHBzPzpcXC9cXC8oPzpbLWEtekEtWjAtOV9cXC5dKSsoPzo6XFxkKyk/LykpJiYoYi5vcmlnaW49aVswXS50b0xvd2VyQ2FzZSgpLGg9ITApfWlmKCFoKXRocm93XCJDaGFubmVsLmJ1aWxkKCkgY2FsbGVkIHdpdGggYW4gaW52YWxpZCBvcmlnaW5cIjtpZih0eXBlb2YgYi5zY29wZSE9XCJ1bmRlZmluZWRcIil7aWYodHlwZW9mIGIuc2NvcGUhPVwic3RyaW5nXCIpdGhyb3dcInNjb3BlLCB3aGVuIHNwZWNpZmllZCwgbXVzdCBiZSBhIHN0cmluZ1wiO2lmKGIuc2NvcGUuc3BsaXQoXCI6OlwiKS5sZW5ndGg+MSl0aHJvd1wic2NvcGUgbWF5IG5vdCBjb250YWluIGRvdWJsZSBjb2xvbnM6ICc6OidcIn12YXIgaj1mdW5jdGlvbigpe3ZhciBhPVwiXCIsYj1cImFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVowMTIzNDU2Nzg5XCI7Zm9yKHZhciBjPTA7Yzw1O2MrKylhKz1iLmNoYXJBdChNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqYi5sZW5ndGgpKTtyZXR1cm4gYX0oKSxrPXt9LGw9e30sbT17fSxuPSExLG89W10scD1mdW5jdGlvbihhLGIsYyl7dmFyIGQ9ITEsZT0hMTtyZXR1cm57b3JpZ2luOmIsaW52b2tlOmZ1bmN0aW9uKGIsZCl7aWYoIW1bYV0pdGhyb3dcImF0dGVtcHRpbmcgdG8gaW52b2tlIGEgY2FsbGJhY2sgb2YgYSBub25leGlzdGVudCB0cmFuc2FjdGlvbjogXCIrYTt2YXIgZT0hMTtmb3IodmFyIGY9MDtmPGMubGVuZ3RoO2YrKylpZihiPT09Y1tmXSl7ZT0hMDticmVha31pZighZSl0aHJvd1wicmVxdWVzdCBzdXBwb3J0cyBubyBzdWNoIGNhbGxiYWNrICdcIitiK1wiJ1wiO3Qoe2lkOmEsY2FsbGJhY2s6YixwYXJhbXM6ZH0pfSxlcnJvcjpmdW5jdGlvbihiLGMpe2U9ITA7aWYoIW1bYV0pdGhyb3dcImVycm9yIGNhbGxlZCBmb3Igbm9uZXhpc3RlbnQgbWVzc2FnZTogXCIrYTtkZWxldGUgbVthXSx0KHtpZDphLGVycm9yOmIsbWVzc2FnZTpjfSl9LGNvbXBsZXRlOmZ1bmN0aW9uKGIpe2U9ITA7aWYoIW1bYV0pdGhyb3dcImNvbXBsZXRlIGNhbGxlZCBmb3Igbm9uZXhpc3RlbnQgbWVzc2FnZTogXCIrYTtkZWxldGUgbVthXSx0KHtpZDphLHJlc3VsdDpifSl9LGRlbGF5UmV0dXJuOmZ1bmN0aW9uKGEpe3R5cGVvZiBhPT1cImJvb2xlYW5cIiYmKGQ9YT09PSEwKTtyZXR1cm4gZH0sY29tcGxldGVkOmZ1bmN0aW9uKCl7cmV0dXJuIGV9fX0scT1mdW5jdGlvbihhLGIsYyl7cmV0dXJuIHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCl7aWYobFthXSl7dmFyIGQ9XCJ0aW1lb3V0IChcIitiK1wibXMpIGV4Y2VlZGVkIG9uIG1ldGhvZCAnXCIrYytcIidcIjsoMSxsW2FdLmVycm9yKShcInRpbWVvdXRfZXJyb3JcIixkKSxkZWxldGUgbFthXSxkZWxldGUgZlthXX19LGIpfSxyPWZ1bmN0aW9uKGEsYyxkKXtpZih0eXBlb2YgYi5nb3RNZXNzYWdlT2JzZXJ2ZXI9PVwiZnVuY3Rpb25cIil0cnl7Yi5nb3RNZXNzYWdlT2JzZXJ2ZXIoYSxkKX1jYXRjaChoKXtnKFwiZ290TWVzc2FnZU9ic2VydmVyKCkgcmFpc2VkIGFuIGV4Y2VwdGlvbjogXCIraC50b1N0cmluZygpKX1pZihkLmlkJiZjKXtpZihrW2NdKXt2YXIgaT1wKGQuaWQsYSxkLmNhbGxiYWNrcz9kLmNhbGxiYWNrczpbXSk7bVtkLmlkXT17fTt0cnl7aWYoZC5jYWxsYmFja3MmJmUoZC5jYWxsYmFja3MpJiZkLmNhbGxiYWNrcy5sZW5ndGg+MClmb3IodmFyIGo9MDtqPGQuY2FsbGJhY2tzLmxlbmd0aDtqKyspe3ZhciBuPWQuY2FsbGJhY2tzW2pdLG89ZC5wYXJhbXMscT1uLnNwbGl0KFwiL1wiKTtmb3IodmFyIHI9MDtyPHEubGVuZ3RoLTE7cisrKXt2YXIgcz1xW3JdO3R5cGVvZiBvW3NdIT1cIm9iamVjdFwiJiYob1tzXT17fSksbz1vW3NdfW9bcVtxLmxlbmd0aC0xXV09ZnVuY3Rpb24oKXt2YXIgYT1uO3JldHVybiBmdW5jdGlvbihiKXtyZXR1cm4gaS5pbnZva2UoYSxiKX19KCl9dmFyIHQ9a1tjXShpLGQucGFyYW1zKTshaS5kZWxheVJldHVybigpJiYhaS5jb21wbGV0ZWQoKSYmaS5jb21wbGV0ZSh0KX1jYXRjaChoKXt2YXIgdT1cInJ1bnRpbWVfZXJyb3JcIix2PW51bGw7dHlwZW9mIGg9PVwic3RyaW5nXCI/dj1oOnR5cGVvZiBoPT1cIm9iamVjdFwiJiYoaCYmZShoKSYmaC5sZW5ndGg9PTI/KHU9aFswXSx2PWhbMV0pOnR5cGVvZiBoLmVycm9yPT1cInN0cmluZ1wiJiYodT1oLmVycm9yLGgubWVzc2FnZT90eXBlb2YgaC5tZXNzYWdlPT1cInN0cmluZ1wiP3Y9aC5tZXNzYWdlOmg9aC5tZXNzYWdlOnY9XCJcIikpO2lmKHY9PT1udWxsKXRyeXt2PUpTT04uc3RyaW5naWZ5KGgpLHR5cGVvZiB2PT1cInVuZGVmaW5lZFwiJiYodj1oLnRvU3RyaW5nKCkpfWNhdGNoKHcpe3Y9aC50b1N0cmluZygpfWkuZXJyb3IodSx2KX19fWVsc2UgZC5pZCYmZC5jYWxsYmFjaz8hbFtkLmlkXXx8IWxbZC5pZF0uY2FsbGJhY2tzfHwhbFtkLmlkXS5jYWxsYmFja3NbZC5jYWxsYmFja10/ZyhcImlnbm9yaW5nIGludmFsaWQgY2FsbGJhY2ssIGlkOlwiK2QuaWQrXCIgKFwiK2QuY2FsbGJhY2srXCIpXCIpOmxbZC5pZF0uY2FsbGJhY2tzW2QuY2FsbGJhY2tdKGQucGFyYW1zKTpkLmlkP2xbZC5pZF0/KGQuZXJyb3I/KDEsbFtkLmlkXS5lcnJvcikoZC5lcnJvcixkLm1lc3NhZ2UpOmQucmVzdWx0IT09dW5kZWZpbmVkPygxLGxbZC5pZF0uc3VjY2VzcykoZC5yZXN1bHQpOigxLGxbZC5pZF0uc3VjY2VzcykoKSxkZWxldGUgbFtkLmlkXSxkZWxldGUgZltkLmlkXSk6ZyhcImlnbm9yaW5nIGludmFsaWQgcmVzcG9uc2U6IFwiK2QuaWQpOmMmJmtbY10mJmtbY10oe29yaWdpbjphfSxkLnBhcmFtcyl9O2MoYi53aW5kb3csYi5vcmlnaW4sdHlwZW9mIGIuc2NvcGU9PVwic3RyaW5nXCI/Yi5zY29wZTpcIlwiLHIpO3ZhciBzPWZ1bmN0aW9uKGEpe3R5cGVvZiBiLnNjb3BlPT1cInN0cmluZ1wiJiZiLnNjb3BlLmxlbmd0aCYmKGE9W2Iuc2NvcGUsYV0uam9pbihcIjo6XCIpKTtyZXR1cm4gYX0sdD1mdW5jdGlvbihhLGMpe2lmKCFhKXRocm93XCJwb3N0TWVzc2FnZSBjYWxsZWQgd2l0aCBudWxsIG1lc3NhZ2VcIjt2YXIgZD1uP1wicG9zdCAgXCI6XCJxdWV1ZSBcIjtnKGQrXCIgbWVzc2FnZTogXCIrSlNPTi5zdHJpbmdpZnkoYSkpO2lmKCFjJiYhbilvLnB1c2goYSk7ZWxzZXtpZih0eXBlb2YgYi5wb3N0TWVzc2FnZU9ic2VydmVyPT1cImZ1bmN0aW9uXCIpdHJ5e2IucG9zdE1lc3NhZ2VPYnNlcnZlcihiLm9yaWdpbixhKX1jYXRjaChlKXtnKFwicG9zdE1lc3NhZ2VPYnNlcnZlcigpIHJhaXNlZCBhbiBleGNlcHRpb246IFwiK2UudG9TdHJpbmcoKSl9Yi53aW5kb3cucG9zdE1lc3NhZ2UoSlNPTi5zdHJpbmdpZnkoYSksYi5vcmlnaW4pfX0sdT1mdW5jdGlvbihhLGMpe2coXCJyZWFkeSBtc2cgcmVjZWl2ZWRcIik7aWYobil0aHJvd1wicmVjZWl2ZWQgcmVhZHkgbWVzc2FnZSB3aGlsZSBpbiByZWFkeSBzdGF0ZS4gIGhlbHAhXCI7Yz09PVwicGluZ1wiP2orPVwiLVJcIjpqKz1cIi1MXCIsdi51bmJpbmQoXCJfX3JlYWR5XCIpLG49ITAsZyhcInJlYWR5IG1zZyBhY2NlcHRlZC5cIiksYz09PVwicGluZ1wiJiZ2Lm5vdGlmeSh7bWV0aG9kOlwiX19yZWFkeVwiLHBhcmFtczpcInBvbmdcIn0pO3doaWxlKG8ubGVuZ3RoKXQoby5wb3AoKSk7dHlwZW9mIGIub25SZWFkeT09XCJmdW5jdGlvblwiJiZiLm9uUmVhZHkodil9LHY9e3VuYmluZDpmdW5jdGlvbihhKXtpZihrW2FdKXtpZihkZWxldGUga1thXSlyZXR1cm4hMDt0aHJvd1wiY2FuJ3QgZGVsZXRlIG1ldGhvZDogXCIrYX1yZXR1cm4hMX0sYmluZDpmdW5jdGlvbihhLGIpe2lmKCFhfHx0eXBlb2YgYSE9XCJzdHJpbmdcIil0aHJvd1wiJ21ldGhvZCcgYXJndW1lbnQgdG8gYmluZCBtdXN0IGJlIHN0cmluZ1wiO2lmKCFifHx0eXBlb2YgYiE9XCJmdW5jdGlvblwiKXRocm93XCJjYWxsYmFjayBtaXNzaW5nIGZyb20gYmluZCBwYXJhbXNcIjtpZihrW2FdKXRocm93XCJtZXRob2QgJ1wiK2ErXCInIGlzIGFscmVhZHkgYm91bmQhXCI7a1thXT1iO3JldHVybiB0aGlzfSxjYWxsOmZ1bmN0aW9uKGIpe2lmKCFiKXRocm93XCJtaXNzaW5nIGFyZ3VtZW50cyB0byBjYWxsIGZ1bmN0aW9uXCI7aWYoIWIubWV0aG9kfHx0eXBlb2YgYi5tZXRob2QhPVwic3RyaW5nXCIpdGhyb3dcIidtZXRob2QnIGFyZ3VtZW50IHRvIGNhbGwgbXVzdCBiZSBzdHJpbmdcIjtpZighYi5zdWNjZXNzfHx0eXBlb2YgYi5zdWNjZXNzIT1cImZ1bmN0aW9uXCIpdGhyb3dcIidzdWNjZXNzJyBjYWxsYmFjayBtaXNzaW5nIGZyb20gY2FsbFwiO3ZhciBjPXt9LGQ9W10sZT1mdW5jdGlvbihhLGIpe2lmKHR5cGVvZiBiPT1cIm9iamVjdFwiKWZvcih2YXIgZiBpbiBiKXtpZighYi5oYXNPd25Qcm9wZXJ0eShmKSljb250aW51ZTt2YXIgZz1hKyhhLmxlbmd0aD9cIi9cIjpcIlwiKStmO3R5cGVvZiBiW2ZdPT1cImZ1bmN0aW9uXCI/KGNbZ109YltmXSxkLnB1c2goZyksZGVsZXRlIGJbZl0pOnR5cGVvZiBiW2ZdPT1cIm9iamVjdFwiJiZlKGcsYltmXSl9fTtlKFwiXCIsYi5wYXJhbXMpO3ZhciBnPXtpZDphLG1ldGhvZDpzKGIubWV0aG9kKSxwYXJhbXM6Yi5wYXJhbXN9O2QubGVuZ3RoJiYoZy5jYWxsYmFja3M9ZCksYi50aW1lb3V0JiZxKGEsYi50aW1lb3V0LHMoYi5tZXRob2QpKSxsW2FdPXtjYWxsYmFja3M6YyxlcnJvcjpiLmVycm9yLHN1Y2Nlc3M6Yi5zdWNjZXNzfSxmW2FdPXIsYSsrLHQoZyl9LG5vdGlmeTpmdW5jdGlvbihhKXtpZighYSl0aHJvd1wibWlzc2luZyBhcmd1bWVudHMgdG8gbm90aWZ5IGZ1bmN0aW9uXCI7aWYoIWEubWV0aG9kfHx0eXBlb2YgYS5tZXRob2QhPVwic3RyaW5nXCIpdGhyb3dcIidtZXRob2QnIGFyZ3VtZW50IHRvIG5vdGlmeSBtdXN0IGJlIHN0cmluZ1wiO3Qoe21ldGhvZDpzKGEubWV0aG9kKSxwYXJhbXM6YS5wYXJhbXN9KX0sZGVzdHJveTpmdW5jdGlvbigpe2QoYi53aW5kb3csYi5vcmlnaW4sdHlwZW9mIGIuc2NvcGU9PVwic3RyaW5nXCI/Yi5zY29wZTpcIlwiKSx3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcj93aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIixyLCExKTp3aW5kb3cuZGV0YWNoRXZlbnQmJndpbmRvdy5kZXRhY2hFdmVudChcIm9ubWVzc2FnZVwiLHIpLG49ITEsaz17fSxtPXt9LGw9e30sYi5vcmlnaW49bnVsbCxvPVtdLGcoXCJjaGFubmVsIGRlc3Ryb3llZFwiKSxqPVwiXCJ9fTt2LmJpbmQoXCJfX3JlYWR5XCIsdSksc2V0VGltZW91dChmdW5jdGlvbigpe30sMCk7cmV0dXJuIHZ9fX0oKTtXaW5DaGFuPWZ1bmN0aW9uKCl7ZnVuY3Rpb24gaSgpe3ZhciBiPXdpbmRvdy5sb2NhdGlvbixjPXdpbmRvdy5vcGVuZXIuZnJhbWVzLGQ9Yi5wcm90b2NvbCtcIi8vXCIrYi5ob3N0O2Zvcih2YXIgZT1jLmxlbmd0aC0xO2U+PTA7ZS0tKXRyeXtpZihjW2VdLmxvY2F0aW9uLmhyZWYuaW5kZXhPZihkKT09PTAmJmNbZV0ubmFtZT09PWEpcmV0dXJuIGNbZV19Y2F0Y2goZil7fXJldHVybn1mdW5jdGlvbiBoKGEpey9eaHR0cHM/OlxcL1xcLy8udGVzdChhKXx8KGE9d2luZG93LmxvY2F0aW9uLmhyZWYpO3ZhciBiPS9eKGh0dHBzPzpcXC9cXC9bXFwtX2EtekEtWlxcLjAtOTpdKykvLmV4ZWMoYSk7cmV0dXJuIGI/YlsxXTphfWZ1bmN0aW9uIGcoKXtyZXR1cm4gd2luZG93LkpTT04mJndpbmRvdy5KU09OLnN0cmluZ2lmeSYmd2luZG93LkpTT04ucGFyc2UmJndpbmRvdy5wb3N0TWVzc2FnZX1mdW5jdGlvbiBmKCl7dHJ5e3ZhciBhPW5hdmlnYXRvci51c2VyQWdlbnQ7cmV0dXJuIGEuaW5kZXhPZihcIkZlbm5lYy9cIikhPS0xfHxhLmluZGV4T2YoXCJGaXJlZm94L1wiKSE9LTEmJmEuaW5kZXhPZihcIkFuZHJvaWRcIikhPS0xfWNhdGNoKGIpe31yZXR1cm4hMX1mdW5jdGlvbiBlKCl7dmFyIGE9LTE7aWYobmF2aWdhdG9yLmFwcE5hbWU9PT1cIk1pY3Jvc29mdCBJbnRlcm5ldCBFeHBsb3JlclwiKXt2YXIgYj1uYXZpZ2F0b3IudXNlckFnZW50LGM9bmV3IFJlZ0V4cChcIk1TSUUgKFswLTldezEsfVsuMC05XXswLH0pXCIpO2MuZXhlYyhiKSE9bnVsbCYmKGE9cGFyc2VGbG9hdChSZWdFeHAuJDEpKX1yZXR1cm4gYT49OH1mdW5jdGlvbiBkKGEsYixjKXthLmRldGFjaEV2ZW50P2EuZGV0YWNoRXZlbnQoXCJvblwiK2IsYyk6YS5yZW1vdmVFdmVudExpc3RlbmVyJiZhLnJlbW92ZUV2ZW50TGlzdGVuZXIoYixjLCExKX1mdW5jdGlvbiBjKGEsYixjKXthLmF0dGFjaEV2ZW50P2EuYXR0YWNoRXZlbnQoXCJvblwiK2IsYyk6YS5hZGRFdmVudExpc3RlbmVyJiZhLmFkZEV2ZW50TGlzdGVuZXIoYixjLCExKX12YXIgYT1cIl9fd2luY2hhbl9yZWxheV9mcmFtZVwiLGI9XCJkaWVcIixqPWUoKTtyZXR1cm4gZygpP3tvcGVuOmZ1bmN0aW9uKGUsZyl7ZnVuY3Rpb24gcShhKXt0cnl7dmFyIGI9SlNPTi5wYXJzZShhLmRhdGEpO2IuYT09PVwicmVhZHlcIj9tLnBvc3RNZXNzYWdlKG8sbCk6Yi5hPT09XCJlcnJvclwiP2cmJihnKGIuZCksZz1udWxsKTpiLmE9PT1cInJlc3BvbnNlXCImJihkKHdpbmRvdyxcIm1lc3NhZ2VcIixxKSxkKHdpbmRvdyxcInVubG9hZFwiLHApLHAoKSxnJiYoZyhudWxsLGIuZCksZz1udWxsKSl9Y2F0Y2goYyl7fX1mdW5jdGlvbiBwKCl7ayYmZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChrKSxrPXVuZGVmaW5lZDtpZihuKXRyeXtuLmNsb3NlKCl9Y2F0Y2goYSl7bS5wb3N0TWVzc2FnZShiLGwpfW49bT11bmRlZmluZWR9aWYoIWcpdGhyb3dcIm1pc3NpbmcgcmVxdWlyZWQgY2FsbGJhY2sgYXJndW1lbnRcIjt2YXIgaTtlLnVybHx8KGk9XCJtaXNzaW5nIHJlcXVpcmVkICd1cmwnIHBhcmFtZXRlclwiKSxlLnJlbGF5X3VybHx8KGk9XCJtaXNzaW5nIHJlcXVpcmVkICdyZWxheV91cmwnIHBhcmFtZXRlclwiKSxpJiZzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7ZyhpKX0sMCksZS53aW5kb3dfbmFtZXx8KGUud2luZG93X25hbWU9bnVsbCk7aWYoIWUud2luZG93X2ZlYXR1cmVzfHxmKCkpZS53aW5kb3dfZmVhdHVyZXM9dW5kZWZpbmVkO3ZhciBrLGw9aChlLnVybCk7aWYobCE9PWgoZS5yZWxheV91cmwpKXJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7ZyhcImludmFsaWQgYXJndW1lbnRzOiBvcmlnaW4gb2YgdXJsIGFuZCByZWxheV91cmwgbXVzdCBtYXRjaFwiKX0sMCk7dmFyIG07aiYmKGs9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlmcmFtZVwiKSxrLnNldEF0dHJpYnV0ZShcInNyY1wiLGUucmVsYXlfdXJsKSxrLnN0eWxlLmRpc3BsYXk9XCJub25lXCIsay5zZXRBdHRyaWJ1dGUoXCJuYW1lXCIsYSksZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChrKSxtPWsuY29udGVudFdpbmRvdyk7dmFyIG49d2luZG93Lm9wZW4oZS51cmwsZS53aW5kb3dfbmFtZSxlLndpbmRvd19mZWF0dXJlcyk7bXx8KG09bik7dmFyIG89SlNPTi5zdHJpbmdpZnkoe2E6XCJyZXF1ZXN0XCIsZDplLnBhcmFtc30pO2Mod2luZG93LFwidW5sb2FkXCIscCksYyh3aW5kb3csXCJtZXNzYWdlXCIscSk7cmV0dXJue2Nsb3NlOnAsZm9jdXM6ZnVuY3Rpb24oKXtpZihuKXRyeXtuLmZvY3VzKCl9Y2F0Y2goYSl7fX19fX06e29wZW46ZnVuY3Rpb24oYSxiLGMsZCl7c2V0VGltZW91dChmdW5jdGlvbigpe2QoXCJ1bnN1cHBvcnRlZCBicm93c2VyXCIpfSwwKX19fSgpO3ZhciBiPWZ1bmN0aW9uKCl7ZnVuY3Rpb24gbCgpe3JldHVybiBjfWZ1bmN0aW9uIGsoKXtjPWcoKXx8aCgpfHxpKCl8fGooKTtyZXR1cm4hY31mdW5jdGlvbiBqKCl7aWYoISh3aW5kb3cuSlNPTiYmd2luZG93LkpTT04uc3RyaW5naWZ5JiZ3aW5kb3cuSlNPTi5wYXJzZSkpcmV0dXJuXCJKU09OX05PVF9TVVBQT1JURURcIn1mdW5jdGlvbiBpKCl7aWYoIWEucG9zdE1lc3NhZ2UpcmV0dXJuXCJQT1NUTUVTU0FHRV9OT1RfU1VQUE9SVEVEXCJ9ZnVuY3Rpb24gaCgpe3RyeXt2YXIgYj1cImxvY2FsU3RvcmFnZVwiaW4gYSYmYS5sb2NhbFN0b3JhZ2UhPT1udWxsO2lmKGIpYS5sb2NhbFN0b3JhZ2Uuc2V0SXRlbShcInRlc3RcIixcInRydWVcIiksYS5sb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbShcInRlc3RcIik7ZWxzZSByZXR1cm5cIkxPQ0FMU1RPUkFHRV9OT1RfU1VQUE9SVEVEXCJ9Y2F0Y2goYyl7cmV0dXJuXCJMT0NBTFNUT1JBR0VfRElTQUJMRURcIn19ZnVuY3Rpb24gZygpe3JldHVybiBmKCl9ZnVuY3Rpb24gZigpe3ZhciBhPWUoKSxiPWE+LTEmJmE8ODtpZihiKXJldHVyblwiQkFEX0lFX1ZFUlNJT05cIn1mdW5jdGlvbiBlKCl7dmFyIGE9LTE7aWYoYi5hcHBOYW1lPT1cIk1pY3Jvc29mdCBJbnRlcm5ldCBFeHBsb3JlclwiKXt2YXIgYz1iLnVzZXJBZ2VudCxkPW5ldyBSZWdFeHAoXCJNU0lFIChbMC05XXsxLH1bLjAtOV17MCx9KVwiKTtkLmV4ZWMoYykhPW51bGwmJihhPXBhcnNlRmxvYXQoUmVnRXhwLiQxKSl9cmV0dXJuIGF9ZnVuY3Rpb24gZChjLGQpe2I9YyxhPWR9dmFyIGE9d2luZG93LGI9bmF2aWdhdG9yLGM7cmV0dXJue3NldFRlc3RFbnY6ZCxpc1N1cHBvcnRlZDprLGdldE5vU3VwcG9ydFJlYXNvbjpsfX0oKTtuYXZpZ2F0b3IuaWR8fChuYXZpZ2F0b3IuaWQ9e30sbmF2aWdhdG9yLm1veklkP25hdmlnYXRvci5pZD1uYXZpZ2F0b3IubW96SWQ6bmF2aWdhdG9yLmlkPXt9KTtpZighbmF2aWdhdG9yLmlkLnJlcXVlc3R8fG5hdmlnYXRvci5pZC5fc2hpbW1lZCl7dmFyIGM9XCJodHRwczovL2xvZ2luLnBlcnNvbmEub3JnXCIsZD1uYXZpZ2F0b3IudXNlckFnZW50LGU9ZC5pbmRleE9mKFwiRmVubmVjL1wiKSE9LTF8fGQuaW5kZXhPZihcIkZpcmVmb3gvXCIpIT0tMSYmZC5pbmRleE9mKFwiQW5kcm9pZFwiKSE9LTEsZj1lP3VuZGVmaW5lZDpcIm1lbnViYXI9MCxsb2NhdGlvbj0xLHJlc2l6YWJsZT0xLHNjcm9sbGJhcnM9MSxzdGF0dXM9MCx3aWR0aD03MDAsaGVpZ2h0PTM3NVwiLGcsaD17bG9naW46bnVsbCxsb2dvdXQ6bnVsbCxtYXRjaDpudWxsLHJlYWR5Om51bGx9LGksaj11bmRlZmluZWQ7ZnVuY3Rpb24gayhhKXthIT09ITA7aWYoaj09PXVuZGVmaW5lZClqPWE7ZWxzZSBpZihqIT1hKXRocm93IG5ldyBFcnJvcihcInlvdSBjYW5ub3QgY29tYmluZSB0aGUgbmF2aWdhdG9yLmlkLndhdGNoKCkgQVBJIHdpdGggbmF2aWdhdG9yLmlkLmdldFZlcmlmaWVkRW1haWwoKSBvciBuYXZpZ2F0b3IuaWQuZ2V0KCl0aGlzIHNpdGUgc2hvdWxkIGluc3RlYWQgdXNlIG5hdmlnYXRvci5pZC5yZXF1ZXN0KCkgYW5kIG5hdmlnYXRvci5pZC53YXRjaCgpXCIpfXZhciBsLG09ITEsbj1iLmlzU3VwcG9ydGVkKCk7ZnVuY3Rpb24gbyhhKXtkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyP2RvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJET01Db250ZW50TG9hZGVkXCIsZnVuY3Rpb24gYigpe2RvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJET01Db250ZW50TG9hZGVkXCIsYiksYSgpfSwhMSk6ZG9jdW1lbnQuYXR0YWNoRXZlbnQmJmRvY3VtZW50LnJlYWR5U3RhdGUmJmRvY3VtZW50LmF0dGFjaEV2ZW50KFwib25yZWFkeXN0YXRlY2hhbmdlXCIsZnVuY3Rpb24gYygpe3ZhciBiPWRvY3VtZW50LnJlYWR5U3RhdGU7aWYoYj09PVwibG9hZGVkXCJ8fGI9PT1cImNvbXBsZXRlXCJ8fGI9PT1cImludGVyYWN0aXZlXCIpZG9jdW1lbnQuZGV0YWNoRXZlbnQoXCJvbnJlYWR5c3RhdGVjaGFuZ2VcIixjKSxhKCl9KX1mdW5jdGlvbiBwKCl7aWYoISFuKXt2YXIgYj13aW5kb3cuZG9jdW1lbnQ7aWYoIWIuYm9keSl7bXx8KG8ocCksbT0hMCk7cmV0dXJufXRyeXtpZighbCl7dmFyIGQ9Yi5jcmVhdGVFbGVtZW50KFwiaWZyYW1lXCIpO2Quc3R5bGUuZGlzcGxheT1cIm5vbmVcIixiLmJvZHkuYXBwZW5kQ2hpbGQoZCksZC5zcmM9YytcIi9jb21tdW5pY2F0aW9uX2lmcmFtZVwiLGw9YS5idWlsZCh7d2luZG93OmQuY29udGVudFdpbmRvdyxvcmlnaW46YyxzY29wZTpcIm1vemlkX25pXCIsb25SZWFkeTpmdW5jdGlvbigpe2wuY2FsbCh7bWV0aG9kOlwibG9hZGVkXCIsc3VjY2VzczpmdW5jdGlvbigpe2gucmVhZHkmJmgucmVhZHkoKX0sZXJyb3I6ZnVuY3Rpb24oKXt9fSl9fSksbC5iaW5kKFwibG9nb3V0XCIsZnVuY3Rpb24oYSxiKXtoLmxvZ291dCYmaC5sb2dvdXQoKX0pLGwuYmluZChcImxvZ2luXCIsZnVuY3Rpb24oYSxiKXtoLmxvZ2luJiZoLmxvZ2luKGIpfSksbC5iaW5kKFwibWF0Y2hcIixmdW5jdGlvbihhLGIpe2gubWF0Y2gmJmgubWF0Y2goKX0pLHEoaSkmJmwubm90aWZ5KHttZXRob2Q6XCJsb2dnZWRJblVzZXJcIixwYXJhbXM6aX0pfX1jYXRjaChlKXtsPXVuZGVmaW5lZH19fWZ1bmN0aW9uIHEoYSl7cmV0dXJuIHR5cGVvZiBhIT1cInVuZGVmaW5lZFwifWZ1bmN0aW9uIHIoYSl7dHJ5e2NvbnNvbGUud2FybihhKX1jYXRjaChiKXt9fWZ1bmN0aW9uIHMoYSxiKXtpZihxKGFbYl0pKXtyKGIrXCIgaGFzIGJlZW4gZGVwcmVjYXRlZFwiKTtyZXR1cm4hMH19ZnVuY3Rpb24gdChhLGIsYyl7aWYocShhW2JdKSYmcShhW2NdKSl0aHJvdyBuZXcgRXJyb3IoXCJ5b3UgY2Fubm90IHN1cHBseSAqYm90aCogXCIrYitcIiBhbmQgXCIrYyk7cyhhLGIpJiYoYVtjXT1hW2JdLGRlbGV0ZSBhW2JdKX1mdW5jdGlvbiB1KGEpe2lmKHR5cGVvZiBhPT1cIm9iamVjdFwiKXtpZihhLm9ubG9naW4mJnR5cGVvZiBhLm9ubG9naW4hPVwiZnVuY3Rpb25cInx8YS5vbmxvZ291dCYmdHlwZW9mIGEub25sb2dvdXQhPVwiZnVuY3Rpb25cInx8YS5vbm1hdGNoJiZ0eXBlb2YgYS5vbm1hdGNoIT1cImZ1bmN0aW9uXCJ8fGEub25yZWFkeSYmdHlwZW9mIGEub25yZWFkeSE9XCJmdW5jdGlvblwiKXRocm93IG5ldyBFcnJvcihcIm5vbi1mdW5jdGlvbiB3aGVyZSBmdW5jdGlvbiBleHBlY3RlZCBpbiBwYXJhbWV0ZXJzIHRvIG5hdmlnYXRvci5pZC53YXRjaCgpXCIpO2lmKCFhLm9ubG9naW4pdGhyb3cgbmV3IEVycm9yKFwiJ29ubG9naW4nIGlzIGEgcmVxdWlyZWQgYXJndW1lbnQgdG8gbmF2aWdhdG9yLmlkLndhdGNoKClcIik7aWYoIWEub25sb2dvdXQpdGhyb3cgbmV3IEVycm9yKFwiJ29ubG9nb3V0JyBpcyBhIHJlcXVpcmVkIGFyZ3VtZW50IHRvIG5hdmlnYXRvci5pZC53YXRjaCgpXCIpO2gubG9naW49YS5vbmxvZ2lufHxudWxsLGgubG9nb3V0PWEub25sb2dvdXR8fG51bGwsaC5tYXRjaD1hLm9ubWF0Y2h8fG51bGwsaC5yZWFkeT1hLm9ucmVhZHl8fG51bGwsdChhLFwibG9nZ2VkSW5FbWFpbFwiLFwibG9nZ2VkSW5Vc2VyXCIpLGk9YS5sb2dnZWRJblVzZXIscCgpfX12YXIgdjtmdW5jdGlvbiB3KCl7dmFyIGE9djthPT09XCJyZXF1ZXN0XCImJihoLnJlYWR5P2E9XCJ3YXRjaF93aXRoX29ucmVhZHlcIjphPVwid2F0Y2hfd2l0aG91dF9vbnJlYWR5XCIpO3JldHVybiBhfWZ1bmN0aW9uIHgoYSl7cyhhLFwicmVxdWlyZWRFbWFpbFwiKSx0KGEsXCJ0b3NVUkxcIixcInRlcm1zT2ZTZXJ2aWNlXCIpLHQoYSxcInByaXZhY3lVUkxcIixcInByaXZhY3lQb2xpY3lcIiksYS50ZXJtc09mU2VydmljZSYmIWEucHJpdmFjeVBvbGljeSYmcihcInRlcm1zT2ZTZXJ2aWNlIGlnbm9yZWQgdW5sZXNzIHByaXZhY3lQb2xpY3kgYWxzbyBkZWZpbmVkXCIpLGEucHJpdmFjeVBvbGljeSYmIWEudGVybXNPZlNlcnZpY2UmJnIoXCJwcml2YWN5UG9saWN5IGlnbm9yZWQgdW5sZXNzIHRlcm1zT2ZTZXJ2aWNlIGFsc28gZGVmaW5lZFwiKSxhLnJwX2FwaT13KCksdj1udWxsLGEuc3RhcnRfdGltZT0obmV3IERhdGUpLmdldFRpbWUoKTtpZihnKXRyeXtnLmZvY3VzKCl9Y2F0Y2goZCl7fWVsc2V7aWYoIWIuaXNTdXBwb3J0ZWQoKSl7dmFyIGU9Yi5nZXROb1N1cHBvcnRSZWFzb24oKSxpPVwidW5zdXBwb3J0ZWRfZGlhbG9nXCI7ZT09PVwiTE9DQUxTVE9SQUdFX0RJU0FCTEVEXCImJihpPVwiY29va2llc19kaXNhYmxlZFwiKSxnPXdpbmRvdy5vcGVuKGMrXCIvXCIraSxudWxsLGYpO3JldHVybn1sJiZsLm5vdGlmeSh7bWV0aG9kOlwiZGlhbG9nX3J1bm5pbmdcIn0pLGc9V2luQ2hhbi5vcGVuKHt1cmw6YytcIi9zaWduX2luXCIscmVsYXlfdXJsOmMrXCIvcmVsYXlcIix3aW5kb3dfZmVhdHVyZXM6Zix3aW5kb3dfbmFtZTpcIl9fcGVyc29uYV9kaWFsb2dcIixwYXJhbXM6e21ldGhvZDpcImdldFwiLHBhcmFtczphfX0sZnVuY3Rpb24oYixjKXtsJiYoIWImJmMmJmMuZW1haWwmJmwubm90aWZ5KHttZXRob2Q6XCJsb2dnZWRJblVzZXJcIixwYXJhbXM6Yy5lbWFpbH0pLGwubm90aWZ5KHttZXRob2Q6XCJkaWFsb2dfY29tcGxldGVcIn0pKSxnPXVuZGVmaW5lZDtpZighYiYmYyYmYy5hc3NlcnRpb24pdHJ5e2gubG9naW4mJmgubG9naW4oYy5hc3NlcnRpb24pfWNhdGNoKGQpe31pZihiPT09XCJjbGllbnQgY2xvc2VkIHdpbmRvd1wifHwhYylhJiZhLm9uY2FuY2VsJiZhLm9uY2FuY2VsKCksZGVsZXRlIGEub25jYW5jZWx9KX19bmF2aWdhdG9yLmlkPXtyZXF1ZXN0OmZ1bmN0aW9uKGEpe2lmKHRoaXMhPW5hdmlnYXRvci5pZCl0aHJvdyBuZXcgRXJyb3IoXCJhbGwgbmF2aWdhdG9yLmlkIGNhbGxzIG11c3QgYmUgbWFkZSBvbiB0aGUgbmF2aWdhdG9yLmlkIG9iamVjdFwiKTtpZighaC5sb2dpbil0aHJvdyBuZXcgRXJyb3IoXCJuYXZpZ2F0b3IuaWQud2F0Y2ggbXVzdCBiZSBjYWxsZWQgYmVmb3JlIG5hdmlnYXRvci5pZC5yZXF1ZXN0XCIpO2E9YXx8e30sayghMSksdj1cInJlcXVlc3RcIixhLnJldHVyblRvfHwoYS5yZXR1cm5Ubz1kb2N1bWVudC5sb2NhdGlvbi5wYXRobmFtZSk7cmV0dXJuIHgoYSl9LHdhdGNoOmZ1bmN0aW9uKGEpe2lmKHRoaXMhPW5hdmlnYXRvci5pZCl0aHJvdyBuZXcgRXJyb3IoXCJhbGwgbmF2aWdhdG9yLmlkIGNhbGxzIG11c3QgYmUgbWFkZSBvbiB0aGUgbmF2aWdhdG9yLmlkIG9iamVjdFwiKTtrKCExKSx1KGEpfSxsb2dvdXQ6ZnVuY3Rpb24oYSl7aWYodGhpcyE9bmF2aWdhdG9yLmlkKXRocm93IG5ldyBFcnJvcihcImFsbCBuYXZpZ2F0b3IuaWQgY2FsbHMgbXVzdCBiZSBtYWRlIG9uIHRoZSBuYXZpZ2F0b3IuaWQgb2JqZWN0XCIpO3AoKSxsJiZsLm5vdGlmeSh7bWV0aG9kOlwibG9nb3V0XCJ9KSx0eXBlb2YgYT09XCJmdW5jdGlvblwiJiYocihcIm5hdmlnYXRvci5pZC5sb2dvdXQgY2FsbGJhY2sgYXJndW1lbnQgaGFzIGJlZW4gZGVwcmVjYXRlZC5cIiksc2V0VGltZW91dChhLDApKX0sZ2V0OmZ1bmN0aW9uKGEsYil7dmFyIGM9e307Yj1ifHx7fSxjLnByaXZhY3lQb2xpY3k9Yi5wcml2YWN5UG9saWN5fHx1bmRlZmluZWQsYy50ZXJtc09mU2VydmljZT1iLnRlcm1zT2ZTZXJ2aWNlfHx1bmRlZmluZWQsYy5wcml2YWN5VVJMPWIucHJpdmFjeVVSTHx8dW5kZWZpbmVkLGMudG9zVVJMPWIudG9zVVJMfHx1bmRlZmluZWQsYy5zaXRlTmFtZT1iLnNpdGVOYW1lfHx1bmRlZmluZWQsYy5zaXRlTG9nbz1iLnNpdGVMb2dvfHx1bmRlZmluZWQsdj12fHxcImdldFwiO3MoYixcInNpbGVudFwiKT9hJiZzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7YShudWxsKX0sMCk6KGsoITApLHUoe29ubG9naW46ZnVuY3Rpb24oYil7YSYmKGEoYiksYT1udWxsKX0sb25sb2dvdXQ6ZnVuY3Rpb24oKXt9fSksYy5vbmNhbmNlbD1mdW5jdGlvbigpe2EmJihhKG51bGwpLGE9bnVsbCksaC5sb2dpbj1oLmxvZ291dD1oLm1hdGNoPWgucmVhZHk9bnVsbH0seChjKSl9LGdldFZlcmlmaWVkRW1haWw6ZnVuY3Rpb24oYSl7cihcIm5hdmlnYXRvci5pZC5nZXRWZXJpZmllZEVtYWlsIGhhcyBiZWVuIGRlcHJlY2F0ZWRcIiksayghMCksdj1cImdldFZlcmlmaWVkRW1haWxcIixuYXZpZ2F0b3IuaWQuZ2V0KGEpfSxfc2hpbW1lZDohMH19fSkoKVxubW9kdWxlLmV4cG9ydHMgPSBuYXZpZ2F0b3IuaWQ7XG4iLCJ2YXIgZ2xvYmFsPXNlbGY7Ly8vIHNoaW0gZm9yIGJyb3dzZXIgcGFja2FnaW5nXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBnbG9iYWwuV2ViU29ja2V0IHx8IGdsb2JhbC5Nb3pXZWJTb2NrZXQ7XG59XG4iXX0=
;