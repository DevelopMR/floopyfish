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

    this.titleText = new Text({
      text: "Brain Tank",
      style: new TextStyle({
        fontFamily: "Arial",
        fontSize: 20,
        fontWeight: "800",
        fill: 0xeeffff,
      }),
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

    this.draw();
  }

  update({ architecture, inputs, outputs, outputLabels, metrics }) {
    if (architecture) this.architecture = architecture;
    if (inputs) this.inputs = inputs;
    if (outputs) this.outputs = outputs;
    if (outputLabels) this.outputLabelsText = outputLabels;
    if (metrics) {
      this.metrics = {
        ...this.metrics,
        ...metrics,
      };
    }

    this.draw();
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.draw();
  }

  draw() {
    const scale = this.panelScale;

    const px = this.width - 320 * scale;
    const py = 18;
    const pw = 300 * scale;
    const ph = 320 * scale;

    this.panel.clear();

    this.panel.roundRect(px, py, pw, ph, 20 * scale);
    this.panel.fill({ color: 0x062840, alpha: 0.65 });
    this.panel.stroke({ color: 0x96e8ff, alpha: 0.5, width: 2 });

    this.titleText.x = px + 16 * scale;
    this.titleText.y = py + 8 * scale;

    const metricsHeight = 52 * scale;
    const ix = px + 12 * scale;
    const iy = py + 42 * scale;
    const iw = pw - 24 * scale;
    const ih = ph - 54 * scale - metricsHeight;

    const layerCount = this.architecture.length;
    const layerSpacing = iw / Math.max(1, layerCount - 1);

    const layers = this.architecture.map((count, i) => {
      const x = ix + i * layerSpacing;
      const top = iy + 8 * scale;
      const bottom = iy + ih - 8 * scale;
      const step = (bottom - top) / Math.max(1, count - 1);

      return Array.from({ length: count }, (_, j) => ({
        x,
        y: top + j * step,
      }));
    });

    this.drawConnections(layers);
    this.drawNodes(layers);
    this.drawOutputLabels(layers[layers.length - 1], px, pw, scale);
    this.drawMetrics(px, py, pw, ph, scale);
  }

  drawConnections(layers) {
    for (let l = 0; l < layers.length - 1; l++) {
      for (const a of layers[l]) {
        for (const b of layers[l + 1]) {
          this.panel.moveTo(a.x, a.y);
          this.panel.lineTo(b.x, b.y);
          this.panel.stroke({ color: 0x78ebdc, alpha: 0.08, width: 1 });
        }
      }
    }
  }

  drawNodes(layers) {
    const low = [111, 241, 206];
    const high = [255, 195, 109];

    layers.forEach((layer, i) => {
      layer.forEach((node, j) => {
        let radius = 3;
        let color = 0x76d6e8;

        if (i === 0) {
          const t = this.inputs[j] ?? 0;
          color = this.mix(low, high, t);
          radius = 4;
        }

        if (i === layers.length - 1) {
          const t = (this.outputs[j] + 1) / 2;
          color = this.mix([94, 229, 217], [255, 164, 120], t);
          radius = 6;
        }

        this.panel.circle(node.x, node.y, radius);
        this.panel.fill({ color, alpha: 0.95 });
      });
    });
  }

  drawOutputLabels(outputLayer, px, pw, scale) {
    this.outputLabels.forEach((label) => this.root.removeChild(label));
    this.outputLabels = [];

    outputLayer.forEach((node, i) => {
      const labelText = this.outputLabelsText[i] ?? `out ${i}`;

      const label = new Text({
        text: labelText,
        style: new TextStyle({
          fontFamily: "Arial",
          fontSize: 10,
          fill: 0xf8f1e0,
        }),
      });

      label.x = Math.min(node.x + 8 * scale, px + pw - 40);
      label.y = node.y - 6;

      this.root.addChild(label);
      this.outputLabels.push(label);
    });
  }

  drawMetrics(px, py, pw, ph, scale) {
    this.metricTexts.forEach((label) => this.root.removeChild(label));
    this.metricTexts = [];

    const dividerY = py + ph - 60 * scale;

    this.panel.moveTo(px + 12 * scale, dividerY);
    this.panel.lineTo(px + pw - 12 * scale, dividerY);
    this.panel.stroke({ color: 0x78d7f5, alpha: 0.22, width: 2 });

    const leftX = px + 16 * scale;
    const rightX = px + pw * 0.53;
    const row1Y = dividerY + 8 * scale;
    const row2Y = dividerY + 24 * scale;

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

    for (const entry of entries) {
      const label = new Text({
        text: entry.text,
        style: new TextStyle({
          fontFamily: "Arial",
          fontSize: 11,
          fontWeight: "700",
          fill: 0xcfefff,
        }),
      });

      label.x = entry.x;
      label.y = entry.y;
      this.root.addChild(label);
      this.metricTexts.push(label);
    }
  }

  formatMetricNumber(value) {
    const safe = Number.isFinite(value) ? value : 0;
    return Math.round(safe).toLocaleString();
  }

  mix(a, b, t) {
    const clamped = Math.max(0, Math.min(1, t));
    const r = Math.round(a[0] + (b[0] - a[0]) * clamped);
    const g = Math.round(a[1] + (b[1] - a[1]) * clamped);
    const bb = Math.round(a[2] + (b[2] - a[2]) * clamped);
    return (r << 16) | (g << 8) | bb;
  }
}