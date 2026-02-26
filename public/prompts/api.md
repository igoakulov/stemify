# Scene API Reference

Call `scene.X()` methods to create 3D visualizations. All coordinates use arrays `[x, y, z]`, never objects.
You MUST use primitives first, then groups, custom mesh last. Use scene.poly3 for cubes/tetrahedrons, scene.poly2 for 2D shapes etc. Use groups of primitives for composite shapes. Only use scene.mesh when primitives and groups are insufficient to create the scene as intended or require unreasonable sacrifice to detail.


---

## Primitives

### Common Parameters

All shapes share:
- `id`: required, use short self-evident names for shapes / objects
- `selectable`: default true, allows user to play with objects manually, set false if plays no meaningful role in scene
- `color`: default #E6E8EB
- `opacity`: default 1.0 (fill only, outline remains opaque). Not available: addPoint, addCustomMesh
- `offset`: offset from position/position

**For scene.line/scene.curve**:
- `lookat`: rotates bounding box +Z face to point at target (default +Z = faces forward)
- `spin`: degrees to rotate around the lookat axis (twists the curve)

Not available: addPoint

Note: id is also required on addLabel, addTooltip, addAnimation; optional on addAxes. selectabl also on addLabel, addGroup, addAxes. color/lookat/spin/offset also on addGroup, addCustomMesh.
Can omit optional parameter entirely when using its default value.
Examples below do not showcase these shared parameters, unless they implement a notable shape.

---

### scene.point(config)
Creates a marker point (small sphere).

```javascript
scene.point({
    id: "origin",
    position: [0, 0, 0],
})
```

---

### scene.line(config)
Creates straight lines or smooth curves through points. Pivot is midpoint of points.

**Orientation**: Uses bounding box +Z face as reference. `lookat` rotates so +Z faces the target. `spin` rotates around that lookat axis (twists the curve).

```javascript
// Straight line with arrow
scene.line({
    id: "vector",
    points: [[0, 0, 0], [2, 1, 0]],
    thickness: 0,  // 0=thin line, >0=tube
    arrow: "end",  // "none"|"start"|"end"|"both"
})

// Smooth wave (tension controls wave tightness)
scene.line({
    id: "wave",
    points: [[0, 0, 0], [1, 2, 0], [2, 0, 0], [3, 2, 0]],
    tension: 0.7, // 0=very round, 1=straight segments, 0.5=default
})

// Rotate line so +Z face points at target, then spin
scene.line({
    id: "pointing_line",
    points: [[0, 0, 0], [1, 0, 0]],
    lookat: [0, 1, 0], // +Z face points here (+Y = vertical)
    spin: 45, // twist 45° around the lookat axis
})
```

---

### scene.curve(config)
Creates curves from parametric formulas x(t), y(t), z(t). Pivot is midpoint of formula path.

**Orientation**: Uses bounding box +Z face as reference. `lookat` rotates so +Z faces the target. `spin` rotates around that lookat axis (twists the curve).

```javascript
// Sine wave on XY plane
scene.curve({
    id: "sine",
    x: "t", // can be formula
    y: "Math.sin(t)",
    z: 0, // can be constant
    steps: 100,
    tMin: 0,
    tMax: 6.28,
    arrow: "end",
})

// Rotate to face +Y, then twist 90°
scene.curve({
    id: "sine_vertical",
    x: "t",
    y: "Math.sin(t)",
    z: 0,
    steps: 100,
    tMin: 0,
    tMax: 6.28,
    lookat: [0, 1, 0], // +Z face points at +Y (curve lies on XZ plane)
    spin: 90, // twist 90° around +Y axis (curve now vertical on YZ plane)
})

// Circle
scene.curve({
    id: "circle",
    x: "Math.cos(t)",
    y: "Math.sin(t)",
    z: 0,
    tMin: 0,
    tMax: 6.28,
    thickness: 0.5
})
```

---

### scene.circle(config)
Creates 2D disc, ring, sector, or ellipse.

```javascript
// Disc
scene.circle({
    id: "plate",
    position: [0, 0, 0],
    radius: 3,
})

// Disc with outline
scene.circle({
    id: "plate",
    radius: 3,
    outline: 0.1,
})

// Ring (outline only - use opacity: 0 for transparent fill)
scene.circle({
    id: "ring",
    position: [0, 0, 0],
    radius: 4,
    opacity: 0,
    outline: 0.1,
})

// Sector (arc from 0 to 60 degrees)
scene.circle({
    id: "sector",
    position: [0, 0, 0],
    radius: 3,
    anglecut: [0, 60],
})

// Sector with outline
scene.circle({
    id: "sector",
    radius: 3,
    anglecut: [0, 60],
    outline: 0.1,
})

// Ellipse
scene.circle({
    id: "ellipse",
    position: [0, 0, 0],
    radius: 3,
    stretch: [1.5, 1, 1],
    spin: 45,
})
```

