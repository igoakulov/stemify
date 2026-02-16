# Scene API Reference

Call `scene.addX()` methods to create 3D visualizations. All coordinates use `{ x, y, z }` objects, never arrays.

---

## Primitives

### Common Parameters

All primitives share:
- `id`: required, use short self-evident names for shapes / objects
- `selectable`: default true, allows user to play with objects manually (explore and edit parameters), set false if plays no meaningful role in scene
- `color`: default #E6E8EB
- `opacity`: default 1.0, affects fill (outline remains opaque)
- `direction`: orientation vector (unit vector), default {x:0,y:0,z:1} = perpendicular to XY plane. {x:0,y:1,z:0} = perpendicular to XZ plane. circle/donut/poly2d/sphere: surface normal / hemisphere opening direction. cylinder: applies rotation to entire shape AFTER building along points - redundant/confusing, use points to define axis instead.
- `rotation`: default 0, degrees, along facing direction

Exception: addPoint only supports id, center, color, selectable.
Can omit optional parameter entirely when using its default value.
Examples below do not showcase these shared parameters, unless they implement a notable shape.

---

### scene.addPoint(config)
Creates a marker point (small sphere).

```javascript
scene.addPoint({
    id: "origin",
    center: { x: 0, y: 0, z: 0 },
})
```

---

### scene.addLine(config)
Creates lines, tubes, or curves. Supports points array OR formula expression.

```javascript
// Vector (line with arrow)
scene.addLine({
    id: "vector",
    points: [{ x: 0, y: 0, z: 0 }, { x: 2, y: 1, z: 0 }],
    thickness: 0,  // 0=line, >0=tube
    arrow: "end",  // "none"|"start"|"end"|"both"
})

// Tube (thick line)
scene.addLine({
    id: "pipe",
    points: [{ x: 0, y: 0, z: 0 }, { x: 5, y: 3, z: 0 }],  // more points make a curve
    thickness: 0.5,
})

// Formula curve (parametric)
scene.addLine({
    id: "sine",
    points: { x: "t", y: "Math.sin(t)", z: "0", tMin: 0, tMax: 6.28, tSteps: 100 },
    thickness: 0.05,
})
```

Formula: `{ x: "expr", y: "expr", z: "expr", tMin, tMax, tSteps }`. Use `t` as variable.

---

### scene.addPoly2D(config)
Creates 2D polygons from vertices.

```javascript
scene.addPoly2D({
    id: "triangle",
    points: [{ x: 0, y: 0, z: 0 }, { x: 3, y: 0, z: 0 }, { x: 0, y: 4, z: 0 }],
    opacity: 0.3
})
```

---

### scene.addCircle(config)
Creates 2D disc, ring, sector, or ellipse.

```javascript
// Disc
scene.addCircle({
    id: "plate",
    center: { x: 0, y: 0, z: 0 },
    radius: 3,
})

// Ring (outline only)
scene.addCircle({
    id: "ring",
    center: { x: 0, y: 0, z: 0 },
    radius: 4,
    opacity: 0,
})

// Sector (pie slice)
scene.addCircle({
    id: "sector",
    center: { x: 0, y: 0, z: 0 },
    radius: 3,
    slice: { start: 0, end: 60 },  // arc degrees
})

// Ellipse
scene.addCircle({
    id: "ellipse",
    center: { x: 0, y: 0, z: 0 },
    radius: 3,
    stretch: { x: 1.5, y: 1, z: 1 },
    rotation: 45,
})
```

---

### scene.addSphere(config)
Creates 3D sphere, ellipsoid, or hemisphere.

```javascript
// Sphere
scene.addSphere({
    id: "ball",
    center: { x: 0, y: 2, z: 0 },
    radius: 1.5,
})

// Ellipsoid
scene.addSphere({
    id: "football",
    center: { x: 0, y: 0, z: 0 },
    radius: 2,
    stretch: { x: 1, y: 1.5, z: 0.8 },
})

// Hemisphere
scene.addSphere({
    id: "dome",
    center: { x: 0, y: 0, z: 0 },
    radius: 3,
    slice: { start: 0, end: 180 },
    direction: { x: 1, y: 0, z: 0 },
    rotation: 90,
})
```

---

### scene.addCylinder(config)
Creates cylinders, cones, or hourglass shapes.

