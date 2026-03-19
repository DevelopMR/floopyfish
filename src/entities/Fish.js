import { Sprite, Texture } from "pixi.js";

export class Fish {
  constructor(x, y) {
    this.sprite = new Sprite(Texture.from("assets/lionfish75.png"));
    this.sprite.anchor.set(0.5);

    this.position = { x, y };
    this.velocity = { x: 0, y: 0 };

    this.sprite.x = x;
    this.sprite.y = y;

    this.facingRotation = 0;
    this.sprite.rotation = 0;
  }

  update(delta, controller, current) {
    const accel = 0.35;

    let thrustX = 0;
    let thrustY = 0;

    if (controller.isDown("KeyW")) thrustY -= accel;
    if (controller.isDown("KeyS")) thrustY += accel;
    if (controller.isDown("KeyD")) thrustX += accel;
    if (controller.isDown("KeyA")) thrustX -= accel * 0.65;

    this.velocity.x += thrustX;
    this.velocity.y += thrustY;

    // slight forward drift
    this.velocity.x += 0.05;

    // current
    this.velocity.x += current.x;
    this.velocity.y += current.y;

    // damping
    this.velocity.x *= 0.98;
    this.velocity.y *= 0.98;

    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;

    this.sprite.x = this.position.x;
    this.sprite.y = this.position.y;

    // Helicopter-style attitude:
    // backward intent -> nose up
    // forward intent -> nose down
    const pitchFromHorizontalIntent = -thrustX * 0.5;

    // Optional small influence from vertical thrust so W/S still feels alive
    const pitchFromVerticalIntent = thrustY * 0.35;

    const targetRotation = -(pitchFromHorizontalIntent + pitchFromVerticalIntent);

    const maxPitch = 0.55;
    const clampedTarget = Math.max(-maxPitch, Math.min(maxPitch, targetRotation));

    this.facingRotation += (clampedTarget - this.facingRotation) * 0.18;
    this.sprite.rotation = this.facingRotation;
  }
}