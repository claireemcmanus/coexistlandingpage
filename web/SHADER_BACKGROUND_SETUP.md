# Shader Background Component Setup

## ✅ Completed Setup

The ShaderBackground component has been successfully integrated into your project with the following setup:

### 1. TypeScript Configuration
- ✅ Installed TypeScript and type definitions
- ✅ Created `tsconfig.json` with path aliases configured
- ✅ Project now supports both `.js` and `.tsx` files

### 2. Tailwind CSS Configuration
- ✅ Installed Tailwind CSS, PostCSS, and Autoprefixer
- ✅ Created `tailwind.config.js` and `postcss.config.js`
- ✅ Added Tailwind directives to `src/index.css`

### 3. Component Structure
- ✅ Created `/src/components/ui/` folder (shadcn/ui convention)
- ✅ Added `shader-background.tsx` component
- ✅ Created `demo.tsx` file with usage example

## 📁 File Locations

```
web/
├── src/
│   ├── components/
│   │   └── ui/
│   │       ├── shader-background.tsx  ← Main component
│   │       └── demo.tsx                ← Usage examples
│   ├── index.css                       ← Updated with Tailwind
│   └── ...
├── tailwind.config.js                  ← Tailwind config
├── postcss.config.js                   ← PostCSS config
└── tsconfig.json                       ← TypeScript config
```

## 🚀 Usage

### Basic Usage

```tsx
import ShaderBackground from './components/ui/shader-background';

function App() {
  return (
    <div>
      <ShaderBackground />
      {/* Your content here */}
    </div>
  );
}
```

### Using the Demo

```tsx
import { DemoOne } from './components/ui/demo';

function App() {
  return <DemoOne />;
}
```

## 📝 Important Notes

### Path Aliases (`@/` imports)

The `tsconfig.json` includes path aliases, but **Create React App doesn't support them by default**. 

**Option 1: Use relative imports (Current)**
```tsx
import ShaderBackground from './components/ui/shader-background';
```

**Option 2: Enable path aliases with CRACO** (if needed)
```bash
npm install @craco/craco --save-dev
```

Then create `craco.config.js`:
```js
module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
};
```

### Component Features

- **WebGL-based animated background** with shader effects
- **Fully responsive** - automatically resizes to window size
- **Fixed positioning** - stays behind content (z-index: -10)
- **No props required** - works out of the box
- **Performance optimized** - uses requestAnimationFrame

### Browser Support

- Requires WebGL support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Falls back gracefully if WebGL is not available

## 🔧 Dependencies

All required dependencies are already installed:
- ✅ React 19.2.1
- ✅ TypeScript (with types)
- ✅ Tailwind CSS
- ✅ No additional dependencies needed

## 🎨 Styling

The component uses Tailwind classes:
- `fixed top-0 left-0` - Fixed positioning
- `w-full h-full` - Full viewport size
- `-z-10` - Behind all content

You can customize the shader colors and effects by modifying the constants in the fragment shader code within `shader-background.tsx`.

## 🐛 Troubleshooting

### TypeScript Errors
If you see TypeScript errors, make sure:
1. TypeScript is installed: `npm list typescript`
2. Restart your dev server after installing TypeScript

### Tailwind Not Working
1. Make sure Tailwind directives are in `src/index.css`
2. Restart your dev server
3. Check `tailwind.config.js` content paths

### WebGL Not Available
The component will log a warning if WebGL is not supported. This is expected on some older browsers or devices.

## 📚 Next Steps

1. **Test the component**: Add it to one of your pages to see it in action
2. **Customize colors**: Modify the shader constants to match your brand
3. **Add to App.js**: Consider adding it to your main App component for a global background

## Example Integration

To add the shader background to your entire app, update `src/App.js`:

```jsx
import ShaderBackground from './components/ui/shader-background';

function App() {
  return (
    <div>
      <ShaderBackground />
      {/* Your existing app content */}
    </div>
  );
}
```

