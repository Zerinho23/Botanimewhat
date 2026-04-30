module.exports = {
    prefix: "!",
    botName: "🌸 AnimeBot 🌸",
    ownerNumber: "5215512345678",
    language: "es",

    // Segundos de espera entre comandos para usuarios normales (admins no tienen límite)
    commandCooldown: 10,

    level: {
      xpPerMessage: 10,
      xpPerCommand: 25,
      levelMultiplier: 100,
    },

    economy: {
      enabled: true,
      coinsPerMessage: 2,
      coinsPerCommand: 5,
      waifuCost: 50,
      dailyReward: 100,
    },

    antiSpam: {
      enabled: true,
      maxMessagesPerSecond: 5,
      deleteLinks: true,
      allowedDomains: ["myanimelist.net", "anilist.co"],
    },

    api: {
      jikanBase: "https://api.jikan.moe/v4",
      waifuBase: "https://api.waifu.pics",
      nekosBase: "https://nekos.best/api/v2",
    },

    emojis: {
      success: "✅",
      error: "❌",
      warning: "⚠️",
      info: "ℹ️",
      star: "⭐",
      heart: "💖",
      sparkles: "✨",
      fire: "🔥",
      crown: "👑",
      coin: "🪙",
      rose: "🌹",
      cherry: "🌸",
      katana: "🗡️",
    },
  };
  