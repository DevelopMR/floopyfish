import { Coral } from "../entities/Coral.js";

export class SpawnSystem {

  constructor(container) {

    this.container = container;
    this.corals = [];
    this.timer = 0;

  }

  update(delta) {

    this.timer += delta;

    if (this.timer > 150) {
      this.spawn();
      this.timer = 0;
    }

    this.corals = this.corals.filter(c => {

      if (c.sprite.x < -200) {
        this.container.removeChild(c.sprite);
        return false;
      }

      return true;

    });

  }

  spawn() {

    const gap = 140 + Math.random() * 100;
    const center = 200 + Math.random() * 300;

    const topHeight = center - gap / 2;
    const bottomY = center + gap / 2;

    const top = new Coral(1300, 0, "assets/coral_top.png");
    top.sprite.height = topHeight;

    const bottom = new Coral(1300, bottomY, "assets/coral_bottom.png");

    this.container.addChild(top.sprite);
    this.container.addChild(bottom.sprite);

    this.corals.push(top, bottom);

  }

}