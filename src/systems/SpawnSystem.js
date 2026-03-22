import { ReefGenerator } from "./ReefGenerator.js";

export class SpawnSystem {
    constructor(container) {
        this.container = container;

        this.reefGen = new ReefGenerator(777);

        this.segments = [];

        this.spawnX = 1280;

        this.scrollSpeed = 2.5;

        this.spawnSpacing = this.reefGen.segmentWidth;

        this.pressureTime = 0;
    }

    update(delta) {
        const dx = this.scrollSpeed * delta;
        this.pressureTime += delta * 0.05;

        for (const seg of this.segments) {
            seg.x -= dx;

            seg.topGraphic.x = seg.x;
            seg.pressureGraphic.x = seg.x;
            seg.bottomGraphic.x = seg.x;

            this.animatePressureGraphic(seg, delta);
        }

        this.cleanupSegments();

        this.spawnIfNeeded();
    }

    animatePressureGraphic(seg, delta) {
        const pressure = seg.pressureGraphic;

        if (!pressure) {
            return;
        }

        const phase = this.pressureTime + (pressure.phase ?? 0);
        const pulse = 0.84 + Math.sin(phase * 1.7) * 0.16;

        pressure.alpha = pulse;

        pressure.scale.y = 0.985 + Math.sin(phase * 2.9 + 1.4) * 0.02;
        pressure.y = Math.sin(phase * 1.15) * 0.8;

        pressure.flowOffset ??= 0;
        pressure.flowOffset -= delta * 0.9;

        if (pressure.flowOffset < -18) {
            pressure.flowOffset += 18;
        }

        if (pressure.pressureStreaks) {
            pressure.pressureStreaks.x = pressure.flowOffset;
            pressure.pressureStreaks.alpha = 0.82 + Math.sin(phase * 2.4) * 0.18;
        }

        if (pressure.pressureGlow) {
            pressure.pressureGlow.alpha = 0.75 + Math.sin(phase * 1.6 + 0.7) * 0.12;
        }
    }

    spawnIfNeeded() {
        if (this.segments.length === 0) {
            this.spawnSegment(this.spawnX);
            return;
        }

        const last = this.segments[this.segments.length - 1];

        if (last.x < 1280 - this.spawnSpacing) {
            this.spawnSegment(last.x + this.spawnSpacing);
        }
    }

    spawnSegment(x) {
        const seg = this.reefGen.generateSegment(x);

        this.container.addChild(seg.topGraphic);
        this.container.addChild(seg.pressureGraphic);
        this.container.addChild(seg.bottomGraphic);

        this.segments.push(seg);
    }

    destroySegmentGraphics(seg) {
        const displayObjects = [seg.topGraphic, seg.pressureGraphic, seg.bottomGraphic];

        for (const displayObject of displayObjects) {
            if (!displayObject) {
                continue;
            }

            if (displayObject.parent) {
                displayObject.parent.removeChild(displayObject);
            }

            displayObject.destroy({ children: true });
        }
    }

    cleanupSegments() {
        const cutoff = -this.spawnSpacing;

        this.segments = this.segments.filter((seg) => {
            if (seg.x < cutoff) {
                this.destroySegmentGraphics(seg);
                return false;
            }

            return true;
        });
    }

    getLeftmostSegment() {
        if (this.segments.length === 0) {
            return null;
        }

        let leftmost = this.segments[0];

        for (const seg of this.segments) {
            if (seg.x < leftmost.x) {
                leftmost = seg;
            }
        }

        return leftmost;
    }

    getSafeLoopSpawn(fishRadius = 12) {
        const seg = this.getLeftmostSegment();

        if (!seg) {
            return { x: 160, y: 360 };
        }

        const sampleIndex = Math.max(
            0,
            Math.min(
                seg.topProfile.length - 1,
                Math.floor(seg.topProfile.length * 0.25)
            )
        );

        const top = seg.topProfile[sampleIndex]?.y ?? 220;
        const bottom = seg.bottomProfile[sampleIndex]?.y ?? 420;

        const gapCenterY = (top + bottom) * 0.5;
        const safePadding = fishRadius * 2;

        const minY = top + safePadding;
        const maxY = bottom - safePadding;

        return {
            x: seg.x + 40,
            y: Math.max(minY, Math.min(gapCenterY, maxY)),
        };
    }
}