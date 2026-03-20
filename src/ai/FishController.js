export class FishController {
    constructor({ inputBuilder } = {}) {
        this.inputBuilder = inputBuilder;

        this.lastInputs = new Array(14).fill(0);
        this.lastOutputs = [0, 0];
    }

    update({ fish, rayResults, current }) {
        if (!this.inputBuilder) {
            this.lastInputs = new Array(14).fill(0);
            this.lastOutputs = [0, 0];
            return;
        }

        const inputs = this.inputBuilder.build({
            fish,
            rayResults,
            current,
        });

        this.lastInputs = inputs;
        this.lastOutputs = this.forward(inputs);
    }

    getOutput() {
        return {
            thrustX: this.lastOutputs[0],
            thrustY: this.lastOutputs[1],
        };
    }

    forward(inputs) {
        const rays = inputs.slice(0, 8);
        const xNorm = inputs[8];
        const yNorm = inputs[9];
        const vyNorm = inputs[10];
        const rotationNorm = inputs[11];
        const currentXNorm = inputs[12];
        const currentYNorm = inputs[13];

        const frontClearance = (rays[3] + rays[4]) * 0.5;
        const upperClearance = (rays[2] + rays[1]) * 0.5;
        const lowerClearance = (rays[5] + rays[6]) * 0.5;

        const verticalBias = lowerClearance - upperClearance;
        const centerBias = 0.5 - yNorm;
        const verticalVelocitySigned = (vyNorm * 2) - 1;
        const currentXSigned = (currentXNorm * 2) - 1;
        const currentYSigned = (currentYNorm * 2) - 1;
        const rotationSigned = (rotationNorm * 2) - 1;

        const thrustX = this.tanh(
            (frontClearance * 1.8) +
            ((1 - xNorm) * 0.35) +
            (-currentXSigned * 1.2) -
            (Math.abs(rotationSigned) * 0.15) -
            0.9
        );

        const thrustY = this.tanh(
            (verticalBias * 1.8) +
            (centerBias * 0.9) +
            (-verticalVelocitySigned * 0.6) +
            (-currentYSigned * 0.8)
        );

        return [thrustX * 0.35, thrustY * 0.35];
    }

    tanh(value) {
        return Math.tanh(value);
    }
}