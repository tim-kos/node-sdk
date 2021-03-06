gently            = require "./gently-preamble"
should            = require("chai").should()
expect            = require("chai").expect
TransloaditClient = require "../src/TransloaditClient"

describe "TransloaditClient", ->
  describe "constructor", ->
    it "should set some default properties", ->
      opts =
        authKey    : "foo_key"
        authSecret : "foo_secret"
      client = new TransloaditClient opts
      expect(client._authKey).to.equal "foo_key"
      expect(client._authSecret).to.equal "foo_secret"
      expect(client._service).to.equal "api2.transloadit.com"
      expect(client._region).to.equal "us-east-1"
      expect(client._protocol).to.equal "https://"

    it "should allow overwriting some properties", ->
      opts =
        authKey    : "foo_key"
        authSecret : "foo_secret"
        service    : "foo_service"
        region     : "foo_region"

      client = new TransloaditClient opts
      expect(client._authKey).to.equal "foo_key"
      expect(client._authSecret).to.equal "foo_secret"
      expect(client._service).to.equal "foo_service"
      expect(client._region).to.equal "foo_region"

  describe "addStream", ->
    it "should properly add a stream", ->
      client = new TransloaditClient authKey: "foo_key", authSecret: "foo_secret"

      NAME   = "foo_name"
      STREAM = {}

      expect(client._streams[NAME]).to.equal undefined
      gently.expect STREAM, "pause"
      client.addStream NAME, STREAM
      expect(client._streams[NAME]).to.equal STREAM

  describe "addFile", ->
    it "should properly add a stream", ->
      client = new TransloaditClient authKey: "foo_key", authSecret: "foo_secret"

      NAME   = "foo_name"
      PATH   = "foo_path"
      STREAM = { on: -> }

      gently.expect GENTLY.hijacked.fs, "createReadStream", (thePath) ->
        expect(thePath).to.equal PATH
        return STREAM

      gently.expect client, "addStream", (name, stream) ->
        expect(name).to.equal NAME
        expect(stream).to.equal STREAM

      client.addFile NAME, PATH

  describe "_appendForm", ->
    it "should append all required fields to the request form", ->
      client = new TransloaditClient authKey: "foo_key", authSecret: "foo_secret"

      client._streams =
        stream1: "foo_stream"
        stream2: "foo_stream2"

      FORM        = {}
      REQ         = {}
      PARAMS      = {}
      JSON_PARAMS = {}
      FIELDS      = {
        foo: "shizzle"
        foo2:
          bar: "baz"

      }
      SIGNATURE =
        signature : "foo_signature"
        params    : JSON_PARAMS

      gently.expect client, "calcSignature", (params) ->
        expect(params).to.eql PARAMS
        return SIGNATURE

      gently.expect REQ, "form", ->
        return FORM

      gently.expect FORM, "append", (key, val) ->
        expect(key).to.equal "params"
        expect(val).to.equal JSON_PARAMS

      gently.expect FORM, "append", (key, val) ->
        expect(key).to.equal "foo"
        expect(val).to.equal "shizzle"

      gently.expect FORM, "append", (key, val) ->
        expect(key).to.equal "foo2"
        expect(val).to.equal JSON.stringify({bar: "baz"})

      gently.expect FORM, "append", (key, val) ->
        expect(key).to.equal "signature"
        expect(val).to.equal SIGNATURE.signature

      gently.expect FORM, "append", (key, val) ->
        expect(key).to.equal "stream1"
        expect(val).to.equal "foo_stream"

      gently.expect FORM, "append", (key, val) ->
        expect(key).to.equal "stream2"
        expect(val).to.equal "foo_stream2"

      client._appendForm REQ, PARAMS, FIELDS

  describe "_appendParamsToUrl", ->
    it "should append params and signature to the given url", ->
      client = new TransloaditClient authKey: "foo_key", authSecret: "foo_secret"

      URL         = "foo_url"
      PARAMS      =
        foo: "bar"
      JSON_PARAMS = "{foo:\"bar\"}"
      SIGNATURE   =
        signature : "foo_sig"
        params    : JSON_PARAMS

      gently.expect client, "calcSignature", (params) ->
        expect(params).to.eql PARAMS
        return SIGNATURE

      ENCODED_PARAMS = encodeURIComponent JSON_PARAMS
      url = client._appendParamsToUrl URL, PARAMS

      expected = "#{URL}?signature=#{SIGNATURE.signature}&params=#{ENCODED_PARAMS}"
      expect(url).to.equal expected

  describe "_prepareParams", ->
    it "should add the auth key, secret and expires parameters", ->
      client = new TransloaditClient authKey: "foo_key", authSecret: "foo_secret"

      r = JSON.parse client._prepareParams()
      expect(r.auth.key).to.equal "foo_key"
      expect(r.auth.expires).not.to.equal null

      opts =
        authKey: "foo"
        authSecret: "foo_secret"
      client = new TransloaditClient opts

      r = JSON.parse client._prepareParams()
      expect(r.auth.key).to.equal "foo"
      expect(r.auth.expires).not.to.equal null

    it "should not add anything if the params are already present", ->
      client = new TransloaditClient authKey: "foo_key", authSecret: "foo_secret"

      PARAMS =
        auth:
          key     : "foo_key"
          expires : "foo_expires"

      r = JSON.parse client._prepareParams PARAMS
      expect(r.auth.key).to.equal "foo_key"
      expect(r.auth.expires).to.equal "foo_expires"


  describe "calcSignature", ->
    it "should calc _prepareParams and _calcSignature", ->
      client = new TransloaditClient authKey: "foo_key", authSecret: "foo_secret"

      client._authSecret = "13123123123"

      PARAMS      = {foo: "bar"}
      JSON_PARAMS = "my_json_params"
      SIGNATURE   = "my_signature"

      gently.expect client, "_prepareParams", (params) ->
        expect(params).to.eql PARAMS
        return JSON_PARAMS

      gently.expect client, "_calcSignature", (toSign) ->
        expect(toSign).to.equal JSON_PARAMS
        return SIGNATURE

      r = client.calcSignature PARAMS
      expect(r.params).to.equal JSON_PARAMS
      expect(r.signature).to.equal SIGNATURE

  describe "_calcSignature", ->
    it "should calculate the signature properly", ->
      client = new TransloaditClient authKey: "foo_key", authSecret: "foo_secret"

      client._authSecret = "13123123123"

      expected = "57ddad5dbba538590e60f0938f364c7179316eba"
      expect(client._calcSignature("foo")).to.equal expected

      expected = "b8110452b4ba46a9ecf438271bbd79f25d2a5400"
      expect(client._calcSignature("akjdkadskjads")).to.equal expected

      client._authSecret = "90191902390123"

      expected = "d393c38de2cbc993bea52f8ecdf56c7ede8b920d"
      expect(client._calcSignature("foo")).to.equal expected

      expected = "8fd625190e1955eb47a9984d3e8308e3afc9049e"
      expect(client._calcSignature("akjdkadskjads")).to.equal expected

  describe "_serviceUrl", ->
    it "should return the service url", ->
      client = new TransloaditClient authKey: "foo_key", authSecret: "foo_secret"

      client._protocol = "foo_protocol"
      client._service = "foo_service"

      expect(client._serviceUrl()).to.equal client._protocol + client._service

  describe "__remoteJson", ->
    it "should make proper remote GET calls", ->
      client = new TransloaditClient authKey: "foo_key", authSecret: "foo_secret"
      #@todo figure out how to test direct calls to request

    it "should append params to the request form for POST requests", ->
      client = new TransloaditClient authKey: "foo_key", authSecret: "foo_secret"
      #@todo
