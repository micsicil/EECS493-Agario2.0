import THREE from 'three';
const NodePhysijs = require('nodejs-physijs');
const Ammo = NodePhysijs.Ammo;
const Physijs = NodePhysijs.Physijs(THREE, Ammo);

// Colors
var playerColor = 0x888888;
var smallEnemyColor = 0xffffff;
var largeEnemyColor = 0xff0000;

// Starting values
var GROUND_DIMENSION = 200;
var PLAYER_MASS = 5;
var MAX_SPAWN_RADIUS = 20;
var PLAYER_RADIUS = 5;
var SCREEN_WIDTH = 900;
var SCREEN_HEIGHT = 500;

// Meteor variables
var instance, session, meteor;

// Scene variables
var render, renderer, scene, camera, player, ground, grid;
var walls = [];
var gravity = -100;
var groundDimension = GROUND_DIMENSION, groundFactor = 1.05;

// State variables
var gamePaused = false;
var gameDisabled = false;
var endGame;
var NUM_ENEMIES = 10;

// Player variables
var playerMass = PLAYER_MASS, playerRadius = PLAYER_RADIUS;
var pressedKey = {};
var W = 87, A = 65, S = 83, D = 68, PAUSE = 80, SPACE = 32;

// Enemy variables
var numBiggerEnemies = 0;
var numSmallerEnemies = 0;
var enemies = [];

// Timekeeping
var startTime, timeElapsed, timeFactor = 60000;


/*************************************************************/
/****************** SCENE SETUP & RENDERING ******************/
/*************************************************************/

// Initializes the game.
// Links Meteor backend.
// Adds basic event handling.
initGame = function (templateIn, sessionIn, meteorIn)
{
    instance = templateIn;
    session = sessionIn;
    meteor = meteorIn;

    document.addEventListener("keydown", controlPlayer, false);
    document.addEventListener("keyup", controlPlayer, false);
    $("#logout").click(endGame);

    initScene();
    playerInit(0, playerRadius, 0);
    cameraInit();
    generateMap();
    enemiesInit(NUM_ENEMIES);

    window.onload = requestAnimationFrame(render);
};

// Creates the renderer and appends it to "#game-board".
// Creates the scene.
var initScene = function()
{
    startTime = Date.now();

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );
    document.getElementById( 'game-board' ).appendChild( renderer.domElement );
    renderer.domElement.style.position = 'relative';

    scene = new Physijs.Scene;
    scene.setGravity(new THREE.Vector3( 0, gravity, 0));
};

// Simulates the game.
var render = function()
{
    scene.simulate(); // run physics
    renderer.render( scene, camera); // render the scene
    cameraFollow();
    updateTracking();

    if (gamePaused == true || gameDisabled == true) { return; }

    requestAnimationFrame(render);
};

// Reloads the browser. Effectively logs the user out.
var endGame = function()
{
    location.reload();
};

// Deletes the scene and all elements inside it.
// Resets variables to their initial value.
// Resets player input.
// Reloads all essential functions
var restartGame = function()
{
    while(scene.children.length > 0){ 
        scene.remove(scene.children[0]); 
    }
    enemies = [];
    walls = [];

    gameDisabled = false;

    $("#gameover-text").remove();
    $("#restart-btn").remove();

    instance.currScore.set(0);

    playerMass = PLAYER_MASS;
    playerRadius = PLAYER_RADIUS;
    groundDimension = GROUND_DIMENSION;
    numBiggerEnemies = 0;
    numSmallerEnemies = 0;

    resetKeys();
    playerInit(0, playerRadius, 0);
    cameraInit();
    generateMap();
    enemiesInit(8);
    requestAnimationFrame(render);
};

// Creates the game won text and restart button.
var gameWon = function()
{
    gameDisabled = true;

    var $text = $('<text/>', {
        text: "Congratulations, you win!", //set text 1 to 10
        id: "gameover-text",
    });

    var $btn = $('<text/>', {
        text: "Play again", //set text 1 to 10
        id: "restart-btn",
        click: function () { restartGame(); },
        hover: function() { $("#restart-btn").css("textDecoration", "underline"); },
        mouseleave: function() { $("#restart-btn").css("textDecoration", "none");}
    });

    $("#game-board").prepend($btn);
    $("#game-board").prepend($text);
}

