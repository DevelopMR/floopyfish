import { Container, Graphics, Text, TextStyle } from "pixi.js";

export class BrainOverlay {
  constructor({
    width,
    height,
    architecture = [14, 12, 8, 2],
    outputLabels = [],
    panelScale = 0.75,
  } = {}) {
    this.width = width ?? 1280;
    this.height = height ?? 720;

    this.architecture = architecture;
    this.outputLabelsText = outputLabels;
    this.panelScale = panelScale;

    this.root = new Container();
    this.root.eventMode = "none";

    this.panel = new Graphics();
    this.root.addChild(this.panel);

    this.titleStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 18,
      fontWeight: "800",
      fill: 0xeeffff,
    });

    this.outputLabelStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 10,
      fontWeight: "700",
      fill: 0xfaf6e8,
    });

    this.metricStyle = new TextStyle({
      fontFamily: "Arial",
      fontSize: 11,
      fontWeight: "700",
      fill: 0xd7f4ff,
    });

    this.titleText = new Text({
      text: "Brain Tank",
      style: this.titleStyle,
    });
    this.root.addChild(this.titleText);

    this.outputLabels = [];
    this.metricTexts = [];

    this.inputs = new Array(this.architecture[0]).fill(0);
    this.outputs = new Array(this.architecture[this.architecture.length - 1]).fill(0);

    this.metrics = {
      generation: 0,
      alive: 0,
      population: 0,
      fitness: 0,
      loops: 0,
    };

    this.ensureOutputLabels();
    this.ensureMetricTexts();
    this.draw();
  }

  update({ architecture, inputs, outputs, outputLabels, metrics }) {
    let architectureChanged = false;

    if (architecture) {
      const sameLength = architecture.length === this.architecture.length;
      const sameValues = sameLength && architecture.every((value, index) => value === this.architecture[index]);
      architectureChanged = !sameValues;
      this.architecture = architecture;
    }

    if (inputs) this.inputs = inputs;
    if (outputs) this.outputs = outputs;
    if (outputLabels) this.outputLabelsText = outputLabels;

    if (metrics) {
      this.metrics = {
        ...this.metrics,
        ...metrics,
      };
    }

    if (architectureChanged) {
      this.syncOutputLabelCount();
    }

    this.draw();
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.draw();
  }

  ensureOutputLabels() {
    this.syncOutputLabelCount();
  }

  syncOutputLabelCount() {
    const outputCount = this.architecture[this.architecture.length - 1] ?? 0;

    while (this.outputLabels.length < outputCount) {
      const label = new Text({
        text: "",
        style: this.outputLabelStyle,
      });
      this.root.addChild(label);
      this.outputLabels.push(label);
    }

    while (this.outputLabels.length > outputCount) {
      const label = this.outputLabels.pop();
      this.root.removeChild(label);
      label.destroy();
    }
  }

  ensureMetricTexts() {
    const targetCount = 4;

    while (this.metricTexts.length < targetCount) {
      const label = new Text({
        text: "",
        style: this.metricStyle,
      });
      this.root.addChild(label);
      this.metricTexts.push(label);
    }
  }

  draw() {
    const scale = this.panelScale;

    const px = this.width - 320 * scale;
    const py = 18;
    const pw = 300 * scale;
    const ph = 320 * scale;

    const outerPadX = 16 * scale;
    const topHeaderPad = 18 * scale;
    const titleToNetworkGap = 22 * scale;
    const networkPadX = 16 * scale;
    const networkPadY = 12 * scale;
    const metricsHeight = 56 * scale;
    const metricsGap = 12 * scale;

    this.panel.clear();

    this.panel.roundRect(px, py, pw, ph, 20 * scale);
    this.panel.fill({ color: 0x062840, alpha: 0.65 });
    this.panel.stroke({ color: 0x96e8ff, alpha: 0.5, width: 2 });

    this.titleText.x = px + outerPadX;
    this.titleText.y = py + topHeaderPad * 0.45;

    const ix = px + outerPadX + networkPadX;
    const iy = py + topHeaderPad + titleToNetworkGap + networkPadY;
    const iw = pw - (outerPadX + networkPadX) * 2;
    const ih = ph - iy + py - metricsHeight - metricsGap - networkPadY;

    const layerCount = this.architecture.length;
    const layerSpacing = iw / Math.max(1, layerCount - 1);
    const outputInset = layerSpacing * 0.18;

    const layers = this.architecture.map((count, i) => {
      let x = ix + i * layerSpacing;

      if (i === layerCount - 1) {
        x -= outputInset;
      }

      const top = iy + 4 * scale;
      const bottom = iy + ih - 4 * scale;
      const verticalInset = i === layerCount - 1 ? (bottom - top) * 0.16 : 0;
      const layerTop = top + verticalInset;
      const layerBottom = bottom - verticalInset;
      const step = (layerBottom - layerTop) / Math.max(1, count - 1);

      return Array.from({ length: count }, (_, j) => ({
        x,
        y: layerTop + j * step,
      }));
    });

    this.drawNetworkFrame(ix, iy, iw, ih, scale);
    this.drawConnections(layers, scale);
    this.drawNodes(layers, scale);
    this.layoutOutputLabels(layers[layers.length - 1], px, pw, scale);
    this.layoutMetrics(px, py, pw, ph, scale);
  }

  drawNetworkFrame(ix, iy, iw, ih, scale) {
    this.panel.roundRect(ix - 8 * scale, iy - 6 * scale, iw + 16 * scale, ih + 12 * scale, 14 * scale);
    this.panel.fill({ color: 0x7edfff, alpha: 0.045 });
    this.panel.stroke({ color: 0x8cecff, alpha: 0.18, width: 1.5 });
  }

  drawConnections(layers, scale) {
    const lastLayerIndex = layers.length - 2;

    for (let l = 0; l < layers.length - 1; l++) {
      for (let ai = 0; ai < layers[l].length; ai++) {
        const a = layers[l][ai];

        for (let bi = 0; bi < layers[l + 1].length; bi++) {
          const b = layers[l + 1][bi];

          const style = this.getConnectionStyle(l, lastLayerIndex, ai, bi, layers[l].length, layers[l + 1].length);

          this.panel.moveTo(a.x, a.y);
          this.panel.lineTo(b.x, b.y);
          this.panel.stroke({
            width: style.width * scale,
            color: style.color,
            alpha: style.alpha,
          });
        }
      }
    }
  }

  getConnectionStyle(layerIndex, lastLayerIndex, fromIndex, toIndex, fromCount, toCount) {
    const fromT = fromCount <= 1 ? 0.5 : fromIndex / (fromCount - 1);
    const toT = toCount <= 1 ? 0.5 : toIndex / (toCount - 1);
    const bridgeT = (fromT + toT) * 0.5;

    if (layerIndex === 0) {
      return {
        color: this.mix([88, 242, 255], [120, 255, 204], bridgeT),
        alpha: 0.16 + bridgeT * 0.06,
        width: 1.15,
      };
    }

    if (layerIndex === lastLayerIndex) {
      const outputIndex = Math.min(this.outputs.length - 1, toIndex);
      const outputSignal = this.normalizeSigned(this.outputs[outputIndex] ?? 0);
      return {
        color: this.mix([124, 255, 226], [255, 163, 122], outputSignal),
        alpha: 0.18 + outputSignal * 0.08,
        width: 1.25,
      };
    }

    return {
      color: this.mix([92, 226, 255], [157, 247, 255], bridgeT),
      alpha: 0.12 + bridgeT * 0.05,
      width: 1.0,
    };
  }

  drawNodes(layers, scale) {
    const inputLow = [126, 255, 230];
    const inputHigh = [255, 214, 115];
    const hiddenLow = [122, 234, 255];
    const hiddenHigh = [208, 250, 255];
    const outputLow = [101, 248, 230];
    const outputHigh = [255, 158, 118];

    layers.forEach((layer, i) => {
      layer.forEach((node, j) => {
        let radius = 3.3 * scale;
        let color = 0x8deaff;
        let glowAlpha = 0.18;

        if (i === 0) {
          const t = this.normalizeUnsigned(this.inputs[j] ?? 0);
          color = this.mix(inputLow, inputHigh, t);
          radius = 4.4 * scale;
          glowAlpha = 0.24;
        } else if (i === layers.length - 1) {
          const t = this.normalizeSigned(this.outputs[j] ?? 0);
          color = this.mix(outputLow, outputHigh, t);
          radius = 6.2 * scale;
          glowAlpha = 0.28;
        } else {
          const t = layer.length <= 1 ? 0.5 : j / (layer.length - 1);
          color = this.mix(hiddenLow, hiddenHigh, t);
          radius = 3.8 * scale;
          glowAlpha = 0.2;
        }

        this.panel.circle(node.x, node.y, radius * 1.85);
        this.panel.fill({ color, alpha: glowAlpha * 0.45 });

        this.panel.circle(node.x, node.y, radius);
        this.panel.fill({ color, alpha: 0.98 });

        this.panel.circle(node.x, node.y, radius * 0.34);
        this.panel.fill({ color: 0xffffff, alpha: 0.7 });
      });
    });
  }

  layoutOutputLabels(outputLayer, px, pw, scale) {
    const outputCount = outputLayer?.length ?? 0;

    for (let i = 0; i < this.outputLabels.length; i++) {
      const label = this.outputLabels[i];

      if (i >= outputCount) {
        label.visible = false;
        continue;
      }

      const node = outputLayer[i];
      const labelText = this.outputLabelsText[i] ?? `out ${i}`;

      label.text = labelText;
      label.visible = true;
      label.x = Math.min(node.x + 12 * scale, px + pw - 58 * scale);
      label.y = node.y - 7 * scale;
    }
  }

  layoutMetrics(px, py, pw, ph, scale) {
    const dividerY = py + ph - 64 * scale;

    this.panel.moveTo(px + 14 * scale, dividerY);
    this.panel.lineTo(px + pw - 14 * scale, dividerY);
    this.panel.stroke({ color: 0x78d7f5, alpha: 0.22, width: 2 });

    const leftX = px + 18 * scale;
    const rightX = px + pw * 0.54;
    const row1Y = dividerY + 9 * scale;
    const row2Y = dividerY + 26 * scale;

    const entries = [
      {
        x: leftX,
        y: row1Y,
        text: `Gen ${this.metrics.generation ?? 0}`,
      },
      {
        x: rightX,
        y: row1Y,
        text: `Alive ${this.metrics.alive ?? 0}/${this.metrics.population ?? 0}`,
      },
      {
        x: leftX,
        y: row2Y,
        text: `Fit ${this.formatMetricNumber(this.metrics.fitness)}`,
      },
      {
        x: rightX,
        y: row2Y,
        text: `Loops ${this.metrics.loops ?? 0}`,
      },
    ];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const label = this.metricTexts[i];

      label.text = entry.text;
      label.x = entry.x;
      label.y = entry.y;
      label.visible = true;
    }
  }

  formatMetricNumber(value) {
    const safe = Number.isFinite(value) ? value : 0;
    return Math.round(safe).toLocaleString();
  }

  normalizeSigned(value) {
    return Math.max(0, Math.min(1, (value + 1) * 0.5));
  }

  normalizeUnsigned(value) {
    return Math.max(0, Math.min(1, value));
  }

  mix(a, b, t) {
    const clamped = Math.max(0, Math.min(1, t));
    const r = Math.round(a[0] + (b[0] - a[0]) * clamped);
    const g = Math.round(a[1] + (b[1] - a[1]) * clamped);
    const bb = Math.round(a[2] + (b[2] - a[2]) * clamped);
    return (r << 16) | (g << 8) | bb;
  }
}