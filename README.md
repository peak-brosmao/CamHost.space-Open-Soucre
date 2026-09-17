# CamHost.space — Open Source

<div align="center">

![CamHost.space](https://img.shields.io/badge/Status-Coming%20Soon-00d4ff?style=for-the-badge)
![Open Source](https://img.shields.io/badge/Open%20Source-Yes-7b4fff?style=for-the-badge)
![Powered By](https://img.shields.io/badge/Powered%20By-Telegram-229ed9?style=for-the-badge&logo=telegram)
![License](https://img.shields.io/badge/License-MIT-ff6b9d?style=for-the-badge)

**Unlimited Private Cloud Storage — Powered by Telegram Bots**

*Upload files from your browser. Store them for free via Telegram. No limits.*

</div>

---

## 🚀 What is CamHost.space?

CamHost.space is an **open-source unlimited cloud storage platform** that uses **Telegram Bots** as a backend storage layer. Users can upload any file through a beautiful web interface, and the system silently forwards the file to a Telegram bot/channel — giving you virtually unlimited, free, private storage.

## ✨ Features (Planned)

- 📁 **Unlimited storage** — leverages Telegram's free infrastructure
- 🌐 **Web upload interface** — drag & drop, multi-file, progress tracking
- 🤖 **Telegram bot backend** — files sent to admin account / private channel
- 🔒 **Private & secure** — only you control access
- 📂 **File management dashboard** — browse, search, share, delete
- 🔗 **Shareable links** — generate public/private links for files
- 🚀 **Open source** — MIT licensed, self-hostable

## 🔧 How It Works

```
User (Browser) → Web App → Background Service → Telegram Bot → Telegram Cloud
                                    ↑
                            Stores file metadata
                            in local database
```

1. User uploads a file through the web UI
2. The backend receives the file and forwards it to a configured Telegram Bot
3. Telegram stores the file (up to 2GB per file) in their cloud
4. Metadata (file ID, name, size, type) is saved in a local database
5. User can access, download, or share the file anytime via the dashboard

## 📦 Tech Stack (Planned)

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, JavaScript (or Next.js) |
| Backend | Node.js / Python |
| Storage | Telegram Bot API |
| Database | SQLite / PostgreSQL |
| Auth | JWT / OAuth |

## 🗺️ Roadmap

- [x] Coming Soon page
- [ ] Project architecture design
- [ ] Telegram bot integration (file upload/download)
- [ ] Web upload UI
- [ ] File management dashboard
- [ ] User authentication
- [ ] Shareable links
- [ ] Docker deployment support
- [ ] API documentation

## 🤝 Contributing

This project is in early development. Contributions, ideas, and feedback are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
  Made with ❤️ by <a href="https://github.com/peak-brosmao">peak-brosmao</a>
</div>
