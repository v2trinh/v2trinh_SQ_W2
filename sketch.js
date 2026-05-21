// ============================================================
// Week 2 Example 1: Movement, Gravity, and Collision
// ============================================================

// ------------------------------------------------------------
// PLATFORMS ARRAY
// Each platform is an object with x, y, width, and height.
// x and y are the TOP-LEFT corner (same as rect()).
//
// Storing platforms in an array means:
//   - We can loop through all of them with one for loop
//   - Adding a new platform = adding one line of data
//   - Later we can load this data from a JSON file instead
// ------------------------------------------------------------
let platforms = [
  // { x, y, w, h }
  { x: 0, y: 395, w: 800, h: 60 }, // ground (full width floor)
  { x: 80, y: 310, w: 120, h: 10 }, // left low platform
  { x: 480, y: 130, w: 120, h: 10 }, // right high platform
  { x: 200, y: 180, w: 100, h: 10 }, // left high platform
  { x: 360, y: 320, w: 110, h: 10 }, // centre low platform
  { x: 580, y: 290, w: 130, h: 10 }, // far right platform
];

// ------------------------------------------------------------
// THE PLAYER OBJECT
// An object groups related data together in one place.
// Instead of separate variables (playerX, playerY, playerVX...),
// we store everything about the player in one object.
// ------------------------------------------------------------
let player = {
  x: 200, // horizontal position (centre of blob)
  y: 100, // vertical position (centre of blob)

  vx: 0, // horizontal velocity — how fast we're moving left/right
  vy: 0, // vertical velocity — how fast we're moving up/down

  r: 24, // radius of the blob shape

  // Movement tuning — change these to adjust how the game feels
  speed: 0.5, // horizontal acceleration per frame
  maxSpeed: 4, // maximum horizontal speed
  jumpForce: -12, // upward velocity applied when jumping (negative = upward)
  friction: 0.8, // horizontal slowdown when no key is pressed (0–1, lower = more friction)

  onGround: false, // tracks whether the player is standing on something
};

// ------------------------------------------------------------
// PHYSICS CONSTANTS
// Defined outside the player object so they can be shared
// across multiple objects later (e.g. enemies)
// ------------------------------------------------------------
const GRAVITY = 0.6; // downward force added to vy every frame

// ------------------------------------------------------------
// NOISE BLOB ANIMATION
// We use p5's noise() function to make the blob edges wobble
// organically. blobT increases each frame to animate the wobble.
// ------------------------------------------------------------
let blobT = 0; // time input for noise — increases each frame

// Floor position — where the ground is
let floorY;

// Background image variable
let bg;
let playerImg;
let wasabiImg;
let wasabiPieces = [];

function preload() {
  // Load the image into the variable
  bg = loadImage("assets/images/background.png");
  playerImg = loadImage("assets/images/salmonSushi.png");
  wasabiImg = loadImage("assets/images/wasabi.png");
}

// Platform colour stored as an array so it can be reused easily
const PLATFORM_COLOR = [150, 111, 51]; // brown

// ============================================================
// setup()
// Runs once at the very start of the sketch.
// Sets up the canvas and positions the player on the floor.
// ============================================================
function setup() {
  createCanvas(800, 450);

  // Place player on top of the ground platform (index 0 in the array)
  player.y = platforms[0].y - player.r;

  floorY = height - 40; // ground sits 40px from the bottom
  player.y = floorY - player.r; // start the player sitting on the floor

  // Create wasabi on the 4th platform
  drawWasabiOnPlatform(platforms[4]);
}

// ============================================================
// draw()
// Runs repeatedly in a loop after setup() finishes.
// Each frame we clear the background, handle input,
// apply physics, and draw everything.
// ============================================================
function draw() {
  imageMode(CORNER);
  background(bg); // sushi conveyor belt background

  drawFloor();
  drawPlatforms();
  handleInput();
  applyPhysics();
  checkWasabiBounce();
  resolvePlatformCollisions();
  drawPlayer();
  drawHUD();

  blobT += 0.015; // advance blob wobble animation each frame
}

// ------------------------------------------------------------
// handleInput()
// Checks which keys are held down this frame and updates
// the player's velocity accordingly.
// keyIsDown() returns true as long as the key is held —
// unlike keyPressed(), which only fires once per press.
// We check both arrow keys and WASD so either works.
// ------------------------------------------------------------
function handleInput() {
  // --- Horizontal movement ---
  if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) {
    // LEFT or A
    player.vx -= player.speed;
  }
  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) {
    // RIGHT or D
    player.vx += player.speed;
  }

  // --- Clamp horizontal speed ---
  // constrain(value, min, max) keeps a value within a range.
  // Without this, holding a key forever would accelerate infinitely.
  player.vx = constrain(player.vx, -player.maxSpeed, player.maxSpeed);

  // --- Apply friction when no horizontal key is pressed ---
  // Multiplying by a value less than 1 gradually slows the player down.
  if (
    !keyIsDown(LEFT_ARROW) &&
    !keyIsDown(65) &&
    !keyIsDown(RIGHT_ARROW) &&
    !keyIsDown(68)
  ) {
    player.vx *= player.friction;
  }

  // --- Jump ---
  // The player can only jump when standing on the ground (onGround = true).
  // This prevents jumping again mid-air.
  if ((keyIsDown(UP_ARROW) || keyIsDown(87)) && player.onGround) {
    // UP or W
    player.vy = player.jumpForce;
    player.onGround = false;
  }
}

