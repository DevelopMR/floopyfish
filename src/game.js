import { Application, Assets, Container, Graphics, TilingSprite, Texture } from "pixi.js";
import { Fish } from "./entities/Fish.js";
import { SpawnSystem } from "./systems/SpawnSystem.js";
import { CurrentSystem } from "./systems/CurrentSystem.js";
import { KeyboardController } from "./input/KeyboardController.js";
import { ReefCollisionSystem } from "./systems/ReefCollisionSystem.js";
import { SensorSystem } from "./systems/SensorSystem.js";

export class Game {

  async init() {

    this.app = new Application();

    await this.app.init({
      width: 1280,
      height: 720,
      background: "#003344"
    });

    document.body.appendChild(this.app.canvas);

    // get images ready
    await Assets.load([
      "assets/lionfish75.png",
      "assets/coral_texture2.png",
      "assets/reef_bg_far.png",
      "assets/reef_bg_mid.png",
      "assets/caustics_tile.png",
    ]);

    // build background scene graphics
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

    // tint backgrounds to better match caustics and foreground coral
    this.bgFar.tint = 0x88bbcc;
    this.bgMid.tint = 0xaacccc;


    // floaty lighting caustics layers
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


    // input controller
    this.controller = new KeyboardController();

    this.fish = new Fish(300, 360);
    this.world.addChild(this.fish.sprite);

    this.spawnSystem = new SpawnSystem(this.world); // handles reef segment spawning and profile generation
    this.currentSystem = new CurrentSystem(this.spawnSystem); // handles current forces based on position and time
    this.collisionSystem = new ReefCollisionSystem(this.spawnSystem); // handles collision checks based on current reef segments

    //  handles raycasting for fish vision based on current reef segments
    this.sensorSystem = new SensorSystem(this.collisionSystem);

    // debug layer for raycasting visualization
    this.debugLayer = new Container();
    this.app.stage.addChild(this.debugLayer);

    this.rayDebug = new Graphics();
    this.debugLayer.addChild(this.rayDebug);

    this.lastRayResults = [];

    // time accumulator for current system
    this.time = 0;

  }

  start() {

    this.app.ticker.add((ticker) => {
      this.update(ticker.deltaTime);
    });

  }

  // debug function to visualize raycasting results
  drawRayDebug(rayResults) {
    this.rayDebug.clear();

    for (const ray of rayResults) {
      const color = ray.hit ? 0xff6644 : 0x66e0ff;
      const alpha = ray.hit ? 0.95 : 0.55;

      this.rayDebug.moveTo(ray.startX, ray.startY);
      this.rayDebug.lineTo(ray.endX, ray.endY);
      this.rayDebug.stroke({ width: 2, color, alpha });

      if (ray.hit) {
        this.rayDebug.circle(ray.endX, ray.endY, 3);
        this.rayDebug.fill({ color: 0xffffff, alpha: 0.95 });
      }
    }
  }

  update(delta) {

    this.time += delta * 0.01; // scaled time for more manageable numbers

    // get current forces for this frame
    const current = this.currentSystem.getForce(
      this.fish.position.x,
      this.fish.position.y,
      this.time
    );

    // update fish with current input and forces
    this.fish.update(delta, this.controller, current);

    // scroll backgrounds
    this.bgFar.tilePosition.x -= 0.3 * delta;
    this.bgMid.tilePosition.x -= 0.8 * delta;

    // spawns segments and updates profiles
    this.spawnSystem.update(delta);

    // raycasting for debug visualization
    this.lastRayResults = this.sensorSystem.getVisionReadings(this.fish);   // get raycast results for debug drawing
    this.drawRayDebug(this.lastRayResults);  // draws raycasts for debugging

    // collision check
    if (this.collisionSystem.checkFishCollision(this.fish)) {
      console.log("fish crashed");
    }

    // animate caustics
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

