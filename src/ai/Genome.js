import { Brain } from "./Brain.js";

let genomeIdCounter = 1;

const DEFAULT_APPEARANCE = Object.freeze({
    baseIconIndex: 0,
    heroEvent: null,          // null | "firstLooper" | future hero tags
    isHeroLine: false,        // true once this genome belongs to a hero lineage
    colorFamily: "base",      // "base" | "hero" | "wild" | future named families
    lineageAge: 0,            // generations since lineage marker was established
    wildcardFamily: null,     // null or string marker for unusual/random line
});

function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function clampInteger(value, fallback = 0, min = 0) {
    if (!Number.isFinite(value)) return fallback;
    return Math.max(min, Math.floor(value));
}

function normalizeAppearance(appearance = {}) {
    const source = isPlainObject(appearance) ? appearance : {};

    return {
        baseIconIndex: clampInteger(source.baseIconIndex, DEFAULT_APPEARANCE.baseIconIndex, 0),
        heroEvent:
            typeof source.heroEvent === "string" && source.heroEvent.trim().length > 0
                ? source.heroEvent.trim()
                : DEFAULT_APPEARANCE.heroEvent,
        isHeroLine: Boolean(source.isHeroLine),
        colorFamily:
            typeof source.colorFamily === "string" && source.colorFamily.trim().length > 0
                ? source.colorFamily.trim()
                : DEFAULT_APPEARANCE.colorFamily,
        lineageAge: clampInteger(source.lineageAge, DEFAULT_APPEARANCE.lineageAge, 0),
        wildcardFamily:
            typeof source.wildcardFamily === "string" && source.wildcardFamily.trim().length > 0
                ? source.wildcardFamily.trim()
                : DEFAULT_APPEARANCE.wildcardFamily,
    };
}

function cloneAppearance(appearance = {}) {
    return normalizeAppearance(appearance);
}

export class Genome {
    constructor({
        id = null,
        generation = 0,
        fitness = 0,
        parentIds = [],
        seed = 1,
        brain = null,
        architecture = null,
        weights = null,
        biases = null,
        activations = null,
        appearance = null,
    } = {}) {
        this.id = id ?? Genome.createId();
        this.generation = generation;
        this.fitness = fitness;
        this.parentIds = Array.isArray(parentIds) ? parentIds.slice() : [];
        this.seed = seed;
        this.appearance = normalizeAppearance(appearance);

        if (brain) {
            if (!(brain instanceof Brain)) {
                throw new Error("Genome brain must be an instance of Brain.");
            }
            this.brain = brain.clone();
        } else {
            if (!architecture) {
                throw new Error("Genome requires either a brain or an architecture.");
            }

            this.brain = new Brain({
                architecture,
                weights,
                biases,
                activations,
                seed,
            });
        }
    }

    clone({
        id = null,
        generation = this.generation,
        fitness = this.fitness,
        parentIds = null,
        seed = this.seed,
        appearance = null,
    } = {}) {
        return new Genome({
            id: id ?? Genome.createId(),
            generation,
            fitness,
            parentIds: parentIds ?? this.parentIds,
            seed,
            brain: this.brain.clone(),
            appearance: appearance ?? cloneAppearance(this.appearance),
        });
    }

    createOffspring({
        id = null,
        seed = this.seed,
        generation = this.generation + 1,
        mutationRate = 0.1,
        mutationScale = 0.15,
        biasMutationScale = mutationScale,
        parentIds = [this.id],
        appearance = null,
        incrementLineageAge = true,
    } = {}) {
        const inheritedAppearance =
            appearance ?? this.createInheritedAppearance({ incrementLineageAge });

        const child = this.clone({
            id: id ?? Genome.createId(),
            generation,
            fitness: 0,
            parentIds,
            seed,
            appearance: inheritedAppearance,
        });

        child.mutate({
            mutationRate,
            mutationScale,
            biasMutationScale,
            seed,
        });

        return child;
    }

    createInheritedAppearance({ incrementLineageAge = true } = {}) {
        const nextAppearance = cloneAppearance(this.appearance);

        if (incrementLineageAge && (nextAppearance.isHeroLine || nextAppearance.wildcardFamily)) {
            nextAppearance.lineageAge += 1;
        }

        return nextAppearance;
    }

