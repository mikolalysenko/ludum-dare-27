"use strict"

function User(email, dollars) {
  this.email = email
  this.dollars = dollars
}

function UserDatabase() {
  this.users = {}
}

UserDatabase.prototype.getUser = function(email) {
  if(email in this.users) {
    return this.users[email]
  }
  var user = new User(email, 350)
  this.users[email] = user
  return user
}

function createUserDatabase() {
  return new UserDatabase()
}

module.exports = createUserDatabase