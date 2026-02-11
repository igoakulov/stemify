# Scene API Reference

Call `scene.addX()` methods to create 3D visualizations. All coordinates use `{ x, y, z }` objects, never arrays.

---

## Hierarchy

Use in this order:
1. **Primitives** - Standard shapes (points, lines, circles, spheres, etc.)
2. **Groups** - Composite shapes from multiple primitives (pendulum, capsule, hourglass)
3. **Custom Mesh** - Complex shapes that primitives and groups can't create (last resort)

---

## 2D Primitives

### scene.addPoint(config)
Creates a marker point (small sphere).

**Shapes:** Point marker, origin indicator, data point

```javascript
scene.addPoint({
  id: "origin",
  center: { x: 0, y: 0, z: 0 },
  color: "#F25C54"
})
```

**Parameters:** `id` (required), `center`, `color`

---

### scene.addLine(config)
Creates lines, tubes, or curves. Supports points array OR formula expression.

**Shapes:**
- **Line** - thin line between points (thickness: 0)
- **Wire** - same as line
- **Tube** - volumetric cylinder along path (thickness > 0)
- **Vector** - tube with arrowhead (add `arrow: "end"`)
- **Polyline** - line through 3+ points
- **Arc** - tube with slice parameter
- **Formula curve** - parametric curve (sine, helix, parabola)

```javascript
// Line with arrow (vector)
scene.addLine({
  id: "vector",
  points: [{ x: 0, y: 0, z: 0 }, { x: 2, y: 1, z: 0 }],
  thickness: 0.1,
  arrow: "end",
  color: "#2D7FF9"
})

// Curved tube through points (polyline)
scene.addLine({
  id: "pipe",
  points: [{ x: 0, y: 0, z: 0 }, { x: 2, y: 3, z: 0 }, { x: 5, y: 0, z: 0 }],
  thickness: 0.5,
  color: "#2FBF71"
})

// Formula curve (parametric: sine wave)
scene.addLine({
  id: "sine",
  points: { x: "t", y: "Math.sin(t)", z: "0", tMin: 0, tMax: 6.28, tSteps: 100 },
  thickness: 0.05,
  color: "#F2C14E"
})

// Half-pipe (tube with slice)
scene.addLine({
  id: "halfpipe",
  points: [{ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }],
  thickness: 2,
  slice: { start: 0, end: 180 },
  rotation: { axis: { x: 0, y: 0, z: 1 }, angle: 0 },
  color: "#B07CFF"
})
```

**Parameters:** `id` (required), `points` (array or formula object), `thickness` (0=line, >0=tube), `arrow` ("none"|"start"|"end"|"both"), `slice` (degrees for partial tube), `rotation`, `color`, `opacity`

**Formula syntax:** `{ x: "expression", y: "expression", z: "expression", tMin, tMax, tSteps }`. Use `t` as variable.

---

### scene.addPoly2D(config)
Creates 2D polygons from vertices.

**Shapes:**
- **Triangle** - 3 vertices
- **Rectangle/square** - 4 vertices
- **Pentagon, hexagon, etc.** - 5+ vertices

```javascript
scene.addPoly2D({
  id: "triangle",
  points: [{ x: 0, y: 0, z: 0 }, { x: 3, y: 0, z: 0 }, { x: 0, y: 4, z: 0 }],
  color: "#2D7FF9",
  opacity: 0.3
})
```

**Parameters:** `id` (required), `points` (3+ vertices), `color`, `opacity`, `rotation`

---

### scene.addCircle(config)
Creates 2D circular disc or ring (can be sliced for arcs/sectors).

**Shapes:**
- **Disc** - filled circle (opacity > 0)
- **Ring** - outline only (opacity: 0)
- **Sector** - pie slice with fill (add `slice`)
- **Arc** - pie slice outline only (opacity: 0 + slice)
- **Ellipse** - stretched circle (add `stretch`)