---

### scene.poly2(config)
Creates 2D polygons from vertices on the XY plane.

- `points` (required): Array of [x,y] points. Must have at least 3 points.
- `lookat` (optional): Direction the shape faces, default [0,0,1] (+Z).
- `spin` (optional): Degrees to rotate around the lookat axis.
- `offset` (optional): Shifts all points.
- `color` (optional): Hex color string.
- `opacity` (optional): 0-1, default 1.
- `selectable` (optional): true or false, default true.

```javascript
// Triangle on XY plane, facing +Z
scene.poly2({
    id: "triangle",
    points: [[0, 0], [3, 0], [0, 4]],
    opacity: 0.3
})

// Triangle facing up, rotated 45 degrees
scene.poly2({
    id: "triangle3d",
    points: [[0, 0], [3, 0], [0, 4]],
    lookat: [0, 1, 0],
    spin: 45
})
```

---


### scene.sphere(config)
Creates 3D sphere, ellipsoid, or hemisphere.

**Parameters:**
- `anglecut` - Sweeps around Y axis, starts at +X, CCW
- `flatcut` - Sweeps from north pole (Y+), 180 = hemisphere

```javascript
// Sphere
scene.sphere({
    id: "ball",
    position: [0, 2, 0],
    radius: 1.5,
})

// Ellipsoid
scene.sphere({
    id: "football",
    position: [0, 0, 0],
    radius: 2,
    stretch: [1, 1.5, 0.8],
})

// Hemisphere
scene.sphere({
    id: "dome",
    position: [0, 0, 0],
    radius: 3,
    anglecut: [0, 360],
    flatcut: [0, 180],
    lookat: [0, 0, 1],
})
```

---

### scene.cylinder(config)
Creates cylinders, cones, or tapered shapes.

```javascript
// Cylinder
scene.cylinder({
    id: "column",
    position: [0, 2.5, 0],
    height: 5,
    radius: [1, 1],
})

// Cone
scene.cylinder({
    id: "spike",
    position: [0, 1.5, 0],
    height: 3,
    radius: [1.5, 0],
})

// Hourglass (multiple sections)
scene.cylinder({
    id: "hourglass",
    position: [0, 2, 0],
    height: [2, 2],
    radius: [1, 0.3, 1],
})

// Partial cylinder
scene.cylinder({
    id: "quarter_pipe",
    position: [0, 0, 2],
    height: 4,
    radius: [1, 1],
    anglecut: [0, 90],
    spin: 45,
    color: "#F2C14E"
})
```

**Parameters:**
- `id` (string, required): Unique identifier
- `position` (vec3, required): Center point of the stacked cylinder
- `height` (number or number[], optional): Section height(s), default 1
- `radius` (number[], optional): Array of radii at boundaries (n+1 for n sections), default [1]
- `anglecut` (number or [start, length], optional): Degrees, default 360, starts at +X, CCW
- `spin` (number, optional): Degrees around local Y axis
- `lookat` (vec3, optional): Direction for local Y+ to face, default [0, 1, 0]
- `offset` (vec3, optional): Offset from position
- `color` (string, optional): Hex color
- `opacity` (number, optional): 0-1 opacity
- `selectable` (boolean, optional): Default true

