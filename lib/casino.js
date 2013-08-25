"use strict"

var game = require("./game.js")

var CASINO_STATE = {
  ACCEPTING_BETS: 0,
  MATCH_IN_PROGRESS: 1,
  WAITING_FOR_MATCH: 2,
  INTERMISSION: 3
}

function Bet(user, outcome, wager) {
  this.user = user
  this.outcome = outcome
  this.wager = wager
}

function Casino() {
  this.connections = []
  this.bets = []
  this.redTeam = null
  this.blueTeam = null
  this.redBetTotal = 0
  this.blueBetTotal = 0
  this.odds = 1
  this.favored = "even"
  this.gladiators = []
  this.simulation = new game.Game(1000, 1000)
  this.limit = Infinity
  this.state = CASINO_STATE.WAITING_FOR_MATCH
  this.betStart = Date.now()
  this.matchTickCount = 0
  var self = this
  this._checkMatch = function() {
    self.checkMatchStart()
  }
  this._startMatch = function() {
    self.startMatch()
  }
  this._tickMatch = function() {
    self.tickMatch()
  }
  this.tickInterval = null
}

Casino.prototype.sendStatus = function(connection) {
  connection.socket.send(JSON.stringify({"status": connection.user}))
}

Casino.prototype.getMatchState = function() {
  return {
    state: "fight",
    gameState: this.simulation.getState(),
    tickCount: this.matchTickCount,
    odds: this.odds,
    favored: this.favored
  }
}

Casino.prototype.tickMatch = function() {
  this.simulation.step()
  ++this.matchTickCount
  var state = this.simulation.state()
  this.broadcast(JSON.stringify(this.getMatchState()))
}

Casino.prototype.startMatch = function() {
  this.matchTickCount = 0
  this.simulation.reset()
  this.tickInterval = setInterval(this._tickMatch, 30)
  
  //Add fighters
  this.simulation.addCreature(this.redTeam, false, {x:0,y:0}, "red", "red")
  this.simulation.addCreature(this.blueTeam, true, {x:500, y:500}, "blue", "blue")
  
  //Calculate odds
  var rb = 0
  var bb = 0
  var bets = this.bets
  for(var i=bets.length-1; i>=0; --i) {
    var b = bets[i]
    if(b.outcome === "red") {
      rb += b.wager
    } else if(b.outcome === "blue") {
      bb += b.wager
    }
  }
  this.redBetTotal = rb
  this.blueBetTotal = bb
  if(rb > bb) {
    this.odds = rb / bb
    this.favored = "red"
  } else if(bb > rb) {
    this.odds = bb / rb
    this.favored = "blue"
  } else {
    this.odds = 1.0
    this.favored = "even"
  }
  console.log("Starting match")
  console.log("odds", this.odds, ":1 favor ", this.favored)
  
  this.broadcast(JSON.stringify(this.getMatchState()))
}

Casino.prototype.checkMatchStart = function() {
  if(this.state !== CASINO_STATE.WAITING_FOR_MATCH ||
     this.gladiators.length < 2) {
    return
  }
  console.log("Preparing for fight, taking bets")
  var fighter0 = (Math.random() * this.gladiators.length)|0
  var a = this.gladiators[fighter0]
  this.gladiators.splice(fighter0, 1)
  var fighter1 = (Math.random() * this.gladiators.length)|0
  var b = this.gladiators[fighter1]
  this.gladiators.splice(fighter1, 1)
  console.log("red team:", a)
  console.log("blue team:", b)
  this.bets.length = 0
  this.redTeam = a
  this.blueTeam = b
  this.state = CASINO_STATE.ACCEPTING_BETS
  this.betStart = Date.now()
  this.broadcast(JSON.stringify({
    state: "bet",
    betStart: this.betStart,
    red: this.redTeam,
    blue: this.blueTeam
  }))
  setTimeout(this._startMatch, 10000 - (Date.now() - this.betStart))
}

Casino.prototype.addBet = function(connection, outcome, wager) {
  if(this.state === CASINO_STATE.ACCEPTING_BETS) {
    var b = new Bet(connection, outcome, wager)
    connection.user.dollars -= wager
    this.bets.push(b)
  }
}

Casino.prototype.addGladiator = function(conn, gladiator) {
  var g = conn.user.gladiators
  for(var i=g.length-1; i>=0; --i) {
    if(g[i].name === gladiator) {
      console.log("Adding fighter:", g[i])
      this.gladiators.push(g[i])
      this.checkMatchStart()
      return
    }
  }
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
    this.addBet(connection, b, w)
  } else if(parsed.gladiator) {
    var gladiator = parsed.gladiator
    console.log(gladiator)
    if(game.validateCreature(gladiator)) {
      console.log(gladiator)
      gladiator.cost = game.evaluateCost(gladiator)
      gladiator.owner = connection.user.email
      console.log("Saving gladiator:", gladiator)
      if(connection.user.addGladiator(gladiator)) {
        this.sendStatus(connection)
      }
    }
  } else if(parsed.fighter) {
    if(typeof parsed.fighter === "string") {
      this.addGladiator(connection, parsed.fighter)
    }
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
  var casino = this
  conn.socket.on("message", function(data) {
    casino.onMessage(conn, data)
  })
  conn.socket.on("close", function() {
    casino.onClose(conn)
  })
  
  switch(this.state) {
    case CASINO_STATE.INTERMISSION:
    case CASINO_STATE.WAITING_FOR_MATCH:
      conn.socket.send('{"state":"wait"}')
    break
    case CASINO_STATE.ACCEPTING_BETS:
      conn.socket.send(JSON.stringify({
        state: "bet",
        betStart: this.betStart,
        red: this.redTeam,
        blue: this.blueTeam
      }))
    break
    case CASINO_STATE.MATCH_IN_PROGRESS:
      conn.socket.send(JSON.stringify(this.getMatchState()))
    break
    default:
    break
  }
}

function createCasino() {
  return new Casino()
}

module.exports = createCasino