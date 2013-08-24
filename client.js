var request = require('browser-request')
var persona = require('persona-id')()

var identify = document.getElementById('identify')
var unidentify = document.getElementById('unidentify')

function updateSession(cb) {
  request({url: '/_session', json: true}, function(err, resp, profile) {
    if (!persona.id && profile.email) persona.set(profile.email)
    output.innerHTML = JSON.stringify(profile)
    if (cb) cb(err, profile)
  })
}

persona.on('login', function(id) {
  updateSession(function(err, profile) {
  })
})

persona.on('logout', function() { updateSession() })

identify.addEventListener('click', function () { persona.identify() })
unidentify.addEventListener('click', function () { persona.unidentify() })

updateSession()