export class DifficultySystem {
    getGapCurrentMultiplier(loopNumber) {
        const startingMultiplier = 0.60; // 40% easier on first loop
        const loopStep = 0.12;
        return startingMultiplier + loopNumber * loopStep;
    }

    getFarRightCurrentMultiplier(loopNumber) {
        const startingMultiplier = 0.60; // 40% easier on first loop
        const loopStep = 0.20;
        return startingMultiplier + loopNumber * loopStep;
    }

    getCoralMotionSpeedMultiplier(loopNumber) {
        const startingMultiplier = 0.60; // 40% slower on first loop
        const loopStep = 0.10;
        return startingMultiplier + loopNumber * loopStep;
    }

    getWaveAmplitudeMultiplier(loopNumber) {
        const startingMultiplier = 0.60; // calmer first loop
        const loopStep = 0.14;
        return startingMultiplier + loopNumber * loopStep;
    }

    getLoopCompletionReward(loopNumber) {
        const baseReward = 120;
        const stepReward = 50;
        return baseReward + loopNumber * stepReward;
    }

    getGapPassReward(loopNumber) {
        const baseReward = 20;
        const stepReward = 6;
        return baseReward + loopNumber * stepReward;
    }

    getEnvironment(loopNumber, baseConfig) {
        return {
            gapCurrentForce:
                baseConfig.gapCurrentForce * this.getGapCurrentMultiplier(loopNumber),

            farRightCurrentForce:
                baseConfig.farRightCurrentForce *
                this.getFarRightCurrentMultiplier(loopNumber),

            coralMotionSpeed:
                baseConfig.coralMotionSpeed *
                this.getCoralMotionSpeedMultiplier(loopNumber),

            waveAmplitude:
                baseConfig.waveAmplitude *
                this.getWaveAmplitudeMultiplier(loopNumber),
        };
    }
}