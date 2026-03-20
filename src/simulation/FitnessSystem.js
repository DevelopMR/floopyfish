export class FitnessSystem {
    constructor(difficultySystem) {
        this.difficultySystem = difficultySystem;
        this.survivalRewardPerFrame = 0.01;
        this.progressRewardScale = 0.02;
    }

    updateSurvivalFitness(trial) {
        if (!trial.alive) return;
        trial.fitness += this.survivalRewardPerFrame;
    }

    updateProgressFitness(trial, fishX) {
        if (!trial.alive) return;

        if (fishX > trial.furthestX) {
            const delta = fishX - trial.furthestX;
            trial.fitness += delta * this.progressRewardScale;
            trial.furthestX = fishX;
            trial.framesSinceProgress = 0;
        } else {
            trial.framesSinceProgress += 1;
        }
    }

    rewardGapPass(trial) {
        if (!trial.alive) return;

        const reward = this.difficultySystem.getGapPassReward(trial.loopsCompleted);
        trial.fitness += reward;
        trial.totalGapPasses += 1;
    }

    rewardLoopCompletion(trial) {
        if (!trial.alive) return;

        const reward = this.difficultySystem.getLoopCompletionReward(
            trial.loopsCompleted
        );

        trial.fitness += reward;
    }
}