**Orientation:**
- Default facing: local Y+ (vertical)
- anglecut starts at +X, counter-clockwise
- spin rotates around local Y axis (cylinder's own axis)
- lookat rotates cylinder so local Y+ points toward direction

---

### scene.donut(config)
Creates a torus (donut) shape.

```javascript
// Full example, optional parameters show default values:
scene.donut({
  id: "ring",
  radius: 5,
  thickness: 0.8, // tube radius, in world units
  position?: [0, 0, 0],
  offset?: [0, 0, 0],
  lookat?: [0, 0, 1], // direction torus axis points
  anglecut?: [0, 360], // [start, length] in degrees, single number = length from 0
  spin?: 0,
  color?: "#F2C14E",
  opacity?: 1,
  selectable?: true
})
```

---

### scene.poly3(config)
Creates 3D convex polyhedra from vertices. Shape positioned at bounding box, then rotated.

```javascript
// Full example, optional parameters show default values:
scene.poly3({
  id: "pyramid", // unique identifier
  points: [ // required, [[x,y,z],...], min 4 points
    [0, 0, 0],
    [2, 0, 0],
    [2, 0, 2],
    [0, 0, 2],
    [1, 2, 1]
  ],
  lookat: [0,0,1], // direction +Z faces (default +Z)
  spin: 0, // degrees around lookat axis
  offset: [0,0,0],
  color: "#F2C14E",
  opacity: 1,
  selectable: true
})
```

---

## Complex Shapes & Compositions

### scene.group(config)
Groups primitives that move/rotate together.

```javascript
// Full example, optional parameters show default values:
scene.group({
  id: "pendulum", // unique identifier
  children: ["arm", "weight"], // IDs to group
  lookat?: [0,0,1], // direction group faces
  spin?: 0, // degrees around lookat axis
  offset?: [0,0,0],
  selectable?: true // user can inspect, false to declutter when unimportant
})
```

---

### scene.mesh(config)
Full Three.js access for shapes primitives cannot create.

```javascript
scene.mesh({
    id: "complex",
    createFn: `
        const geometry = new THREE.IcosahedronGeometry(2, 0);
        const material = new THREE.MeshStandardMaterial({ color: 0x2D7FF9, roughness: 0.5 });
        return new THREE.Mesh(geometry, material);
    `
})
```

---

## Infrastructure

### scene.axes(config)
Creates X/Y/Z coordinate axes.

```javascript
scene.axes({
    id: "world",
    x: { start: -5, end: 5 },
    y: { start: 0, end: 5 },
    z: { start: -5, end: 5 },
    position: [0, 0, 0]
})
```

---

### scene.label(config)
Creates text labels with Markdown and LaTeX support.

```javascript
scene.label({
    id: "velocity",
    text: "Velocity \\(v = 5\\,m/s\\)",
    position: [3, 2, 0],
    color: "#E6E8EB",
    fontSizePx: 16
})
```

LaTeX: Inline `\\( ... \\)`, Display `\\[ ... \\]`

---

### scene.grid(size)
Set coordinate grid snap size.

```javascript
scene.grid(1.0)   // Coarse
scene.grid(0.5)   // Default
scene.grid(0.1)   // Fine
```

---

### scene.smoothness(segments)
Set curve smoothness (8-256, default 64).

```javascript
scene.smoothness(32)   // Low
scene.smoothness(64)   // Default
scene.smoothness(128)  // High
```

Affected: `addCircle`, `addSphere`, `addDonut`

---

### scene.camera(config)
Set camera position and lookat point (where camera looks). Only use when default is not appropriate.

```javascript
// Default camera position and lookat
scene.camera({
  position: [6, 4, 8],
  lookat: [0, 0, 0]
});
```

---

## Tooltips & Animation

### scene.tooltip(config)
Registers object for hover tooltip.

```javascript
// Label + properties
scene.tooltip({
    id: "ball",
    title: "Point Mass",
    properties: [
        { label: "Mass", value: "2.0 kg" },
        { label: "Velocity", value: "5 m/s" }
    ]
})

// Text only
scene.tooltip({
    id: "hint",
    title: "Hover me"
})
```

---

### scene.animation(config)
Registers time-based animation loops.

```javascript
scene.animation({
    id: "spin",
    updateFunction: "scene.getObject('cube').rotation.y = elapsed;"
})

scene.animation({
    id: "pulse",
    updateFunction: "scene.getObject('heart').scale.setScalar(1 + Math.sin(elapsed * 3) * 0.1);"
})
```

Available: `scene.getObject(id)`, `THREE` namespace.

Animate correctly: addCircle, addDonut, addPoint, addSphere, addCustomMesh.

Delayed appearance:
```javascript
const label = scene.getObject("label_id");
if (label && label.parent) label.parent.visible = elapsed > 1.0;
```

Max 3 concurrent animations.

---

## Design System

Colors:
- Neutrals: `#E6E8EB`, `#AAB2BD`, `#111318`
- Accents: `#2D7FF9`, `#F25C54`, `#F2C14E`, `#2FBF71`, `#B07CFF`

Opacity:
- 2D shapes: fill only, outline 100%
- 3D volumes: entire shape

Limits: 50 objects, 100k polygons, 100 tube segments, 20 labels, 3 animations

---

## Output

Response format depends on current mode:
- **BUILD mode**: Return JavaScript scene code in ```javascript code block. Include scene.camera() calls to set initial view.
- **FIX mode**: Return corrected JavaScript scene code in ```javascript code block
- **ASK mode**: Return human-readable markdown with standard code blocks

See respective mode prompts for complete format specifications.