```javascript
// Disc (filled circle)
scene.addCircle({
  id: "plate",
  center: { x: 0, y: 0, z: 0 },
  radius: 3,
  direction: { x: 0, y: 0, z: 1 },
  color: "#2FBF71"
})

// Sector (pie slice with fill)
scene.addCircle({
  id: "sector",
  center: { x: 0, y: 0, z: 0 },
  radius: 3,
  slice: { start: 0, end: 60 },
  direction: { x: 0, y: 0, z: 1 },
  color: "#B07CFF"
})

// Ring (outline only)
scene.addCircle({
  id: "ring",
  center: { x: 0, y: 0, z: 0 },
  radius: 4,
  opacity: 0,
  color: "#E6E8EB"
})
```

**Parameters:** `id` (required), `center`, `radius`, `direction` (unit vector for facing), `stretch` (scale factors for ellipse), `slice` (degrees: start/end for arc/sector), `rotation` (degrees), `color`, `opacity`

---

## 3D Primitives

### scene.addSphere(config)
Creates 3D sphere (can be stretched or sliced).

**Shapes:**
- **Sphere** - perfect sphere
- **Hemisphere** - half sphere (add `slice: { start: 0, end: 180 }`)
- **Ellipsoid** - stretched sphere (add `stretch`)
- **Spherical sector** - orange slice shape (add `slice`)

```javascript
scene.addSphere({
  id: "ball",
  center: { x: 0, y: 2, z: 0 },
  radius: 1.5,
  color: "#F25C54"
})

scene.addSphere({
  id: "football",
  center: { x: 0, y: 0, z: 0 },
  radius: 2,
  stretch: { x: 1, y: 1.5, z: 0.8 },
  color: "#2FBF71"
})

scene.addSphere({
  id: "dome",
  center: { x: 0, y: 0, z: 0 },
  radius: 3,
  slice: { start: 0, end: 180 },
  direction: { x: 1, y: 0, z: 0 },
  rotation: 90,
  color: "#2D7FF9"
})
```

**Parameters:** `id` (required), `center`, `radius`, `stretch` (scale factors for ellipsoid), `slice` (degrees for sector), `direction` (unit vector for slice facing), `rotation` (degrees), `color`, `opacity`

---

### scene.addCylinder(config)
Creates 3D cylinders, cones, or hourglass shapes using points to define central axis.

**Shapes:**
- **Cylinder** - uniform radius at both ends
- **Cone** - tapers to point (radius: [base, 0])
- **Hourglass** - 3+ points with varying radii
- **Tapered beam** - 2 points with different end radii

```javascript
// Cylinder (uniform)
scene.addCylinder({
  id: "column",
  points: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 5, z: 0 }],
  radius: [1, 1],
  color: "#E6E8EB"
})

// Cone (tapering to point)
scene.addCylinder({
  id: "spike",
  points: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 3, z: 0 }],
  radius: [1.5, 0],
  color: "#F25C54"
})

// Hourglass (3+ points, varying radius)
scene.addCylinder({
  id: "hourglass",
  points: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 2, z: 0 }, { x: 0, y: 4, z: 0 }],
  radius: [1, 0.3, 1],
  color: "#B07CFF"
})
```

**Parameters:** `id` (required), `points` (2+ points along centerline), `radius` (array: one radius per point), `color`, `opacity`

---

### scene.addPoly3D(config)
Creates 3D convex polyhedra from vertices. System auto-generates faces from convex hull.

**Shapes:**
- **Pyramid** - 4 base vertices + 1 apex
- **Tetrahedron** - 4 triangular faces
- **Octahedron** - 8 triangular faces
- Any convex polyhedron with 4+ vertices

```javascript
scene.addPoly3D({
  id: "pyramid",
  points: [
    { x: 0, y: 0, z: 0 },
    { x: 2, y: 0, z: 0 },
    { x: 2, y: 0, z: 2 },
    { x: 0, y: 0, z: 2 },
    { x: 1, y: 2, z: 1 }
  ],
  color: "#F2C14E"
})
```

