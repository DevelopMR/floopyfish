export function createTrialState(spawnX, spawnY) {
    return {
        alive: true,
        fitness: 0,

        ageFrames: 0,
        loopFrames: 0,

        spawnX,
        spawnY,

        loopsCompleted: 0,
        totalGapPasses: 0,

        furthestX: spawnX,
        framesSinceProgress: 0,

        passedSegments: new Set(),
    };
}

export function resetLoopState(trial, fishX) {
    trial.loopFrames = 0;
    trial.furthestX = fishX;
    trial.framesSinceProgress = 0;
    trial.passedSegments.clear();
}

export function killTrial(trial) {
    trial.alive = false;
}