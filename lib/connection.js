"use strict"

function Connection(user, socket) {
  this.user = user
  this.socket = socket
}

module.exports = Connection