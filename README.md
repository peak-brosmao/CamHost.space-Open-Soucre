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

## What is CamHost.space?

**CamHost.space** is an open-source, private cloud storage platform that uses **Telegram Bots** as an infinite, free storage backend. Upload files from your web browser — CamHost streams them to a private Telegram channel and gives you a direct, high-speed download link.

## Features

- **Unlimited storage** — leverages Telegram's free infrastructure
- **Web upload interface** — drag & drop, multi-file, progress tracking
- **Telegram bot backend** — files sent to admin account / private channel
- **Private & secure** — only you control access
- **File management dashboard** — browse, search, share, delete
- **Shareable links** — generate public/private links for files
- **Open source** — MIT licensed, self-hostable

## How It Works

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

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML5, CSS3, JavaScript |
| Backend | PHP 8+ REST API |
| Storage | Telegram Bot API |
| Database | SQLite (PDO) |
| Auth | Bearer Token / SHA-256 |

## Roadmap

- [x] Landing page with dark/light themes
- [x] PHP REST API backend (`api.camhost.space`)
- [x] Telegram bot integration (file upload/download/stream)
- [x] Web upload UI with progress tracking
- [x] File and folder management dashboard
- [x] User authentication (Register & Login)
- [x] Open source and self-hostable

## Contributing

This project is open source. Contributions, ideas, and feedback are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
  Developed by <a href="https://github.com/peak-brosmao">peak-brosmao</a> · <a href="https://peakbrosmao.me">peakbrosmao.me</a>
</div>
