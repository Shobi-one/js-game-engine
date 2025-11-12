// Example Custom Code Snippets for Three.js Objects
// Copy and paste these into the "Edit Code" dialog

// ============================================
// BASIC ANIMATIONS
// ============================================

// Continuous rotation on Y axis
this.mesh.rotation.y += 0.01;

// Continuous rotation on all axes
this.mesh.rotation.x += 0.005;
this.mesh.rotation.y += 0.01;
this.mesh.rotation.z += 0.007;

// Smooth bounce animation
this.mesh.position.y = Math.abs(Math.sin(Date.now() * 0.002)) * 3 + 0.5;

// Wave motion
this.mesh.position.x = Math.sin(Date.now() * 0.001) * 5;
this.mesh.position.z = Math.cos(Date.now() * 0.001) * 5;

// Circular orbit around origin
const time = Date.now() * 0.001;
this.mesh.position.x = Math.cos(time) * 3;
this.mesh.position.z = Math.sin(time) * 3;

// Pulsing scale effect
const scale = 1 + Math.sin(Date.now() * 0.003) * 0.3;
this.mesh.scale.set(scale, scale, scale);

// ============================================
// INTERACTIVE BEHAVIORS
// ============================================

// Rotate when mouse is near
if (this.threeScene && this.threeScene.mouse) {
  const mouseX = this.threeScene.mouse.x;
  const mouseY = this.threeScene.mouse.y;
  this.mesh.rotation.y = mouseX * Math.PI;
  this.mesh.rotation.x = mouseY * Math.PI;
}

// Follow the camera
if (this.threeScene && this.threeScene.camera) {
  const targetPos = this.threeScene.camera.position;
  this.mesh.lookAt(targetPos);
}

// Respond to keyboard (requires object to be selected)
const keys = this.threeScene?.keys || {};
if (keys['r']) {
  this.mesh.rotation.y += 0.05;
}
if (keys['t']) {
  this.mesh.position.y += 0.1;
}

// ============================================
// PHYSICS-LIKE BEHAVIORS
// ============================================

// Simple gravity with ground collision
if (!this.velocityY) this.velocityY = 0;
this.velocityY -= 0.01; // gravity
this.mesh.position.y += this.velocityY;

// Ground collision at y = 0.5
if (this.mesh.position.y <= 0.5) {
  this.mesh.position.y = 0.5;
  this.velocityY = 0;
}

// Bounce on ground
if (!this.velocityY) this.velocityY = 0;
this.velocityY -= 0.015; // gravity
this.mesh.position.y += this.velocityY;

if (this.mesh.position.y <= 0.5) {
  this.mesh.position.y = 0.5;
  this.velocityY = Math.abs(this.velocityY) * 0.7; // bounce with damping
}

// Random walk movement
if (!this.walkTimer || Date.now() - this.walkTimer > 1000) {
  this.walkTimer = Date.now();
  this.walkDirection = {
    x: (Math.random() - 0.5) * 0.05,
    z: (Math.random() - 0.5) * 0.05
  };
}
this.mesh.position.x += this.walkDirection.x;
this.mesh.position.z += this.walkDirection.z;

// ============================================
// ADVANCED EFFECTS
// ============================================

// Color cycle
if (!this.colorTime) this.colorTime = 0;
this.colorTime += 0.01;
const hue = (this.colorTime % 1.0);
this.material.color.setHSL(hue, 1.0, 0.5);

// Opacity pulse
if (!this.opacityTime) this.opacityTime = 0;
this.opacityTime += 0.02;
this.material.transparent = true;
this.material.opacity = 0.5 + Math.sin(this.opacityTime) * 0.3;

// Trail effect (requires multiple objects)
if (!this.trail) this.trail = [];
this.trail.push({
  x: this.mesh.position.x,
  y: this.mesh.position.y,
  z: this.mesh.position.z
});
if (this.trail.length > 50) this.trail.shift();

// Rotate to face movement direction
if (this.lastPosition) {
  const dx = this.mesh.position.x - this.lastPosition.x;
  const dz = this.mesh.position.z - this.lastPosition.z;
  if (dx !== 0 || dz !== 0) {
    this.mesh.rotation.y = Math.atan2(dx, dz);
  }
}
this.lastPosition = {
  x: this.mesh.position.x,
  y: this.mesh.position.y,
  z: this.mesh.position.z
};

// ============================================
// GAME LOGIC EXAMPLES
// ============================================

// Simple patrol behavior
if (!this.patrolPoints) {
  this.patrolPoints = [
    { x: -3, z: -3 },
    { x: 3, z: -3 },
    { x: 3, z: 3 },
    { x: -3, z: 3 }
  ];
  this.currentPoint = 0;
}

const target = this.patrolPoints[this.currentPoint];
const dx = target.x - this.mesh.position.x;
const dz = target.z - this.mesh.position.z;
const dist = Math.sqrt(dx * dx + dz * dz);

if (dist < 0.2) {
  this.currentPoint = (this.currentPoint + 1) % this.patrolPoints.length;
} else {
  this.mesh.position.x += (dx / dist) * 0.05;
  this.mesh.position.z += (dz / dist) * 0.05;
}

// Orbit around another object (assumes object ID 0 exists)
if (this.threeScene && this.threeScene.objects[0]) {
  const center = this.threeScene.objects[0].mesh.position;
  if (!this.orbitAngle) this.orbitAngle = 0;
  this.orbitAngle += 0.02;
  const radius = 3;
  this.mesh.position.x = center.x + Math.cos(this.orbitAngle) * radius;
  this.mesh.position.z = center.z + Math.sin(this.orbitAngle) * radius;
  this.mesh.lookAt(center);
}

