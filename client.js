"use strict"

var WebSocket   = require("ws")
var request     = require("browser-request")
var persona     = require("persona-id")({ route: "/_profile" })
var parsedURL   = require("parsed-url")

var identify = document.getElementById("identify")
var unidentify = document.getElementById("unidentify")

function updateSession(cb) {
  request({url: "/_profile", json: true}, function(err, resp, profile) {
    if (!persona.id && profile.email) persona.set(profile.email)
    console.log(JSON.stringify(profile))
    if (cb) cb(err, profile)
  })
}

persona.on("login", function(id) {
  updateSession(function(err, profile) {
    var socket = new WebSocket("ws://" + parsedURL.hostName)
  })
})

persona.on("logout", function() { updateSession() })

identify.addEventListener("click", function () { persona.identify() })
unidentify.addEventListener("click", function () { persona.unidentify() })

updateSession()