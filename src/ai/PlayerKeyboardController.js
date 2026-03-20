export class PlayerKeyboardController {
    constructor(keyboard) {
        this.keyboard = keyboard;
        this.lastInputs = new Array(14).fill(0);
        this.lastOutputs = [0, 0];
    }

    update() {
        let thrustX = 0;
        let thrustY = 0;

        if (this.keyboard?.isDown?.("KeyW")) thrustY -= 0.35;
        if (this.keyboard?.isDown?.("KeyS")) thrustY += 0.35;
        if (this.keyboard?.isDown?.("KeyD")) thrustX += 0.35;
        if (this.keyboard?.isDown?.("KeyA")) thrustX -= 0.2275;

        this.lastOutputs = [thrustX, thrustY];
    }

    getOutput() {
        return {
            thrustX: this.lastOutputs[0],
            thrustY: this.lastOutputs[1],
        };
    }
}