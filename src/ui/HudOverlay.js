import { Container, Graphics, Sprite, Text, TextStyle } from "pixi.js";

export class HudOverlay {
    constructor({ width, height, panelScale = 1 } = {}) {
        this.width = width ?? 1280;
        this.height = height ?? 720;
        this.panelScale = panelScale;

        this.root = new Container();
        this.root.eventMode = "none";

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
            statTop: 203,
            cardHeight: 50,
            cardGap: 10,
            dividerGap: 6,
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
        this.loopLabel = this.makeLabel("Loop Count");
        this.loopValue = this.makeValue("0");

        this.root.addChild(this.scoreLabel);
        this.root.addChild(this.scoreValue);
        this.root.addChild(this.loopLabel);
        this.root.addChild(this.loopValue);

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

    update({ score, loopCount }) {
        this.scoreValue.text = this.formatScore(score);
        this.loopValue.text = String(loopCount ?? 0);
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

        const cardTop = y + l.statTop * this.panelScale;
        const cardHeight = l.cardHeight * this.panelScale;
        const cardGap = l.cardGap * this.panelScale + 9;
        const leftCardWidth = 110 * this.panelScale;
        const rightCardWidth = 110 * this.panelScale;

        const scoreCard = {
            x: x + pad,
            y: cardTop,
            w: leftCardWidth,
            h: cardHeight,
        };

        const loopCard = {
            x: scoreCard.x + scoreCard.w + cardGap,
            y: cardTop,
            w: rightCardWidth,
            h: cardHeight,
        };

        this.panel.clear();

        this.panel.roundRect(x, y, w, h, radius);
        this.panel.fill({ color: 0x062840, alpha: 0.68 });
        this.panel.stroke({ color: 0x96e8ff, alpha: 0.5, width: 2 });

        this.panel.roundRect(glowX, glowY, glowW, glowH, 18 * this.panelScale);
        this.panel.fill({ color: 0x82e6ff, alpha: 0.08 });

        this.drawCard(scoreCard.x, scoreCard.y, scoreCard.w, scoreCard.h);
        this.drawCard(loopCard.x, loopCard.y, loopCard.w, loopCard.h);

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

        this.scoreLabel.x = scoreCard.x + 16 * this.panelScale;
        this.scoreLabel.y = scoreCard.y + 7 * this.panelScale;
        this.scoreValue.x = scoreCard.x + 16 * this.panelScale;
        this.scoreValue.y = scoreCard.y + 20 * this.panelScale;

        this.loopLabel.x = loopCard.x + 16 * this.panelScale;
        this.loopLabel.y = loopCard.y + 7 * this.panelScale;
        this.loopValue.x = loopCard.x + 18 * this.panelScale;
        this.loopValue.y = loopCard.y + 20 * this.panelScale;
    }

    drawCard(x, y, w, h) {
        this.panel.roundRect(x, y, w, h, 14 * this.panelScale);
        this.panel.fill({ color: 0x0e3d5d, alpha: 0.82 });
        this.panel.stroke({ color: 0x78d7f5, alpha: 0.32, width: 2 });
    }
}