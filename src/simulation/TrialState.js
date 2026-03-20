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

        isDying: false,
        deathFrames: 0,
        deathFloatFrames: 240, // ~4 seconds at 60 fps
        deathResolved: false,
    };
}

export function resetLoopState(trial, fishX) {
    trial.loopFrames = 0;
    trial.furthestX = fishX;
    trial.framesSinceProgress = 0;
    trial.passedSegments.clear();
}

export function beginDeath(trial) {
    if (trial.isDying || trial.deathResolved) {
        return;
    }

    trial.alive = false;
    trial.isDying = true;
    trial.deathFrames = 0;
}

export function updateDeathState(trial) {
    if (!trial.isDying || trial.deathResolved) {
        return;
    }

    trial.deathFrames += 1;

    if (trial.deathFrames >= trial.deathFloatFrames) {
        trial.isDying = false;
        trial.deathResolved = true;
    }
}

export function killTrial(trial) {
    beginDeath(trial);
}