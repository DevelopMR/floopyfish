export class Brain {
    constructor({
        architecture,
        weights = null,
        biases = null,
        activations = null,
        seed = 1,
    } = {}) {
        this.architecture = architecture;
        this.seed = seed;

        this.validateArchitecture(this.architecture);

        this.activations = activations ?? this.createDefaultActivations(this.architecture);
        this.validateActivations(this.activations, this.architecture);

        this.random = this.createSeededRandom(seed);

        this.weights = weights ?? this.createRandomWeights(this.architecture);
        this.biases = biases ?? this.createRandomBiases(this.architecture);

        this.validateWeights(this.weights, this.architecture);
        this.validateBiases(this.biases, this.architecture);

        this.lastTrace = null;
    }

    forward(inputs) {
        return this.forwardDetailed(inputs).outputs;
    }

    forwardDetailed(inputs) {
        if (!Array.isArray(inputs)) {
            throw new Error("Brain.forward inputs must be an array.");
        }

        if (inputs.length !== this.architecture[0]) {
            throw new Error(
                `Brain.forward expected ${this.architecture[0]} inputs, got ${inputs.length}.`
            );
        }

        let current = inputs.slice();
        const layerActivations = [current.slice()];

        for (let layerIndex = 0; layerIndex < this.weights.length; layerIndex++) {
            const weightMatrix = this.weights[layerIndex];
            const biasVector = this.biases[layerIndex];
            const activationName = this.activations[layerIndex];
            const activationFn = this.getActivationFunction(activationName);

            const next = new Array(weightMatrix.length).fill(0);

            for (let to = 0; to < weightMatrix.length; to++) {
                let sum = biasVector[to];

                for (let from = 0; from < weightMatrix[to].length; from++) {
                    sum += weightMatrix[to][from] * current[from];
                }

                next[to] = activationFn(sum);
            }

            current = next;
            layerActivations.push(current.slice());
        }

        const result = {
            outputs: current.slice(),
            layerActivations,
        };

        this.lastTrace = result;
        return result;
    }

    clone() {
        return new Brain({
            architecture: this.architecture.slice(),
            weights: this.weights.map(layer => layer.map(row => row.slice())),
            biases: this.biases.map(layer => layer.slice()),
            activations: this.activations.slice(),
            seed: this.seed,
        });
    }

    toJSON() {
        return {
            architecture: this.architecture.slice(),
            weights: this.weights.map(layer => layer.map(row => row.slice())),
            biases: this.biases.map(layer => layer.slice()),
            activations: this.activations.slice(),
            seed: this.seed,
        };
    }

    static fromJSON(data) {
        return new Brain(data);
    }

    createDefaultActivations(architecture) {
        return new Array(architecture.length - 1).fill("tanh");
    }

    createRandomWeights(architecture) {
        const layers = [];

        for (let i = 0; i < architecture.length - 1; i++) {
            const inputCount = architecture[i];
            const outputCount = architecture[i + 1];
            const limit = 1 / Math.sqrt(Math.max(1, inputCount));

            const matrix = [];

            for (let to = 0; to < outputCount; to++) {
                const row = [];

                for (let from = 0; from < inputCount; from++) {
                    row.push(this.randomBetween(-limit, limit));
                }

                matrix.push(row);
            }

            layers.push(matrix);
        }

        return layers;
    }

    createRandomBiases(architecture) {
        const layers = [];

        for (let i = 1; i < architecture.length; i++) {
            const count = architecture[i];
            const vector = new Array(count).fill(0).map(() => this.randomBetween(-0.1, 0.1));
            layers.push(vector);
        }

        return layers;
    }

    randomBetween(min, max) {
        return min + (max - min) * this.random();
    }

    getActivationFunction(name) {
        const registry = {
            tanh: (x) => Math.tanh(x),
            sigmoid: (x) => 1 / (1 + Math.exp(-x)),
            relu: (x) => Math.max(0, x),
            leakyRelu: (x) => (x < 0 ? x * 0.01 : x),
            linear: (x) => x,
        };

        const fn = registry[name];
        if (!fn) {
            throw new Error(`Unsupported activation: ${name}`);
        }

        return fn;
    }

    validateArchitecture(architecture) {
        if (!Array.isArray(architecture)) {
            throw new Error("Brain architecture must be an array.");
        }

        if (architecture.length < 2) {
            throw new Error("Brain architecture must have at least 2 layers.");
        }

        architecture.forEach((size, index) => {
            if (!Number.isInteger(size) || size < 1) {
                throw new Error(`Brain architecture layer ${index} must be an integer >= 1.`);
            }
        });
    }

    validateActivations(activations, architecture) {
        if (!Array.isArray(activations)) {
            throw new Error("Brain activations must be an array.");
        }

        const expected = architecture.length - 1;
        if (activations.length !== expected) {
            throw new Error(`Brain activations must have length ${expected}.`);
        }

        activations.forEach((name, index) => {
            if (typeof name !== "string") {
                throw new Error(`Brain activation at index ${index} must be a string.`);
            }
            this.getActivationFunction(name);
        });
    }

    validateWeights(weights, architecture) {
        if (!Array.isArray(weights)) {
            throw new Error("Brain weights must be an array.");
        }

        if (weights.length !== architecture.length - 1) {
            throw new Error("Brain weights layer count does not match architecture.");
        }

        for (let layerIndex = 0; layerIndex < weights.length; layerIndex++) {
            const expectedRows = architecture[layerIndex + 1];
            const expectedCols = architecture[layerIndex];
            const matrix = weights[layerIndex];

            if (!Array.isArray(matrix) || matrix.length !== expectedRows) {
                throw new Error(`Brain weights[${layerIndex}] row count mismatch.`);
            }

            for (let rowIndex = 0; rowIndex < matrix.length; rowIndex++) {
                const row = matrix[rowIndex];

                if (!Array.isArray(row) || row.length !== expectedCols) {
                    throw new Error(
                        `Brain weights[${layerIndex}][${rowIndex}] column count mismatch.`
                    );
                }
            }
        }
    }

    validateBiases(biases, architecture) {
        if (!Array.isArray(biases)) {
            throw new Error("Brain biases must be an array.");
        }

        if (biases.length !== architecture.length - 1) {
            throw new Error("Brain biases layer count does not match architecture.");
        }

        for (let layerIndex = 0; layerIndex < biases.length; layerIndex++) {
            const expectedCount = architecture[layerIndex + 1];
            const vector = biases[layerIndex];

            if (!Array.isArray(vector) || vector.length !== expectedCount) {
                throw new Error(`Brain biases[${layerIndex}] size mismatch.`);
            }
        }
    }

    createSeededRandom(seed) {
        let state = (seed >>> 0) || 1;

        return () => {
            state = (1664525 * state + 1013904223) >>> 0;
            return state / 4294967296;
        };
    }
}