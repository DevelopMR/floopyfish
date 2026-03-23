import { Rectangle, Texture, ColorMatrixFilter } from "pixi.js";

export class FishAppearanceSystem {
    constructor(options = {}) {
        this.sheetPath = options.sheetPath ?? "assets/Fish-Icon_set.png";
        this.layout = options.layout ?? { columns: 3, rows: 3 };

        this.baseIndex = options.baseIndex ?? 0;
        this.deadIndex = options.deadIndex ?? 5;   // fish #6 if counted 1..9
        this.ghostIndex = options.ghostIndex ?? 8;

        this.customFrames = Array.isArray(options.customFrames) ? options.customFrames : null;
        this.textures = [];
    }

    initialize() {
        const sheetTexture = Texture.from(this.sheetPath);
        const textureSource = sheetTexture.source;

        this.textures = [];

        if (this.customFrames && this.customFrames.length > 0) {
            for (const frameDef of this.customFrames) {
                const frame = new Rectangle(frameDef.x, frameDef.y, frameDef.width, frameDef.height);
                this.textures.push(new Texture({ source: textureSource, frame }));
            }
            return;
        }

        const frameWidth = Math.floor(sheetTexture.width / this.layout.columns);
        const frameHeight = Math.floor(sheetTexture.height / this.layout.rows);

        for (let row = 0; row < this.layout.rows; row += 1) {
            for (let col = 0; col < this.layout.columns; col += 1) {
                const frame = new Rectangle(
                    col * frameWidth,
                    row * frameHeight,
                    frameWidth,
                    frameHeight
                );

                this.textures.push(new Texture({ source: textureSource, frame }));
            }
        }
    }

    getTexture(index) {
        return this.textures[index] ?? this.textures[this.baseIndex] ?? Texture.WHITE;
    }

    getBaseTexture() {
        return this.getTexture(this.baseIndex);
    }

    getDeadTexture() {
        return this.getTexture(this.deadIndex);
    }

    getGhostTexture() {
        return this.getTexture(this.ghostIndex);
    }

    applyBaseAppearance(fish, appearance = {}) {
        const resolved = this.resolveAppearance(appearance);
        this.applyResolvedAppearance(fish, resolved);
    }

    applyGenomeAppearance(fish, genome) {
        const resolved = this.resolveAppearance(genome?.appearance ?? {});
        this.applyResolvedAppearance(fish, resolved);
        return resolved;
    }

    applyDeadAppearance(fish, genome = null) {
        const baseTint = genome?.appearance?.tintHex ?? 0xd9e1e8;
        const filter = new ColorMatrixFilter();
        filter.brightness(0.78, false);

        fish.setTexture(this.getDeadTexture());
        fish.sprite.alpha = 0.92;
        fish.sprite.tint = this.blendTint(baseTint, 0xe3edf4, 0.55);
        fish.sprite.filters = [filter];
    }

    applyGhostAppearance(fish) {
        const ghostFilter = new ColorMatrixFilter();
        ghostFilter.brightness(1.05, false);

        fish.setTexture(this.getGhostTexture());
        fish.sprite.alpha = 0.55;
        fish.sprite.tint = 0xddeeff;
        fish.sprite.filters = [ghostFilter];
    }

    resolveAppearance(appearance = {}) {
        const normalized = this.normalizeAppearanceData(appearance);
        const filters = [];

        const textureIndex = Number.isInteger(normalized.baseIconIndex)
            ? normalized.baseIconIndex
            : this.baseIndex;

        let tint = normalized.tintHex ?? 0xffffff;
        let alpha = 1;

        if (normalized.isHeroLine) {
            tint = this.blendTint(tint, 0xffffff, 0.08);
        }

        if (normalized.lineageAge > 0) {
            tint = this.blendTint(
                tint,
                0xffffff,
                Math.min(normalized.lineageAge * 0.015, 0.12)
            );
        }

        const brightness = this.resolveBrightness(normalized);
        if (brightness !== null) {
            const brightnessFilter = new ColorMatrixFilter();
            brightnessFilter.brightness(brightness, false);
            filters.push(brightnessFilter);
        }

        return {
            textureIndex,
            tint,
            alpha,
            filters,
        };
    }

    normalizeAppearanceData(appearance = {}) {
        return {
            baseIconIndex: Number.isInteger(appearance.baseIconIndex)
                ? appearance.baseIconIndex
                : this.baseIndex,
            heroEvent:
                typeof appearance.heroEvent === "string" && appearance.heroEvent.trim().length > 0
                    ? appearance.heroEvent.trim()
                    : null,
            isHeroLine: Boolean(appearance.isHeroLine),
            lineageAge:
                Number.isFinite(appearance.lineageAge) && appearance.lineageAge > 0
                    ? Math.floor(appearance.lineageAge)
                    : 0,
            tintHex:
                Number.isFinite(appearance.tintHex)
                    ? Math.max(0, Math.min(0xffffff, Math.floor(appearance.tintHex)))
                    : 0xffffff,
        };
    }

    resolveBrightness(appearance) {
        switch (appearance.heroEvent) {
            case "firstLooper":
                return 1.12;
            case "firstThreeWrap":
                return 1.14;
            case "clutchWrap":
                return 1.18;
            case "specialWrap":
                return 1.10;
            default:
                break;
        }

        if (appearance.isHeroLine) {
            return Math.min(1.03 + appearance.lineageAge * 0.01, 1.09);
        }

        return null;
    }

    applyResolvedAppearance(fish, resolved) {
        fish.setTexture(this.getTexture(resolved.textureIndex));
        fish.sprite.alpha = resolved.alpha;
        fish.sprite.tint = resolved.tint;
        fish.sprite.filters = resolved.filters;
    }

    blendTint(baseTint, targetTint, amount) {
        const alpha = Math.max(0, Math.min(1, amount));

        const baseR = (baseTint >> 16) & 0xff;
        const baseG = (baseTint >> 8) & 0xff;
        const baseB = baseTint & 0xff;

        const targetR = (targetTint >> 16) & 0xff;
        const targetG = (targetTint >> 8) & 0xff;
        const targetB = targetTint & 0xff;

        const mixedR = Math.round(baseR + (targetR - baseR) * alpha);
        const mixedG = Math.round(baseG + (targetG - baseG) * alpha);
        const mixedB = Math.round(baseB + (targetB - baseB) * alpha);

        return (mixedR << 16) | (mixedG << 8) | mixedB;
    }
}