// Flee from camera
if (this.threeScene && this.threeScene.camera) {
  const camPos = this.threeScene.camera.position;
  const dx = this.mesh.position.x - camPos.x;
  const dz = this.mesh.position.z - camPos.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  
  if (dist < 5) {
    this.mesh.position.x += (dx / dist) * 0.05;
    this.mesh.position.z += (dz / dist) * 0.05;
  }
}

// Simple AI - Chase nearest object
if (this.threeScene && this.threeScene.objects) {
  let nearest = null;
  let minDist = Infinity;
  
  this.threeScene.objects.forEach(obj => {
    if (obj.id !== this.id && obj.mesh) {
      const dx = obj.mesh.position.x - this.mesh.position.x;
      const dz = obj.mesh.position.z - this.mesh.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < minDist) {
        minDist = dist;
        nearest = obj;
      }
    }
  });
  
  if (nearest && minDist > 1) {
    const dx = nearest.mesh.position.x - this.mesh.position.x;
    const dz = nearest.mesh.position.z - this.mesh.position.z;
    this.mesh.position.x += (dx / minDist) * 0.03;
    this.mesh.position.z += (dz / minDist) * 0.03;
    this.mesh.lookAt(nearest.mesh.position);
  }
}

// ============================================
// COMPLEX COMBINATIONS
// ============================================

// Flying bird-like movement
if (!this.birdState) {
  this.birdState = {
    angle: 0,
    height: 2,
    speed: 0.02,
    flap: 0
  };
}

this.birdState.angle += this.birdState.speed;
this.birdState.flap += 0.1;

// Circular path
this.mesh.position.x = Math.cos(this.birdState.angle) * 5;
this.mesh.position.z = Math.sin(this.birdState.angle) * 5;

// Wing flap (scale Y)
this.mesh.scale.y = 1 + Math.sin(this.birdState.flap) * 0.2;

// Height variation
this.mesh.position.y = this.birdState.height + Math.sin(this.birdState.angle * 2) * 0.5;

// Look in direction of movement
const nextX = Math.cos(this.birdState.angle + 0.1) * 5;
const nextZ = Math.sin(this.birdState.angle + 0.1) * 5;
this.mesh.lookAt(nextX, this.mesh.position.y, nextZ);

// Spinning top with wobble
if (!this.topState) {
  this.topState = {
    spinSpeed: 0.2,
    wobbleAmount: 0.1,
    wobbleSpeed: 0.05,
    time: 0
  };
}

this.topState.time += 1;
this.mesh.rotation.y += this.topState.spinSpeed;

// Wobble effect
const wobble = Math.sin(this.topState.time * this.topState.wobbleSpeed) * this.topState.wobbleAmount;
this.mesh.rotation.x = wobble;
this.mesh.rotation.z = Math.cos(this.topState.time * this.topState.wobbleSpeed * 1.5) * wobble;

// Slow down over time
this.topState.spinSpeed *= 0.999;
this.topState.wobbleAmount += 0.001;

// ============================================
// MATERIAL ANIMATIONS
// ============================================

// Emissive glow pulse
if (!this.glowTime) this.glowTime = 0;
this.glowTime += 0.05;
const glowIntensity = (Math.sin(this.glowTime) + 1) * 0.5;
if (this.material.emissive) {
  this.material.emissive.setHex(0xff6600);
  this.material.emissiveIntensity = glowIntensity;
}

// Wireframe toggle
if (!this.wireframeTimer) this.wireframeTimer = 0;
this.wireframeTimer++;
if (this.wireframeTimer % 120 === 0) {
  this.material.wireframe = !this.material.wireframe;
}

// Texture offset animation (if texture exists)
if (this.material.map) {
  this.material.map.offset.x += 0.001;
  this.material.map.offset.y += 0.001;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Random position within bounds
if (!this.initialized) {
  this.mesh.position.x = (Math.random() - 0.5) * 10;
  this.mesh.position.z = (Math.random() - 0.5) * 10;
  this.initialized = true;
}

// Keep within bounds
const bounds = 8;
if (Math.abs(this.mesh.position.x) > bounds) {
  this.mesh.position.x = Math.sign(this.mesh.position.x) * bounds;
}
if (Math.abs(this.mesh.position.z) > bounds) {
  this.mesh.position.z = Math.sign(this.mesh.position.z) * bounds;
}

// Distance to origin
const distToOrigin = Math.sqrt(
  this.mesh.position.x ** 2 + 
  this.mesh.position.z ** 2
);

// Simple state machine
if (!this.state) this.state = 'idle';

switch(this.state) {
  case 'idle':
    if (Math.random() < 0.01) this.state = 'moving';
    break;
  case 'moving':
    this.mesh.position.x += 0.1;
    if (this.mesh.position.x > 5) this.state = 'idle';
    break;
}

// ============================================
// DEBUGGING HELPERS
// ============================================

// Log position every second
if (!this.lastLog || Date.now() - this.lastLog > 1000) {
  console.log(`Object ${this.id} at (${
    this.mesh.position.x.toFixed(2)
  }, ${
    this.mesh.position.y.toFixed(2)
  }, ${
    this.mesh.position.z.toFixed(2)
  })`);
  this.lastLog = Date.now();
}

// Visual debug - change color based on state
if (this.velocityY > 0) {
  this.material.color.setHex(0x00ff00); // Green when going up
} else if (this.velocityY < 0) {
  this.material.color.setHex(0xff0000); // Red when falling
} else {
  this.material.color.setHex(0x0000ff); // Blue when stationary
}
