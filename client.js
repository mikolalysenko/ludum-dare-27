"use strict"

var WebSocket   = require("ws")()
var request     = require("browser-request")
var persona     = require("persona-id")({ route: "/_profile" })
var parsedURL   = require("parsed-url")

var identify    = document.getElementById("identify")
var chatLog     = document.getElementById("chatlog")
var chatBox     = document.getElementById("chatbox")

var loggedIn = false
var email = ""
var socket = null

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
      
      socket.onopen = function() {
        console.log("SOCKET OPEN")
      }
      
      socket.onmessage = function(data, flags) {
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
