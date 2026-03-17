import { Graphics } from "pixi.js";

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

        this.segmentWidth = 220;
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
        this.taperStrength = .8;

        
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
    const gapSize = this.random.range(88, 132);
    const gapCenter = this.random.range(210, 510);

    const topLimit = gapCenter - gapSize * 0.5;
    const bottomLimit = gapCenter + gapSize * 0.5;

    const topNodes = this.createBranchField(topLimit, true);
    const bottomNodes = this.createBranchField(bottomLimit, false);

    const topProfile = this.sampleSurfaceProfile(topNodes, true, topLimit);
    const bottomProfile = this.sampleSurfaceProfile(bottomNodes, false, bottomLimit);

    this.enforceMinimumGap(topProfile, bottomProfile, 130);

    const topGraphic = this.buildCoralContainer(topProfile, true, topLimit);
    const bottomGraphic = this.buildCoralContainer(bottomProfile, false, bottomLimit);

    topGraphic.x = xPosition;
    bottomGraphic.x = xPosition;

    return {
        x: xPosition,
        width: this.segmentWidth,
        topGraphic,
        bottomGraphic,
        topProfile,
        bottomProfile,
    };
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
      const coral = new Graphics();

      const fillPath = [];

      if (isTop) {
          fillPath.push(0, 0);
          for (const p of profile) {
              fillPath.push(p.x, p.y);
          }
          fillPath.push(this.coralBodyWidth, 0);
      } else {
          fillPath.push(0, this.maxHeight);
          for (const p of profile) {
              fillPath.push(p.x, p.y);
          }
          fillPath.push(this.coralBodyWidth, this.maxHeight);
      }

      const fillColor = isTop
          ? this.randomColor(this.topColorMin, this.topColorMax)
          : this.randomColor(this.bottomColorMin, this.bottomColorMax);

      coral.poly(fillPath).fill(fillColor);

      this.drawBranchDecorations(coral, profile, isTop, limit);
      this.drawEdgeHighlights(coral, profile, isTop);

      return coral;
    }

    drawBranchDecorations(graphics, profile, isTop, limit) {
      const decorCount = this.random.int(4, 7); //const decorCount = this.random.int(5, 9);
      const used = new Set();

      for (let i = 0; i < decorCount; i++) {
          const maxIndex = Math.max(4, profile.length - 6);
          let index = this.random.int(4, maxIndex);

          if (used.has(index)) {
              continue;
          }
          used.add(index);

          const base = profile[index];

          // Avoid drawing inside the taper seam
          if (base.x > this.coralBodyWidth - this.taperWidth - 8) {
              continue;
          }

          const dir = isTop ? 1 : -1;

          const length = this.random.range(14, 26); //const length = this.random.range(12, 24);
          const halfWidth = this.random.range(4, 7); //const halfWidth = this.random.range(3, 6);
          const bend = this.random.range(-3, 3);

          const midY = this.clampDirectedY(base.y + length * 0.55 * dir, isTop, limit);
          const tipY = this.clampDirectedY(base.y + length * dir, isTop, limit);

          const midX = base.x + bend * 0.5;
          const tipX = base.x + bend;

          const color = isTop
              ? this.randomColor(0xefbdb5, 0xf8d8cc)
              : this.randomColor(0xe6c8f4, 0xf3dcff);

          // Rounded stalk body
          const bodyPath = [
              base.x - halfWidth, base.y,
              midX - halfWidth * 0.9, midY,
              tipX - halfWidth * 0.45, tipY,
              tipX + halfWidth * 0.45, tipY,
              midX + halfWidth * 0.9, midY,
              base.x + halfWidth, base.y
          ];

          graphics.poly(bodyPath).fill(color);

          // Rounded cap
          graphics.circle(tipX, tipY, halfWidth * 0.7).fill(color);

          // Optional side nub for more coral-like growth
          if (this.random.chance(0.28)) {
              const side = this.random.sign();
              const nubBaseX = base.x + side * this.random.range(1, 4);
              const nubBaseY = this.clampDirectedY(base.y + length * 0.45 * dir, isTop, limit);

              const nubTipX = nubBaseX + side * this.random.range(4, 8);
              const nubTipY = this.clampDirectedY(
                  nubBaseY + length * this.random.range(0.18, 0.32) * dir,
                  isTop,
                  limit
              );

              const nubWidth = halfWidth * 0.55;

              const nubPath = [
                  nubBaseX - nubWidth * 0.6, nubBaseY,
                  nubTipX - nubWidth * 0.35, nubTipY,
                  nubTipX + nubWidth * 0.35, nubTipY,
                  nubBaseX + nubWidth * 0.6, nubBaseY
              ];

              graphics.poly(nubPath).fill(color);
              graphics.circle(nubTipX, nubTipY, nubWidth * 0.45).fill(color);
          }
      }
    }

    drawEdgeHighlights(graphics, profile, isTop) {
        const color = isTop ? this.branchStrokeTop : this.branchStrokeBottom;

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

            graphics.poly(path).fill(color);
        }
    }

    randomColor(minColor, maxColor) {
        const minR = (minColor >> 16) & 0xff;
        const minG = (minColor >> 8) & 0xff;
        const minB = minColor & 0xff;

        const maxR = (maxColor >> 16) & 0xff;
        const maxG = (maxColor >> 8) & 0xff;
        const maxB = maxColor & 0xff;

        const r = Math.floor(this.random.range(minR, maxR));
        const g = Math.floor(this.random.range(minG, maxG));
        const b = Math.floor(this.random.range(minB, maxB));

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