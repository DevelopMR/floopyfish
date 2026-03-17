export class ReefCollisionSystem {
    constructor(spawnSystem) {
        this.spawnSystem = spawnSystem;
    }

    checkFishCollision(fish) {
        const fishX = fish.position.x;
        const fishY = fish.position.y;

        const reefGen = this.spawnSystem.reefGen;

        for (const seg of this.spawnSystem.segments) {
            const left = seg.x;
            const right = seg.x + seg.width;

            if (fishX < left || fishX > right) {
                continue;
            }

            const localX = fishX - left;

            if (localX > reefGen.coralBodyWidth) {
                continue;
            }

            const index = Math.floor(localX / reefGen.sampleStep);
            const top = seg.topProfile[index]?.y ?? 0;
            const bottom = seg.bottomProfile[index]?.y ?? reefGen.maxHeight;

            if (fishY < top || fishY > bottom) {
                return true;
            }
        }

        return false;
    }
}