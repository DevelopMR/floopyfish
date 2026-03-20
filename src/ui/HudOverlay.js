import { Container, Graphics, Sprite, Text, TextStyle, Texture, Rectangle } from "pixi.js";

export class HudOverlay {
    constructor({ width, height, panelScale = 1 } = {}) {
        this.width = width ?? 1280;
        this.height = height ?? 720;
        this.panelScale = panelScale;

        this.root = new Container();
        this.root.eventMode = "passive";

        this.layout = {
            x: 18,
            y: 18,
            width: 270,
            height: 270,
            radius: 22,
            padding: 14,
            logoMaxWidth: 250,
            logoMaxHeight: 150,
            glowHeight: 164,
            dividerGap: 6,

            statsCardX: 14,
            statsCardY: 202,
            statsCardW: 182,
            statsCardH: 62,

            iconCardX: 202,
            iconCardY: 202,
            iconCardW: 62,
            iconCardH: 62,

            iconInset: 8,
        };

        this.panel = new Graphics();
        this.root.addChild(this.panel);

        this.logoSprite = new Sprite();
        this.logoSprite.visible = false;
        this.root.addChild(this.logoSprite);

        this.fittestText = new Text({
            text: "FITTEST",
            style: new TextStyle({
                fontFamily: "Arial",
                fontSize: 13,
                fontWeight: "700",
                fill: 0x9cf6ff,
                letterSpacing: 1.2,
            }),
        });
        this.root.addChild(this.fittestText);

        this.scoreLabel = this.makeLabel("Score");
        this.scoreValue = this.makeValue("0");
        this.loopLabel = this.makeLabel("Loop");
        this.loopValue = this.makeValue("0");

        this.root.addChild(this.scoreLabel);
        this.root.addChild(this.scoreValue);
        this.root.addChild(this.loopLabel);
        this.root.addChild(this.loopValue);

        this.modeIconTextures = null;
        this.modeIconSprite = new Sprite();
        this.modeIconSprite.visible = false;
        this.modeIconSprite.eventMode = "none";
        this.modeIconSprite.cursor = "default";
        /* this.modeIconSprite.on("pointertap", () => {
            this.onModeButtonPressed?.();
        }); */
        this.root.addChild(this.modeIconSprite);

        // bigger hit area for easier clicking, since the mode icon can be small
        this.modeButtonHitArea = new Graphics();
        this.modeButtonHitArea.eventMode = "static";
        this.modeButtonHitArea.cursor = "pointer";
        this.modeButtonHitArea.alpha = 0.001;
        this.modeButtonHitArea.on("pointertap", () => {
            this.onModeButtonPressed?.();
        });
        this.root.addChild(this.modeButtonHitArea);


        this.mode = "human";
        this.onModeButtonPressed = null;

        this.draw();
    }

    makeLabel(text) {
        return new Text({
            text,
            style: new TextStyle({
                fontFamily: "Arial",
                fontSize: 12,
                fontWeight: "700",
                fill: 0xc9edf4,
            }),
        });
    }

    makeValue(text) {
        return new Text({
            text,
            style: new TextStyle({
                fontFamily: "Arial",
                fontSize: 20,
                fontWeight: "800",
                fill: 0xffefb8,
            }),
        });
    }

    setLogoTexture(texture) {
        if (!texture) {
            this.logoSprite.visible = false;
            return;
        }

        this.logoSprite.texture = texture;
        this.logoSprite.visible = true;

        const { logoMaxWidth, logoMaxHeight } = this.layout;
        const scale = Math.min(
            logoMaxWidth / texture.width,
            logoMaxHeight / texture.height
        );

        this.logoSprite.scale.set(scale * this.panelScale);
        this.draw();
    }

    setModeIconTextureStrip(texture, modes = ["human", "fish", "bot"]) {
        if (!texture) {
            this.modeIconTextures = null;
            this.modeIconSprite.visible = false;
            return;
        }

        const frameWidth = texture.width / modes.length;
        const frameHeight = texture.height;

        this.modeIconTextures = {};
        modes.forEach((mode, index) => {
            this.modeIconTextures[mode] = new Texture({
                source: texture.source,
                frame: new Rectangle(
                    Math.round(index * frameWidth),
                    0,
                    Math.round(frameWidth),
                    frameHeight
                ),
            });
        });

        this.modeIconSprite.visible = true;
        this.setMode(this.mode);
    }

    setMode(mode) {
        this.mode = mode;

        if (this.modeIconTextures?.[mode]) {
            this.modeIconSprite.texture = this.modeIconTextures[mode];
            this.modeIconSprite.visible = true;
        }

        this.draw();
    }

    update({ score, loopCount, mode }) {
        this.scoreValue.text = this.formatScore(score);
        this.loopValue.text = String(loopCount ?? 0);

        if (mode) {
            this.setMode(mode);
        }
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        this.draw();
    }

