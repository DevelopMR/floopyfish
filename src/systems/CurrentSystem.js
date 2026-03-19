export class CurrentSystem {
  constructor(spawnSystem) {
    this.spawnSystem = spawnSystem;

    this.ambientStrength = 0.03;

    this.segmentInfluenceRadius = 180;
    this.gapPressureStrength = 0.16;
    this.gapCenteringStrength = 0.035;

    this.rightRampStart = 760;
    this.rightRampEnd = 1230;
    this.rightRampStrength = 0.28;
  }

  getForce(x, y, time) {
    const ambient = this.getAmbientTurbulence(x, y, time);
    const gapPressure = this.getGapPressure(x, y);
    const rightRamp = this.getRightPressureRamp(x);

    return {
      x: ambient.x + gapPressure.x + rightRamp.x,
      y: ambient.y + gapPressure.y,
    };
  }

  getAmbientTurbulence(x, y, time) {
    const strength = this.ambientStrength;

    return {
      x: Math.cos(time + y * 0.01) * strength,
      y: Math.sin(time + x * 0.01) * strength,
    };
  }

  getGapPressure(x, y) {
    let totalX = 0;
    let totalY = 0;

    for (const seg of this.spawnSystem.segments) {
      const reefGen = this.spawnSystem.reefGen;
      const left = seg.x;
      const right = seg.x + seg.width;

      const nearestX = this.clamp(x, left, right);
      const dx = Math.abs(x - nearestX);

      if (dx > this.segmentInfluenceRadius) {
        continue;
      }

      const localX = this.clamp(x - left, 0, reefGen.coralBodyWidth);
      const index = this.getProfileIndex(localX, reefGen, seg.topProfile.length);

      const top = seg.topProfile[index]?.y ?? 0;
      const bottom = seg.bottomProfile[index]?.y ?? reefGen.maxHeight;

      const gapCenterY = (top + bottom) * 0.5;
      const gapSize = Math.max(1, bottom - top);

      const horizontalT = 1 - dx / this.segmentInfluenceRadius;
      const horizontalFalloff = horizontalT * horizontalT;

      const verticalOffset = y - gapCenterY;
      const verticalNorm = Math.abs(verticalOffset) / (gapSize * 0.5 + 1);
      const verticalAlignment = Math.max(0, 1 - verticalNorm);

      // Strongest leftward pressure near the gap centerline
      totalX += -this.gapPressureStrength * horizontalFalloff * verticalAlignment;

      // Gentle vertical flow toward the center of the channel
      totalY += (-Math.sign(verticalOffset)) * this.gapCenteringStrength * horizontalFalloff;
    }

    return { x: totalX, y: totalY };
  }

  getRightPressureRamp(x) {
    if (x <= this.rightRampStart) {
      return { x: 0, y: 0 };
    }

    const tRaw = (x - this.rightRampStart) / (this.rightRampEnd - this.rightRampStart);
    const t = this.clamp(tRaw, 0, 1);

    // smoothstep
    const eased = t * t * (3 - 2 * t);

    return {
      x: -this.rightRampStrength * eased,
      y: 0,
    };
  }

  getProfileIndex(localX, reefGen, profileLength) {
    const rawIndex = Math.floor(localX / reefGen.sampleStep);
    return this.clamp(rawIndex, 0, profileLength - 1);
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
}