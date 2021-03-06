// Generated by CoffeeScript 1.10.0
(function() {
  var PaginationStream, TransloaditClient, _, crypto, fs, reqr, request, retry, unknownErrMsg;

  reqr = global.GENTLY ? GENTLY.hijack(require) : require;

  request = reqr("request");

  crypto = reqr("crypto");

  _ = reqr("underscore");

  fs = reqr("fs");

  retry = reqr("retry");

  PaginationStream = reqr("./PaginationStream");

  unknownErrMsg = "Unknown error. Please report this at ";

  unknownErrMsg += "https://github.com/transloadit/node-sdk/issues/new?title=Unknown%20error";

  TransloaditClient = (function() {
    function TransloaditClient(opts) {
      opts = opts || {};
      if (opts.useSsl == null) {
        opts.useSsl = true;
      }
      if (opts.authKey == null) {
        throw new Error("Please provide an authKey");
      }
      if (opts.authSecret == null) {
        throw new Error("Please provide an authSecret");
      }
      this._authKey = opts.authKey;
      this._authSecret = opts.authSecret;
      this._service = opts.service || "api2.transloadit.com";
      this._region = opts.region || "us-east-1";
      this._protocol = opts.useSsl ? "https://" : "http://";
      this._streams = {};
      this._lastUsedAssemblyUrl = "";
    }

    TransloaditClient.prototype.addStream = function(name, stream) {
      stream.pause();
      return this._streams[name] = stream;
    };

    TransloaditClient.prototype.addFile = function(name, path) {
      var stream;
      stream = fs.createReadStream(path);
      stream.on("error", function(err) {
        return null;
      });
      return this.addStream(name, stream);
    };

    TransloaditClient.prototype.getLastUsedAssemblyUrl = function() {
      return this._lastUsedAssemblyUrl;
    };

    TransloaditClient.prototype.createAssembly = function(opts, cb) {
      var callback, called, i, label, len, ncompleted, requestOpts, sendRequest, stream, streamErrCb, streams;
      callback = cb;
      called = false;
      cb = function(err, result) {
        if (!called) {
          called = true;
          return callback(err, result);
        }
      };
      this._lastUsedAssemblyUrl = (this._serviceUrl()) + "/assemblies";
      requestOpts = {
        url: this._lastUsedAssemblyUrl,
        method: "post",
        timeout: 24 * 60 * 60 * 1000,
        params: opts.params || {},
        fields: opts.fields || {}
      };
      streams = (function() {
        var ref, results;
        ref = this._streams;
        results = [];
        for (label in ref) {
          stream = ref[label];
          results.push(stream);
        }
        return results;
      }).call(this);
      sendRequest = (function(_this) {
        return function() {
          return _this._remoteJson(requestOpts, function(err, result) {
            var ref, ref1;
            _this._streams = {};
            if (err) {
              return cb(err);
            }
            if (result && result.ok) {
              return cb(null, result);
            }
            err = new Error((ref = (ref1 = result.error) != null ? ref1 : result.message) != null ? ref : unknownErrMsg);
            return cb(err);
          });
        };
      })(this);
      ncompleted = 0;
      streamErrCb = function(err) {
        if (err != null) {
          return cb(err);
        }
        if (++ncompleted === streams.length) {
          return sendRequest();
        }
      };
      for (i = 0, len = streams.length; i < len; i++) {
        stream = streams[i];
        stream.on("error", cb);
        if (stream.path == null) {
          streamErrCb(null);
          continue;
        }
        fs.access(stream.path, fs.F_OK | fs.R_OK, function(err) {
          if (err != null) {
            return streamErrCb(err);
          }
          return streamErrCb(null);
        });
      }
      if (streams.length === 0) {
        return sendRequest();
      }
    };

    TransloaditClient.prototype.deleteAssembly = function(assemblyId, cb) {
      return this.getAssembly(assemblyId, (function(_this) {
        return function(err, result) {
          var opts;
          if (err != null) {
            return cb(err);
          }
          opts = {
            url: result.assembly_url,
            timeout: 5000,
            method: "del",
            params: {}
          };
          return _this._remoteJson(opts, cb);
        };
      })(this));
    };

    TransloaditClient.prototype.replayAssembly = function(opts, cb) {
      var assemblyId, requestOpts;
      assemblyId = opts.assembly_id;
      requestOpts = {
        url: this._serviceUrl() + ("/assemblies/" + assemblyId + "/replay"),
        method: "post"
      };
      if (opts.notify_url != null) {
        requestOpts.params = {
          notify_url: opts.notify_url
        };
      }
      return this._remoteJson(requestOpts, cb);
    };

    TransloaditClient.prototype.replayAssemblyNotification = function(opts, cb) {
      var assemblyId, requestOpts;
      assemblyId = opts.assembly_id;
      requestOpts = {
        url: this._serviceUrl() + ("/assembly_notifications/" + assemblyId + "/replay"),
        method: "post"
      };
      if (opts.notify_url != null) {
        requestOpts.params = {
          notify_url: opts.notify_url
        };
      }
      return this._remoteJson(requestOpts, cb);
    };

    TransloaditClient.prototype.listAssemblyNotifications = function(params, cb) {
      var requestOpts;
      requestOpts = {
        url: this._serviceUrl() + "/assembly_notifications",
        method: "get",
        params: params || {}
      };
      return this._remoteJson(requestOpts, cb);
    };

    TransloaditClient.prototype.streamAssemblyNotifications = function(params) {
      return new PaginationStream((function(_this) {
        return function(pageno, cb) {
          return _this.listAssemblyNotifications(_.extend({}, params, {
            page: pageno
          }), cb);
        };
      })(this));
    };

    TransloaditClient.prototype.listAssemblies = function(params, cb) {
      var requestOpts;
      requestOpts = {
        url: this._serviceUrl() + "/assemblies",
        method: "get",
        params: params || {}
      };
      return this._remoteJson(requestOpts, cb);
    };

    TransloaditClient.prototype.streamAssemblies = function(params) {
      return new PaginationStream((function(_this) {
        return function(pageno, cb) {
          return _this.listAssemblies(_.extend({}, params, {
            page: pageno
          }), cb);
        };
      })(this));
    };

    TransloaditClient.prototype.getAssembly = function(assemblyId, cb) {
      var operation, opts, retryOpts;
      opts = {
        url: this._serviceUrl() + ("/assemblies/" + assemblyId)
      };
      retryOpts = {
        retries: 5,
        factor: 3.28,
        minTimeout: 1 * 1000,
        maxTimeout: 8 * 1000
      };
      operation = retry.operation(retryOpts);
      return operation.attempt((function(_this) {
        return function(attempt) {
          return _this._remoteJson(opts, function(err, result) {
            if (err != null) {
              if (operation.retry(err)) {
                return;
              }
              return cb(operation.mainError());
            }
            if ((result.assembly_url == null) || (result.assembly_ssl_url == null)) {
              if (operation.retry(new Error("got incomplete assembly status response"))) {
                return;
              }
              return cb(operation.mainError());
            }
            return cb(null, result);
          });
        };
      })(this));
    };

    TransloaditClient.prototype.createTemplate = function(params, cb) {
      var requestOpts;
      requestOpts = {
        url: this._serviceUrl() + "/templates",
        method: "post",
        params: params || {}
      };
      return this._remoteJson(requestOpts, function(err, result) {
        var ref, ref1;
        if (err) {
          return cb(err);
        }
        if (result && result.ok) {
          return cb(null, result);
        }
        err = new Error((ref = (ref1 = result.error) != null ? ref1 : result.message) != null ? ref : unknownErrMsg);
        return cb(err);
      });
    };

    TransloaditClient.prototype.editTemplate = function(templateId, params, cb) {
      var requestOpts;
      requestOpts = {
        url: this._serviceUrl() + "/templates/" + templateId,
        method: "put",
        params: params || {}
      };
      return this._remoteJson(requestOpts, function(err, result) {
        var ref, ref1;
        if (err) {
          return cb(err);
        }
        if (result && result.ok) {
          return cb(null, result);
        }
        err = new Error((ref = (ref1 = result.error) != null ? ref1 : result.message) != null ? ref : unknownErrMsg);
        return cb(err);
      });
    };

    TransloaditClient.prototype.deleteTemplate = function(templateId, cb) {
      var requestOpts;
      requestOpts = {
        url: this._serviceUrl() + ("/templates/" + templateId),
        method: "del",
        params: {}
      };
      return this._remoteJson(requestOpts, cb);
    };

    TransloaditClient.prototype.getTemplate = function(templateId, cb) {
      var requestOpts;
      requestOpts = {
        url: this._serviceUrl() + "/templates/" + templateId,
        method: "get",
        params: {}
      };
      return this._remoteJson(requestOpts, cb);
    };

    TransloaditClient.prototype.listTemplates = function(params, cb) {
      var requestOpts;
      requestOpts = {
        url: this._serviceUrl() + "/templates",
        method: "get",
        params: params || {}
      };
      return this._remoteJson(requestOpts, cb);
    };

    TransloaditClient.prototype.streamTemplates = function(params) {
      return new PaginationStream((function(_this) {
        return function(pageno, cb) {
          return _this.listTemplates(_.extend({}, params, {
            page: pageno
          }), cb);
        };
      })(this));
    };

    TransloaditClient.prototype.getBill = function(month, cb) {
      var requestOpts;
      requestOpts = {
        url: this._serviceUrl() + ("/bill/" + month),
        method: "get",
        params: {}
      };
      return this._remoteJson(requestOpts, cb);
    };

    TransloaditClient.prototype.calcSignature = function(params) {
      var jsonParams, signature;
      jsonParams = this._prepareParams(params);
      signature = this._calcSignature(jsonParams);
      return {
        signature: signature,
        params: jsonParams
      };
    };

    TransloaditClient.prototype._calcSignature = function(toSign) {
      return crypto.createHmac("sha1", this._authSecret).update(new Buffer(toSign, "utf-8")).digest("hex");
    };

    TransloaditClient.prototype._appendForm = function(req, params, fields) {
      var form, jsonParams, key, sigData, signature, val;
      sigData = this.calcSignature(params);
      jsonParams = sigData.params;
      signature = sigData.signature;
      form = req.form();
      form.append("params", jsonParams);
      if (fields == null) {
        fields = [];
      }
      for (key in fields) {
        val = fields[key];
        if (_.isObject(fields[key]) || _.isArray(fields[key])) {
          val = JSON.stringify(fields[key]);
        }
        form.append(key, val);
      }
      form.append("signature", signature);
      return _.each(this._streams, function(value, key) {
        return form.append(key, value);
      });
    };

    TransloaditClient.prototype._appendParamsToUrl = function(url, params) {
      var jsonParams, sigData, signature;
      sigData = this.calcSignature(params);
      signature = sigData.signature;
      jsonParams = sigData.params;
      if (url.indexOf("?") === -1) {
        url += "?signature=" + signature;
      } else {
        url += "&signature=" + signature;
      }
      jsonParams = encodeURIComponent(jsonParams);
      url += "&params=" + jsonParams;
      return url;
    };

    TransloaditClient.prototype._prepareParams = function(params) {
      var base, base1;
      if (params == null) {
        params = {};
      }
      if (params.auth == null) {
        params.auth = {};
      }
      if ((base = params.auth).key == null) {
        base.key = this._authKey;
      }
      if ((base1 = params.auth).expires == null) {
        base1.expires = this._getExpiresDate();
      }
      return JSON.stringify(params);
    };

    TransloaditClient.prototype._getExpiresDate = function() {
      var expiresDate;
      expiresDate = new Date();
      expiresDate.setDate(expiresDate.getDate() + 1);
      return expiresDate.toISOString();
    };

    TransloaditClient.prototype._serviceUrl = function() {
      return this._protocol + this._service;
    };

    TransloaditClient.prototype._remoteJson = function(opts, cb) {
      var operation;
      operation = retry.operation({
        retries: 5,
        factor: 3.28,
        minTimeout: 1 * 1000,
        maxTimeout: 8 * 1000
      });
      return operation.attempt((function(_this) {
        return function() {
          return _this.__remoteJson(opts, function(err, result) {
            var mainError;
            if ((err != null) && err.error === "RATE_LIMIT_REACHED") {
              console.warn("Rate limit reached, retrying request in " + err.info.retryIn + " seconds.");
              operation._timeouts.unshift(1000 * err.info.retryIn);
              return operation.retry(err);
            }
            if (operation.retry(err)) {
              return;
            }
            mainError = null;
            if (err) {
              mainError = operation.mainError();
            }
            return cb(mainError, result);
          });
        };
      })(this));
    };

    TransloaditClient.prototype.__remoteJson = function(opts, cb) {
      var err, method, req, requestOpts, timeout, url;
      timeout = opts.timeout || 5000;
      url = opts.url || null;
      method = opts.method || "get";
      if (!url) {
        err = new Error("No url provided!");
        return cb(err);
      }
      if (method === "get" && (opts.params != null)) {
        url = this._appendParamsToUrl(url, opts.params);
      }
      requestOpts = {
        uri: url,
        timeout: timeout
      };
      if (opts.headers != null) {
        requestOpts.headers = opts.headers;
      }
      req = request[method](requestOpts, function(err, res) {
        var abbr, e, error, msg, ref, result;
        if (err) {
          return cb(err);
        }
        result = null;
        try {
          result = JSON.parse(res.body);
        } catch (error) {
          e = error;
          abbr = ("" + res.body).substr(0, 255);
          msg = "Unable to parse JSON from '" + requestOpts.uri + "'. ";
          msg += "Code: " + res.statusCode + ". Body: " + abbr + ". ";
          return cb(new Error(msg));
        }
        if (res.statusCode !== 404 && (400 <= (ref = res.statusCode) && ref <= 599)) {
          return cb(_.extend(new Error, result));
        }
        return cb(null, result);
      });
      if (method === "post" || method === "put" || method === "del") {
        return this._appendForm(req, opts.params, opts.fields);
      }
    };

    return TransloaditClient;

  })();

  module.exports = TransloaditClient;

}).call(this);
