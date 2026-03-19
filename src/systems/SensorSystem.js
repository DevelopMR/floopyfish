export class SensorSystem {
    constructor(collisionSystem) {
        this.collisionSystem = collisionSystem;

        this.maxDistance = 220;
        this.step = 6;

        this.rearRayOffsets = [
            -2.3562, // 45° behind, upper side
            2.3562, // 45° behind, lower side
        ];

        this.forwardRayOffsets = [
            -1.2217,
            -0.7330,
            -0.2443,
            0.2443,
            0.7330,
            1.2217,
        ];

        this.localRayOffsets = [
            ...this.rearRayOffsets,
            ...this.forwardRayOffsets,
        ];
    }

    castRay(startX, startY, angle) {
        for (let distance = this.step; distance <= this.maxDistance; distance += this.step) {
            const x = startX + Math.cos(angle) * distance;
            const y = startY + Math.sin(angle) * distance;

            if (this.collisionSystem.isPointInCoral(x, y)) {
                return {
                    startX,
                    startY,
                    endX: x,
                    endY: y,
                    distance,
                    normalizedDistance: Math.max(0, Math.min(1, distance / this.maxDistance)),
                    hit: true,
                    angle,
                };
            }
        }

        const endX = startX + Math.cos(angle) * this.maxDistance;
        const endY = startY + Math.sin(angle) * this.maxDistance;

        return {
            startX,
            startY,
            endX,
            endY,
            distance: this.maxDistance,
            normalizedDistance: 1,
            hit: false,
            angle,
        };
    }

    getVisionReadings(fish) {
        const startX = fish.position.x;
        const startY = fish.position.y;
        const facing = fish.facingRotation ?? fish.sprite.rotation ?? 0;

        return this.localRayOffsets.map((offset) => {
            const angle = facing + offset;
            return this.castRay(startX, startY, angle);
        });
    }
}