# FJJLV React App - Copilot Instructions

## Project Overview
Modern React 18 application built with Vite 5, featuring Chinese language UI. Project follows a minimal SPA architecture with React Router DOM for navigation.

## Tech Stack & Dependencies
- **Build Tool**: Vite 5 (ES modules, fast HMR)
- **Framework**: React 18.2 with StrictMode enabled
- **Routing**: React Router DOM v6.21
- **Language**: Chinese (zh-CN) - UI text, comments, and documentation in Chinese

## Project Structure
```
src/
  main.jsx       # Entry point with React 18 createRoot API
  App.jsx        # Root component
  App.css        # Component-specific styles
  index.css      # Global styles and CSS reset
index.html       # Entry HTML with lang="zh-CN"
vite.config.js   # Vite config with port 3000, auto-open browser
```

## Development Workflow

### Start Development Server
```bash
npm run dev
```
- Opens automatically at http://localhost:3000 (configured in vite.config.js)
- Hot Module Replacement (HMR) enabled by default

### Build & Preview
```bash
npm run build      # Production build
npm run preview    # Preview production build locally
```

## Code Conventions

### Language & Localization
- **All UI text must be in Chinese**: Buttons, labels, messages, error text
- HTML lang attribute set to `zh-CN` in [index.html](index.html#L2)
- Example from [App.jsx](src/App.jsx#L9-L11): `欢迎使用 React`, `点击次数`, `编辑...开始开发`

### React Patterns
- **Functional components with hooks**: Use `useState`, `useEffect` (no class components)
- **StrictMode enabled**: Wrap root with `<React.StrictMode>` in [main.jsx](src/main.jsx#L7)
- **Modern React 18 API**: Use `ReactDOM.createRoot()` not legacy `ReactDOM.render()`

### Styling Approach
- **CSS Modules pattern**: Component-specific CSS files (e.g., `App.css` for `App.jsx`)
- **Global resets in index.css**: Box-sizing, margin/padding reset, viewport-centered layout
- **Dark theme by default**: Dark color scheme in `:root` ([index.css](src/index.css#L5-L7))
- **CSS Variables**: Define theme colors in `:root` for consistency

### File Naming
- **Components**: PascalCase `.jsx` files (e.g., `App.jsx`, not `.js`)
- **Styles**: Match component name (e.g., `App.jsx` → `App.css`)
- **Entry files**: lowercase (e.g., `main.jsx`, `index.css`)

## Common Tasks

### Adding New Components
1. Create `.jsx` file in `src/` with PascalCase naming
2. Create matching `.css` file for component styles
3. Import CSS at top of component: `import './ComponentName.css'`
4. Use Chinese text for all UI strings

### Adding Routes
- React Router DOM v6 is installed but not yet configured in App.jsx
- When adding routes, use new v6 API: `<Routes>`, `<Route>`, `useNavigate()`
- Wrap routes around `<App />` or inside it depending on layout needs

### Working with Vite
- **Fast Refresh**: Component state preserved on save
- **Import paths**: Use relative paths or configure aliases in vite.config.js
- **Static assets**: Place in `public/` folder (referenced as `/file.ext`)
- **Environment variables**: Prefix with `VITE_` to expose to client

## Key Configuration Details

### Vite Config ([vite.config.js](vite.config.js))
- Custom dev server port: 3000 (not default 5173)
- Browser auto-opens on `npm run dev`
- React plugin with Fast Refresh enabled

### Package.json
- **Type: "module"**: ES modules only, use `import`/`export` (no CommonJS)
- No test framework configured yet
- No linting tools (ESLint, Prettier) configured yet
