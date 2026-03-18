import { Application, Assets, Container, TilingSprite, Texture } from "pixi.js";
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
      "assets/coral_texture2.png",
      "assets/reef_bg_far.png",
      "assets/reef_bg_mid.png",
      "assets/caustics_tile.png",
    ]);

    this.backgroundLayer = new Container();
    this.app.stage.addChild(this.backgroundLayer);

    const farTexture = Texture.from("assets/reef_bg_far.png");
    this.bgFar = new TilingSprite({
      texture: farTexture,
      width: 1280,
      height: 720,
    });
    this.bgFar.alpha = 0.45;

    const midTexture = Texture.from("assets/reef_bg_mid.png");
    this.bgMid = new TilingSprite({
      texture: midTexture,
      width: 1280,
      height: 720,
    });
    this.bgMid.alpha = 0.7;

    this.backgroundLayer.addChild(this.bgFar);
    this.backgroundLayer.addChild(this.bgMid);


    this.bgFar.tint = 0x88bbcc;
    this.bgMid.tint = 0xaacccc;

    this.world = new Container();
    this.app.stage.addChild(this.world);

    this.causticsLayer = new Container();
    this.app.stage.addChild(this.causticsLayer);

    const causticsTexture = Texture.from("assets/caustics_tile.png");

    this.causticsA = new TilingSprite({
      texture: causticsTexture,
      width: 1280,
      height: 720,
    });

    this.causticsA.alpha = 0.16;
    this.causticsA.blendMode = "screen";
    this.causticsA.tint = 0xdffcff;
    this.causticsA.tileScale.set(1.2, 1.2);

    this.causticsB = new TilingSprite({
      texture: causticsTexture,
      width: 1280,
      height: 720,
    });

    this.causticsB.alpha = 0.08;
    this.causticsB.blendMode = "screen";
    this.causticsB.tint = 0xbfefff;
    this.causticsB.tileScale.set(0.8, 0.8);

    this.causticsLayer.addChild(this.causticsA);
    this.causticsLayer.addChild(this.causticsB);


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

    this.bgFar.tilePosition.x -= 0.3 * delta;
    this.bgMid.tilePosition.x -= 0.8 * delta;

    this.spawnSystem.update(delta);

    if (this.collisionSystem.checkFishCollision(this.fish))
    {
        console.log("fish crashed");
    }


    this.causticsA.tilePosition.x -= 0.45 * delta;
    this.causticsA.tilePosition.y += 0.12 * delta;

    this.causticsB.tilePosition.x += 0.22 * delta;
    this.causticsB.tilePosition.y += 0.06 * delta;

    this.causticsTime ??= 0;
    this.causticsTime += 0.01 * delta;

    this.causticsA.alpha = 0.14 + Math.sin(this.causticsTime * 0.9) * 0.025;
    this.causticsB.alpha = 0.07 + Math.sin(this.causticsTime * 1.3 + 1.7) * 0.018;

  }
  }