// Creates the gameover text and restart button.
var gameOver = function()
{
    gameDisabled = true;

    var $text = $('<text/>', {
        text: "Game over!", //set text 1 to 10
        id: "gameover-text",
    });

    var $btn = $('<text/>', {
        text: "Play again", //set text 1 to 10
        id: "restart-btn",
        click: function () { restartGame(); },
        hover: function() { $("#restart-btn").css("textDecoration", "underline"); },
        mouseleave: function() { $("#restart-btn").css("textDecoration", "none");}
    });

    $("#game-board").prepend($btn);
    $("#game-board").prepend($text);
};


/*************************************************************/
/********************** MAP GENERATION ***********************/
/*************************************************************/

var generateMap = function()
{
    generateGround();
    generateWalls();
};

// Generates the ground and the grid.
// They are centered on <0, 0> and are at a height such that their surface
// is at y-coordinate 0.
var generateGround = function()
{
    var friction = 0.1;
    var restitution = 0; // "squashyness" / "bouncyness"
    var height = 1;
    var divisions = groundDimension / (groundFactor * 10); // Grid variables

    var ground_material = Physijs.createMaterial(
        new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.2 }),
        friction,
        restitution
    );
  
    ground = new Physijs.BoxMesh(new THREE.CubeGeometry( groundDimension, height, groundDimension ), ground_material, 0);
    ground.position.set(0, -height/2, 0);
    scene.add( ground );

    grid = new THREE.GridHelper(groundDimension, divisions);
    scene.add( grid );
};

// Creates the walls and ceiling for the map.
// The wall depth should be properly scaled to prevent high-speed spheres
// from passing through the walls.
var generateWalls = function()
{
    var depth = 100;

    var wall_material = Physijs.createMaterial(
        new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.08 }), 0, 0
    );

    var front_wall_material = Physijs.createMaterial(
        new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.0 }), 0, 0
    );

    createWall(wall_material, depth, groundDimension, groundDimension/2 + depth/2, 0);
    createWall(wall_material, depth, groundDimension, -groundDimension/2 - depth/2, 0);
    createWall(front_wall_material, groundDimension, depth, 0, groundDimension/2 + depth/2);
    createWall(wall_material, groundDimension, depth, 0, -groundDimension/2 - depth/2);
    createCeiling(front_wall_material, groundDimension, groundDimension, 0, 0);
};

// Creates horizontal slab for the ceiling
var createCeiling = function(material, width, depth, xLoc, zLoc)
{
    var height = 10;
    var yLoc = playerRadius*15;
    createBoundary(material, width, height, depth, xLoc, yLoc, zLoc);
};

// Creates vertical slab for the floor
var createWall = function(material, width, depth, xLoc, zLoc)
{
    var height = playerRadius*15;
    var yLoc = height/2;
    createBoundary(material, width, height, depth, xLoc, yLoc, zLoc);
};

// Creates a wall or ceiling with the specified properties.
var createBoundary = function(material, width, height, depth, xLoc, yLoc, zLoc)
{
    var boundary = new Physijs.BoxMesh(new THREE.CubeGeometry( width, height, depth ), material, 0);
    boundary.position.set(xLoc, yLoc, zLoc);
    scene.add(boundary);
    walls.push(boundary);
};

// Scales the map size according to groundFactor.
// Deletes the old map and generates a scaled map in its place.
var resizeMap = function()
{
    scene.remove(grid);
    scene.remove(ground);
    walls.forEach(function(wall) {
        scene.remove(wall);
    });
    walls = [];
    groundDimension *= groundFactor;
    generateMap();
};



/*************************************************************/
/********************** CAMERA CONTROL ***********************/
/*************************************************************/

// Creates the camera object at position <0, groundDimension + 2*playerRadius, groundDimension>
var cameraInit = function()
{
    camera = new THREE.PerspectiveCamera(
        35, 
        SCREEN_WIDTH / SCREEN_HEIGHT,
        1, // Near clipping plane
        10000 // Far clipping plane
    );
    camera.position.set( 0, groundDimension + playerRadius * 2, groundDimension);
    scene.add( camera );
};

// Adjusts the camera's position according to the player's position.
// Directs the camera to look at the player.
var cameraFollow = function()
{
    var cameraTarget = player.position;
    var cameraOffset = new THREE.Vector3(0, playerRadius * 10, playerRadius * 10);

    camera.position.x = cameraOffset.x + cameraTarget.x;
    camera.position.y = cameraOffset.y + cameraTarget.y;
    camera.position.z = cameraOffset.z + cameraTarget.z;

    camera.lookAt( cameraTarget );
};

