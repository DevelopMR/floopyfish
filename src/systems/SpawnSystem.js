import { ReefGenerator } from "./ReefGenerator.js";

export class SpawnSystem
{

    constructor(container)
    {

        this.container = container;

        this.reefGen = new ReefGenerator(777);

        this.segments = [];

        this.spawnX = 1280;

        this.scrollSpeed = 2.5;

        this.spawnSpacing = this.reefGen.segmentWidth;

    }

    update(delta)
    {

        const dx = this.scrollSpeed * delta;

        for (const seg of this.segments)
        {

            seg.x -= dx;

            seg.topGraphic.x = seg.x;
            seg.bottomGraphic.x = seg.x;

        }

        this.cleanupSegments();

        this.spawnIfNeeded();

    }

    spawnIfNeeded()
    {

        if (this.segments.length === 0)
        {
            this.spawnSegment(this.spawnX);
            return;
        }

        const last = this.segments[this.segments.length - 1];

        if (last.x < 1280 - this.spawnSpacing)
        {
            this.spawnSegment(last.x + this.spawnSpacing);
        }

    }

    spawnSegment(x)
    {

        const seg = this.reefGen.generateSegment(x);

        this.container.addChild(seg.topGraphic);
        this.container.addChild(seg.bottomGraphic);

        this.segments.push(seg);

    }

    cleanupSegments()
    {

        const cutoff = -this.spawnSpacing;

        this.segments = this.segments.filter(seg =>
        {

            if (seg.x < cutoff)
            {

                this.container.removeChild(seg.topGraphic);
                this.container.removeChild(seg.bottomGraphic);

                return false;

            }

            return true;

        });

    }

}