**Parameters:** `id` (required), `points` (4+ convex vertices), `color`, `opacity`

---

### scene.addDonut(config)
Creates 3D torus (ring with circular cross-section).

**Shapes:**
- **Torus** - full ring
- **Partial torus** - arc/ring with slice
- **Elliptical torus** - stretched ring

```javascript
scene.addDonut({
  id: "ring",
  center: { x: 0, y: 0, z: 0 },
  radius: 5,
  thickness: 0.8,
  direction: { x: 0, y: 0, z: 1 },
  color: "#B07CFF"
})

scene.addDonut({
  id: "arc",
  center: { x: 0, y: 0, z: 0 },
  radius: 4,
  thickness: 0.5,
  slice: { start: 0, end: 270 },
  direction: { x: 0, y: 0, z: 1 },
  color: "#2FBF71"
})
```

**Parameters:** `id` (required), `center`, `radius` (distance to tube center), `thickness` (tube radius), `direction` (facing), `slice` (degrees), `rotation`, `color`, `opacity`

---

## Infrastructure

### scene.addAxes(config)
Creates X/Y/Z coordinate axes with colored arrows.

**Shapes:** Axes, coordinate frame, reference triad

```javascript
scene.addAxes({
  id: "world_axes",
  length: 5,
  position: { x: 0, y: 0, z: 0 },
  selectable: false
})
```

**Parameters:** `id` (required), `length`, `position`, `selectable`

---

### scene.addLabel(config)
Creates text labels with Markdown and LaTeX math support.

**Shapes:** Label, annotation, equation

```javascript
scene.addLabel({
  id: "velocity",
  text: "Velocity \\(v = 5\\,m/s\\)",
  position: { x: 3, y: 2, z: 0 },
  color: "#E6E8EB",
  fontSizePx: 16
})
```

**Parameters:** `id` (required), `text` (Markdown + LaTeX), `position`, `color`, `fontSizePx`

**LaTeX:** Inline `\\( ... \\)`, Display `\\[ ... \\]`

---

## Groups & Composition

### scene.addGroup(config)
Creates composite objects from multiple primitives. Children move/rotate together.

**When to use groups:** Complex shapes that require multiple primitives working together, where the primitives should be manipulated as a single unit.

**Shapes that need groups:**
- **Capsule** - cylinder + 2 hemispheres (spheres at ends)
- **Pendulum** - rod (cylinder) + bob (sphere)
- **Double cone** - 2 cones base-to-base
- **Ladder** - 2 vertical rails + horizontal rungs
- **Molecule** - spheres (atoms) + cylinders (bonds)

```javascript
scene.addCylinder({
  id: "arm",
  points: [{ x: 0, y: 0, z: 0 }, { x: 0, y: -3, z: 0 }],
  radius: [0.1, 0.1],
  color: "#E6E8EB"
})

scene.addSphere({
  id: "weight",
  center: { x: 0, y: -3, z: 0 },
  radius: 0.5,
  color: "#F25C54"
})

scene.addGroup({
  id: "pendulum",
  children: ["arm", "weight"],
  description: "Simple Pendulum"
})
```

**Parameters:** `id` (required), `children` (array of primitive IDs)

---

## Animation

### scene.addAnimation(config)
Registers time-based animation loops.

**Use for:** Rotating objects, orbiting bodies, pulsing scales, oscillating motions, any temporal change.

```javascript
scene.addAnimation({
  id: "rotate_pendulum",
  updateFunction: `
    const angle = Math.sin(elapsed) * 0.5;
    const pendulum = scene.getObject("pendulum");
    if (pendulum) pendulum.rotation.z = angle;
  `
})
```

**Parameters:** `id` (required), `updateFunction` (function body with `elapsed`)

**Access:** `scene.getObject(id)` returns object for manipulation. `THREE` namespace available.

---

## Custom Mesh (Last Resort)