// ------------------------------------------------------------
// applyPhysics()
// Each frame we:
//   1. Add gravity to vertical velocity (vy)
//   2. Move the player by its velocity (vx, vy)
//   3. Check if it has landed on the floor
// ------------------------------------------------------------
function applyPhysics() {
  // 1. Apply gravity — pulls the player down every frame
  player.vy += GRAVITY;

  // 2. Move player by its current velocity
  player.x += player.vx;
  player.y += player.vy;

  // 3. Floor collision
  // If the bottom of the blob goes below the floor, push it back up.
  if (player.y + player.r >= floorY) {
    player.y = floorY - player.r; // snap to floor
    player.vy = 0; // stop falling
    player.onGround = true; // allow jumping again
  } else {
    player.onGround = false;
  }

  // 4. Wall collision — keep player inside canvas
  player.x = constrain(player.x, player.r, width - player.r);
}

function checkWasabiBounce() {
  for (let w of wasabiPieces) {
    if (!w.active) continue;

    let dx = player.x - w.x;
    let dy = player.y - w.y;
    let dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < player.r + w.r) {
      // Bounce upward
      player.vy = -15; // adjust bounce strength

      // Optional: deactivate wasabi after bounce
      w.active = false;
    }
  }
}

// ------------------------------------------------------------
// resolvePlatformCollisions()
// Loops through every platform and checks if the player
// is landing on top of it.
//
// The collision check asks three questions:
//   1. Is the player horizontally overlapping the platform?
//   2. Is the player falling downward (vy >= 0)?
//   3. Is the player's bottom at or below the platform top?
//
// If all three are true, we snap the player to sit on top.
// This top-only check means the player can jump through
// platforms from below, which is a common platformer pattern.
// ------------------------------------------------------------
function resolvePlatformCollisions() {
  for (let i = 0; i < platforms.length; i++) {
    let p = platforms[i];

    // Player's bounding box edges
    let playerLeft = player.x - player.r;
    let playerRight = player.x + player.r;
    let playerBottom = player.y + player.r;

    // Platform edges
    let platLeft = p.x;
    let platRight = p.x + p.w;
    let platTop = p.y;

    // 1. Check horizontal overlap
    let overlapsHorizontally = playerRight > platLeft && playerLeft < platRight;

    // 2 & 3. Check if landing on top (falling down onto the platform surface)
    // The small tolerance (+ 20) prevents the player clipping through
    // fast-moving platforms or getting stuck on edges.
    let landingOnTop =
      player.vy >= 0 && playerBottom >= platTop && playerBottom <= platTop + 20;

    if (overlapsHorizontally && landingOnTop) {
      player.y = platTop - player.r; // snap to platform surface
      player.vy = 0; // stop falling
      player.onGround = true; // allow jumping again
    }
  }
}

function drawWasabiOnPlatform(p) {
  let count = 4;
  let spacing = p.w / (count + 1);

  for (let i = 1; i <= count; i++) {
    let wx = p.x + spacing * i;
    let wy = p.y - 10;

    // Draw the wasabi
    imageMode(CENTER);
    image(wasabiImg, wx, wy, 30, 30);

    // Store the wasabi for collision
    wasabiPieces.push({
      x: wx,
      y: wy,
      r: 15, // collision radius
      active: true, // so we can disable it after bouncing
    });
  }
}

// ------------------------------------------------------------
// drawPlatforms()
// Loops through the platforms array and draws each one.
// This is the same loop pattern used to draw any collection
// of objects — enemies, coins, tiles, etc.
// ------------------------------------------------------------
function drawPlatforms() {
  fill(PLATFORM_COLOR[0], PLATFORM_COLOR[1], PLATFORM_COLOR[2]);
  noStroke();

  for (let i = 0; i < platforms.length; i++) {
    let p = platforms[i];
    rect(p.x, p.y, p.w, p.h, 2); // rounded corners

    // Draw wasabi only on the 4th platform
    if (i === 4) {
      drawWasabiOnPlatform(p);
    }
  }
}

// ------------------------------------------------------------
// drawPlayer()
// The blob is drawn as a polygon using noise() to offset
// each vertex slightly, creating an organic wobble effect.
// push() and pop() save and restore drawing settings so
// styles set here don't affect other drawing functions.
// ------------------------------------------------------------
function drawPlayer() {
  push();
  imageMode(CENTER);
  image(playerImg, player.x, player.y, player.r * 2, player.r * 2);
  pop();
}

// ------------------------------------------------------------
// drawFloor()
// A simple rectangle across the bottom of the canvas.
// ------------------------------------------------------------
function drawFloor() {
  noStroke();
  rect(0, floorY, width, height - floorY);
}

// ------------------------------------------------------------
// drawHUD()
// HUD = Heads Up Display.
// Shows controls on screen so the player always knows
// how to interact without needing external instructions.
// ------------------------------------------------------------
function drawHUD() {
  fill(180);
  noStroke();
  textSize(13);
  textAlign(LEFT);
  text("Move: Arrow Keys or WASD   Jump: W or Up Arrow", 16, 24);
}
