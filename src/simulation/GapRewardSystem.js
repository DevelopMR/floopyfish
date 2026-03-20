export class GapRewardSystem {
    constructor(fitnessSystem) {
        this.fitnessSystem = fitnessSystem;
    }

    getSegmentRewardCheckX(seg) {
        return seg.x + seg.width * 0.5;
    }

    getSegmentGapAtSample(seg) {
        const sampleIndex = Math.max(
            0,
            Math.min(
                seg.topProfile.length - 1,
                Math.floor(seg.topProfile.length * 0.5)
            )
        );

        const top = seg.topProfile[sampleIndex]?.y ?? 0;
        const bottom = seg.bottomProfile[sampleIndex]?.y ?? 720;

        return { top, bottom };
    }

    update(fish, trial, segments) {
        if (!trial.alive) {
            return;
        }

        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            const segmentId = `${i}:${Math.round(seg.x)}`;

            if (trial.passedSegments.has(segmentId)) {
                continue;
            }

            const rewardCheckX = this.getSegmentRewardCheckX(seg);

            if (fish.position.x < rewardCheckX) {
                continue;
            }

            const gap = this.getSegmentGapAtSample(seg);
            const insideGap =
                fish.position.y >= gap.top &&
                fish.position.y <= gap.bottom;

            if (!insideGap) {
                continue;
            }

            trial.passedSegments.add(segmentId);
            this.fitnessSystem.rewardGapPass(trial);
        }
    }
}