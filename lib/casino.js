"use strict"

function Casino() {
  this.connections = []
}

Casino.prototype.onMessage = function(connection, message, flags) {
  console.log("got message: ", message)
}

Casino.prototype.onClose = function(connection) {
  console.log("lost connection: ", connection.user.email)
  var conns = this.connections
  for(var i=0, n=conns.length; i<n; ++i) {
    var c = conns[i]
    if(c === connection) {
      conns[i] = conns[n-1]
      conns.pop()
      return
    }
  }
}

Casino.prototype.addConnection = function(conn) {
  var n = this.connections.length
  for(var i=0; i<n; ++i) {
    var c = this.connections[i]
    if(c.user === conn.user) {
      console.log(c)
      c.socket.close()
    }
  }
  console.log("User connected: ", conn.user)
  this.connections.push(conn)
  conn.socket.on("message", this.onMessage.bind(this, conn))
  conn.socket.on("close", this.onClose.bind(this, conn))
}

function createCasino() {
  return new Casino()
}

module.exports = createCasino