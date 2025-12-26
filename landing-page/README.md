# Coexist Landing Page

A standalone marketing website for the Coexist roommate matching app.

## Structure

```
landing-page/
├── index.html      # Main HTML file
├── styles.css      # All styling
├── script.js       # JavaScript for interactivity
└── README.md       # This file
```

## Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Modern UI**: Matches the Coexist app's purple/blue gradient theme
- **Smooth Animations**: Scroll animations and hover effects
- **Mobile Menu**: Hamburger menu for mobile devices
- **SEO Friendly**: Proper meta tags and semantic HTML

## Setup

1. **Local Development**:
   - Simply open `index.html` in a web browser
   - Or use a local server:
     ```bash
     # Python
     python -m http.server 8000
     
     # Node.js (if you have http-server installed)
     npx http-server
     ```

2. **Deployment Options**:
   - **Netlify**: Drag and drop the `landing-page` folder
   - **Vercel**: Connect your repo and set root to `landing-page`
   - **GitHub Pages**: Push to a `gh-pages` branch
   - **Any static hosting**: Upload the files to your hosting provider

## Customization

### Update App Link
Replace `https://app.coexist.com` with your actual app URL in:
- `index.html` (all `href` attributes pointing to the app)

### Colors
Edit CSS variables in `styles.css`:
```css
:root {
    --primary-color: #7c3aed;
    --secondary-color: #a78bfa;
    /* ... */
}
```

### Content
Edit the HTML in `index.html` to update:
- Hero section text
- Features
- How it works steps
- About section
- Footer links

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Notes

- The landing page is completely independent from the React app
- No build process required - just HTML, CSS, and JS
- Can be hosted on any static hosting service
- Update the app URL in the HTML before deploying

