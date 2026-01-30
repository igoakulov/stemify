BUILD INTENT

The user message directly below is a request to create or update a visualization.

Requirements:
- Return ONE raw JSON object with exactly two top-level keys: `scene` and `comment`
- No markdown formatting, no code fences, no intro text
- Focus on creating a clear, educationally valuable visualization

JSON structure:
- `scene.sceneCode`: JavaScript code calling `scene.addX(...)` methods only
- Use `{x,y,z}` objects for points/vectors, NEVER `[x,y,z]` arrays
- `comment.markdown`: Educational explanation with LaTeX for equations
