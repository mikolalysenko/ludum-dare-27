"use strict"

var Box2D         = require("box2dweb")
var domPosition   = require("dom.position")
var game          = require("./game.js")

var gamePage      = document.getElementById("gamepage")
var gladiatorName = document.getElementById("gladiatorname")
var editorPage    = document.getElementById("editorpage")
var closeButton   = document.getElementById("closeeditor")
var saveButton    = document.getElementById("savegladiator")
var selectTool    = document.getElementById("toolselect")
var enablePhysics = document.getElementById("enablephysics")
var costLabel     = document.getElementById("gladiatorcost")
var editCanvas    = document.getElementById("editorcanvas")

var EDIT_DAMPING  = 10.0

var b2MouseJointDef = Box2D.Dynamics.Joints.b2MouseJointDef
  , b2Vec           = Box2D.Common.Math.b2Vec2
var Game            = game.Game
var Creature        = game.Creature

function createEditor(user) {
  document.body.removeChild(editorPage)
  editorPage.style.display = "block"
  
  var context = editCanvas.getContext("2d")
  var simulation = new Game(500, 500)
  var tickInterval = null
  var dragJoint = null
  var mouse
  var boxStart
  
  simulation.setContext(context, 1.0)
  
  function tickEditor() {
    if(dragJoint) {
      dragJoint.SetTarget(new b2Vec(mouse.x, mouse.y))
    }
    simulation.step()
  }
  
  function drawEditor() {
    if(!tickInterval) {
      return
    }
    requestAnimationFrame(drawEditor)
    simulation.draw()
    if(boxStart && boxStart.active) {
      context.fillStyle = "rgba(80, 50, 220, 0.3)"
      context.fillRect(Math.min(boxStart.x, mouse.x),
                       Math.min(boxStart.y, mouse.y),
                       Math.abs(mouse.x-boxStart.x),
                       Math.abs(mouse.y-boxStart.y))
    }
  }
  
  function openEditor() {
    document.body.replaceChild(editorPage, gamePage)
    simulation.reset()
    tickInterval = setInterval(tickEditor, 30)
    drawEditor()
    dragJoint = null
    boxStart = { x: 0, y: 0, active: false }
    mouse = { x: 0, y: 0, down: false }
    simulation.addCreature({bodies: [], joints: []}, false,  {x:0, y:0}, "EditCreature", "red")
    
    var usePhysics = !!enablePhysics.chacked
    if(!usePhysics) {
      simulation.editMode = true
      simulation.dampingFactor = EDIT_DAMPING
    } else {
      simulation.editMode = false
      simulation.dampingFactor = 0.01
    }
  }
  
  function closeEditor() {
    document.body.replaceChild(gamePage, editorPage)
    clearInterval(tickInterval)
  }
  
  closeButton.addEventListener("click", function() {
    closeEditor()
  })
  
  //Hook mouse listeners
  function handleClick() {
    var tool = selectTool.value
    if(tool === "box") {
      //Create a box
      if(mouse.down) {
        boxStart.x = mouse.x
        boxStart.y = mouse.y
        boxStart.active = true
      } else {
        boxStart.active = false
        var x0 = Math.min(mouse.x, boxStart.x)
          , x1 = Math.max(mouse.x, boxStart.x)
          , y0 = Math.min(mouse.y, boxStart.y)
          , y1 = Math.max(mouse.y, boxStart.y)
        if(   y1 - y0 > 0.5
           && x1 - x0 > 0.5) {
          simulation.getCreature("EditCreature").addBody({
              x: (x0+x1) * 0.5
            , y: (y0+y1) * 0.5
            , r: 0
            , w: (x1-x0)
            , h: (y1-y0)
          })
        }
      }
    } else if(tool === "move") {
      //Move body on top
      if(mouse.down) {
        var result = simulation.queryBox(mouse.x-0.001, mouse.y-0.001, mouse.x+0.001, mouse.y+0.001)
        if(result.bodies.length === 0) {
          return
        }
        var body = result.bodies[0]
        
        var md = new b2MouseJointDef()
        md.bodyA = simulation.world.GetGroundBody()
        md.bodyB = body
        md.target.Set(mouse.x, mouse.y)
        md.collideConnected = true
        md.maxForce = 300.0 * body.GetMass()
        dragJoint = simulation.world.CreateJoint(md)
        dragJoint.m_maxForce = 9000.0 * body.m_mass
        dragJoint.SetUserData({
            creature: null
          , power: 9000
        })
        body.SetAwake(true)
      
      } else if(dragJoint) {
        simulation.world.DestroyJoint(dragJoint)
        dragJoint = null
      }
      
    } else if(tool === "joint") {
      //Create a joint between two bodies
      if(mouse.down) {
        var result = simulation.queryBox(mouse.x-0.001, mouse.y-0.001, mouse.x+0.001, mouse.y+0.001)
        if(result.bodies.length >= 2) {
          simulation.getCreature("EditCreature").addJoint({
              a: result.bodies[0]
            , b: result.bodies[1]
            , p: 10
            , x: mouse.x
            , y: mouse.y
          })
        }
      }
      
    } else if(tool === "delete") { 
      //Delete stuff
      if(mouse.down) {
        var result = simulation.queryBox(mouse.x-0.5, mouse.y-0.5, mouse.x+0.5, mouse.y+0.5)
        if(result.joints.length > 0) {
          simulation.getCreature("EditCreature").removeJoint(result.joints[0])
        } else if(result.bodies.length > 0) {
          for(var i=0; i<result.bodies.length; ++i) {
            var B = result.bodies[i]
            if(B.GetFixtureList().TestPoint(new b2Vec(mouse.x, mouse.y) ) ) {
              simulation.getCreature("EditCreature").removeBody(result.bodies[i])
              break
            }
          }
        }
      }
    }
  }
  editCanvas.addEventListener("mousedown", function(ev) {
    if(!mouse.down) {
      mouse.down = true
      handleClick()
    }
  })
  editCanvas.addEventListener("mouseup", function(ev) {
    if(mouse.down) {
      mouse.down = false;
      handleClick()
    }
  })
  editCanvas.addEventListener("mousemove", function(ev) {
    var pos = domPosition(editCanvas)
    mouse.x = (ev.clientX - pos.left) / simulation.drawScale
    mouse.y = (ev.clientY - pos.top) / simulation.drawScale
    if(mouse.down && (
        mouse.x < 0
     || mouse.y < 0 
     || mouse.x > editCanvas.width / simulation.drawScale
     || mouse.y > editCanvas.height / simulation.drawScale ) ) {
     
      mouse.down = false
      handleClick()
    }
  })
  editCanvas.addEventListener("mouseout", function(ev) {
    if(mouse.down) {
      mouse.down = false;
      handleClick()
    }
  })
  
  enablePhysics.addEventListener("change", function() {
    var usePhysics = !!enablePhysics.chacked
    var bodies = simulation.getCreature("EditCreature").getBodies()
    if(!usePhysics) {
      simulation.editMode = true;
      for(var i=0; i<bodies.length; ++i) {
        bodies[i].SetLinearDamping(EDIT_DAMPING);
        bodies[i].SetAngularDamping(EDIT_DAMPING);
        bodies[i].SetAwake(true);
      }
      simulation.dampingFactor = EDIT_DAMPING;
    } else {
      simulation.editMode = false;
      for(var i=0; i<bodies.length; ++i) {
        bodies[i].SetLinearDamping(0.01);
        bodies[i].SetAngularDamping(0.01);
        bodies[i].SetAwake(true);
      }
      simulation.dampingFactor = 0.01;
    }
  })
  
  saveButton.addEventListener("click", function() {
    var creature = simulation.getCreature("EditCreature").serialize()
    creature.name = gladiatorName.value
    user.socket.send(JSON.serialize({
      gladiator: creature
    }))
  })
  
  return {
    open: openEditor,
    close: closeEditor
  }
}

module.exports = createEditor