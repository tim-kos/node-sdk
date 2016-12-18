require "./gently-preamble"
expect            = require("chai").expect
TransloaditClient = require "../src/TransloaditClient"

authKey    = process.env.TRANSLOADIT_KEY
authSecret = process.env.TRANSLOADIT_SECRET
unless authKey? && authSecret?
  msg  = "specify environment variables TRANSLOADIT_KEY and TRANSLOADIT_SECRET"
  msg += " to enable integration tests."
  console.warn msg
  return # Terminates module execution without exiting the test process

# https://transloadit.com/demos/importing-files/import-a-file-over-http
genericImg    = "https://transloadit.com/img/robots/170x170/audio-encode.jpg"
genericParams =
  params:
    steps:
      import:
        robot: "/http/import"
        url:   genericImg
      resize:
        robot:  "/image/resize"
        use:    "import"
        result: true
        width:  130
        height: 130

describe "API integration", ->
  @timeout 0
  
  describe "assembly creation callbacks", ->
    it "should only be called if the assembly is cancellable", (done) ->
      client = new TransloaditClient { authKey, authSecret }

      attempt = (nremaining, cb) ->
        if nremaining == 0
          return cb()

        client.createAssembly genericParams, (err, result) ->
          expect(err).to.not.exist

          id = result.assembly_id

          # Now delete it
          client.deleteAssembly id, (err, result) ->
            if err?
              expect(err).to.have.property("statusCode").that.is.not.equal(404)

            attempt nremaining - 1, cb

      nremaining = 5
      for i in [1..nremaining]
        attempt 5, ->
          if --nremaining == 0
            done()

    it "should only be called if the assembly is fetchable", (done) ->
      client = new TransloaditClient { authKey, authSecret }

      attempt = (nremaining, cb) ->
        if nremaining == 0
          return cb()

        client.createAssembly genericParams, (err, result) ->
          expect(err).to.not.exist

          id = result.assembly_id

          # Now delete it
          client.getAssembly id, (err, result) ->
            if err?
              expect(err).to.have.property("statusCode").that.is.not.equal(404)

            attempt nremaining - 1, cb

      nremaining = 5
      for i in [1..nremaining]
        attempt 5, ->
          if --nremaining == 0
            done()
