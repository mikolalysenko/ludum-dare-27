"use strict"

var level       = require("level")
var url         = require("url")
var authSocket  = require("auth-socket")
var optimist    = require("optimist")
var open        = require("open")

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

//Create server
var portnum = args.port|0
var authServer = authSocket({
  port:           portnum,
  closeAnonymous: true,
  db:             accountDB,
  audience:       args.audience,
  staticPath:     __dirname + "/www",
  devMode:        args.debug
}, handleConnection)

//Handle a socket connection
function handleConnection(req, socket, head) {
  console.log(req.url, socket)
}

//Listen
console.log("Listening on port", portnum)
authServer.httpServer.listen(portnum)

//Open server
if(args.debug) {
  open("http://localhost:" + portnum)
}