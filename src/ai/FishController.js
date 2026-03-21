export class FishController {
    constructor({ inputBuilder, brain } = {}) {
        this.inputBuilder = inputBuilder;
        this.brain = brain ?? null;

        this.lastInputs = [];
        this.lastOutputs = [0, 0];
        this.lastTrace = null;
    }

    update({ fish, rayResults, current }) {
        if (!this.inputBuilder) {
            this.lastInputs = new Array(14).fill(0);
            this.lastOutputs = [0, 0];
            this.lastTrace = null;
            return;
        }

        const inputs = this.inputBuilder.build({
            fish,
            rayResults,
            current,
        });

        this.lastInputs = inputs;

        if (!this.brain) {
            this.lastOutputs = [0, 0];
            this.lastTrace = null;
            return;
        }

        const trace = this.brain.forwardDetailed(inputs);
        this.lastTrace = trace;
        this.lastOutputs = trace.outputs;
    }

    getOutput() {
        return {
            thrustX: this.lastOutputs[0] ?? 0,
            thrustY: this.lastOutputs[1] ?? 0,
        };
    }

    setBrain(brain) {
        this.brain = brain;
    }
}