/*************************************************************/
/********************** PLAYER CONTROL ***********************/
/*************************************************************/

// Instantiates the player at the coordinates x, y, and z.
var playerInit = function(x, y, z)
{
    var linearDamping = 0.5;
    var angularDamping = 0;

    // Create player
    var material  = new Physijs.createMaterial(
        new THREE.MeshBasicMaterial({ color: playerColor, wireframe: true })
    );

    player = new Physijs.SphereMesh(
        new THREE.SphereGeometry( playerRadius, 32, 32 ),
        material,
        playerMass
    );

    // Handle collision w/ enemy AI
    player.addEventListener( 'collision', enemyCollision, false);
    player.setCcdMotionThreshold(1);
    player.setCcdSweptSphereRadius(0.2);

    player.setDamping(linearDamping, angularDamping);

    player.position.set(x, y, z);

    scene.add( player );
};

// Handles player navigation according to the following controls:
//      1. Movement => WASD
//      2. Pause => P
//      3. Jump => SPACE
function controlPlayer(event)
{
    var force = new THREE.Vector3(0, 0, 0);
    var fMagnitude = 10*playerRadius;
    var jumpMagnitude = 10*playerRadius;

    if (gameDisabled)
    {
        return;
    }

    // Stores pressedKey[keycode] = true if keydown
    // Sets pressedKey[keycode] = false when the key is no longer pressed (keyup)
    pressedKey[event.which] = (event.type == 'keydown');

    if (pressedKey[PAUSE])
    {
        gamePaused = !gamePaused;
        if (gamePaused == false) { requestAnimationFrame(render); }
    }

    // Jumping movement + WASD directional pad movement

    var yVelocity = player.getLinearVelocity().y;
    if (pressedKey[W])
    {
        force = force.add(new THREE.Vector3(0, yVelocity, -fMagnitude));
    }
    if (pressedKey[S])
    {
        force = force.add(new THREE.Vector3(0, yVelocity, fMagnitude));
    }
    if (pressedKey[A])
    {
        force = force.add(new THREE.Vector3(-fMagnitude, yVelocity, 0));
    }
    if (pressedKey[D])
    {
        force = force.add(new THREE.Vector3(fMagnitude, yVelocity, 0));
    }
    if (pressedKey[SPACE])
    {
        force = force.add(new THREE.Vector3(0, jumpMagnitude + yVelocity, 0))
    }

    player.setLinearVelocity(force);
    player.setAngularVelocity(force);
};

// Sets all keys to "unpressed"
var resetKeys = function()
{
    pressedKey[SPACE] = false;
    pressedKey[W] = false;
    pressedKey[A] = false;
    pressedKey[S] = false;
    pressedKey[D] = false;
}


/*************************************************************/
/************************ ENEMY AI  **************************/
/*************************************************************/

// Handles enemy routing behavior.
// If an enemy is larger than the player, it will universally move towards the player.
// If an enemy is smaller, its color will be switched to white, and it will behave
// cautiously: it will approach the player from afar, then flee when it becomes too close.
function updateTracking() {
    for (var i = 0; i < enemies.length; i++) {
        var direction;
        var forceFactor = playerRadius/4; // To ensure that massive enemies don't move too slowly

        // Large enemies
        if (enemies[i].radius > playerRadius) {
            direction = new THREE.Vector3(player.position.x - enemies[i].position.x, 0 ,player.position.z - enemies[i].position.z);
        }

        // Small enemies
        else {
            if (enemies[i].material.color != smallEnemyColor)
                enemies[i].material.color.setHex( smallEnemyColor );

            // Flee when it is too close
            if (enemies[i].position.distanceTo(player.position) > groundDimension/4)
                direction = new THREE.Vector3(player.position.x - enemies[i].position.x, 0 ,player.position.z - enemies[i].position.z);
            // Go towards the player
            else
                direction = new THREE.Vector3(enemies[i].position.x - player.position.x, 0 ,enemies[i].position.z - player.position.z);
        }

        enemies[i].applyCentralImpulse(direction.normalize().multiplyScalar(forceFactor));
    }
}

