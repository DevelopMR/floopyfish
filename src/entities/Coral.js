import { Sprite, Texture } from "pixi.js";

export class Coral {

  constructor(x, y, texturePath) {

    this.sprite = new Sprite(Texture.from(texturePath));

    this.sprite.x = x;
    this.sprite.y = y;

  }

  update(delta) {

    this.sprite.x -= 2 * delta;

  }

}