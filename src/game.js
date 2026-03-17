import { Application, Container, Assets } from "pixi.js";
import { Fish } from "./entities/Fish.js";
import { SpawnSystem } from "./systems/SpawnSystem.js";
import { CurrentSystem } from "./systems/CurrentSystem.js";
import { KeyboardController } from "./input/KeyboardController.js";
import { ReefCollisionSystem } from "./systems/ReefCollisionSystem.js";

export class Game {

  async init() {

    this.app = new Application();

    await this.app.init({
      width: 1280,
      height: 720,
      background: "#003344"
    });

    document.body.appendChild(this.app.canvas);

    await Assets.load([
      "assets/lionfish75.png",
      "assets/coral_top.png",
      "assets/coral_bottom.png"
    ]);

    this.world = new Container();
    this.app.stage.addChild(this.world);

    this.controller = new KeyboardController();

    this.fish = new Fish(300, 360);
    this.world.addChild(this.fish.sprite);

    this.spawnSystem = new SpawnSystem(this.world);
    this.currentSystem = new CurrentSystem();
    this.collisionSystem = new ReefCollisionSystem(this.spawnSystem);

    this.time = 0;

  }

  start() {

    this.app.ticker.add((ticker) => {
      this.update(ticker.deltaTime);
    });

  }

  update(delta)
  {

    this.time += delta * 0.01;

    const current = this.currentSystem.getForce(
      this.fish.position.x,
      this.fish.position.y,
      this.time
    );

    this.fish.update(delta, this.controller, current);

    this.spawnSystem.update(delta);

    if (this.collisionSystem.checkFishCollision(this.fish))
    {
        console.log("fish crashed");
    }

  }
  }