// Handles collisions between enemy spheres and the player.
// If the player consumed the final enemy, the game is won.
// If the player was consumed, the game is lost.
// If the player simply consumed another enemy, do the following:
//      1. Update scores
//      2. Resize map
//      3. Generate larger player
//      4. Generate 2 additional enemies
function enemyCollision( enemy )
{
    // Ignore ground and wall collision
    if (enemy.geometry.type != 'BoxGeometry')
    {
        // Player ate the final enemy! :)
        if (enemies.length == 1) {
            scene.remove(enemies[0]);
            gameWon();
            return;
        }

        // Player was eaten! :(
        if (enemy.radius > playerRadius) {
            gameOver();
            return;
        }

        // Update currScore
        timeElapsed = Date.now() - startTime;
        var currScore = instance.currScore.get();
        var numPoints = Math.ceil(Math.pow(enemy.radius, 2) / timeElapsed * timeFactor);
        instance.currScore.set(currScore + numPoints);

        // Update highScore
        var username = session.get('currentUser');
        var currScore = instance.currScore.get();
        meteor.call('updateHighScore', username, currScore);

        // Reset the player's WASD/SPACE/P keyboard inputs
        resetKeys();

        // Grow map (if necessary)
        if (playerRadius < MAX_SPAWN_RADIUS)
            resizeMap();

        // Recreate player
        Vector3 pos = player.position;
        scene.remove(player);
        playerRadius = playerRadius + 0.5;
        playerInit(pos.x, playerRadius, pos.z);
        
        // Regenerate enemies
        numSmallerEnemies = 0;
        numBiggerEnemies = 0;
        for (var i = 0; i < enemies.length; i++) {
            if (enemies[i].radius > playerRadius) {
                numBiggerEnemies++;
            }
            else {
                numSmallerEnemies++;
            }
        }
        enemies.splice(enemies.indexOf(enemy), 1);
        scene.remove(enemy);

        if (playerRadius < MAX_SPAWN_RADIUS)
            enemiesInit(2);
    }

};

/*************************************************************/
/********************* ENEMY GENERATION **********************/
/*************************************************************/


// Creates a number of enemies and adds them to the scene.
var enemiesInit = function (number) {
    for (var i = 0; i < number; i++) {
        var radius = getRandomRadius();
        var enemy = spawnEnemy(radius);
        enemy.radius = radius;
        enemies.push(enemy);
        scene.add(enemy);
    }
}

// Instantiates an enemy of input radius at a random location.
// The enemy's location is never within 3*radius distance to the player.
function spawnEnemy (radius) {
    var enemyMass = 0.5*radius;
    var linearDamping = 0.5;
    var angularDamping = 0;

    var enemyColor = largeEnemyColor;
    if (radius <= playerRadius) {
        enemyColor = smallEnemyColor;
    }

    var material  = new Physijs.createMaterial(
        new THREE.MeshBasicMaterial({ color: enemyColor, wireframe: true })
    );

    enemy = new Physijs.SphereMesh(
        new THREE.SphereGeometry( radius, 32, 32 ),
        material,
        enemyMass
    );
    
    enemy.setDamping(linearDamping, angularDamping);

    try {
        var randomPosition = getRandomCoordinates(radius);
    }
    catch(err) {
        // F5 if there are any unaccounted for errors in enemy location.
        location.reload();
        return;
    }

    enemy.position.set(randomPosition.x, randomPosition.y, randomPosition.z);

    return(enemy);
}

// Randomly decides the enemy radius depending on the player's radius.
// There are always at least NUM_ENEMIES / 2 small enemies for the player
// to consume.
function getRandomRadius() {
    if (numSmallerEnemies < enemies.length / 2) {
        numSmallerEnemies++;
        return getRndInteger(playerRadius-3, playerRadius-2);
    }
    else {
        numBiggerEnemies++;
        return getRndInteger(playerRadius+2, playerRadius+5);
    }
}

// If called with a large radius and the player is near the center, this will not return,
// as randX and randY are forced into the middle with a large radius,
// and it repeatedly calls itself until the distance between the result
// and the player's position is larger than twice the radius
function getRandomCoordinates (radius) {
    var randX = getRndInteger(radius-groundDimension/2, groundDimension/2-radius);
    var randZ = getRndInteger(radius-groundDimension/2, groundDimension/2-radius);
    var possiblePosition = new THREE.Vector3(randX, radius, randZ);
    var distance = possiblePosition.distanceTo(player.position);
    if (distance < 3 * radius) {
        return getRandomCoordinates(radius);
    }
    else {
        return possiblePosition;
    }
}

// Returns a random integer between [min, max]
function getRndInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1) ) + min;
}