    mutate({
        mutationRate = 0.1,
        mutationScale = 0.15,
        biasMutationScale = mutationScale,
        seed = this.seed,
    } = {}) {
        this.validateMutationNumber(mutationRate, "mutationRate");
        this.validateMutationNumber(mutationScale, "mutationScale");
        this.validateMutationNumber(biasMutationScale, "biasMutationScale");

        const random = this.createSeededRandom(seed);

        for (let layerIndex = 0; layerIndex < this.brain.weights.length; layerIndex++) {
            const matrix = this.brain.weights[layerIndex];
            for (let rowIndex = 0; rowIndex < matrix.length; rowIndex++) {
                const row = matrix[rowIndex];
                for (let colIndex = 0; colIndex < row.length; colIndex++) {
                    if (random() < mutationRate) {
                        row[colIndex] += this.randomDelta(random, mutationScale);
                    }
                }
            }
        }

        for (let layerIndex = 0; layerIndex < this.brain.biases.length; layerIndex++) {
            const vector = this.brain.biases[layerIndex];
            for (let valueIndex = 0; valueIndex < vector.length; valueIndex++) {
                if (random() < mutationRate) {
                    vector[valueIndex] += this.randomDelta(random, biasMutationScale);
                }
            }
        }

        this.seed = seed;
        return this;
    }

    setFitness(fitness) {
        if (!Number.isFinite(fitness)) {
            throw new Error("Genome fitness must be a finite number.");
        }

        this.fitness = fitness;
        return this;
    }

    setAppearance(patch = {}) {
        if (!isPlainObject(patch)) {
            throw new Error("Genome.setAppearance requires a plain object patch.");
        }

        this.appearance = normalizeAppearance({
            ...this.appearance,
            ...patch,
        });

        return this;
    }

    markHero({
        heroEvent = "firstLooper",
        colorFamily = "hero",
        baseIconIndex = this.appearance.baseIconIndex,
        resetLineageAge = true,
    } = {}) {
        this.appearance = normalizeAppearance({
            ...this.appearance,
            heroEvent,
            isHeroLine: true,
            colorFamily,
            baseIconIndex,
            lineageAge: resetLineageAge ? 0 : this.appearance.lineageAge,
        });

        return this;
    }

    setWildcardFamily(wildcardFamily, { colorFamily = "wild" } = {}) {
        this.appearance = normalizeAppearance({
            ...this.appearance,
            wildcardFamily,
            colorFamily: wildcardFamily ? colorFamily : this.appearance.colorFamily,
        });

        return this;
    }

    clearHeroEvent() {
        this.appearance = normalizeAppearance({
            ...this.appearance,
            heroEvent: null,
        });

        return this;
    }

    toJSON() {
        return {
            id: this.id,
            generation: this.generation,
            fitness: this.fitness,
            parentIds: this.parentIds.slice(),
            seed: this.seed,
            appearance: cloneAppearance(this.appearance),
            brain: this.brain.toJSON(),
        };
    }

    static fromJSON(data) {
        if (!data || typeof data !== "object") {
            throw new Error("Genome.fromJSON requires a data object.");
        }

        return new Genome({
            id: data.id,
            generation: data.generation,
            fitness: data.fitness,
            parentIds: data.parentIds,
            seed: data.seed,
            appearance: data.appearance,
            brain: Brain.fromJSON(data.brain),
        });
    }

    static createId() {
        const id = `genome-${genomeIdCounter}`;
        genomeIdCounter += 1;
        return id;
    }

    validateMutationNumber(value, name) {
        if (!Number.isFinite(value) || value < 0) {
            throw new Error(`${name} must be a finite number >= 0.`);
        }
    }

    randomDelta(random, scale) {
        return (random() * 2 - 1) * scale;
    }

    createSeededRandom(seed) {
        let state = (seed >>> 0) || 1;

        return () => {
            state = (1664525 * state + 1013904223) >>> 0;
            return state / 4294967296;
        };
    }
}