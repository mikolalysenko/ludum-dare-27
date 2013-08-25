"use strict"

var game = require("./game.js")

var CASINO_STATE = {
  ACCEPTING_BETS: 0,
  MATCH_IN_PROGRESS: 1,
  WAITING_FOR_MATCH: 2
}

function Bet(user, outcome, wager) {
  this.user = user
  this.outcome = outcome
  this.wager = wager
}

function Casino() {
  this.connections = []
  this.bets = []
  this.gladiators = []
  this.limit = Infinity
  this.state = CASINO_STATE.WAITING_FOR_MATCH
}

Casino.prototype.sendStatus = function(connection) {
  connection.socket.send(JSON.stringify({"status": connection.user}))
}

Casino.prototype.addBet = function(user, outcome, wager) {
  if(this.state === CASINO_STATE.ACCEPTING_BETS) {
    var b = new Bet(user, outcome, wager)
    user.dollars -= wager
    this.bets.push(b)
  }
}

Casino.prototype.addGladiator = function(user) {
}

Casino.prototype.broadcast = function(msg) {
  var conns = this.connections
  for(var i=0, n=conns.length; i<n; ++i) {
    conns[i].socket.send(msg)
  }
}

Casino.prototype.onMessage = function(connection, message) {
  console.log("got message: ", message)
  var parsed = JSON.parse(message)
  if(parsed.chat) {
    this.broadcast(JSON.stringify({user:connection.user.email,
                                  chat:parsed.chat}))
  } else if(parsed.bet) {
    var w = parsed.wager|0
    if(w <= 0 || w > Math.min(connection.user.dollars, this.limit)) {
      return
    }
    var b = parsed.bet
    this.addBet(connection.user, b, w)
  } else if(parsed.gladiator) {
    var gladiator = parsed.gladiator
    if(game.validateCreature(gladiator)) {
      if(connection.user.addGladiator(gladiator)) {
        this.sendStatus(connection)
      }
    }
  } else if(parsed.fighter) {
    
  
  }
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
  console.log("user connected: ", conn.user)
  this.connections.push(conn)
  conn.socket.on("message", function(data) {
    this.onMessage(conn, data)
  })
  conn.socket.on("close", function() {
    this.onClose(conn)
  })
}

function createCasino() {
  return new Casino()
}

module.exports = createCasino