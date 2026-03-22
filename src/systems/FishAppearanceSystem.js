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

        this.familyPalette = {
            base: {
                tint: 0xffffff,
                textureIndex: this.baseIndex,
                alpha: 1,
                brightness: null,
            },
            hero: {
                tint: 0x58b8ff,
                textureIndex: this.baseIndex,
                alpha: 1,
                brightness: 1.03,
            },
            wild: {
                tint: 0x7cf2c3,
                textureIndex: this.baseIndex,
                alpha: 1,
                brightness: 1.02,
            },
            champion: {
                tint: 0xffd54a,
                textureIndex: this.baseIndex,
                alpha: 1,
                brightness: 1.05,
            },
            elite: {
                tint: 0xb86cff,
                textureIndex: this.baseIndex,
                alpha: 1,
                brightness: 1.04,
            },
        };
    }

    initialize() {
        const sheetTexture = Texture.from(this.sheetPath);
        const textureSource = sheetTexture.source;
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
                        source: textureSource,
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
        const resolved = this.resolveAppearance({
            baseIconIndex: appearance.baseIconIndex ?? this.baseIndex,
            colorFamily: appearance.colorFamily ?? "base",
            lineageAge: appearance.lineageAge ?? 0,
            heroEvent: appearance.heroEvent ?? null,
            isHeroLine: appearance.isHeroLine ?? false,
            wildcardFamily: appearance.wildcardFamily ?? null,
        });

        this.applyResolvedAppearance(fish, resolved);
    }

    applyGhostAppearance(fish) {
        const ghostFilter = new ColorMatrixFilter();
        ghostFilter.brightness(1.05, false);

        fish.setTexture(this.getGhostTexture());
        fish.sprite.alpha = 0.55;
        fish.sprite.tint = 0xddeeff;
        fish.sprite.filters = [ghostFilter];
    }

    applyGenomeAppearance(fish, genome) {
        const appearance = genome?.appearance ?? {};
        const resolved = this.resolveAppearance(appearance);
        this.applyResolvedAppearance(fish, resolved);
        return resolved;
    }

    applyLineageAppearance(fish, lineageState = {}) {
        const normalized = this.normalizeLegacyLineageState(lineageState);
        const resolved = this.resolveAppearance(normalized);
        this.applyResolvedAppearance(fish, resolved);
        return resolved;
    }

    normalizeLegacyLineageState(lineageState = {}) {
        const {
            wrapsUnlocked = 0,
            isElite = false,
            isChampion = false,
        } = lineageState;

        if (isChampion) {
            return {
                baseIconIndex: this.baseIndex,
                colorFamily: "champion",
                lineageAge: 0,
                heroEvent: null,
                isHeroLine: true,
                wildcardFamily: null,
            };
        }

        if (isElite) {
            return {
                baseIconIndex: this.baseIndex,
                colorFamily: "elite",
                lineageAge: 0,
                heroEvent: null,
                isHeroLine: true,
                wildcardFamily: null,
            };
        }

        if (wrapsUnlocked >= 3) {
            return {
                baseIconIndex: this.baseIndex,
                colorFamily: "wild",
                lineageAge: 2,
                heroEvent: null,
                isHeroLine: false,
                wildcardFamily: "legacy-wrap-3",
            };
        }

        if (wrapsUnlocked >= 1) {
            return {
                baseIconIndex: this.baseIndex,
                colorFamily: "hero",
                lineageAge: 1,
                heroEvent: null,
                isHeroLine: false,
                wildcardFamily: "legacy-wrap-1",
            };
        }

        return {
            baseIconIndex: this.baseIndex,
            colorFamily: "base",
            lineageAge: 0,
            heroEvent: null,
            isHeroLine: false,
            wildcardFamily: null,
        };
    }

    resolveAppearance(appearance = {}) {
        const normalized = this.normalizeAppearanceData(appearance);
        const palette = this.resolvePalette(normalized);
        const textureIndex = this.resolveTextureIndex(normalized, palette);
        const tint = this.resolveTint(normalized, palette);
        const alpha = palette.alpha ?? 1;
        const filters = this.buildFilters(normalized, palette);

        return {
            textureIndex,
            tint,
            alpha,
            filters,
            normalizedAppearance: normalized,
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
            colorFamily:
                typeof appearance.colorFamily === "string" && appearance.colorFamily.trim().length > 0
                    ? appearance.colorFamily.trim()
                    : "base",
            lineageAge:
                Number.isFinite(appearance.lineageAge) && appearance.lineageAge > 0
                    ? Math.floor(appearance.lineageAge)
                    : 0,
            wildcardFamily:
                typeof appearance.wildcardFamily === "string" && appearance.wildcardFamily.trim().length > 0
                    ? appearance.wildcardFamily.trim()
                    : null,
        };
    }

    resolvePalette(appearance) {
        const family = appearance.colorFamily;

        if (this.familyPalette[family]) {
            return this.familyPalette[family];
        }

        return this.familyPalette.base;
    }

    resolveTextureIndex(appearance, palette) {
        if (Number.isInteger(palette.textureIndex)) {
            return palette.textureIndex;
        }

        return appearance.baseIconIndex;
    }

    resolveTint(appearance, palette) {
        let tint = palette.tint ?? 0xffffff;

        if (appearance.heroEvent === "firstLooper") {
            tint = this.blendTint(tint, 0x9ad8ff, 0.35);
        }

        if (appearance.isHeroLine && appearance.lineageAge >= 1) {
            tint = this.blendTint(tint, 0xc7f0ff, Math.min(0.14 + appearance.lineageAge * 0.03, 0.30));
        }

        if (appearance.lineageAge >= 3) {
            tint = this.blendTint(tint, 0xf6e7b7, Math.min((appearance.lineageAge - 2) * 0.05, 0.22));
        }

        if (appearance.wildcardFamily) {
            tint = this.blendTint(tint, 0x7cf2c3, 0.18);
        }

        return tint;
    }

    buildFilters(appearance, palette) {
        const filters = [];

        const brightnessStrength = this.resolveBrightness(appearance, palette);
        if (brightnessStrength !== null) {
            const brightnessFilter = new ColorMatrixFilter();
            brightnessFilter.brightness(brightnessStrength, false);
            filters.push(brightnessFilter);
        }

        return filters;
    }

    resolveBrightness(appearance, palette) {
        let brightness = palette.brightness ?? null;

        if (appearance.heroEvent === "firstLooper") {
            brightness = Math.max(brightness ?? 1, 1.08);
        } else if (appearance.isHeroLine && appearance.lineageAge >= 2) {
            brightness = Math.max(brightness ?? 1, Math.min(1.02 + appearance.lineageAge * 0.01, 1.08));
        }

        return brightness;
    }

    applyResolvedAppearance(fish, resolved) {
        fish.setTexture(this.getTexture(resolved.textureIndex));
        fish.sprite.alpha = resolved.alpha;
        fish.sprite.tint = resolved.tint;
        fish.sprite.filters = resolved.filters;
    }

    blendTint(baseTint, targetTint, amount) {
        const clampedAmount = Math.max(0, Math.min(1, amount));

        const baseR = (baseTint >> 16) & 0xff;
        const baseG = (baseTint >> 8) & 0xff;
        const baseB = baseTint & 0xff;

        const targetR = (targetTint >> 16) & 0xff;
        const targetG = (targetTint >> 8) & 0xff;
        const targetB = targetTint & 0xff;

        const mixedR = Math.round(baseR + (targetR - baseR) * clampedAmount);
        const mixedG = Math.round(baseG + (targetG - baseG) * clampedAmount);
        const mixedB = Math.round(baseB + (targetB - baseB) * clampedAmount);

        return (mixedR << 16) | (mixedG << 8) | mixedB;
    }
}