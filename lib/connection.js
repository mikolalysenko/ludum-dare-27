"use strict"

function Connection(user, socket) {
  this.user = user
  this.socket = socket
}

function createConnection(user, socket) {
  return new Connection(user, socket)
}

module.exports = createConnection