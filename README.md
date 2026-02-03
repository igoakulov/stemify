# STEMify

STEMify is a local-first web application that transforms natural language descriptions into interactive, editable 3D visualizations. Built for STEM education, exploration, and prototyping.

## What It Does

- **Natural Language to 3D**: Describe physics simulations, mathematical concepts, or geometric shapes in plain English, and watch them come to life as interactive 3D scenes
- **Conversational Editing**: Chat with an AI assistant to modify, extend, or explain your visualizations
- **Dual Mode Interface**:
  - **Ask Mode**: Get explanations and insights about your scenes
  - **Build Mode**: Direct the AI to modify and create new visualizations
- **Interactive Scene Editor**: Click, drag, and manipulate objects directly in the 3D viewport
- **Local-First**: All data stored locally in your browser—no cloud dependency

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript 5
- **3D Rendering**: Three.js with React Three Fiber
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **AI Integration**: OpenRouter API (Claude, GPT, and other LLMs)
- **State Management**: Zustand for local state, assistant-ui for chat

## Key Features

### Chat Interface
- Message history with metadata (mode, model, timestamp)
- Context-aware prompts based on current scene state
- Support for multiple AI models via OpenRouter
- Keyboard shortcuts

### Scene Interaction
- Two control schemes: Rotate & Fly
- Inpect and edit object parameters
- Scene history and versioning
- Keyboard shortcuts

### Customization
- Customizable system prompts for AI behavior
- Model selection (Claude, GPT-4, etc.)
- BYOK (OpenRouter)
- Persistent settings across sessions

## License

MIT
