# Gradiant Ascent

<div align="center">

[![Gradiant Ascent](https://gradiantascent.com/cube.png)](https://gradiantascent.com)

**Elevating Emotional Intelligence through AI**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Made with Astro](https://img.shields.io/badge/Made%20with-Astro-ff5d01.svg)](https://astro.build)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178c6.svg)](https://www.typescriptlang.org/)
[![HIPAA Compliant](https://img.shields.io/badge/HIPAA-Compliant-green.svg)](SECURITY.md)
[![Powered by Convex](https://img.shields.io/badge/Powered%20by-Convex-blue.svg)](https://convex.dev)

[Website](https://gradiantascent.com) •
[Documentation](https://docs.gradiantascent.com) •
[Blog](https://blog.gradiantascent.com)

</div>

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

<div align="center">

![Analytics Dashboard](https://raw.githubusercontent.com/lin-stephanie/assets/refs/heads/main/astro-antfustyle-theme/blog_2x.png)
*Powerful analytics dashboard for deep insights*

![Session Analysis](https://raw.githubusercontent.com/lin-stephanie/assets/refs/heads/main/astro-antfustyle-theme/post_2x.png)
*Real-time session analysis and pattern recognition*

</div>

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

<div align="center">

**Built with ❤️ for mental health professionals worldwide**

[Terms](https://gradiantascent.com/terms) •
[Privacy](https://gradiantascent.com/privacy) •
[Security](https://gradiantascent.com/security)

</div>

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
