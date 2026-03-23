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
        heroEventName = "firstLooper",
        heroColorFamily = "hero",
        inheritedDriftAmount = 0.05,
        virginVariantCount = 5,

        // zero-based: old "icons 3 and 5"
        firstLooperIconChoices = [2, 4],

        // zero-based, excluding base 0, dead 5, ghost 8
        generalHeroIconChoices = [1, 2, 3, 4, 6, 7],
        deadIconIndex = 5,
        ghostIconIndex = 8,
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

        this.heroEventName = heroEventName;
        this.heroColorFamily = heroColorFamily;
        this.inheritedDriftAmount = inheritedDriftAmount;
        this.virginVariantCount = virginVariantCount;

        this.firstLooperIconChoices = firstLooperIconChoices.slice();
        this.generalHeroIconChoices = generalHeroIconChoices
            .filter((index) => index !== deadIconIndex && index !== ghostIconIndex)
            .slice();

        this.deadIconIndex = deadIconIndex;
        this.ghostIconIndex = ghostIconIndex;

        this.heroLineCounter = 0;
        this.virginVariantCounter = 0;

        this.validateConfiguration();

        this.random = this.createSeededRandom(seed);
        this.generationIndex = 0;
        this.genomes = [];
        this.activeBatchStart = 0;
        this.lastGenerationSummary = null;

        this.currentGenerationHeroGenomeId = null;
        this.currentGenerationHeroRecord = null;
    }

    initializePopulation() {
        this.genomes = [];

        for (let i = 0; i < this.populationSize; i++) {
            this.genomes.push(this.createRandomGenome({ generation: 0 }));
        }

        this.seedVirginVariants(this.genomes);

        this.generationIndex = 0;
        this.activeBatchStart = 0;
        this.lastGenerationSummary = null;
        this.clearGenerationHero();

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
        const genome = this.findGenomeById(genomeId);

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

    findGenomeById(genomeId) {
        return this.genomes.find((entry) => entry.id === genomeId) ?? null;
    }

    hasGenerationHero() {
        return Boolean(this.getGenerationHeroGenome());
    }

    getGenerationHeroGenome() {
        if (this.currentGenerationHeroGenomeId) {
            const trackedHero = this.findGenomeById(this.currentGenerationHeroGenomeId);
            if (trackedHero) {
                return trackedHero;
            }
        }

        const inferredHero = this.genomes.find(
            (genome) =>
                genome.appearance?.heroEvent === this.heroEventName &&
                genome.appearance?.isHeroLine
        );

        return inferredHero ?? null;
    }

    getGenerationHeroRecord() {
        return this.currentGenerationHeroRecord ? { ...this.currentGenerationHeroRecord } : null;
    }

    clearGenerationHero() {
        this.currentGenerationHeroGenomeId = null;
        this.currentGenerationHeroRecord = null;
    }

    chooseFromPool(pool) {
        const choices = Array.isArray(pool) && pool.length > 0 ? pool : [0];
        const index = Math.floor(this.random() * choices.length);
        return choices[index];
    }

    randomChannel(min = 70, max = 235) {
        return Math.floor(min + this.random() * (max - min));
    }

    randomStrongTint() {
        const r = this.randomChannel();
        const g = this.randomChannel();
        const b = this.randomChannel();
        return (r << 16) | (g << 8) | b;
    }

    tintToRgb(tint) {
        return {
            r: (tint >> 16) & 0xff,
            g: (tint >> 8) & 0xff,
            b: tint & 0xff,
        };
    }

    rgbToTint(r, g, b) {
        return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
    }

    blendTint(baseTint, targetTint, amount) {
        const alpha = Math.max(0, Math.min(1, amount));
        const base = this.tintToRgb(baseTint);
        const target = this.tintToRgb(targetTint);

        return this.rgbToTint(
            Math.round(base.r + (target.r - base.r) * alpha),
            Math.round(base.g + (target.g - base.g) * alpha),
            Math.round(base.b + (target.b - base.b) * alpha)
        );
    }

    applyDriftToTint(baseTint, amount = this.inheritedDriftAmount) {
        const targetTint = this.randomStrongTint();
        return this.blendTint(baseTint, targetTint, amount);
    }

    createHeroColorFamilyToken(prefix, genome) {
        const safeGenomeId = String(genome?.id ?? "unknown").replace(/[^a-zA-Z0-9_-]/g, "");
        return `${prefix}-${this.generationIndex}-${this.heroLineCounter++}-${safeGenomeId}`;
    }

    createVirginVariantToken(genome) {
        const safeGenomeId = String(genome?.id ?? "unknown").replace(/[^a-zA-Z0-9_-]/g, "");
        return `virgin-${this.generationIndex}-${this.virginVariantCounter++}-${safeGenomeId}`;
    }

    createInheritedAppearanceFromParent(parentGenome) {
        const baseAppearance = parentGenome.createInheritedAppearance({ incrementLineageAge: true });

        return {
            ...baseAppearance,
            heroEvent: null,
            tintHex: this.applyDriftToTint(baseAppearance.tintHex ?? 0xffffff),
        };
    }

    markFirstLooperHero(genomeId) {
        if (this.currentGenerationHeroGenomeId) {
            return this.getGenerationHeroGenome();
        }

        const genome = this.findGenomeById(genomeId);
        if (!genome) {
            throw new Error(`EvolutionSystem could not find genome for hero mark: ${genomeId}`);
        }

        const baseIconIndex = this.chooseFromPool(this.firstLooperIconChoices);
        const tintHex = this.randomStrongTint();
        const colorFamily = this.createHeroColorFamilyToken("hero-line", genome);

        genome.markHero({
            heroEvent: this.heroEventName,
            colorFamily,
            baseIconIndex,
            tintHex,
            resetLineageAge: true,
        });

        this.currentGenerationHeroGenomeId = genome.id;
        this.currentGenerationHeroRecord = {
            generation: this.generationIndex,
            genomeId: genome.id,
            heroEvent: this.heroEventName,
            colorFamily,
            baseIconIndex,
            tintHex,
            fitnessAtMark: Number.isFinite(genome.fitness) ? genome.fitness : 0,
        };

        return genome;
    }

    promoteGenomeVisual(
        genomeId,
        {
            heroEvent = "specialWrap",
            iconChoices = this.generalHeroIconChoices,
            resetLineageAge = false,
            forceNewTint = true,
            forceNewIcon = true,
            keepHeroLine = true,
        } = {}
    ) {
        const genome = this.findGenomeById(genomeId);
        if (!genome) {
            throw new Error(`EvolutionSystem could not find genome for visual promotion: ${genomeId}`);
        }

        const nextTint = forceNewTint
            ? this.randomStrongTint()
            : this.applyDriftToTint(genome.appearance?.tintHex ?? 0xffffff, 0.18);

        const nextIcon = forceNewIcon
            ? this.chooseFromPool(iconChoices)
            : genome.appearance?.baseIconIndex ?? 0;

        genome.markHero({
            heroEvent,
            colorFamily: keepHeroLine
                ? (genome.appearance?.colorFamily || this.createHeroColorFamilyToken("hero-line", genome))
                : genome.appearance?.colorFamily || "base",
            baseIconIndex: nextIcon,
            tintHex: nextTint,
            resetLineageAge,
        });

        return genome;
    }

    seedVirginVariants(genomes) {
        const pool = genomes.filter(
            (genome) =>
                Array.isArray(genome.parentIds) &&
                genome.parentIds.length === 0 &&
                !genome.appearance?.isHeroLine
        );

        const count = Math.min(this.virginVariantCount, pool.length);
        const used = new Set();

        for (let i = 0; i < count; i++) {
            let chosen = null;

            for (let attempts = 0; attempts < 12 && !chosen; attempts++) {
                const candidate = pool[Math.floor(this.random() * pool.length)];
                if (candidate && !used.has(candidate.id)) {
                    chosen = candidate;
                }
            }

            if (!chosen) {
                break;
            }

            used.add(chosen.id);

            chosen.setAppearance({
                baseIconIndex: this.chooseFromPool(this.generalHeroIconChoices),
                tintHex: this.randomStrongTint(),
                colorFamily: this.createVirginVariantToken(chosen),
                isHeroLine: false,
                heroEvent: null,
                lineageAge: 0,
            });
        }
    }

    evolveNextGeneration() {
        if (!this.isGenerationComplete()) {
            throw new Error("Cannot evolve next generation before all genomes have finite fitness.");
        }

        const sorted = this.getSortedGenomes();
        const counts = this.calculateGenerationCounts();
        const heroSource = this.getGenerationHeroGenome();

        const elites = sorted.slice(0, counts.elites);
        const breedingPool = this.buildBreedingPool(sorted, counts, heroSource);
        const nextGeneration = [];
        const reservedSourceIds = new Set();
        const randomGenomes = [];

        if (heroSource) {
            nextGeneration.push(
                heroSource.clone({
                    generation: this.generationIndex + 1,
                    fitness: 0,
                    parentIds: [heroSource.id],
                    seed: this.nextSeed(),
                    appearance: this.createInheritedAppearanceFromParent(heroSource),
                })
            );
            reservedSourceIds.add(heroSource.id);
        }

        for (const elite of elites) {
            if (reservedSourceIds.has(elite.id)) {
                continue;
            }

            nextGeneration.push(
                elite.clone({
                    generation: this.generationIndex + 1,
                    fitness: 0,
                    parentIds: [elite.id],
                    seed: this.nextSeed(),
                    appearance: this.createInheritedAppearanceFromParent(elite),
                })
            );

            reservedSourceIds.add(elite.id);

            if (nextGeneration.length >= this.populationSize) {
                break;
            }
        }

        for (let i = 0; i < counts.offspring && nextGeneration.length < this.populationSize; i++) {
            const parent = this.selectWeightedParent(breedingPool);

            nextGeneration.push(
                parent.createOffspring({
                    generation: this.generationIndex + 1,
                    fitness: 0,
                    seed: this.nextSeed(),
                    mutationRate: this.mutationRate,
                    mutationScale: this.mutationScale,
                    biasMutationScale: this.biasMutationScale,
                    appearance: this.createInheritedAppearanceFromParent(parent),
                })
            );
        }

        for (let i = 0; i < counts.random && nextGeneration.length < this.populationSize; i++) {
            const genome = this.createRandomGenome({ generation: this.generationIndex + 1 });
            randomGenomes.push(genome);
            nextGeneration.push(genome);
        }

        while (nextGeneration.length < this.populationSize) {
            const parent = this.selectWeightedParent(breedingPool);

            nextGeneration.push(
                parent.createOffspring({
                    generation: this.generationIndex + 1,
                    fitness: 0,
                    seed: this.nextSeed(),
                    mutationRate: this.mutationRate,
                    mutationScale: this.mutationScale,
                    biasMutationScale: this.biasMutationScale,
                    appearance: this.createInheritedAppearanceFromParent(parent),
                })
            );
        }

        this.seedVirginVariants(randomGenomes);

        if (nextGeneration.length > this.populationSize) {
            nextGeneration.length = this.populationSize;
        }

        this.lastGenerationSummary = {
            generation: this.generationIndex,
            populationSize: this.populationSize,
            bestFitness: sorted[0]?.fitness ?? 0,
            medianFitness: this.getMedianFitness(sorted),
            eliteCount: counts.elites,
            breedingPoolCount: breedingPool.length,
            offspringCount: counts.offspring,
            randomCount: counts.random,
            bestGenomeId: sorted[0]?.id ?? null,
            heroGenomeId: heroSource?.id ?? null,
            heroCarriedForward: Boolean(heroSource),
            heroColorFamily: heroSource?.appearance?.colorFamily ?? null,
            heroIconIndex: heroSource?.appearance?.baseIconIndex ?? null,
        };

        this.genomes = nextGeneration;
        this.generationIndex += 1;
        this.activeBatchStart = 0;
        this.clearGenerationHero();

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

    buildBreedingPool(sorted, counts, heroSource = null) {
        const pool = sorted.slice(0, counts.breedingPool);

        if (!heroSource) {
            return pool;
        }

        const alreadyIncluded = pool.some((genome) => genome.id === heroSource.id);
        if (!alreadyIncluded) {
            pool.push(heroSource);
        }

        return pool;
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
            appearance: {
                baseIconIndex: 0,
                tintHex: 0xffffff,
            },
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
            [this.inheritedDriftAmount, "inheritedDriftAmount"],
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