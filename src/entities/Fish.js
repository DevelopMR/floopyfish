import { Sprite, Texture } from "pixi.js";

export class Fish {

  constructor(x, y) {

    this.sprite = new Sprite(Texture.from("assets/lionfish.png"));

    this.sprite.anchor.set(0.5);

    this.position = { x, y };
    this.velocity = { x: 0, y: 0 };

    this.sprite.x = x;
    this.sprite.y = y;

  }

  update(delta, controller, current) {

    const accel = 0.4;

    if (controller.isDown("KeyW")) this.velocity.y -= accel;
    if (controller.isDown("KeyS")) this.velocity.y += accel;
    if (controller.isDown("KeyD")) this.velocity.x += accel;
    if (controller.isDown("KeyA")) this.velocity.x -= accel * 0.5;

    // slight forward drift
    this.velocity.x += 0.05;

    // wave current
    this.velocity.x += current.x;
    this.velocity.y += current.y;

    // damping
    this.velocity.x *= 0.98;
    this.velocity.y *= 0.98;

    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;

    this.sprite.x = this.position.x;
    this.sprite.y = this.position.y;

    // tilt helicopter style
    this.sprite.rotation = Math.max(
      -0.6,
      Math.min(0.6, this.velocity.x * 0.04)
    );

  }

}