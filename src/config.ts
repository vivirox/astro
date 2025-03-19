export const SITE = {
  name: "Gradiant Ascent",
  title: "Gradiant Ascent - AI-Assisted Emotional Intelligence",
  description:
    "The premier destination for all things related to the world of AI-assisted emotional intelligence.",
  url: "https://gradiantascent.com",
  ogImage: "https://gradiantascent.com/og-image.png",
  themeColor: "#3f51b5",
  lang: "en-US",
  base: "",
  author: {
    name: "Gradiant Team",
    twitter: "@gradiantascent",
  },
  menu: [
    {
      text: "Home",
      link: "/",
    },
    {
      text: "Blog",
      link: "/blog",
    },
    {
      text: "About",
      link: "/about",
    },
    {
      text: "Contact",
      link: "/contact",
    },
  ],
};

export const UI = {
  // Navigation UI settings
  nav: {
    position: "sticky", // 'fixed' | 'sticky' | 'static'
    glassmorphism: true,
    blur: 10, // px
  },
  // Theme switching UI settings
  theme: {
    default: "system", // 'light' | 'dark' | 'system'
    toggleIcon: true,
  },
  // External link settings
  externalLink: {
    newTab: true,
    icon: true,
    cursorType: "pointer", // 'pointer' | 'newtab'
  },
};

export const FEATURES = {
  // Animation settings
  slideEnterAnim: [true, { enterStep: 100 }], // [enabled, { options }]
  // Core Web Vitals optimizations
  useLightImages: true,
  lazyLoadImages: true,
  // Social features
  enableSocialShare: true,
  // Content features
  tocMaxDepth: 3,
  enableComments: false,
};

// API endpoints
export const API = {
  base: "/api",
  endpoints: {
    contact: "/contact",
    newsletter: "/newsletter",
  },
};
