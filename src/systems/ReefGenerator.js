import { Container, Graphics } from "pixi.js";

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
        const palette = this.makeCoralPalette(isTop);

        const base = new Graphics();
        base.poly(path).fill({
            color: palette.baseColor,
            alpha: 0.92,
        });

        const underpaint = new Graphics();
        underpaint.poly(path).fill({
            color: this.mixColor(palette.baseColor, palette.shadowColor, 0.5),
            alpha: 0.12,
        });

        const microLayer = new Graphics();
        const colonyLayer = new Graphics();
        const featureLayer = new Graphics();
        const deco = new Graphics();

        const neighborhoods = this.createColorNeighborhoods(profile, isTop, palette);
        const colonySeeds = this.createColonySeeds(profile, isTop, neighborhoods);

        this.drawMicroBloomField(microLayer, profile, isTop, palette, neighborhoods);
        this.drawColonyBloomTexture(colonyLayer, profile, isTop, palette, neighborhoods, colonySeeds);
        this.drawFeatureBloomClusters(featureLayer, profile, isTop, palette, neighborhoods);

        this.drawBranchDecorations(deco, profile, isTop, limit, palette);
        this.drawEdgeHighlights(deco, profile, isTop, palette);
        this.drawEdgeLightBand(deco, profile, isTop, limit, palette);

        container.addChild(base);
        container.addChild(underpaint);
        container.addChild(microLayer);
        container.addChild(colonyLayer);
        container.addChild(featureLayer);
        container.addChild(deco);

        return container;
    }

    makeCoralPalette(isTop) {
        const baseSets = isTop
            ? [
                0xe4ad91,
                0xd9d39d,
                0xc0d186,
                0x80ce95,
                0x61c4ab,
            ]
            : [
                0xe4ad91,
                0xd9d39d,
                0xc0d186,
                0x80ce95,
                0x61c4ab,
            ];

        const bloomFamilies = [
            [0xffc688, 0xffd8a1, 0xffefc9],
            [0xf7a88e, 0xffc0aa, 0xffdfd1],
            [0xc6f08a, 0xa8df87, 0xdaf5b5],
            [0x86e0b4, 0x6fd6c5, 0xbff2df],
            [0x6bd6d1, 0x7fdff0, 0xbcefff],
            [0xd6a7ff, 0xe4bcff, 0xf4d9ff],
            [0xf1a8df, 0xffbede, 0xffd8ed],
            [0xb89bff, 0xcab3ff, 0xe3d8ff],
            [0xffc97d, 0xf7ae6f, 0xffdf9d],
            [0xfff0c9, 0xfde3b0, 0xffffff],
        ];

        const baseColor = baseSets[this.random.int(0, baseSets.length - 1)];
        const shadowColor = this.mixColor(baseColor, 0x7f6b78, 0.22);
        const highlightColor = this.mixColor(baseColor, 0xffffff, 0.35);

        const species = [];
        for (let i = 0; i < 5; i++) {
            species.push(bloomFamilies[this.random.int(0, bloomFamilies.length - 1)]);
        }

        return {
            baseColor,
            shadowColor,
            highlightColor,
            speciesA: species[0],
            speciesB: species[1],
            speciesC: species[2],
            speciesD: species[3],
            speciesE: species[4],
        };
    }

    createColorNeighborhoods(profile, isTop, palette) {
        const count = this.random.int(4, 7);
        const neighborhoods = [];
        const speciesPools = [
            palette.speciesA,
            palette.speciesB,
            palette.speciesC,
            palette.speciesD,
            palette.speciesE,
        ];

        for (let i = 0; i < count; i++) {
            const x = this.random.range(12, this.coralBodyWidth - 12);
            const surfaceY = this.sampleProfileY(profile, x);

            let y;
            if (isTop) {
                y = this.random.range(8, Math.max(10, surfaceY - 10));
            } else {
                y = this.random.range(surfaceY + 10, this.maxHeight - 8);
            }

            const radius = this.random.range(24, 52);
            const species = speciesPools[this.random.int(0, speciesPools.length - 1)];

            neighborhoods.push({
                x,
                y,
                radius,
                species,
                strength: this.random.range(0.35, 0.8),
            });
        }

        return neighborhoods;
    }

    createColonySeeds(profile, isTop, neighborhoods) {
        const colonyCount = this.random.int(24, 34);
        const seeds = [];

        for (let i = 0; i < colonyCount; i++) {
            const x = this.random.range(8, this.coralBodyWidth - 8);
            const surfaceY = this.sampleProfileY(profile, x);

            let y;
            if (isTop) {
                if (surfaceY < 18) continue;
                y = this.random.range(8, Math.max(10, surfaceY - 8));
            } else {
                if (surfaceY > this.maxHeight - 18) continue;
                y = this.random.range(surfaceY + 8, this.maxHeight - 8);
            }

            if (!this.isPointInsideCoral(x, y, profile, isTop)) {
                continue;
            }

            let neighborhoodBias = 0;
            for (const neighborhood of neighborhoods) {
                const dx = x - neighborhood.x;
                const dy = y - neighborhood.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                neighborhoodBias = Math.max(
                    neighborhoodBias,
                    this.clamp(1 - d / neighborhood.radius, 0, 1)
                );
            }

            seeds.push({
                x,
                y,
                radius: this.random.range(8, 16),
                density: this.random.range(0.9, 1.35) + neighborhoodBias * 0.45,
                variety: this.random.range(0.2, 0.95),
            });
        }

        return seeds;
    }

    drawMicroBloomField(graphics, profile, isTop, palette, neighborhoods) {
        const count = this.random.int(160, 230);

        for (let i = 0; i < count; i++) {
            const x = this.random.range(6, this.coralBodyWidth - 6);
            const surfaceY = this.sampleProfileY(profile, x);

            let y;
            if (isTop) {
                if (surfaceY < 10) continue;
                y = this.random.range(4, Math.max(6, surfaceY - 4));
            } else {
                if (surfaceY > this.maxHeight - 10) continue;
                y = this.random.range(surfaceY + 4, this.maxHeight - 4);
            }

            if (!this.isPointInsideCoral(x, y, profile, isTop)) {
                continue;
            }

            const bloom = this.sampleSpeciesColor(x, y, palette, neighborhoods);
            const base = bloom.base;
            const light = bloom.light;

            const r = this.random.range(1.8, 3.4);
            const petals = this.random.int(4, 6);

            for (let p = 0; p < petals; p++) {
                const angle = (Math.PI * 2 * p) / petals + this.random.range(-0.3, 0.3);
                const dist = r * this.random.range(0.15, 0.5);
                const px = x + Math.cos(angle) * dist;
                const py = y + Math.sin(angle) * dist;

                graphics.circle(px, py, r * this.random.range(0.28, 0.44));
                graphics.fill({
                    color: base,
                    alpha: 0.16,
                });
            }

            graphics.circle(x, y, r * this.random.range(0.12, 0.2));
            graphics.fill({
                color: light,
                alpha: 0.18,
            });
        }
    }

    drawColonyBloomTexture(graphics, profile, isTop, palette, neighborhoods, colonySeeds) {
        for (const colony of colonySeeds) {
            const bloomCount = Math.round(this.random.range(8, 15) * colony.density);

            for (let i = 0; i < bloomCount; i++) {
                const angle = this.random.range(0, Math.PI * 2);
                const dist = this.random.range(0, colony.radius);
                const anchorX = colony.x + Math.cos(angle) * dist;
                const anchorY = colony.y + Math.sin(angle) * dist * 0.88;

                if (!this.isPointInsideCoral(anchorX, anchorY, profile, isTop)) {
                    continue;
                }

                const bloom = this.sampleSpeciesColor(anchorX, anchorY, palette, neighborhoods);
                const bloomColor = this.mixColor(bloom.base, bloom.alt, colony.variety * 0.28);
                const petalColor = this.mixColor(bloomColor, bloom.light, this.random.range(0.12, 0.28));
                const shadowColor = this.mixColor(bloomColor, palette.shadowColor, this.random.range(0.28, 0.44));
                const centerColor = this.mixColor(bloom.light, 0xffffff, this.random.range(0.12, 0.3));

                const bloomRadius = this.random.range(3.8, 7.4);
                const lobeCount = this.random.int(5, 8);

                if (this.random.chance(0.68)) {
                    const sx = anchorX + this.random.range(-1.2, 1.2);
                    const sy = isTop
                        ? anchorY + this.random.range(0.8, 2.2)
                        : anchorY + this.random.range(-2.2, -0.8);

                    graphics.circle(sx, sy, bloomRadius * this.random.range(0.72, 0.94));
                    graphics.fill({
                        color: shadowColor,
                        alpha: 0.08,
                    });
                }

                for (let l = 0; l < lobeCount; l++) {
                    const lobeAngle = (Math.PI * 2 * l) / lobeCount + this.random.range(-0.28, 0.28);
                    const lobeDist = bloomRadius * this.random.range(0.2, 0.56);
                    const lobeRadius = bloomRadius * this.random.range(0.24, 0.4);

                    const lx = anchorX + Math.cos(lobeAngle) * lobeDist;
                    const ly = anchorY + Math.sin(lobeAngle) * lobeDist;

                    if (!this.isPointInsideCoral(lx, ly, profile, isTop)) {
                        continue;
                    }

                    graphics.circle(lx, ly, lobeRadius);
                    graphics.fill({
                        color: petalColor,
                        alpha: 0.2,
                    });
                }

                graphics.circle(anchorX, anchorY, bloomRadius * this.random.range(0.24, 0.42));
                graphics.fill({
                    color: bloomColor,
                    alpha: 0.22,
                });

                graphics.circle(
                    anchorX + this.random.range(-0.55, 0.55),
                    anchorY + this.random.range(-0.55, 0.55),
                    bloomRadius * this.random.range(0.08, 0.16)
                );
                graphics.fill({
                    color: centerColor,
                    alpha: 0.24,
                });
            }
        }
    }

    drawFeatureBloomClusters(graphics, profile, isTop, palette, neighborhoods) {
        const clusterCount = this.random.int(7, 12);

        for (let i = 0; i < clusterCount; i++) {
            const x = this.random.range(12, this.coralBodyWidth - 12);
            const surfaceY = this.sampleProfileY(profile, x);

            let y;
            if (isTop) {
                if (surfaceY < 14) continue;
                y = this.random.range(8, Math.max(10, surfaceY - 8));
            } else {
                if (surfaceY > this.maxHeight - 14) continue;
                y = this.random.range(surfaceY + 8, this.maxHeight - 8);
            }

            if (!this.isPointInsideCoral(x, y, profile, isTop)) {
                continue;
            }

            const bloom = this.sampleSpeciesColor(x, y, palette, neighborhoods);
            const featureBase = this.mixColor(bloom.base, bloom.light, this.random.range(0.24, 0.46));
            const featureCenter = this.mixColor(bloom.light, 0xffffff, this.random.range(0.18, 0.34));

            const baseRadius = this.random.range(7, 12);
            const petals = this.random.int(7, 10);

            for (let p = 0; p < petals; p++) {
                const angle = (Math.PI * 2 * p) / petals + this.random.range(-0.18, 0.18);
                const dist = baseRadius * this.random.range(0.18, 0.62);
                const px = x + Math.cos(angle) * dist;
                const py = y + Math.sin(angle) * dist;
                const pr = baseRadius * this.random.range(0.18, 0.34);

                if (!this.isPointInsideCoral(px, py, profile, isTop)) {
                    continue;
                }

                graphics.circle(px, py, pr);
                graphics.fill({
                    color: featureBase,
                    alpha: 0.24,
                });
            }

            graphics.circle(x, y, baseRadius * this.random.range(0.1, 0.18));
            graphics.fill({
                color: featureCenter,
                alpha: 0.32,
            });
        }
    }

    sampleSpeciesColor(x, y, palette, neighborhoods) {
        let chosen = palette.speciesA;
        let bestInfluence = -1;

        for (const neighborhood of neighborhoods) {
            const dx = x - neighborhood.x;
            const dy = y - neighborhood.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const influence = this.clamp(1 - distance / neighborhood.radius, 0, 1) * neighborhood.strength;

            if (influence > bestInfluence) {
                bestInfluence = influence;
                chosen = neighborhood.species;
            }
        }

        const localMix = this.random.next();
        const base = chosen[0];
        const alt = chosen[Math.min(2, 1 + Math.floor(localMix * 2))];
        const light = chosen[2];

        return { base, alt, light };
    }

    sampleProfileY(profile, x) {
        if (!profile.length) {
            return 0;
        }

        if (x <= profile[0].x) {
            return profile[0].y;
        }

        if (x >= profile[profile.length - 1].x) {
            return profile[profile.length - 1].y;
        }

        for (let i = 1; i < profile.length; i++) {
            const a = profile[i - 1];
            const b = profile[i];

            if (x <= b.x) {
                const t = (x - a.x) / Math.max(1, b.x - a.x);
                return this.lerp(a.y, b.y, t);
            }
        }

        return profile[profile.length - 1].y;
    }

    isPointInsideCoral(x, y, profile, isTop) {
        const surfaceY = this.sampleProfileY(profile, x);
        return isTop ? y <= surfaceY : y >= surfaceY;
    }

    drawBranchDecorations(graphics, profile, isTop, limit, palette) {
        const decorCount = this.random.int(4, 7);
        const used = new Set();

        for (let i = 0; i < decorCount; i++) {
            const maxIndex = Math.max(4, profile.length - 6);
            let index = this.random.int(4, maxIndex);

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
            const length = this.random.range(14, 26);
            const halfWidth = this.random.range(4, 7);
            const bend = this.random.range(-3, 3);

            const midY = this.clampDirectedY(base.y + length * 0.55 * dir, isTop, limit);
            const tipY = this.clampDirectedY(base.y + length * dir, isTop, limit);

            const midX = base.x + bend * 0.5;
            const tipX = base.x + bend;

            const bodyColor = this.mixColor(palette.baseColor, palette.highlightColor, this.random.range(0.18, 0.36));
            const capColor = this.mixColor(palette.highlightColor, 0xffffff, this.random.range(0.08, 0.18));

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
                alpha: 0.9,
            });
            graphics.circle(tipX, tipY, halfWidth * 0.7).fill({
                color: capColor,
                alpha: 0.92,
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
        const color = this.mixColor(palette.highlightColor, 0xffffff, 0.3);

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
                p1.y + dir * this.random.range(5, 9),
                isTop,
                limit
            );

            const halfWidth = this.random.range(3, 6);

            const path = [
                p1.x - halfWidth, outerY,
                p1.x - halfWidth * 0.7, innerY,
                p1.x + halfWidth * 0.7, innerY,
                p1.x + halfWidth, outerY
            ];

            graphics.poly(path).fill({
                color,
                alpha: 0.2,
            });
        }
    }

    drawEdgeHighlights(graphics, profile, isTop, palette) {
        const color = isTop
            ? this.mixColor(this.branchStrokeTop, palette.highlightColor, 0.42)
            : this.mixColor(this.branchStrokeBottom, palette.highlightColor, 0.42);

        for (let i = 2; i < profile.length - 2; i += this.random.int(3, 6)) {
            const p = profile[i];
            const length = this.random.range(4, 10);
            const width = this.random.range(2, 4);
            const dir = isTop ? 1 : -1;

            const path = [
                p.x - width, p.y,
                p.x, p.y + length * dir,
                p.x + width, p.y
            ];

            graphics.poly(path).fill({
                color,
                alpha: 0.82,
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