### scene.addCustomMesh(config)
Full Three.js access for shapes that primitives and groups cannot create.

**When to use:** Klein bottle, Möbius strip, parametric surfaces, irregular closed forms - any shape that defies construction from primitives.

**Shapes that need custom mesh:**
- **Klein bottle** - non-orientable surface
- **Möbius strip** - one-sided surface
- **Parametric surface** - complex math-defined geometry
- **Impossible geometry** - Penrose stairs, Escher-style forms

```javascript
scene.addCustomMesh({
  id: "complex",
  createFn: `
    const geometry = new THREE.IcosahedronGeometry(2, 0);
    const material = new THREE.MeshStandardMaterial({ color: 0x2D7FF9, roughness: 0.5 });
    return new THREE.Mesh(geometry, material);
  `,
  color: "#2D7FF9"
})
```

**Parameters:** `id` (required), `createFn` (function body with THREE), `color`

---

## Tooltips

### scene.addTooltip(config)
Registers an object for hover detection and tooltip display.

```javascript
scene.addTooltip({
  id: "ball",
  title: "Point Mass",
  properties: [
    { label: "Mass", value: "2.0 kg" },
    { label: "Velocity", value: "5 m/s" }
  ]
})
```

**Parameters:** `id` (required), `title`, `properties` (array of {label, value})

---

## Grid

### scene.setGrid(size)
Set coordinate grid snap size. Default: 0.5.

```javascript
scene.setGrid(1.0)
```

All coordinates snap to nearest grid value during validation.

---

## Smoothness

### scene.setSmoothness(segments)
Set the smoothness level for curved shapes (circles, spheres, donuts). Default: 64 segments.

```javascript
scene.setSmoothness(32)   // Low quality, fewer polygons
scene.setSmoothness(64)   // Default quality
scene.setSmoothness(128)  // High quality, smoother curves
```

**Values:** 8 to 256 segments. Lower = angular/faceted, higher = smooth but more polygons.

**Affected shapes:** `addCircle`, `addSphere`, `addDonut`

---

## Design System

**Color Palette:**
- Neutrals: `#E6E8EB` (primary), `#AAB2BD` (secondary), `#111318` (bg)
- Accents: `#2D7FF9` (blue), `#F25C54` (red), `#F2C14E` (yellow), `#2FBF71` (green), `#B07CFF` (violet)

**Opacity Behavior:**
- 2D shapes (circle, poly2d): affects fill only, outline 100%
- 3D volumes (sphere, cylinder, etc.): affects entire volume

**Parameter Reference:**
- `slice`: Degrees for partial shapes (arc, sector, hemisphere). Like clock: 0 = 3 o'clock, 90 = 12 o'clock
- `stretch`: Scale factors {x, y, z} for ellipse/ellipsoid (1 = no stretch)
- `direction`: Unit vector {x, y, z} pointing which way shape faces
- `rotation`: Degrees to spin around the facing direction
- `thickness`: 0 = thin line, >0 = volumetric tube
- `points`: Array of {x, y, z} vertices (polygons/lines) or centerline (cylinders)

---

## Performance Budget

Limits (inform LLM but don't block):
- Max 50 objects
- Max 100,000 polygons
- Max 100 tube segments
- Max 20 labels
- Max 3 animations

---

## JSON Output Format

For BUILD intent, return:

```json
{
  "scene": {
    "sceneCode": "scene.addAxes({...});\nscene.addLine({...});",
    "objects": [
      { "id": "axes", "type": "axes" },
      { "id": "line", "type": "line" }
    ],
    "camera": { "position": [6, 4, 8], "target": [0, 0, 0] }
  },
  "comment": {
    "markdown": "Explanation with \\(LaTeX\\)."
  }
}
```

**Rules:**
- Use `{x,y,z}` for all coordinates, never `[x,y,z]`
- No comments in sceneCode (system adds them)
- Only use documented attributes
- camera.position/target use arrays, coordinates use objects
