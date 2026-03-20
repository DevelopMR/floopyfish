export class NeuralInputBuilder {
    constructor({
        worldWidth = 1280,
        worldHeight = 720,
        maxAbsVerticalVelocity = 8,
        maxAbsRotation = 0.55,
        maxAbsCurrentX = 0.5,
        maxAbsCurrentY = 0.25,
    } = {}) {
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.maxAbsVerticalVelocity = maxAbsVerticalVelocity;
        this.maxAbsRotation = maxAbsRotation;
        this.maxAbsCurrentX = maxAbsCurrentX;
        this.maxAbsCurrentY = maxAbsCurrentY;
    }

    build({ fish, rayResults, current }) {
        const rays = (rayResults ?? []).map((ray) => ray.normalizedDistance ?? 1);
        while (rays.length < 8) {
            rays.push(1);
        }

        const xNorm = this.clamp01(fish.position.x / this.worldWidth);
        const yNorm = this.clamp01(fish.position.y / this.worldHeight);

        const vyNorm = this.normalizeSigned(fish.velocity.y, this.maxAbsVerticalVelocity);
        const rotationNorm = this.normalizeSigned(
            fish.facingRotation ?? fish.sprite?.rotation ?? 0,
            this.maxAbsRotation
        );

        const currentXNorm = this.normalizeSigned(current?.x ?? 0, this.maxAbsCurrentX);
        const currentYNorm = this.normalizeSigned(current?.y ?? 0, this.maxAbsCurrentY);

        return [
            rays[0], rays[1], rays[2], rays[3],
            rays[4], rays[5], rays[6], rays[7],
            xNorm,
            yNorm,
            vyNorm,
            rotationNorm,
            currentXNorm,
            currentYNorm,
        ];
    }

    normalizeSigned(value, maxAbs) {
        const clamped = this.clamp(value, -maxAbs, maxAbs);
        return (clamped + maxAbs) / (maxAbs * 2);
    }

    clamp01(value) {
        return this.clamp(value, 0, 1);
    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
}