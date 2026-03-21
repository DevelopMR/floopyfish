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
import { EvolutionSystem } from "./simulation/EvolutionSystem.js";
import { HudOverlay } from "./ui/HudOverlay.js";
import { BrainOverlay } from "./ui/BrainOverlay.js";
import { FishController } from "./ai/FishController.js";
import { NeuralInputBuilder } from "./ai/NeuralInputBuilder.js";
import { PlayerKeyboardController } from "./ai/PlayerKeyboardController.js";

export class Game {
  async init() {
    this.app = new Application();

    await this.app.init({
      width: 1280,
      height: 720,
      background: "#003344",
    });

    document.body.appendChild(this.app.canvas);

    await Assets.load([
      "assets/lionfish75.png",
      "assets/coral_texture2.png",
      "assets/reef_bg_far.png",
      "assets/reef_bg_mid.png",
      "assets/caustics_tile.png",
      "assets/FloopyFish_logo.png",
      "assets/Player_Mode_icons.png",
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

    this.spawnSystem = new SpawnSystem(this.world);
    this.currentSystem = new CurrentSystem(this.spawnSystem);
    this.collisionSystem = new ReefCollisionSystem(this.spawnSystem);
    this.sensorSystem = new SensorSystem(this.collisionSystem);

    this.difficultySystem = new DifficultySystem();
    this.fitnessSystem = new FitnessSystem(this.difficultySystem);
    this.gapRewardSystem = new GapRewardSystem(this.fitnessSystem);

    this.baseEnvironmentConfig = {
      gapCurrentForce: this.currentSystem.baseGapPressureStrength,
      farRightCurrentForce: this.currentSystem.baseRightRampStrength,
      coralMotionSpeed: 1,
      waveAmplitude: 1,
    };

    this.trialSystem = new TrialSystem({
      fitnessSystem: this.fitnessSystem,
      gapRewardSystem: this.gapRewardSystem,
      difficultySystem: this.difficultySystem,
      spawnSystem: this.spawnSystem,
      collisionSystem: this.collisionSystem,
      worldWidth: 1280,
      worldHeight: 720,
    });

    this.neuralInputBuilder = new NeuralInputBuilder({
      worldWidth: 1280,
      worldHeight: 720,
    });

    this.keyboard = new KeyboardController();
    this.humanController = new PlayerKeyboardController(this.keyboard);

    this.populationSize = 350;
    this.brainArchitecture = [14, 12, 8, 2];
    this.brainActivations = ["tanh", "tanh", "tanh"];

    this.evolutionSystem = new EvolutionSystem({
      populationSize: this.populationSize,
      batchSize: this.populationSize,
      architecture: this.brainArchitecture,
      activations: this.brainActivations,
      eliteSurvivalRate: 0.10,
      breedingPoolRate: 0.25,
      offspringRate: 0.50,
      randomRate: 0.40,
      mutationRate: 0.10,
      mutationScale: 0.15,
      biasMutationScale: 0.15,
      seed: 1337,
    });

    this.actors = [];
    this.featuredActor = null;
    this.currentGenerationNumber = 0;

    this.playerFish = null;
    this.playerTrial = null;
    this.playerLastRayResults = [];
    this.playerLastCurrent = { x: 0, y: 0 };
    this.playerLastEnvironment = this.baseEnvironmentConfig;

    this.controllerModeOrder = ["human", "fish"];
    this.controllerMode = "fish";

    this.debugLayer = new Container();
    this.app.stage.addChild(this.debugLayer);

    this.rayDebug = new Graphics();
    this.debugLayer.addChild(this.rayDebug);

    this.uiLayer = new Container();
    this.app.stage.addChild(this.uiLayer);

    this.hudOverlay = new HudOverlay({ width: 1280, height: 720 });
    this.uiLayer.addChild(this.hudOverlay.root);

    this.brainOverlay = new BrainOverlay({
      width: 1280,
      height: 720,
      architecture: this.brainArchitecture,
      outputLabels: ["thrust X", "thrust Y"],
    });
    this.uiLayer.addChild(this.brainOverlay.root);

    const logoTexture = Texture.from("assets/FloopyFish_logo.png");
    this.hudOverlay.setLogoTexture(logoTexture);

    const modeIconsTexture = Texture.from("assets/Player_Mode_icons.png");
    this.hudOverlay.setModeIconTextureStrip(modeIconsTexture, ["human", "fish", "bot"]);
    this.hudOverlay.setMode(this.controllerMode);
    this.hudOverlay.onModeButtonPressed = () => {
      this.cycleControllerMode();
    };

    this.lastRayResults = [];
    this.time = 0;
    this.causticsTime = 0;

    this.startFirstGeneration();
    this.startNewPlayerTrial();
    this.updateModeVisibility();
  }

  startFirstGeneration() {
    const genomes = this.evolutionSystem.initializePopulation();
    this.prepareGenomesForEvaluation(genomes);
    this.spawnGenerationFromGenomes(genomes);
    this.currentGenerationNumber = this.evolutionSystem.generationIndex;
  }

  prepareGenomesForEvaluation(genomes) {
    for (const genome of genomes) {
      genome.fitness = Number.NaN;
    }
  }

  clearActors() {
    for (const actor of this.actors) {
      if (actor?.fish?.sprite?.parent) {
        actor.fish.sprite.parent.removeChild(actor.fish.sprite);
      }
    }

    this.actors = [];
    this.featuredActor = null;
  }

  spawnGenerationFromGenomes(genomes) {
    this.clearActors();

    this.actors = genomes.map((genome) => this.createActorForGenome(genome));
    this.featuredActor = this.getFeaturedActor();
    this.lastRayResults = this.featuredActor?.lastRayResults ?? [];
    this.updateModeVisibility();
  }

  createActorForGenome(genome) {
    const safeSpawn = this.spawnSystem.getSafeLoopSpawn(12);
    const fish = new Fish(safeSpawn.x, safeSpawn.y);

    this.world.addChild(fish.sprite);

    const controller = new FishController({
      inputBuilder: this.neuralInputBuilder,
      brain: genome.brain,
    });

    const trial = createTrialState(fish.position.x, fish.position.y);

    return {
      genome,
      fish,
      controller,
      trial,
      lastRayResults: [],
      lastCurrent: { x: 0, y: 0 },
      lastEnvironment: this.baseEnvironmentConfig,
      fitnessRecorded: false,
    };
  }

  startNewPlayerTrial() {
    if (!this.playerFish) {
      const safeSpawn = this.spawnSystem.getSafeLoopSpawn(12);
      this.playerFish = new Fish(safeSpawn.x, safeSpawn.y);
      this.world.addChild(this.playerFish.sprite);
    }

    const safeSpawn = this.spawnSystem.getSafeLoopSpawn(this.playerFish.radius);
    this.playerFish.resetForLoop(safeSpawn.x, safeSpawn.y);
    this.playerTrial = createTrialState(this.playerFish.position.x, this.playerFish.position.y);
    this.playerLastRayResults = [];
    this.playerLastCurrent = { x: 0, y: 0 };
    this.playerLastEnvironment = this.baseEnvironmentConfig;

    this.updateModeVisibility();
  }

  updateModeVisibility() {
    const showPopulation = this.controllerMode === "fish";
    const showPlayer = this.controllerMode === "human";

    for (const actor of this.actors) {
      actor.fish.sprite.visible = showPopulation;
    }

    if (this.playerFish) {
      this.playerFish.sprite.visible = showPlayer;
    }
  }

  cycleControllerMode() {
    const currentIndex = this.controllerModeOrder.indexOf(this.controllerMode);
    const nextIndex = (currentIndex + 1) % this.controllerModeOrder.length;
    this.controllerMode = this.controllerModeOrder[nextIndex];
    this.hudOverlay.setMode(this.controllerMode);
    this.updateModeVisibility();
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
    const coralSpeed = environment?.coralMotionSpeed ?? 1;
    const waveAmp = environment?.waveAmplitude ?? 1;

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

  getFeaturedActor() {
    if (!this.actors.length) {
      return null;
    }

    let bestActor = this.actors[0];
    let bestFitness = Number.isFinite(bestActor.trial?.fitness) ? bestActor.trial.fitness : -Infinity;

    for (const actor of this.actors) {
      const fitness = Number.isFinite(actor.trial?.fitness) ? actor.trial.fitness : -Infinity;
      if (fitness > bestFitness) {
        bestFitness = fitness;
        bestActor = actor;
      }
    }

    return bestActor;
  }

  updateActor(actor, delta) {
    const environment = this.trialSystem.getEnvironment(this.baseEnvironmentConfig, actor.trial);
    actor.lastEnvironment = environment;

    this.currentSystem.setEnvironment(environment);

    const current = this.currentSystem.getForce(
      actor.fish.position.x,
      actor.fish.position.y,
      this.time
    );

    actor.lastCurrent = current;
    actor.lastRayResults = this.sensorSystem.getVisionReadings(actor.fish);

    if (actor.trial.alive) {
      actor.controller.update({
        fish: actor.fish,
        rayResults: actor.lastRayResults,
        current,
        trial: actor.trial,
      });

      actor.fish.update(delta, actor.controller, current);
    } else if (actor.trial.isDying) {
      actor.fish.updateDeadFloat(delta, current);
    }

    this.trialSystem.update(actor.fish, actor.trial);

    if (actor.trial.deathResolved && !actor.fitnessRecorded) {
      actor.fitnessRecorded = true;
      this.evolutionSystem.recordFitness(actor.genome.id, actor.trial.fitness);
    }
  }

  updateHumanMode(delta) {
    if (!this.playerFish || !this.playerTrial) {
      return;
    }

    const environment = this.trialSystem.getEnvironment(this.baseEnvironmentConfig, this.playerTrial);
    this.playerLastEnvironment = environment;

    this.currentSystem.setEnvironment(environment);

    const current = this.currentSystem.getForce(
      this.playerFish.position.x,
      this.playerFish.position.y,
      this.time
    );

    this.playerLastCurrent = current;
    this.playerLastRayResults = this.sensorSystem.getVisionReadings(this.playerFish);

    const playerInputs = this.neuralInputBuilder.build({
      fish: this.playerFish,
      rayResults: this.playerLastRayResults,
      current,
    });

    this.humanController.lastInputs = playerInputs;

    if (this.playerTrial.alive) {
      this.humanController.update({
        fish: this.playerFish,
        rayResults: this.playerLastRayResults,
        current,
        trial: this.playerTrial,
      });

      this.playerFish.update(delta, this.humanController, current);
    } else if (this.playerTrial.isDying) {
      this.playerFish.updateDeadFloat(delta, current);
    }

    this.trialSystem.update(this.playerFish, this.playerTrial);

    this.lastRayResults = this.playerLastRayResults;
    this.drawRayDebug(this.lastRayResults);
    this.updateEnvironmentVisuals(environment, delta);

    this.hudOverlay.update({
      score: this.playerTrial.fitness,
      loopCount: this.playerTrial.loopsCompleted,
      mode: "human",
    });

    this.brainOverlay.update({
      architecture: this.brainArchitecture,
      inputs: this.humanController.lastInputs ?? new Array(14).fill(0),
      outputs: this.humanController.lastOutputs ?? [0, 0],
    });

    if (this.playerTrial.deathResolved) {
      this.startNewPlayerTrial();
    }
  }

  isCurrentGenerationFinished() {
    return this.actors.length > 0 && this.actors.every((actor) => actor.fitnessRecorded);
  }

  startNextGeneration() {
    const previousSummary = {
      generation: this.evolutionSystem.generationIndex,
      bestActor: this.getFeaturedActor(),
    };

    this.evolutionSystem.evolveNextGeneration();

    const nextGenomes = this.evolutionSystem.getGenerationGenomes();
    this.prepareGenomesForEvaluation(nextGenomes);
    this.spawnGenerationFromGenomes(nextGenomes);
    this.currentGenerationNumber = this.evolutionSystem.generationIndex;

    const summary = this.evolutionSystem.getLastGenerationSummary();
    console.log("generation evolved", {
      previousGeneration: previousSummary.generation,
      bestFitness: summary?.bestFitness ?? previousSummary.bestActor?.trial?.fitness ?? 0,
      medianFitness: summary?.medianFitness ?? 0,
      populationSize: summary?.populationSize ?? this.populationSize,
      eliteCount: summary?.eliteCount ?? 0,
      offspringCount: summary?.offspringCount ?? 0,
      randomCount: summary?.randomCount ?? 0,
      nextGeneration: this.currentGenerationNumber,
    });
  }

  updateFishMode(delta) {
    this.spawnSystem.update(delta);

    for (const actor of this.actors) {
      this.updateActor(actor, delta);
    }

    this.featuredActor = this.getFeaturedActor();

    if (this.featuredActor) {
      this.lastRayResults = this.featuredActor.lastRayResults;
      this.drawRayDebug(this.lastRayResults);
      this.updateEnvironmentVisuals(this.featuredActor.lastEnvironment, delta);

      this.hudOverlay.update({
        score: this.featuredActor.trial.fitness,
        loopCount: this.featuredActor.trial.loopsCompleted,
        mode: "fish",
      });

      this.brainOverlay.update({
        architecture: this.featuredActor.genome.brain.architecture,
        inputs: this.featuredActor.controller.lastInputs ?? new Array(14).fill(0),
        outputs: this.featuredActor.controller.lastOutputs ?? [0, 0],
      });
    } else {
      this.drawRayDebug([]);
      this.updateEnvironmentVisuals(this.baseEnvironmentConfig, delta);
    }

    if (this.isCurrentGenerationFinished()) {
      this.startNextGeneration();
    }
  }

  update(delta) {
    this.time += delta * 0.01;

    if (this.controllerMode === "human") {
      this.updateHumanMode(delta);
      return;
    }

    this.updateFishMode(delta);
  }
}