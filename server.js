"use strict"

var DoorknobServer    = require("doorknob/server")
var ws                = require("ws")
var level             = require("level")
var url               = require("url")
var optimist          = require("optimist")
var open              = require("open")

var createUserDB      = require("./lib/user.js")
var createCasino      = require("./lib/casino.js")
var createConnection  = require("./lib/connection.js")

//Parse arguments
var args = optimist
            .default("statePath", "./db/state.db")
            .default("accountPath", "./db/account.db")
            .default("port", 8080)
            .default("audience", "http://localhost:8080")
            .boolean("debug")
            .argv

//Create database instances
var stateDB = level(args.statePath)
var accountDB = level(args.accountPath)

//Create user database
var users = createUserDB()

//Create the casino
var casino = createCasino()

//Create server
var portnum = args.port|0
var doorknob = DoorknobServer({
  port:           portnum,
  closeAnonymous: true,
  db:             accountDB,
  audience:       { audience: args.audience, prefix: "/_profile" },
  staticPath:     __dirname + "/www",
  devMode:        args.debug,
  cache:          args.debug ? 10 : 3600
})
var wss = new ws.Server({
  noServer: true,
  clientTracking: false
})

//Handle upgrade event
doorknob.on("upgrade", function(req, socket, head) {
  doorknob.doorknob.getProfile(req, function(err, profile) {
    if(err) {
      console.error("log in error: ", err)
      socket.end()
      return
    }
    wss.handleUpgrade(req, socket, head, function(websocket) {
      var user = users.getUser(profile.email)
      var connection = createConnection(user, websocket)
      casino.addConnection(connection)
    })
  })
})

//Listen
console.log("Listening on port", portnum)
doorknob.listen(portnum)

//Open server
if(args.debug) {
  open("http://localhost:" + portnum)
}