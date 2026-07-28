# M-Box Movie Streaming Platform

A premium movie web application built with pure HTML, CSS, and JavaScript, integrated with the live **TMDb API** and **Mateza Translation**.

## 🛡️ Hiding API Keys from GitHub

To keep secret API keys safe and prevent GitHub secret scanner flags:

1. Sensitive configuration files (`config.js` and `.env`) are listed in `.gitignore` so they are **never tracked or committed to GitHub**.
2. Template files (`.env.example` and `config.example.js`) are provided for repository reference.

### 🚀 Getting Started

1. Clone or download the repository.
2. Copy `config.example.js` to `config.js`:
   ```bash
   cp config.example.js config.js
   ```
3. Add your real TMDb API key and Mateza key in `config.js`.
4. Open `index.html` in your browser.
