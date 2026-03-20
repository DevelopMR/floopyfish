export class DifficultySystem {
    getGapCurrentMultiplier(loopNumber) {
        return 1 + loopNumber * 0.12;
    }

    getFarRightCurrentMultiplier(loopNumber) {
        return 1 + loopNumber * 0.20;
    }

    getCoralMotionSpeedMultiplier(loopNumber) {
        return 1 + loopNumber * 0.10;
    }

    getWaveAmplitudeMultiplier(loopNumber) {
        return 1 + loopNumber * 0.14;
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