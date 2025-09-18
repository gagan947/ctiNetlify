export const chatbotFlow: any = {
  welcome: {
    step: "welcome",
    message: `Welcome to Creative AI \nI’m your AI Assistant Vanya 🤖, here to help you bring your next app or website idea to life.\nI can help you build your next app or website.\n\n👉 Please select an option below to get started.:`,
    options: [
      { label: "Build an App", next: "projectNameApp", logo: '📱' },
      { label: "Build a Website", next: "projectNameWebsite", logo : '💻' },
      { label: "Pricing & Plans", next: "pricing" , logo : '💵' },
      { label: "Development Time", next: "timelineInfo", logo: '⏳' },
      { label: "Contact Support", next: "support", logo: '📞' },
      { label: "Ask a Question", next: "chatbot", logo: '❓' }
    ]
  },

  // Ask project name before proceeding
  projectNameApp: {
    step: "projectNameApp",
    message: "Excellent! 🎉 Let’s get Started.\nWhat’s the name of your app project?",
    input: true,
    next: "askAppType"
  },

  projectNameWebsite: {
    step: "projectNameWebsite",
    message: "Excellent! 🎉 Let’s get Started.\nWhat’s the name of your website project?",
    input: true,
    next: "askWebsiteType"
  },

  // App-specific flow
  askAppType: {
    step: "askAppType",
    message: "Fantastic! Your Project **{projectName}** sounds exciting.\nCould you tell me what type of app you’d like to build?",
    options: [
      { label: "📱 Mobile App", next: "platform" },
      { label: "🛒 E-commerce App", next: "details" },
      { label: "📅 Booking System", next: "details" },
      { label: "📊 Dashboard App", next: "details" },
      { label: "🤖 AI App", next: "details" },
      { label: "📝 Other", next: "details" },
      { label: "❓ Ask a Question", next: "chatbot" }
    ]
  },

  // Website-specific flow
  askWebsiteType: {
    step: "askWebsiteType",
    message: "Perfect! Project **{projectName}** sounds exciting.\nWhat type of website do you want to build?",
    options: [
      { label: "🌐 Business Website", next: "details" },
      { label: "🛒 E-commerce Website", next: "details" },
      { label: "📰 Blog / News Website", next: "details" },
      { label: "🎨 Portfolio Website", next: "details" },
      { label: "📚 Educational Website", next: "details" },
      { label: "📝 Other", next: "details" },
      { label: "❓ Ask a Question", next: "chatbot" }
    ]
  },

  platform: {
    step: "platform",
    message: "Awesome! 📱\nWould you like your app to be built for:",
    options: [
      { label: "🍏 iOS", next: "details" },
      { label: "🤖 Android", next: "details" },
      { label: "🌍 Both (Cross-platform)", next: "details" },
      { label: "❓ Ask a Question", next: "chatbot" }
    ]
  },

  details: {
    step: "details",
    message: "Great! 👌\nCould you share the main objective of your project **{projectName}**? \nFor example: what it should solves, who will use it, or the core purpose behind building it.",
    input: true,
    next: "stop"
  },

  features: {
    step: "features",
    message: "Got it! 🚀 Sounds exciting.\n👉 What features would you like in **{projectName}** ?\n(Example: payments, chat, notifications, admin dashboard, etc.)",
    input: true,
    next: "design"
  },

  design: {
    step: "design",
    message: "Great! 🎨 Do you already have a design/idea or should we create one from scratch?",
    options: [
      { label: "🎨 I have a design", next: "timeline" },
      { label: "📝 Start from scratch", next: "timeline" },
      { label: "❓ Ask a Question", next: "chatbot" }
    ]
  },

  budget: {
    step: "budget",
    message: "Awesome! One more thing — what’s your budget range?",
    options: [
      { label: "💵 Under $1,000", next: "timeline" },
      { label: "💰 $1,000 – $5,000", next: "timeline" },
      { label: "🚀 $5,000+ (Full-scale project)", next: "timeline" },
      { label: "❓ Ask a Question", next: "chatbot" }
    ]
  },

  timeline: {
    step: "timeline",
    message: "Cool ⏳ And what’s your preferred timeline?",
    options: [
      { label: "⏳ 1–2 weeks (Prototype)", next: "summary" },
      { label: "⚡ 1 month (MVP)", next: "summary" },
      { label: "🚀 2–3 months (Full app)", next: "summary" },
      { label: "❓ Ask a Question", next: "chatbot" }
    ]
  },

  summary: {
    step: "summary",
    message: "Perfect 🎯\nHere’s what I got for project **{projectName}**:\n\n✅ Details & features saved.\n👉 Do you want me to connect you with our team for a free prototype & proposal?",
    options: [
      { label: "📞 Yes, connect me", next: "end" },
      { label: "❌ Not now", next: "end" },
      { label: "❓ Ask a Question", next: "chatbot" }
    ]
  },

  buildWebsite: {
    step: "buildWebsite",
    message: "Awesome 🌐!\nWe build:\n• 🛒 E-commerce Stores\n• 📄 Company Websites\n• 📊 Dashboards\n• ⚡ Landing Pages\n• 💼 Portfolio Sites\n\n👉 Can you tell me your *website project name*?",
    input: true,
    next: "details"
  },

  pricing: {
    step: "pricing",
    message: "Here’s how our pricing works 💵:\n• ✨ Free plan → Create a prototype\n• ⚡ Starter → MVP in days\n• 🚀 Premium → Full-scale app with AI & integrations\n\n👉 Want me to connect you with our team for a custom quote?",
    options: [
      { label: "📞 Yes, connect me", next: "end" },
      { label: "⏩ Not now", next: "end" },
      { label: "❓ Ask a Question", next: "chatbot" }
    ]
  },

  timelineInfo: {
    step: "timelineInfo",
    message: "Here’s our timeline ⏳:\n• Prototype → Minutes\n• MVP → Few days\n• Full app → Few weeks (depends on features)\n\n👉 Do you want to start with a free prototype now?",
    options: [
      { label: "✅ Yes", next: "end" },
      { label: "❌ Later", next: "end" },
      { label: "❓ Ask a Question", next: "chatbot" }
    ]
  },

  support: {
    step: "support",
    message: "You can reach us at:\n📧 support@Creative AI\n📞 Direct call available on request\n\n👉 How do you prefer to connect?",
    options: [
      { label: "💬 Chat here", next: "chatbot" },
      { label: "📧 Email us", next: "end" },
      { label: "📞 Request a call", next: "end" }
    ]
  },

  end: {
    step: "end",
    message: "👍 Thanks for chatting! 🚀"
  },
  stop: {
    step: "stop",
    message: "👍 Thanks for chatting! 🚀"
  }
};
