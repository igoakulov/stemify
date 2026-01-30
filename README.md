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
- Real-time streaming responses from LLMs
- Message history with metadata (mode, model, timestamp)
- Context-aware prompts based on current scene state
- Support for multiple AI models via OpenRouter

### Scene Interaction
- Full camera control (rotate, zoom, pan)
- **R** key to reset camera view
- Direct object manipulation in the viewport
- Scene history and versioning

### Keyboard Shortcuts
- **Tab**: Toggle between Ask and Build modes (when chat input is focused)
- **⌘/Ctrl + K**: Focus chat input
- **Esc**: Blur chat input
- **R**: Reset camera view

### Customization
- Customizable system prompts for AI behavior
- Model selection (Claude, GPT-4, etc.)
- API key management
- Persistent settings across sessions

## Development

Install dependencies:

```bash
pnpm install
```

Run development server:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Create production build
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## Architecture

The application follows a modular architecture:

- `src/app/` - Next.js app router pages
- `src/components/` - React components (UI + 3D scene)
- `src/lib/` - Business logic (chat, scene management, settings)
- `src/types/` - TypeScript type definitions
- `public/prompts/` - System prompt templates

## Configuration

Create a `.env.local` file for local development:

```env
# Optional: OpenRouter API key (can also be set via UI)
OPENROUTER_API_KEY=your_key_here
```

## License

MIT