```javascript
// Cylinder
scene.addCylinder({
    id: "column",
    points: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 5, z: 0 }],
    radius: [1],
})

// Cone
scene.addCylinder({
    id: "spike",
    points: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 3, z: 0 }],
    radius: [1.5, 0],
})

// Hourglass
scene.addCylinder({
    id: "hourglass",
    points: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 2, z: 0 }, { x: 0, y: 4, z: 0 }],
    radius: [1, 0.3, 1],
})

// Partial cylinder
scene.addCylinder({
    id: "quarter_pipe",
    points: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 4 }],
    radius: [1],
    slice: { start: 0, end: 90 },
    direction: { x: 1, y: 0, z: 0 },
    rotation: 45,
    color: "#F2C14E"
})
```

---

### scene.addPoly3D(config)
Creates 3D convex polyhedra from vertices.

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

---

### scene.addDonut(config)
Creates torus, partial torus, or elliptical torus.

```javascript
// Torus
scene.addDonut({
    id: "ring",
    center: { x: 0, y: 0, z: 0 },
    radius: 5,
    thickness: 0.8,
})

// Partial torus
scene.addDonut({
    id: "arc",
    center: { x: 0, y: 0, z: 0 },
    radius: 4,
    thickness: 0.5,
    slice: { start: 0, end: 270 },
})
```

---

## Complex Shapes & Compositions

### scene.addGroup(config)
Groups primitives that move/rotate together.

```javascript
scene.addCylinder({
    id: "arm",
    points: [{ x: 0, y: 0, z: 0 }, { x: 0, y: -3, z: 0 }],
    radius: [0.1],
})

scene.addSphere({
    id: "weight",
    center: { x: 0, y: -3, z: 0 },
    radius: 0.5,
})

scene.addGroup({
    id: "pendulum",
    children: ["arm", "weight"],
    rotation: 30
})
```

---

### scene.addCustomMesh(config)
Full Three.js access for shapes primitives cannot create.

```javascript
scene.addCustomMesh({
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

### scene.addAxes(config)
Creates X/Y/Z coordinate axes.

```javascript
scene.addAxes({
    id: "world",
    x: { start: -5, end: 5 },
    y: { start: 0, end: 5 },
    z: { start: -5, end: 5 },
    length: 5,
    position: { x: 0, y: 0, z: 0 }
})
```

---

### scene.addLabel(config)
Creates text labels with Markdown and LaTeX support.

```javascript
scene.addLabel({
    id: "velocity",
    text: "Velocity \\(v = 5\\,m/s\\)",
    position: { x: 3, y: 2, z: 0 },
    color: "#E6E8EB",
    fontSizePx: 16
})
```

LaTeX: Inline `\\( ... \\)`, Display `\\[ ... \\]`

---

### scene.setGrid(size)
Set coordinate grid snap size.

```javascript
scene.setGrid(1.0)   // Coarse
scene.setGrid(0.5)   // Default
scene.setGrid(0.1)   // Fine
```

---

### scene.setSmoothness(segments)
Set curve smoothness (8-256, default 64).

```javascript
scene.setSmoothness(32)   // Low
scene.setSmoothness(64)   // Default
scene.setSmoothness(128)  // High
```

Affected: `addCircle`, `addSphere`, `addDonut`

---

## Tooltips & Animation

### scene.addTooltip(config)
Registers object for hover tooltip.

```javascript
// Label + properties
scene.addTooltip({
    id: "ball",
    title: "Point Mass",
    properties: [
        { label: "Mass", value: "2.0 kg" },
        { label: "Velocity", value: "5 m/s" }
    ]
})

// Text only
scene.addTooltip({
    id: "hint",
    title: "Hover me"
})
```

---

### scene.addAnimation(config)
Registers time-based animation loops.

```javascript
scene.addAnimation({
    id: "spin",
    updateFunction: "scene.getObject('cube').rotation.y = elapsed;"
})

scene.addAnimation({
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

## JSON Output

```json
{
  "scene": "scene.addAxes({...});\nscene.addLine({...});",
  "camera": { "position": [6, 4, 8], "target": [0, 0, 0] }
}
```

- Use `{x,y,z}` for coordinates, `[x,y,z]` for camera only
- Avoid comments in scene
- Each BUILD replaces entire scene
