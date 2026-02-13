# BUILD MODE

The user selected **BUILD** mode. Their message directly below is a request to create or update a visualization.

Requirements:
- Return ONE raw JSON object with exactly two top-level keys: `scene` and `comment`
- No markdown formatting, no code fences, no intro text
- Focus on creating a clear, educationally valuable visualization
- The response is VALID ONLY if it follows ## 2D Primitives, ## 3D Primitives, and ## Groups & Composition exactly

JSON structure:
- `scene.sceneCode`: JavaScript code calling `scene.addX(...)` methods only
- Use `{x,y,z}` objects for points/vectors, NEVER `[x,y,z]` arrays
- Only use attributes documented in ## 2D Primitives and ## 3D Primitives for each method
- `comment.markdown`: Educational explanation with LaTeX for equations
- All object IDs in sceneCode must be listed in `objects` array
- No comments in sceneCode (system adds them deterministically)
