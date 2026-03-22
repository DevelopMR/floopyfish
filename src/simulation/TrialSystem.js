import { killTrial, resetLoopState, updateDeathState } from "./TrialState.js";

export class TrialSystem {
    constructor({
        fitnessSystem,
        gapRewardSystem,
        difficultySystem,
        spawnSystem,
        collisionSystem,
        worldWidth,
        worldHeight,
    }) {
        this.fitnessSystem = fitnessSystem;
        this.gapRewardSystem = gapRewardSystem;
        this.difficultySystem = difficultySystem;
        this.spawnSystem = spawnSystem;
        this.collisionSystem = collisionSystem;

        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;

        this.loopCompleteMargin = 30;
        this.maxFramesWithoutProgress = 300;
    }

    isOutOfBounds(fish) {
        return fish.position.y < -20 || fish.position.y > this.worldHeight + 20;
    }

    isInLoopCompleteZone(fish) {
        return fish.position.x >= this.worldWidth - this.loopCompleteMargin;
    }

    handleLoopCompletion(fish, trial) {
        trial.loopsCompleted += 1;
        this.fitnessSystem.rewardLoopCompletion(trial);

        const safeSpawn = this.spawnSystem.getSafeLoopSpawn(fish.radius);
        fish.resetForLoop(safeSpawn.x, safeSpawn.y);

        resetLoopState(trial, fish.position.x);
    }

    update(fish, trial) {
        if (trial.isDying) {
            updateDeathState(trial);
            return;
        }

        if (!trial.alive) {
            return;
        }

        trial.ageFrames += 1;
        trial.loopFrames += 1;

        this.fitnessSystem.updateSurvivalFitness(trial);
        this.fitnessSystem.updateProgressFitness(trial, fish.position.x);
        this.gapRewardSystem.update(fish, trial, this.spawnSystem.segments);

        if (this.collisionSystem.checkFishCollision(fish)) {
            killTrial(trial);
            return;
        }

        if (this.isOutOfBounds(fish)) {
            killTrial(trial);
            return;
        }

        if (trial.framesSinceProgress >= this.maxFramesWithoutProgress) {
            killTrial(trial);
            return;
        }

        if (this.isInLoopCompleteZone(fish)) {
            this.handleLoopCompletion(fish, trial);
        }
    }

    getEnvironment(baseConfig, trial) {
        return this.difficultySystem.getEnvironment(
            trial.loopsCompleted,
            baseConfig
        );
    }
}