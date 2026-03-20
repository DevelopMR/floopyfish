export class ScriptedController {
    constructor({ worldWidth = 1280, worldHeight = 720 } = {}) {
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;

        this.lastInputs = new Array(14).fill(0);
        this.lastOutputs = [0, 0];
    }

    update({ fish, rayResults, current }) {
        const rays = (rayResults ?? []).map((ray) => ray.normalizedDistance ?? 1);
        while (rays.length < 8) {
            rays.push(1);
        }

        const frontClearance = (rays[3] + rays[4]) * 0.5;
        const upperClearance = (rays[2] + rays[1]) * 0.5;
        const lowerClearance = (rays[5] + rays[6]) * 0.5;

        const yNorm = this.clamp01(fish.position.y / this.worldHeight);
        const centerBias = 0.5 - yNorm;
        const verticalBias = lowerClearance - upperClearance;
        const currentYSigned = this.clamp(current?.y ?? 0, -1, 1);

        const thrustX = this.tanh((frontClearance * 1.4) - 0.5) * 0.35;
        const thrustY = this.tanh((verticalBias * 1.8) + (centerBias * 0.9) - (currentYSigned * 0.6)) * 0.35;

        this.lastOutputs = [thrustX, thrustY];
    }

    getOutput() {
        return {
            thrustX: this.lastOutputs[0],
            thrustY: this.lastOutputs[1],
        };
    }

    tanh(value) {
        return Math.tanh(value);
    }

    clamp01(value) {
        return Math.max(0, Math.min(1, value));
    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
}