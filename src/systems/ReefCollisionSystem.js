export class ReefCollisionSystem {
    constructor(spawnSystem) {
        this.spawnSystem = spawnSystem;
    }

    getProfileIndex(localX, reefGen, profileLength) {
        const rawIndex = Math.floor(localX / reefGen.sampleStep);
        return Math.max(0, Math.min(profileLength - 1, rawIndex));
    }

    isPointInCoral(x, y) {
        const reefGen = this.spawnSystem.reefGen;

        for (const seg of this.spawnSystem.segments) {
            const left = seg.x;
            const right = seg.x + seg.width;

            if (x < left || x > right) {
                continue;
            }

            const localX = x - left;

            // Safe seam area on the right side of each segment
            if (localX > reefGen.coralBodyWidth) {
                return false;
            }

            const topIndex = this.getProfileIndex(localX, reefGen, seg.topProfile.length);
            const bottomIndex = this.getProfileIndex(localX, reefGen, seg.bottomProfile.length);

            const top = seg.topProfile[topIndex]?.y ?? 0;
            const bottom = seg.bottomProfile[bottomIndex]?.y ?? reefGen.maxHeight;

            if (y < top || y > bottom) {
                return true;
            }

            return false;
        }

        return false;
    }

    checkFishCollision(fish) {
        return this.isPointInCoral(fish.position.x, fish.position.y);
    }
}