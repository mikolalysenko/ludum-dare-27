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

var localUser = {
  loggedIn: false,
  email: "",
  socket: null,
  dollars: 0
}

context.fillStyle = "rgba(0,0,0,1.0)"
context.fillRect(0, 0, 800, 800)

function checkState() {
  request({url: "/_profile", json: true}, function(err, resp, profile) {
    if(!profile.loggedOut) {
      if(localUser.loggedIn) {
        return
      }
      localUser.loggedIn = true
      localUser.email = profile.email
      var socket = new WebSocket("ws://" + parsedURL.host)
      localUser.socket = socket
      chatBox.disabled = false
      identify.innerHTML = "Log out"
      loginStatus.innerHTML = "Logged in as " + localUser.email
      
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
        } else if(parsed.status) {
          localUser.dollars = parsed.dollars|0
        }
        console.log("DATA", data)
      }
      
      socket.onerror = function(evt) {
        console.log("SOCKET ERROR", evt)
      }
    } else {
      if(localUser.socket) {
        localUser.socket.close()
      }
      if(!localUser.loggedIn) {
        return
      }
      localUser.loggedIn = false
      localUser.email = ""
      localUser.socket = null
      localUser.dollars = 0
      identify.innerHTML = "Log in"
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
  if(localUser.loggedIn) {
    persona.unidentify()
  } else {
    persona.identify()
  }
})

chatBox.addEventListener("keydown", function(evt) {
  if(evt.keyCode === 13) {
    var str = chatBox.value
    chatBox.value = ""
    if(localUser.socket) {
      localUser.socket.send(['{"chat":"', str.replace(/\\/g, "\\\\").replace(/"/g, "\\\""), '"}'].join(""))
    }
  }
})


checkState()
