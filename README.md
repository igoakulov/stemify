# Stemify

Stemify - learn (or teach) STEM visually with interactive scenes and AI. Generate scenes to explore subjects, concepts and problems. Edit objects, experiment, and ask anything you want. Bring your [OpenRouter](https://openrouter.ai) API key.

[Download for macOS / Windows](https://github.com/igoakulov/stemify/releases)

![Stemify screenshot](public/stemify.png)

## Why Stemify?

| | Textbooks | ChatGPT (Math/Science) | Stemify |
|--|-----------|------------------------|---------|
| **Concept Freedom** | Fixed curriculum | ~70 pre-built topics | **Infinite** - any combination of concepts your chosen AI model can handle |
| **Presentation** | Static low-fi 2D diagrams | Interactive low-fi 2D graphs | **True 3D**, big-screen presentation (e.g. in class), in-scene object highlighting / annotation / inspection |
| **Interactivity** | Passive reading | Edit 2-3 parameters | **Rotate/fly** camera, inspect from any angle, view/edit all object parameters |
| **Scene Customization** | Notes in margin | None | Full editing control via **BUILD mode** (natural language) or **directly in code** with autocomplete |
| **Model Customization** | N/A | None | **Any model** via OpenRouter + **fully editable** Assistant instructions via system prompts |
| **History/Versioning** | N/A | Limited | **Full History** - full version history for every scene |
| **Data Storage** | Physical/digital | Cloud (OpenAI) | **Local-First** - 100% on your device |
| **Availability** | While you have the book | Mobile only (future availability subject to change) | Desktop, download and keep it **forever** |

## Features

- **Two Chat Modes**:
  - **BUILD** - Create or update your 3D scene with natural language
  - **ASK** - Get explanations, walkthroughs, and insights (general or scene-specific)
- **Full control, simple code**: Edit full scene or individual shapes yourself, directly in beginner-friendly code (friendly library of shapes, autocomplete)
- **Rotate Or Fly**: Rotate/zoom camera around center, or freely fly around at 1x-100x speed
- **Convenience**: Hotkeys for everything, recent scenes, autocomplete and built-in documentation, self-troubleshooting
- **Full Local History**: Runs and stores data (only) on your device: settings, scenes, versions, conversations, backup
- **Assistant Customization**: Choose ANY model (some are free), customize instructions and preferences in all system prompts

## Data Storage

No data is sent to any server except OpenRouter for AI requests. All data is stored locally on your device:

| Platform | Location |
|----------|----------|
| **macOS** | `~/Library/Application Support/stemify/` |
| **Windows** | `%APPDATA%/stemify/` |
| **Linux** | `~/.config/stemify/` |

This includes your API key, scenes and versions, conversations, and settings.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript 5
- **3D Rendering**: Three.js with React Three Fiber
- **Styling**: Tailwind CSS v4 + shadcn/ui for general, assistant-ui for chat
- **AI Integration**: OpenRouter
- **State Management**: Zustand for local state, assistant-ui for chat

## Feedback

Questions? Suggestions? [Start a discussion](https://github.com/igoakulov/stemify/discussions/1) or reach out on X:[@igoakulov](https://x.com/igoakulov).

## License

MIT
