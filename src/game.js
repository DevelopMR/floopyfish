import { Application, Assets, Container, Graphics, TilingSprite, Texture } from "pixi.js";
import { Fish } from "./entities/Fish.js";
import { SpawnSystem } from "./systems/SpawnSystem.js";
import { CurrentSystem } from "./systems/CurrentSystem.js";
import { DifficultySystem } from "./systems/DifficultySystem.js";
import { KeyboardController } from "./input/KeyboardController.js";
import { ReefCollisionSystem } from "./systems/ReefCollisionSystem.js";
import { SensorSystem } from "./systems/SensorSystem.js";
import { createTrialState } from "./simulation/TrialState.js";
import { FitnessSystem } from "./simulation/FitnessSystem.js";
import { GapRewardSystem } from "./simulation/GapRewardSystem.js";
import { TrialSystem } from "./simulation/TrialSystem.js";
import { HudOverlay } from "./ui/HudOverlay.js";
import { BrainOverlay } from "./ui/BrainOverlay.js";
import { FishController } from "./ai/FishController.js";
import { NeuralInputBuilder } from "./ai/NeuralInputBuilder.js";

export class Game {
  async init() {
    this.app = new Application(); // default to 800x600, we'll resize later

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
      "assets/FloopyFish_logo.png",
    ]);

    // Set up layers, background layers first
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

    // world layer will hold the fish and reefs
    this.world = new Container();
    this.app.stage.addChild(this.world);

    // Caustics layer
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

    // Input controller
    //this.controller = new KeyboardController(); // hidden during bot testing

    // Create the fish entity 
    this.fish = new Fish(300, 360);
    this.world.addChild(this.fish.sprite);

    this.spawnSystem = new SpawnSystem(this.world);
    this.currentSystem = new CurrentSystem(this.spawnSystem);
    this.collisionSystem = new ReefCollisionSystem(this.spawnSystem);
    this.sensorSystem = new SensorSystem(this.collisionSystem);

    this.neuralInputBuilder = new NeuralInputBuilder({
      worldWidth: 1280,
      worldHeight: 720,
    });

    this.controller = new FishController({
      inputBuilder: this.neuralInputBuilder,
    });

    this.difficultySystem = new DifficultySystem();
    this.fitnessSystem = new FitnessSystem(this.difficultySystem);
    this.gapRewardSystem = new GapRewardSystem(this.fitnessSystem);

    this.baseEnvironmentConfig = {
      gapCurrentForce: this.currentSystem.baseGapPressureStrength,
      farRightCurrentForce: this.currentSystem.baseRightRampStrength,
      coralMotionSpeed: 1,
      waveAmplitude: 1,
    };

    // Trial system manages the state of each trial, including fitness evaluation and loop progression
    this.trialSystem = new TrialSystem({
      fitnessSystem: this.fitnessSystem,
      gapRewardSystem: this.gapRewardSystem,
      difficultySystem: this.difficultySystem,
      spawnSystem: this.spawnSystem,
      collisionSystem: this.collisionSystem,
      worldWidth: 1280,
      worldHeight: 720,
    });

    this.startNewTrial();

    // debug layer
    this.debugLayer = new Container();
    this.app.stage.addChild(this.debugLayer);
    this.rayDebug = new Graphics();
    this.debugLayer.addChild(this.rayDebug);

    // HUD and Brain overlays
    this.uiLayer = new Container();
    this.app.stage.addChild(this.uiLayer);

    this.hudOverlay = new HudOverlay({ width: 1280, height: 720 });
    this.uiLayer.addChild(this.hudOverlay.root);

    this.brainOverlay = new BrainOverlay({
      width: 1280,
      height: 720,
      architecture: [14, 12, 8, 2],
      outputLabels: ["thrust X", "thrust Y"],
    });
    this.uiLayer.addChild(this.brainOverlay.root);

    const logoTexture = Texture.from("assets/FloopyFish_logo.png");
    this.hudOverlay.setLogoTexture(logoTexture);


    this.lastRayResults = []; // store last ray results for debug drawing
    this.time = 0;
    this.causticsTime = 0;
    this.loggedDeath = false;
  }

  startNewTrial() {
    const safeSpawn = this.spawnSystem.getSafeLoopSpawn(this.fish.radius);
    this.fish.resetForLoop(safeSpawn.x, safeSpawn.y);
    this.trial = createTrialState(this.fish.position.x, this.fish.position.y);
    this.loggedDeath = false;
  }

  start() {
    this.app.ticker.add((ticker) => {
      this.update(ticker.deltaTime);
    });
  }

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

  updateEnvironmentVisuals(environment, delta) {
    const coralSpeed = environment.coralMotionSpeed;
    const waveAmp = environment.waveAmplitude;

    this.bgFar.tilePosition.x -= 0.3 * delta * (0.9 + 0.1 * waveAmp);
    this.bgMid.tilePosition.x -= 0.8 * delta * (0.9 + 0.1 * waveAmp);

    this.causticsA.tilePosition.x -= 0.45 * delta * coralSpeed;
    this.causticsA.tilePosition.y += 0.12 * delta * coralSpeed;

    this.causticsB.tilePosition.x += 0.22 * delta * coralSpeed;
    this.causticsB.tilePosition.y += 0.06 * delta * coralSpeed;

    this.causticsTime += 0.01 * delta * waveAmp;

    this.causticsA.alpha = 0.14 + Math.sin(this.causticsTime * 0.9) * 0.025 * waveAmp;
    this.causticsB.alpha = 0.07 + Math.sin(this.causticsTime * 1.3 + 1.7) * 0.018 * waveAmp;
  }

  update(delta) {
    this.time += delta * 0.01;

    const environment = this.trialSystem.getEnvironment(
      this.baseEnvironmentConfig,
      this.trial
    );

    this.currentSystem.setEnvironment(environment);
    this.spawnSystem.update(delta);


    const current = this.currentSystem.getForce(
      this.fish.position.x,
      this.fish.position.y,
      this.time
    );

    this.lastRayResults = this.sensorSystem.getVisionReadings(this.fish);

    if (this.trial.alive) {
      this.controller.update({
        fish: this.fish,
        rayResults: this.lastRayResults,
        current,
      });

      this.fish.update(delta, this.controller, current);
    } else if (this.trial.isDying) {
      this.fish.updateDeadFloat(delta, current);
    }

    this.trialSystem.update(this.fish, this.trial);
    this.drawRayDebug(this.lastRayResults);




    this.updateEnvironmentVisuals(environment, delta);

    if (this.trial.deathResolved && !this.loggedDeath) {
      this.loggedDeath = true;
      console.log("trial ended", {
        fitness: this.trial.fitness,
        loopsCompleted: this.trial.loopsCompleted,
        totalGapPasses: this.trial.totalGapPasses,
      });
      this.startNewTrial();
    }

    this.hudOverlay.update({
      score: this.trial.fitness,
      loopCount: this.trial.loopsCompleted,
    });

    this.brainOverlay.update({
      inputs: this.controller.lastInputs,
      outputs: this.controller.lastOutputs,
    });

  }
}