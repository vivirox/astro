# Gradiant Ascent

[![Gradiant Ascent](https://gradiantascent.com/cube.png)](https://gradiantascent.com)

## Elevating Emotional Intelligence through AI

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Made with Astro](https://img.shields.io/badge/Made%20with-Astro-ff5d01.svg)](https://astro.build)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6.svg)](https://www.typescriptlang.org/)
[![HIPAA Compliant](https://img.shields.io/badge/HIPAA-Compliant-green.svg)](SECURITY.md)
[![Powered by Convex](https://img.shields.io/badge/Powered%20by-Convex-blue.svg)](https://convex.dev)

[Website](https://gradiantascent.com) •
[Documentation](https://docs.gradiantascent.com) •
[Blog](https://blog.gradiantascent.com)

---

## 🌟 Welcome to the Future of Mental Healthcare

Gradiant Ascent stands at the intersection of emotional intelligence and AI, revolutionizing
mental healthcare. Our platform combines cutting-edge technology with deep psychological
insights to create a new paradigm in healthcare delivery.

## 🎯 Our Mission

To democratize access to high-quality mental healthcare by empowering practitioners with
AI-driven insights while maintaining the highest standards of privacy and ethics.

## ✨ Key Features

### 🧠 Real-time Therapeutic Analytics

- **Advanced Session Analysis** - Gain deeper insights into therapeutic sessions
- **Pattern Recognition** - Identify behavioral patterns and trends
- **Risk Assessment** - Early detection of potential concerns
- **Smart Interventions** - AI-powered therapeutic suggestions

### 🔒 Privacy-First Architecture

- **Zero-Knowledge Processing** - Your data remains truly private
- **HIPAA Compliance** - Enterprise-grade security
- **End-to-End Encryption** - Military-grade protection
- **Ethical AI** - Transparent and accountable

### 📊 Comprehensive Analytics

- **Interactive Dashboards** - Beautiful, intuitive visualizations
- **Progress Tracking** - Monitor outcomes effectively
- **Research Tools** - Evidence-based insights
- **Custom Reports** - Professional documentation

### 🤝 Collaboration Suite

- **Secure Messaging** - HIPAA-compliant communication
- **Resource Sharing** - Efficient team collaboration
- **Multi-disciplinary Support** - Connect with specialists
- **Community Insights** - Learn from peer experiences

## 💡 Why Gradiant Ascent?

### For Mental Health Professionals

Transform your practice with AI-powered insights while maintaining the human touch that
makes therapy effective.

### For Healthcare Administrators

Optimize resources, ensure compliance, and improve outcomes with comprehensive analytics
and reporting.

### For Researchers

Access anonymized datasets, conduct studies, and contribute to the advancement of mental
healthcare.

## 🌈 The Gradiant Difference

| Traditional Approach | Gradiant Ascent |
|---------------------|-----------------|
| Manual note-taking | AI-assisted documentation |
| Intuition-based insights | Data-driven patterns |
| Limited progress tracking | Comprehensive analytics |
| Basic security | Military-grade encryption |
| Isolated practice | Connected ecosystem |

## 📱 Experience It Yourself

Visit [gradiantascent.com](https://gradiantascent.com) to explore our interactive demo
and see how we're transforming mental healthcare.

<!-- markdownlint-disable MD033 -->
<div align="center">

![Analytics Dashboard](https://raw.githubusercontent.com/lin-stephanie/assets/refs/heads/main/astro-antfustyle-theme/blog_2x.png)
*Powerful analytics dashboard for deep insights*

![Session Analysis](https://raw.githubusercontent.com/lin-stephanie/assets/refs/heads/main/astro-antfustyle-theme/post_2x.png)
*Real-time session analysis and pattern recognition*

</div>
<!-- markdownlint-enable MD033 -->

## 🚀 Coming March 31, 2025

Gradiant Ascent is currently in final development and will launch on March 31, 2025.
Join us in revolutionizing mental healthcare through the power of AI and emotional
intelligence.

## 🤝 Join Our Community

- [Twitter](https://twitter.com/gradiantascent)
- [LinkedIn](https://linkedin.com/company/gradiantascent)
- [Discord](https://discord.gg/gradiantascent)
- [Blog](https://blog.gradiantascent.com)

## 📜 License

© 2025 Gradiant Ascent. All rights reserved.

---

## Built with ❤️ for mental health professionals worldwide

[Terms](https://gradiantascent.com/terms) •
[Privacy](https://gradiantascent.com/privacy) •
[Security](https://gradiantascent.com/security)

## 🚀 Technical Stack

- **Frontend:** Astro, React, TypeScript, Tailwind CSS
- **State Management:** Jotai, Zustand
- **Data & Backend:** Convex, Supabase, Redis
- **AI & ML:** TensorFlow.js, langchain
- **Security:** End-to-end encryption, HIPAA compliance
- **Analytics:** Custom dashboards, Recharts

## 🛠️ Development Setup

### Environment Requirements

- **Node.js:** v18.x (required for compatibility with Vercel deployment)
- **Package Manager:** pnpm 10.x+ (required)

### Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/gradiant.git
   cd gradiant
   ```

2. **Setup the environment**

   ```bash
   # Install dependencies
   pnpm install

   # Setup environment (fixes common issues)
   pnpm run setup:env
   ```

3. **Start development server**

   ```bash
   pnpm dev
   ```

4. **Build for production**

   ```bash
   pnpm build
   ```

### Troubleshooting

If you encounter any issues during development or build:

1. **Run diagnostics**

   ```bash
   pnpm run diagnostics
   ```

2. **Node.js version issues**
   If you're using nvm, you can easily switch to the required version:

   ```bash
   nvm use
   ```

3. **Search functionality issues**
   The project uses FlexSearch (v0.7.31) for client-side search. Pagefind is not
   currently supported on macOS arm64 platforms, so we've implemented a workaround
   that creates dummy Pagefind files to prevent errors.

## Project Astro

A modern, high-performance application built with Astro, React, and Convex.

## Project Status

The project is currently in the process of migrating from a pure React application to a hybrid
Astro/React architecture. This transition aims to improve performance, SEO, and developer experience
while maintaining the interactive capabilities of React where needed.

- **Overall Progress**: 89% Complete
- **Documentation**: [Conversion Plan](./astro-conversion-plan.mdx), [Troubleshooting Guide](./TROUBLESHOOTING.md)

## Key Features

- **Hybrid Rendering**: Static content is rendered at build time, while interactive components use partial hydration
- **Convex Integration**: Real-time data synchronization with Convex backend
- **Component Library**: Comprehensive set of UI components built with Astro and React
- **Admin Dashboard**: Analytics and monitoring dashboards for administrators
- **Documentation System**: Comprehensive documentation with automatic table of contents and responsive design
- **Blog System**: Content collections-based blog with tag filtering and search
- **Security System**: Real-time security event monitoring and filtering

## Layout Components

The project includes several layout components for different use cases:

- **MainLayout**: Base layout for the main site with header, footer, and ViewTransitions integration
- **DashboardLayout**: Layout for authenticated user dashboard pages with sidebar navigation
- **BlogLayout**: Specialized layout for blog posts with metadata and social sharing
- **DocumentationLayout**: Layout for documentation pages with automatic table of contents generation and
  responsive sidebar

### Documentation Layout

The `DocumentationLayout.astro` component provides a specialized layout for documentation pages with:

- Automatic table of contents generation from page headings
- Responsive sidebar that collapses on mobile
- Enhanced styling for documentation content (code blocks, blockquotes, tables, etc.)
- Support for custom MDX components (Cards, Steps, Notes, etc.)
- Light/dark mode toggle integrated into the sidebar
- Previous/next page navigation
- Support for frontmatter metadata

```astro
---
import DocumentationLayout from '@/layouts/DocumentationLayout.astro';
---

<DocumentationLayout
  title="API Reference"
  description="Complete API documentation for our platform"
>
  <h1>API Reference</h1>
  <!-- Documentation content goes here -->
</DocumentationLayout>
```

## Getting Started 2

### Prerequisites

- Node.js 16+
- pnpm 7+

### Installation

```bash
# Clone the repository
git clone https://github.com/yourorganization/project-astro.git

# Navigate to the project directory
cd project-astro

# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

The application will be available at `http://localhost:3000`.

### Build

```bash
# Standard build (uses build-clean.js to handle null byte issues)
pnpm build

# Original Astro build (may fail with null byte errors)
pnpm build:regular
```

The built application will be in the `dist` directory.

#### Build Process Notes

The project uses a custom build script (`build-clean.js`) to handle null byte issues with certain Astro
components. This script:

1. Temporarily replaces problematic components with placeholders
2. Runs the Astro build command
3. Restores the original components after the build

For more details, see the [Troubleshooting Guide](./TROUBLESHOOTING.md).

## Project Structure

```mermaid
project-astro/
├── convex/             # Convex backend configuration and functions
├── docs/               # Documentation
├── public/             # Static assets
├── src/
│   ├── components/     # UI components
│   │   ├── admin/      # Admin-specific components
│   │   ├── base/       # Base components
│   │   ├── security/   # Security-related components
│   │   └── ui/         # Reusable UI components
│   ├── content/        # Content collections
│   ├── layouts/        # Page layouts
│   ├── lib/            # Utility functions and libraries
│   ├── pages/          # Astro pages
│   ├── styles/         # Global styles
│   └── test/           # Test utilities
└── astro.config.mjs    # Astro configuration
```

## Development

### Component Development

Components are divided into two categories:

1. **Astro Components** (`.astro`): Used for static or minimally interactive components
2. **React Components** (`.tsx`): Used for highly interactive components

For guidance on when to use each and how to convert from React to Astro, see our [React to Astro Conversion Guide](./docs/react-to-astro-conversion.md).

### Testing

We use Vitest for testing components. For details on how to test Astro components, see our [Component Testing Guide](./docs/component-testing.md).

To run tests:

```bash
pnpm test
```

For watch mode:

```bash
pnpm test:watch
```

### Convex Integration

This project uses Convex for backend functionality. To start the Convex development server:

```bash
pnpm convex dev
```

## Documentation

- [Astro Conversion Plan](./astro-conversion-plan.mdx)
- [Component Testing Guide](./docs/component-testing.md)
- [React to Astro Conversion Guide](./docs/react-to-astro-conversion.md)
- [API Documentation](./docs/api.md)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure all tests pass before submitting a pull request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
