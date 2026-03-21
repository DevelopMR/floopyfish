# Floopy Fish

Floopy Fish is a PixiJS-based underwater simulation/game where fish learn to navigate a procedural coral reef using vision-based neural inputs and evolutionary training.

This project is also something more personal: it is a hands-on learning journey in becoming a better **vibe coder** — learning how to collaborate with AI, shape systems through clear direction, iterate on ideas, and turn rough instincts into structured, working software.

## What This Project Is

Floopy Fish sits at the intersection of:

- arcade-style game feel
- procedural environment generation
- neural-network-driven agents
- evolutionary simulation
- human + AI co-development

At first glance, it looks like a fish swimming through coral.

Under the hood, it is a growing platform for experimenting with:

- agent perception
- movement control
- reward shaping
- population training
- simulation fairness
- visual debugging
- emergent behavior

The long-term goal is not just to make a playable fish project. It is to create a simulation that is interesting to watch, deterministic enough to reason about, and rich enough to teach both the fish and the developer something new.

## Why This Exists

This repository is part of a learning process.

The goal is not only to build Floopy Fish, but to build the skills needed to direct AI-assisted software creation well. In that sense, this repo is also a record of learning how to:

- break vague ideas into buildable systems
- communicate intent clearly
- iterate without losing direction
- use AI as a collaborator rather than a code vending machine
- preserve architecture while still moving fast
- balance experimentation with maintainability

This is vibe coding with intent.

## Current Project Direction

Floopy Fish has evolved from a simple fish game into a simulation platform for training and observing many fish agents at once.

The current direction includes:

- a procedural reef environment
- current-driven fish physics
- ray-based vision sensing
- neural controllers
- evolutionary selection and mutation
- generation-based training
- overlays for HUD and brain inspection
- player mode and fish mode for comparison

The system is designed to support hundreds of agents while staying visually understandable and architecturally extensible.

## Core Gameplay / Simulation Concept

Each fish tries to survive and move through a reef environment.

Fish perceive the world through a set of forward-facing vision rays. Those readings, along with movement/environment signals, are converted into normalized neural inputs. A neural network produces continuous thrust outputs that control movement.

Over repeated trials and generations:

- weak fish fail
- stronger fish survive longer
- fitter genomes are selected
- offspring are produced through mutation and inheritance
- behavior gradually improves

The intended result is emergent navigation behavior rather than hand-authored movement.

## Design Principles

### 1. Emergent behavior over scripted behavior
The fish should learn to navigate through training pressure, not through hardcoded path-following logic.

### 2. Deterministic enough to study
The simulation should be fair and stable enough that changes in behavior can be connected to changes in inputs, rewards, and evolution settings.

### 3. Visual clarity matters
This project is meant to be watched, debugged, and learned from. Overlays, ray visualization, and HUD feedback are part of the design, not an afterthought.

### 4. Architecture should support experimentation
The codebase should make it easy to tune rewards, swap controllers, inspect brain activity, and evolve the simulation without rewriting everything.

### 5. This is a learning repo
Clean progress matters more than pretending to be polished. The project should remain understandable to a developer growing into better instincts.

## Tech Stack

- **JavaScript**
- **PixiJS 8**
- browser-based rendering
- modular game/simulation architecture

## Repository Structure

```text
src/
├── ai/
│   ├── Brain.js
│   ├── FishController.js
│   ├── Genome.js
│   ├── NeuralInputBuilder.js
│   ├── PlayerKeyboardController.js
│   └── ScriptedController.js
├── entities/
│   ├── Coral.js
│   └── Fish.js
├── input/
│   └── KeyboardController.js
├── simulation/
│   ├── EvolutionSystem.js
│   ├── FitnessSystem.js
│   ├── GapRewardSystem.js
│   ├── TrialState.js
│   └── TrialSystem.js
├── systems/
│   ├── CollisionSystem.js
│   ├── CurrentSystem.js
│   ├── DifficultySystem.js
│   ├── ReefCollisionSystem.js
│   ├── ReefGenerator.js
│   ├── SensorSystem.js
│   └── SpawnSystem.js
├── ui/
│   ├── BrainOverlay.js
│   └── HudOverlay.js
├── counter.js
├── game.js
├── main.js
├── Matt.js
└── style.css
