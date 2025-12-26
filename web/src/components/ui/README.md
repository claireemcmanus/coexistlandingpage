# UI Components

This directory follows the [shadcn/ui](https://ui.shadcn.com/) project structure convention for organizing reusable UI components.

## Structure

```
ui/
├── shader-background.tsx  # Animated WebGL shader background
├── demo.tsx               # Component usage examples
└── README.md             # This file
```

## Why `/components/ui`?

The `/components/ui` folder is the standard location for shadcn/ui components. This structure:
- Keeps UI components separate from feature-specific components
- Makes it easy to add more shadcn/ui components in the future
- Follows industry best practices for component organization
- Allows for easy component discovery and maintenance

## Adding More Components

When adding new shadcn/ui components:
1. Install via shadcn CLI: `npx shadcn-ui@latest add [component-name]`
2. Or manually add to this folder following the same structure
3. Update this README with component descriptions

## Current Components

### ShaderBackground
An animated WebGL-based background component with plasma-like effects.

**Usage:**
```tsx
import ShaderBackground from './components/ui/shader-background';

<ShaderBackground />
```

**Features:**
- Fully responsive
- Fixed positioning (stays behind content)
- No props required
- WebGL-powered animations

