"use strict"

function User(email, dollars, gladiators) {
  this.email = email
  this.dollars = dollars
  this.gladiators = gladiators
}

User.prototype.addGladiator = function(gladiator) {
  var list = this.gladiators
  for(var i=list.length-1; i>=0; --i) {
    if(this.gladiators[i].name === gladiator.name) {
      this.gladiators[i] = gladiator
    }
  }
  this.gladiators.push(gladiator)
  return true
}

function UserDatabase() {
  this.users = {}
}

UserDatabase.prototype.getUser = function(email) {
  if(email in this.users) {
    return this.users[email]
  }
  var user = new User(email, 350, [])
  this.users[email] = user
  return user
}

function createUserDatabase() {
  return new UserDatabase()
}

module.exports = createUserDatabase