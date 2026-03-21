import { Genome } from "../ai/Genome.js";

export class EvolutionSystem {
    constructor({
        populationSize = 350,
        batchSize = populationSize,
        architecture = [14, 12, 8, 2],
        activations = null,
        eliteSurvivalRate = 0.10,
        breedingPoolRate = 0.25,
        offspringRate = 0.50,
        randomRate = 0.40,
        mutationRate = 0.10,
        mutationScale = 0.15,
        biasMutationScale = mutationScale,
        seed = 1,
    } = {}) {
        this.populationSize = populationSize;
        this.batchSize = batchSize;
        this.architecture = architecture;
        this.activations = activations;

        this.eliteSurvivalRate = eliteSurvivalRate;
        this.breedingPoolRate = breedingPoolRate;
        this.offspringRate = offspringRate;
        this.randomRate = randomRate;

        this.mutationRate = mutationRate;
        this.mutationScale = mutationScale;
        this.biasMutationScale = biasMutationScale;
        this.seed = seed;

        this.validateConfiguration();

        this.random = this.createSeededRandom(seed);
        this.generationIndex = 0;
        this.genomes = [];
        this.activeBatchStart = 0;
        this.lastGenerationSummary = null;
    }

    initializePopulation() {
        this.genomes = [];

        for (let i = 0; i < this.populationSize; i++) {
            this.genomes.push(this.createRandomGenome({ generation: 0 }));
        }

        this.generationIndex = 0;
        this.activeBatchStart = 0;
        this.lastGenerationSummary = null;

        return this.genomes;
    }

    getGenerationGenomes() {
        return this.genomes;
    }

    getPopulationSize() {
        return this.populationSize;
    }

    getBatchSize() {
        return Math.min(this.batchSize, this.populationSize);
    }

    getActiveBatch() {
        const start = this.activeBatchStart;
        const end = Math.min(start + this.getBatchSize(), this.genomes.length);
        return this.genomes.slice(start, end);
    }

    hasMoreBatches() {
        return this.activeBatchStart + this.getBatchSize() < this.genomes.length;
    }

    advanceToNextBatch() {
        if (!this.hasMoreBatches()) {
            return null;
        }

        this.activeBatchStart += this.getBatchSize();
        return this.getActiveBatch();
    }

    restartBatchTraversal() {
        this.activeBatchStart = 0;
        return this.getActiveBatch();
    }

    recordFitness(genomeId, fitness) {
        const genome = this.genomes.find((entry) => entry.id === genomeId);
        if (!genome) {
            throw new Error(`EvolutionSystem could not find genome: ${genomeId}`);
        }

        genome.setFitness(fitness);
        return genome;
    }

    recordFitnessMap(fitnessByGenomeId) {
        if (!fitnessByGenomeId || typeof fitnessByGenomeId !== "object") {
            throw new Error("recordFitnessMap requires an object keyed by genome id.");
        }

        Object.entries(fitnessByGenomeId).forEach(([genomeId, fitness]) => {
            this.recordFitness(genomeId, fitness);
        });
    }

    isGenerationComplete() {
        return this.genomes.length > 0 && this.genomes.every((genome) => Number.isFinite(genome.fitness));
    }

    getSortedGenomes() {
        return this.genomes.slice().sort((a, b) => b.fitness - a.fitness);
    }

