import { Container, Graphics, Sprite, Texture, Rectangle } from "pixi.js";

class SeededRandom {
    constructor(seed) {
        this.seed = seed >>> 0;
    }

    next() {
        let t = (this.seed += 0x6D2B79F5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    range(min, max) {
        return min + (max - min) * this.next();
    }

    int(min, max) {
        return Math.floor(this.range(min, max + 1));
    }

    chance(probability) {
        return this.next() < probability;
    }

    sign() {
        return this.next() < 0.5 ? -1 : 1;
    }
}

export class ReefGenerator {
    constructor(seed = 12345) {
        this.random = new SeededRandom(seed);

        this.sampleStep = 4;
        this.metaballCount = 4;
        this.maxHeight = 720;

        this.fieldThreshold = 1.08;

        this.topColorMin = 0xe59aa1;
        this.topColorMax = 0xf2b0b6;

        this.bottomColorMin = 0xcf8bcf;
        this.bottomColorMax = 0xe1a3df;

        this.branchStrokeTop = 0xf7d6c9;
        this.branchStrokeBottom = 0xf2d3ff;

        this.segmentWidth = 260;
        this.seamWidth = 130;
        this.coralBodyWidth = this.segmentWidth - this.seamWidth;

        this.taperWidth = 48;
        this.taperStrength = 0.8;

        this.pressureBandAlpha = 0.16;
        this.pressureLineColor = 0xbfefff;
        this.pressureGlowColor = 0xe8fcff;

        this.coralSheetPath = "assets/Coral_texture_sheet.png";
        this.coralSheetColumns = 7;
    }

    enforceMinimumGap(topProfile, bottomProfile, minGap) {
        for (let i = 0; i < topProfile.length; i++) {
            const topY = topProfile[i].y;
            const bottomY = bottomProfile[i].y;
            const currentGap = bottomY - topY;

            if (currentGap < minGap) {
                const correction = (minGap - currentGap) * 0.5;
                topProfile[i].y -= correction;
                bottomProfile[i].y += correction;
            }
        }
    }

    generateSegment(xPosition) {
        const gapSize = this.random.range(120, 200);
        const gapCenter = this.random.range(175, 650);
        const topLimit = gapCenter - gapSize * 0.5;
        const bottomLimit = gapCenter + gapSize * 0.5;

        const topNodes = this.createBranchField(topLimit, true);
        const bottomNodes = this.createBranchField(bottomLimit, false);

        const topProfile = this.sampleSurfaceProfile(topNodes, true, topLimit);
        const bottomProfile = this.sampleSurfaceProfile(bottomNodes, false, bottomLimit);

        this.enforceMinimumGap(topProfile, bottomProfile, 130);

        const topGraphic = this.buildCoralContainer(topProfile, true, topLimit);
        const pressureGraphic = this.buildPressureDisplay(topProfile, bottomProfile);
        const bottomGraphic = this.buildCoralContainer(bottomProfile, false, bottomLimit);

        topGraphic.x = xPosition;
        pressureGraphic.x = xPosition;
        bottomGraphic.x = xPosition;

        return {
            x: xPosition,
            width: this.segmentWidth,
            topGraphic,
            pressureGraphic,
            bottomGraphic,
            topProfile,
            bottomProfile,
        };
    }

    buildPressureDisplay(topProfile, bottomProfile) {
        const container = new Container();

        const glow = new Graphics();
        const streaks = new Graphics();

        const points = Math.min(topProfile.length, bottomProfile.length);

        for (let i = 0; i < points - 1; i++) {
            const topA = topProfile[i];
            const botA = bottomProfile[i];
            const topB = topProfile[i + 1];
            const botB = bottomProfile[i + 1];

            const centerYA = (topA.y + botA.y) * 0.5;
            const centerYB = (topB.y + botB.y) * 0.5;

            const gapA = botA.y - topA.y;
            const gapB = botB.y - topB.y;
            const avgGap = (gapA + gapB) * 0.5;

            const tightness = 1 - this.clamp((avgGap - 120) / 100, 0, 1);
            const bandHalfHeight = Math.max(10, avgGap * (0.18 + tightness * 0.12));
            const alpha = this.pressureBandAlpha * (0.45 + tightness * 0.9);

            this.drawHorizontalFadedPressureBand(
                glow,
                topA.x,
                centerYA,
                topB.x,
                centerYB,
                bandHalfHeight,
                alpha
            );

            streaks.moveTo(topA.x, centerYA);
            streaks.lineTo(topB.x, centerYB);
            streaks.stroke({
                width: 1.5 + tightness * 1.5,
                color: this.pressureLineColor,
                alpha: 0.18 + tightness * 0.28,
            });

            const offset = Math.max(6, bandHalfHeight * 0.45);

            streaks.moveTo(topA.x, centerYA - offset);
            streaks.lineTo(topB.x, centerYB - offset);
            streaks.stroke({
                width: 1,
                color: this.pressureLineColor,
                alpha: 0.08 + tightness * 0.16,
            });

            streaks.moveTo(topA.x, centerYA + offset);
            streaks.lineTo(topB.x, centerYB + offset);
            streaks.stroke({
                width: 1,
                color: this.pressureLineColor,
                alpha: 0.08 + tightness * 0.16,
            });
        }

        container.addChild(glow);
        container.addChild(streaks);

        container.pressureGlow = glow;
        container.pressureStreaks = streaks;
        container.phase = this.random.range(0, Math.PI * 2);

        return container;
    }

    drawHorizontalFadedPressureBand(graphics, x0, y0, x1, y1, bandHalfHeight, baseAlpha) {
        const steps = 10;
        const layers = [
            { scale: 1.0, alpha: 0.16 },
            { scale: 0.72, alpha: 0.24 },
            { scale: 0.46, alpha: 0.34 },
            { scale: 0.24, alpha: 0.44 },
        ];

        for (let i = 0; i < steps; i++) {
            const t0 = i / steps;
            const t1 = (i + 1) / steps;

            const xa0 = this.lerp(x0, x1, t0);
            const xa1 = this.lerp(x0, x1, t1);

            const ya0 = this.lerp(y0, y1, t0);
            const ya1 = this.lerp(y0, y1, t1);

            const midT = (t0 + t1) * 0.5;

            let horizontalFade;
            if (midT < 0.5) {
                const rise = midT / 0.5;
                horizontalFade = rise * rise * (3 - 2 * rise);
            } else {
                const fall = (1 - midT) / 0.5;
                horizontalFade = fall * fall * (3 - 2 * fall);
            }

            for (const layer of layers) {
                const h = bandHalfHeight * layer.scale;
                const alpha = baseAlpha * horizontalFade * layer.alpha;

                if (alpha <= 0.001) {
                    continue;
                }

                const path = [
                    xa0, ya0 - h,
                    xa1, ya1 - h,
                    xa1, ya1 + h,
                    xa0, ya0 + h,
                ];

                graphics.poly(path).fill({
                    color: this.pressureGlowColor,
                    alpha,
                });
            }
        }
    }

    createBranchField(limit, isTop) {
        const nodes = [];

        const growthSign = isTop ? 1 : -1;
        const anchorY = isTop ? 0 : this.maxHeight;

        const availableDepth = isTop
            ? Math.max(36, limit - 16)
            : Math.max(36, this.maxHeight - limit - 16);

        const trunkCount = this.metaballCount;
        const rootCount = this.random.int(2, 3);

        for (let rootIndex = 0; rootIndex < rootCount; rootIndex++) {
            let x = this.random.range(28, this.coralBodyWidth - 28);
            let y = anchorY;

            for (let i = 0; i < trunkCount; i++) {
                const t = trunkCount === 1 ? 1 : i / (trunkCount - 1);

                const stepDepth = availableDepth * this.random.range(0.16, 0.28);
                const stepLateral = this.random.range(-14, 14);

                x = this.clamp(x + stepLateral, 14, this.coralBodyWidth - 14);
                y = this.clampDirectedY(y + stepDepth * growthSign, isTop, limit);

                const radius = this.lerp(26, 12, t) * this.random.range(0.95, 1.12);
                nodes.push({ x, y, r: radius });

                const branchCount = this.random.int(1, 3);

                for (let b = 0; b < branchCount; b++) {
                    const branchSide = this.random.sign();
                    const branchReach = this.random.range(16, 46) * branchSide;
                    const branchDepth = this.random.range(10, 30) * growthSign;

                    const bx = this.clamp(x + branchReach, 10, this.coralBodyWidth - 10);
                    const by = this.clampDirectedY(y + branchDepth, isTop, limit);
                    const br = radius * this.random.range(0.42, 0.7);

                    nodes.push({ x: bx, y: by, r: br });

                    if (this.random.chance(0.45)) {
                        const tx = this.clamp(
                            bx + this.random.range(-16, 16),
                            8,
                            this.coralBodyWidth - 8
                        );
                        const ty = this.clampDirectedY(
                            by + this.random.range(8, 22) * growthSign,
                            isTop,
                            limit
                        );

                        nodes.push({
                            x: tx,
                            y: ty,
                            r: br * this.random.range(0.45, 0.7),
                        });
                    }
                }
            }
        }

        const baseCount = this.random.int(2, 4);
        for (let i = 0; i < baseCount; i++) {
            nodes.push({
                x: this.random.range(0, this.coralBodyWidth),
                y: isTop
                    ? this.random.range(0, Math.min(limit * 0.12, 26))
                    : this.random.range(Math.max(limit, this.maxHeight - 26), this.maxHeight),
                r: this.random.range(18, 32),
            });
        }

        return nodes;
    }

    buildSilhouettePath(profile, isTop) {
        const path = [];

        if (isTop) {
            path.push(0, 0);
            for (const p of profile) {
                path.push(p.x, p.y);
            }
            path.push(this.coralBodyWidth, 0);
        } else {
            path.push(0, this.maxHeight);
            for (const p of profile) {
                path.push(p.x, p.y);
            }
            path.push(this.coralBodyWidth, this.maxHeight);
        }

        return path;
    }

    sampleSurfaceProfile(nodes, isTop, limit) {
        const points = [];

        for (let x = 0; x <= this.coralBodyWidth; x += this.sampleStep) {
            let surfaceY = isTop ? 0 : this.maxHeight;

            if (isTop) {
                for (let y = Math.floor(limit); y >= 0; y -= this.sampleStep) {
                    if (this.fieldValue(x, y, nodes) >= this.fieldThreshold) {
                        surfaceY = y;
                        break;
                    }
                }

                surfaceY += this.random.range(-2, 2);
                surfaceY = this.clamp(surfaceY, 0, limit);
            } else {
                for (let y = Math.ceil(limit); y <= this.maxHeight; y += this.sampleStep) {
                    if (this.fieldValue(x, y, nodes) >= this.fieldThreshold) {
                        surfaceY = y;
                        break;
                    }
                }

                surfaceY += this.random.range(-2, 2);
                surfaceY = this.clamp(surfaceY, limit, this.maxHeight);
            }

            points.push({ x, y: surfaceY });
        }

        const smoothed = this.smoothProfile(points, isTop, limit);
        this.roundProfileCaps(smoothed, isTop, limit);
        this.applyRightEdgeTaper(smoothed, isTop, limit);
        return smoothed;
    }

    applyRightEdgeTaper(profile, isTop, limit) {
        const taperStartX = this.coralBodyWidth - this.taperWidth;
        const anchorY = isTop ? 0 : this.maxHeight;

        for (let i = 0; i < profile.length; i++) {
            const p = profile[i];

            if (p.x < taperStartX) {
                continue;
            }

            const t = (p.x - taperStartX) / Math.max(1, this.taperWidth);
            const eased = t * t * (3 - 2 * t);

            if (isTop) {
                p.y = Math.round(this.lerp(p.y, anchorY, eased * this.taperStrength));
                p.y = this.clamp(p.y, 0, limit);
            } else {
                p.y = Math.round(this.lerp(p.y, anchorY, eased * this.taperStrength));
                p.y = this.clamp(p.y, limit, this.maxHeight);
            }
        }
    }

    fieldValue(x, y, nodes) {
        let sum = 0;

        for (const node of nodes) {
            const dx = x - node.x;
            const dy = y - node.y;
            const d2 = dx * dx + dy * dy + 0.0001;
            sum += (node.r * node.r) / d2;
        }

        return sum;
    }

    smoothProfile(points, isTop, limit) {
        const smoothed = [];

        for (let i = 0; i < points.length; i++) {
            const y0 = points[Math.max(0, i - 2)].y;
            const y1 = points[Math.max(0, i - 1)].y;
            const y2 = points[i].y;
            const y3 = points[Math.min(points.length - 1, i + 1)].y;
            const y4 = points[Math.min(points.length - 1, i + 2)].y;

            let y = y0 * 0.15 + y1 * 0.2 + y2 * 0.3 + y3 * 0.2 + y4 * 0.15;

            if (isTop) {
                y = this.clamp(y, 0, limit);
            } else {
                y = this.clamp(y, limit, this.maxHeight);
            }

            smoothed.push({
                x: points[i].x,
                y: Math.round(y),
            });
        }

        return smoothed;
    }

    buildCoralContainer(profile, isTop, limit) {
        const container = new Container();
        const path = this.buildSilhouettePath(profile, isTop);
        const palette = this.makeCoralPalette();

        const underpaint = new Graphics();
        underpaint.poly(path).fill({
            color: this.mixColor(palette.filterTint, 0xffffff, 0.22),
            alpha: 0.16,
        });

        const maskShape = new Graphics();
        maskShape.poly(path).fill(0xffffff);

        const coralSprite = this.createSheetCoralSprite(profile, isTop, palette);
        coralSprite.mask = maskShape;

        const tintOverlay = new Graphics();
        tintOverlay.poly(path).fill({
            color: palette.filterTint,
            alpha: 0.10,
        });

        const softShade = new Graphics();
        softShade.poly(path).fill({
            color: this.mixColor(palette.filterTint, 0x5f6a74, 0.28),
            alpha: 0.08,
        });

        const deco = new Graphics();
        this.drawBranchDecorations(deco, profile, isTop, limit, palette);
        this.drawEdgeHighlights(deco, profile, isTop, palette);
        this.drawEdgeLightBand(deco, profile, isTop, limit, palette);

        container.addChild(underpaint);
        container.addChild(coralSprite);
        container.addChild(tintOverlay);
        container.addChild(softShade);
        container.addChild(deco);
        container.addChild(maskShape);

        return container;
    }

    createSheetCoralSprite(profile, isTop, palette) {
        const sheetTexture = Texture.from(this.coralSheetPath);

        const totalColumns = this.coralSheetColumns;
        const frameWidth = Math.floor(sheetTexture.width / totalColumns);
        const frameHeight = sheetTexture.height;

        const frameIndex = this.random.int(0, totalColumns - 1);

        const frameTexture = new Texture({
            source: sheetTexture.source,
            frame: new Rectangle(
                frameIndex * frameWidth,
                0,
                frameWidth,
                frameHeight
            ),
        });

        const sprite = new Sprite(frameTexture);

        // 🔥 --- CALIBRATED SCALE ---
        const overscanY = 1.40;   // slightly above 130% to ensure full tip coverage
        const overscanX = 1.70;   // VERY light horizontal stretch (preserve roundness)

        const scaleX = (this.coralBodyWidth / frameWidth) * overscanX;
        const scaleY = (this.maxHeight / frameHeight) * overscanY;

        sprite.scale.set(scaleX, scaleY);

        // 🔥 --- FIND TRUE TIP ---
        let tipY;

        if (isTop) {
            tipY = Math.max(...profile.map(p => p.y));
        } else {
            tipY = Math.min(...profile.map(p => p.y));
        }

        // 🔥 --- CENTER WIDTH (prevent side gaps) ---
        const scaledWidth = frameWidth * scaleX;
        sprite.x = -(scaledWidth - this.coralBodyWidth) * 0.5;

        // 🔥 --- TIP LOCK (this is the key fix) ---
        if (isTop) {
            // push texture DOWN so it overfills past the tip
            sprite.y = tipY - frameHeight * scaleY + 77;
        } else {
            // flip + push UP so it overfills past the tip
            sprite.scale.y *= -1;
            sprite.y = tipY + frameHeight * scaleY - 77;
        }

        // 🔥 --- COLOR (slightly reduced interference) ---
        sprite.tint = palette.filterTint;
        sprite.alpha = 0.98;

        return sprite;
    }

    makeCoralPalette() {
        const baseTints = [
            0xe4ad91,
            0xd9d39d,
            0xc0d186,
            0x80ce95,
            0x61c4ab,
            0xd8a5e8,
            0xa8b8ef,
        ];

        const filterTint = baseTints[this.random.int(0, baseTints.length - 1)];

        return {
            filterTint,
            highlightTint: this.mixColor(filterTint, 0xffffff, 0.32),
            shadowTint: this.mixColor(filterTint, 0x66717b, 0.24),
        };
    }

    drawBranchDecorations(graphics, profile, isTop, limit, palette) {
        const decorCount = this.random.int(3, 6);
        const used = new Set();

        for (let i = 0; i < decorCount; i++) {
            const maxIndex = Math.max(4, profile.length - 6);
            const index = this.random.int(4, maxIndex);

            if (used.has(index)) {
                continue;
            }
            used.add(index);

            const base = profile[index];

            if (base.x > this.coralBodyWidth - this.taperWidth - 8) {
                continue;
            }

            if (!this.isGentleSurface(profile, index, 10)) {
                continue;
            }

            const dir = isTop ? 1 : -1;
            const length = this.random.range(12, 22);
            const halfWidth = this.random.range(3.5, 6);
            const bend = this.random.range(-3, 3);

            const midY = this.clampDirectedY(base.y + length * 0.55 * dir, isTop, limit);
            const tipY = this.clampDirectedY(base.y + length * dir, isTop, limit);

            const midX = base.x + bend * 0.5;
            const tipX = base.x + bend;

            const bodyColor = this.mixColor(palette.filterTint, 0xffffff, 0.22);
            const capColor = this.mixColor(palette.highlightTint, 0xffffff, 0.2);

            const bodyPath = [
                base.x - halfWidth, base.y,
                midX - halfWidth * 0.9, midY,
                tipX - halfWidth * 0.45, tipY,
                tipX + halfWidth * 0.45, tipY,
                midX + halfWidth * 0.9, midY,
                base.x + halfWidth, base.y
            ];

            graphics.poly(bodyPath).fill({
                color: bodyColor,
                alpha: 0.72,
            });

            graphics.circle(tipX, tipY, halfWidth * 0.62).fill({
                color: capColor,
                alpha: 0.82,
            });
        }
    }

    isGentleSurface(profile, index, maxDelta = 10) {
        const prev = profile[Math.max(0, index - 1)];
        const next = profile[Math.min(profile.length - 1, index + 1)];
        return Math.abs(next.y - prev.y) <= maxDelta;
    }

    roundProfileCaps(profile, isTop, limit) {
        for (let i = 2; i < profile.length - 2; i++) {
            const y0 = profile[i - 2].y;
            const y1 = profile[i - 1].y;
            const y2 = profile[i].y;
            const y3 = profile[i + 1].y;
            const y4 = profile[i + 2].y;

            const localAverage = (y0 + y1 + y3 + y4) / 4;
            const delta = y2 - localAverage;

            if (Math.abs(delta) > 10) {
                let rounded = localAverage + delta * 0.45;

                if (isTop) {
                    rounded = this.clamp(rounded, 0, limit);
                } else {
                    rounded = this.clamp(rounded, limit, this.maxHeight);
                }

                profile[i].y = Math.round(rounded);
            }
        }
    }

    drawEdgeLightBand(graphics, profile, isTop, limit, palette) {
        const color = this.mixColor(palette.highlightTint, 0xffffff, 0.28);

        for (let i = 1; i < profile.length - 1; i++) {
            const p0 = profile[i - 1];
            const p1 = profile[i];
            const p2 = profile[i + 1];

            const dy = p2.y - p0.y;

            if (Math.abs(dy) > 12) {
                continue;
            }

            const dir = isTop ? 1 : -1;
            const outerY = p1.y;
            const innerY = this.clampDirectedY(
                p1.y + dir * this.random.range(4, 8),
                isTop,
                limit
            );

            const halfWidth = this.random.range(3, 5.5);

            const shape = [
                p1.x - halfWidth, outerY,
                p1.x - halfWidth * 0.7, innerY,
                p1.x + halfWidth * 0.7, innerY,
                p1.x + halfWidth, outerY
            ];

            graphics.poly(shape).fill({
                color,
                alpha: 0.14,
            });
        }
    }

    drawEdgeHighlights(graphics, profile, isTop, palette) {
        const color = this.mixColor(
            isTop ? this.branchStrokeTop : this.branchStrokeBottom,
            palette.highlightTint,
            0.4
        );

        for (let i = 2; i < profile.length - 2; i += this.random.int(3, 6)) {
            const p = profile[i];
            const length = this.random.range(3, 8);
            const width = this.random.range(1.8, 3.2);
            const dir = isTop ? 1 : -1;

            const tri = [
                p.x - width, p.y,
                p.x, p.y + length * dir,
                p.x + width, p.y
            ];

            graphics.poly(tri).fill({
                color,
                alpha: 0.68,
            });
        }
    }

    mixColor(colorA, colorB, t) {
        const clamped = this.clamp(t, 0, 1);

        const aR = (colorA >> 16) & 0xff;
        const aG = (colorA >> 8) & 0xff;
        const aB = colorA & 0xff;

        const bR = (colorB >> 16) & 0xff;
        const bG = (colorB >> 8) & 0xff;
        const bB = colorB & 0xff;

        const r = Math.round(this.lerp(aR, bR, clamped));
        const g = Math.round(this.lerp(aG, bG, clamped));
        const b = Math.round(this.lerp(aB, bB, clamped));

        return (r << 16) | (g << 8) | b;
    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    clampDirectedY(y, isTop, limit) {
        if (isTop) {
            return this.clamp(y, 0, limit);
        }

        return this.clamp(y, limit, this.maxHeight);
    }

    lerp(a, b, t) {
        return a + (b - a) * t;
    }
}