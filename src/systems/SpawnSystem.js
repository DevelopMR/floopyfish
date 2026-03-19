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
        const pulse = 0.84 + Math.sin(phase * 1.7) * 0.36;
        const shimmer = 0.92 + Math.sin(phase * 1.25 + 1.4) * 0.08;

        pressure.alpha = pulse;
        pressure.scale.y = shimmer;

        // very slight vertical breathing
        pressure.y = Math.sin(phase * 1.15) * 2.5;

        // optional streak drift feel
        if (pressure.pressureStreaks) {
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

    cleanupSegments() {
        const cutoff = -this.spawnSpacing;

        this.segments = this.segments.filter(seg => {
            if (seg.x < cutoff) {
                this.container.removeChild(seg.topGraphic);
                this.container.removeChild(seg.pressureGraphic);
                this.container.removeChild(seg.bottomGraphic);

                return false;
            }

            return true;
        });
    }
}