    setPanelScale(panelScale) {
        this.panelScale = panelScale;
        if (this.logoSprite.texture?.width) {
            this.setLogoTexture(this.logoSprite.texture);
        }
        this.draw();
    }

    formatScore(score) {
        const safe = Number.isFinite(score) ? score : 0;
        return Math.round(safe).toLocaleString();
    }

    draw() {
        const l = this.layout;
        const x = l.x;
        const y = l.y;
        const w = l.width * this.panelScale;
        const h = l.height * this.panelScale;
        const radius = l.radius * this.panelScale;
        const pad = l.padding * this.panelScale;

        const glowX = x + pad * 0.6;
        const glowY = y + pad * 0.6;
        const glowW = w - pad * 1.2;
        const glowH = l.glowHeight * this.panelScale;

        const logoX = x + 22 * this.panelScale;
        const logoY = y + 10 * this.panelScale;

        const fittestY = y + 179 * this.panelScale;
        const dividerY = fittestY + 9 * this.panelScale;

        const statsCard = {
            x: x + l.statsCardX * this.panelScale,
            y: y + l.statsCardY * this.panelScale,
            w: l.statsCardW * this.panelScale,
            h: l.statsCardH * this.panelScale,
        };

        const iconCard = {
            x: x + l.iconCardX * this.panelScale,
            y: y + l.iconCardY * this.panelScale,
            w: l.iconCardW * this.panelScale,
            h: l.iconCardH * this.panelScale,
        };

        this.panel.clear();

        this.panel.roundRect(x, y, w, h, radius);
        this.panel.fill({ color: 0x062840, alpha: 0.68 });
        this.panel.stroke({ color: 0x96e8ff, alpha: 0.5, width: 2 });

        this.panel.roundRect(glowX, glowY, glowW, glowH, 18 * this.panelScale);
        this.panel.fill({ color: 0x82e6ff, alpha: 0.08 });

        this.drawCard(statsCard.x, statsCard.y, statsCard.w, statsCard.h);
        this.drawCard(iconCard.x, iconCard.y, iconCard.w, iconCard.h);

        // update mode button hit area to match icon card
        this.modeButtonHitArea.clear();
        this.modeButtonHitArea.roundRect(
            iconCard.x,
            iconCard.y,
            iconCard.w,
            iconCard.h,
            14 * this.panelScale
        );
        this.modeButtonHitArea.fill({ color: 0xffffff, alpha: 0.001 });

        // divider between stats and mode icon
        const dividerX = statsCard.x + statsCard.w * 0.55;
        this.panel.moveTo(dividerX, statsCard.y + 8 * this.panelScale);
        this.panel.lineTo(dividerX, statsCard.y + statsCard.h - 8 * this.panelScale);
        this.panel.stroke({ color: 0x78d7f5, alpha: 0.22, width: 2 });

        this.logoSprite.x = logoX;
        this.logoSprite.y = logoY;

        this.fittestText.x = x + pad;
        this.fittestText.y = fittestY;

        const lineStart = this.fittestText.x + this.fittestText.width + l.dividerGap * this.panelScale;
        const lineEnd = x + w - pad;
        if (lineEnd > lineStart) {
            this.panel.moveTo(lineStart, dividerY);
            this.panel.lineTo(lineEnd, dividerY);
            this.panel.stroke({ color: 0x9cf6ff, alpha: 0.42, width: 2 });
        }

        this.scoreLabel.x = statsCard.x + 16 * this.panelScale;
        this.scoreLabel.y = statsCard.y + 10 * this.panelScale;
        this.scoreValue.x = statsCard.x + 16 * this.panelScale;
        this.scoreValue.y = statsCard.y + 28 * this.panelScale;

        this.loopLabel.x = dividerX + 14 * this.panelScale;
        this.loopLabel.y = statsCard.y + 10 * this.panelScale;
        this.loopValue.x = dividerX + 14 * this.panelScale;
        this.loopValue.y = statsCard.y + 28 * this.panelScale;

        this.layoutModeIcon(iconCard);
    }

    layoutModeIcon(iconCard) {
        if (!this.modeIconSprite.texture) {
            this.modeIconSprite.visible = false;
            return;
        }

        const inset = this.layout.iconInset * this.panelScale;
        const maxW = iconCard.w - inset * 2;
        const maxH = iconCard.h - inset * 2;

        const tex = this.modeIconSprite.texture;
        const scale = Math.min(maxW / tex.width, maxH / tex.height);

        this.modeIconSprite.visible = true;
        this.modeIconSprite.scale.set(scale);
        this.modeIconSprite.x = iconCard.x + (iconCard.w - tex.width * scale) * 0.5;
        this.modeIconSprite.y = iconCard.y + (iconCard.h - tex.height * scale) * 0.5;
    }

    drawCard(x, y, w, h) {
        this.panel.roundRect(x, y, w, h, 14 * this.panelScale);
        this.panel.fill({ color: 0x0e3d5d, alpha: 0.82 });
        this.panel.stroke({ color: 0x78d7f5, alpha: 0.32, width: 2 });
    }
}