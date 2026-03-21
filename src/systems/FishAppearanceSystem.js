import { Rectangle, Texture, ColorMatrixFilter } from "pixi.js";

export class FishAppearanceSystem {
    constructor(options = {}) {
        this.sheetPath = options.sheetPath ?? "assets/Fish-Icon_set.png";
        this.layout = options.layout ?? {
            columns: 3,
            rows: 3,
        };

        this.baseIndex = options.baseIndex ?? 0;
        this.ghostIndex = options.ghostIndex ?? 8;

        this.textures = [];
    }

    initialize() {
        const sheetTexture = Texture.from(this.sheetPath);
        const baseTexture = sheetTexture.baseTexture;

        const frameWidth = Math.floor(sheetTexture.width / this.layout.columns);
        const frameHeight = Math.floor(sheetTexture.height / this.layout.rows);

        this.textures = [];

        for (let row = 0; row < this.layout.rows; row += 1) {
            for (let col = 0; col < this.layout.columns; col += 1) {
                const frame = new Rectangle(
                    col * frameWidth,
                    row * frameHeight,
                    frameWidth,
                    frameHeight
                );

                this.textures.push(
                    new Texture({
                        source: baseTexture,
                        frame,
                    })
                );
            }
        }
    }

    getTexture(index) {
        return this.textures[index] ?? this.textures[this.baseIndex] ?? Texture.WHITE;
    }

    getBaseTexture() {
        return this.getTexture(this.baseIndex);
    }

    getGhostTexture() {
        return this.getTexture(this.ghostIndex);
    }

    applyBaseAppearance(fish, appearance = {}) {
        fish.sprite.texture = this.getBaseTexture();
        fish.sprite.alpha = 1;
        fish.sprite.tint = appearance.tint ?? 0xffffff;
        fish.sprite.filters = appearance.filters ?? [];
    }

    applyGhostAppearance(fish) {
        const ghostFilter = new ColorMatrixFilter();
        ghostFilter.brightness(1.05, false);

        fish.sprite.texture = this.getGhostTexture();
        fish.sprite.alpha = 0.55;
        fish.sprite.tint = 0xddeeff;
        fish.sprite.filters = [ghostFilter];
    }

    applyLineageAppearance(fish, lineageState = {}) {
        const {
            wrapsUnlocked = 0,
            isElite = false,
            isChampion = false,
        } = lineageState;

        fish.sprite.texture = this.getBaseTexture();
        fish.sprite.alpha = 1;
        fish.sprite.filters = [];

        if (isChampion) {
            fish.sprite.tint = 0xffd54a;
            return;
        }

        if (isElite) {
            fish.sprite.tint = 0xb86cff;
            return;
        }

        if (wrapsUnlocked >= 3) {
            fish.sprite.tint = 0x57d66b;
            return;
        }

        if (wrapsUnlocked >= 1) {
            fish.sprite.tint = 0x58b8ff;
            return;
        }

        fish.sprite.tint = 0xffffff;
    }
}