    evolveNextGeneration() {
        if (!this.isGenerationComplete()) {
            throw new Error("Cannot evolve next generation before all genomes have finite fitness.");
        }

        const sorted = this.getSortedGenomes();
        const counts = this.calculateGenerationCounts();
        const elites = sorted.slice(0, counts.elites);
        const breedingPool = sorted.slice(0, counts.breedingPool);

        const nextGeneration = [];

        for (const elite of elites) {
            nextGeneration.push(elite.clone({
                generation: this.generationIndex + 1,
                fitness: 0,
                parentIds: [elite.id],
                seed: this.nextSeed(),
            }));
        }

        for (let i = 0; i < counts.offspring; i++) {
            const parent = this.selectWeightedParent(breedingPool);
            nextGeneration.push(parent.createOffspring({
                generation: this.generationIndex + 1,
                fitness: 0,
                seed: this.nextSeed(),
                mutationRate: this.mutationRate,
                mutationScale: this.mutationScale,
                biasMutationScale: this.biasMutationScale,
            }));
        }

        for (let i = 0; i < counts.random; i++) {
            nextGeneration.push(this.createRandomGenome({ generation: this.generationIndex + 1 }));
        }

        while (nextGeneration.length < this.populationSize) {
            const parent = this.selectWeightedParent(breedingPool);
            nextGeneration.push(parent.createOffspring({
                generation: this.generationIndex + 1,
                fitness: 0,
                seed: this.nextSeed(),
                mutationRate: this.mutationRate,
                mutationScale: this.mutationScale,
                biasMutationScale: this.biasMutationScale,
            }));
        }

        if (nextGeneration.length > this.populationSize) {
            nextGeneration.length = this.populationSize;
        }

        this.lastGenerationSummary = {
            generation: this.generationIndex,
            populationSize: this.populationSize,
            bestFitness: sorted[0]?.fitness ?? 0,
            medianFitness: this.getMedianFitness(sorted),
            eliteCount: counts.elites,
            breedingPoolCount: counts.breedingPool,
            offspringCount: counts.offspring,
            randomCount: counts.random,
            bestGenomeId: sorted[0]?.id ?? null,
        };

        this.genomes = nextGeneration;
        this.generationIndex += 1;
        this.activeBatchStart = 0;

        return this.genomes;
    }

    getLastGenerationSummary() {
        return this.lastGenerationSummary;
    }

    calculateGenerationCounts() {
        const elites = Math.max(1, Math.round(this.populationSize * this.eliteSurvivalRate));
        const breedingPool = Math.max(elites, Math.round(this.populationSize * this.breedingPoolRate));
        const offspring = Math.max(0, Math.round(this.populationSize * this.offspringRate));
        const random = Math.max(0, Math.round(this.populationSize * this.randomRate));

        return {
            elites,
            breedingPool,
            offspring,
            random,
        };
    }

    selectWeightedParent(pool) {
        if (!Array.isArray(pool) || pool.length === 0) {
            throw new Error("selectWeightedParent requires a non-empty breeding pool.");
        }

        const minFitness = Math.min(...pool.map((genome) => genome.fitness));
        const offset = minFitness < 0 ? Math.abs(minFitness) + 1 : 1;
        const weights = pool.map((genome) => Math.max(0, genome.fitness + offset));
        const totalWeight = weights.reduce((sum, value) => sum + value, 0);

        if (totalWeight <= 0) {
            const index = Math.floor(this.random() * pool.length);
            return pool[index];
        }

        let roll = this.random() * totalWeight;

        for (let i = 0; i < pool.length; i++) {
            roll -= weights[i];
            if (roll <= 0) {
                return pool[i];
            }
        }

        return pool[pool.length - 1];
    }

    createRandomGenome({ generation = 0 } = {}) {
        return new Genome({
            generation,
            fitness: 0,
            seed: this.nextSeed(),
            architecture: this.architecture.slice(),
            activations: this.activations ? this.activations.slice() : null,
        });
    }

    getMedianFitness(sortedGenomes = null) {
        const sorted = sortedGenomes ?? this.getSortedGenomes();
        if (sorted.length === 0) {
            return 0;
        }

        const middle = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 0) {
            return (sorted[middle - 1].fitness + sorted[middle].fitness) * 0.5;
        }

        return sorted[middle].fitness;
    }

    nextSeed() {
        return Math.floor(this.random() * 0xffffffff) >>> 0;
    }

    validateConfiguration() {
        if (!Number.isInteger(this.populationSize) || this.populationSize < 1) {
            throw new Error("EvolutionSystem populationSize must be an integer >= 1.");
        }

        if (!Number.isInteger(this.batchSize) || this.batchSize < 1) {
            throw new Error("EvolutionSystem batchSize must be an integer >= 1.");
        }

        [
            [this.eliteSurvivalRate, "eliteSurvivalRate"],
            [this.breedingPoolRate, "breedingPoolRate"],
            [this.offspringRate, "offspringRate"],
            [this.randomRate, "randomRate"],
            [this.mutationRate, "mutationRate"],
            [this.mutationScale, "mutationScale"],
            [this.biasMutationScale, "biasMutationScale"],
        ].forEach(([value, name]) => {
            if (!Number.isFinite(value) || value < 0) {
                throw new Error(`EvolutionSystem ${name} must be a finite number >= 0.`);
            }
        });
    }

    createSeededRandom(seed) {
        let state = (seed >>> 0) || 1;

        return () => {
            state = (1664525 * state + 1013904223) >>> 0;
            return state / 4294967296;
        };
    }
}