import { Sprite, Texture } from "pixi.js";

export class Fish {
  constructor(x, y, texture = null, options = {}) {
    this.sprite = new Sprite(texture ?? Texture.from("assets/lionfish75.png"));
    this.sprite.anchor.set(0.5);

    this.position = { x, y };
    this.velocity = { x: 0, y: 0 };

    this.sprite.x = x;
    this.sprite.y = y;

    this.facingRotation = 0;
    this.sprite.rotation = 0;

    this.displayWidth = options.displayWidth ?? 62;
    this.displayHeight = options.displayHeight ?? null;

    if (this.displayHeight != null) {
      this.sprite.width = this.displayWidth;
      this.sprite.height = this.displayHeight;
    } else {
      const aspect = this.sprite.texture.height > 0
        ? this.sprite.texture.width / this.sprite.texture.height
        : 1;

      this.sprite.width = this.displayWidth;
      this.sprite.height = this.displayWidth / aspect;
    }

    this.radius = options.radius ?? 12;
  }

  setTexture(texture) {
    this.sprite.texture = texture;

    const aspect = this.sprite.texture.height > 0
      ? this.sprite.texture.width / this.sprite.texture.height
      : 1;

    this.sprite.width = this.displayWidth;
    this.sprite.height = this.displayWidth / aspect;
  }

  getControlIntent(controller) {
    const accel = 0.35;

    let thrustX = 0;
    let thrustY = 0;

    if (controller?.getOutput) {
      const output = controller.getOutput(this) || {};
      thrustX = output.thrustX ?? 0;
      thrustY = output.thrustY ?? 0;
      return { thrustX, thrustY };
    }

    if (controller?.isDown?.("KeyW")) thrustY -= accel;
    if (controller?.isDown?.("KeyS")) thrustY += accel;
    if (controller?.isDown?.("KeyD")) thrustX += accel;
    if (controller?.isDown?.("KeyA")) thrustX -= accel * 0.65;

    return { thrustX, thrustY };
  }

  resetForLoop(x, y) {
    this.position.x = x;
    this.position.y = y;

    this.velocity.x = 0;
    this.velocity.y = 0;

    this.facingRotation = 0;
    this.sprite.rotation = 0;

    this.sprite.x = x;
    this.sprite.y = y;
  }

  updateDeadFloat(delta, current) {
    this.velocity.x *= 0.985;
    this.velocity.y *= 0.985;

    this.velocity.x += (current?.x ?? 0) * 0.35;
    this.velocity.y += (current?.y ?? 0) * 0.35;

    this.velocity.y -= 0.02 * delta;

    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;

    this.sprite.x = this.position.x;
    this.sprite.y = this.position.y;

    const targetRotation = -1.2;
    this.facingRotation += (targetRotation - this.facingRotation) * 0.04;
    this.sprite.rotation = this.facingRotation;
  }

  update(delta, controller, current) {
    const { thrustX, thrustY } = this.getControlIntent(controller);

    this.velocity.x += thrustX;
    this.velocity.y += thrustY;

    this.velocity.x += 0.05;

    this.velocity.x += current.x;
    this.velocity.y += current.y;

    this.velocity.x *= 0.98;
    this.velocity.y *= 0.98;

    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;

    this.sprite.x = this.position.x;
    this.sprite.y = this.position.y;

    const pitchFromHorizontalIntent = -thrustX * 0.5;
    const pitchFromVerticalIntent = thrustY * 0.35;

    const targetRotation = -(pitchFromHorizontalIntent + pitchFromVerticalIntent);

    const maxPitch = 0.55;
    const clampedTarget = Math.max(-maxPitch, Math.min(maxPitch, targetRotation));

    this.facingRotation += (clampedTarget - this.facingRotation) * 0.18;
    this.sprite.rotation = this.facingRotation;
  }
}