# TabSage - Context-Aware Chrome Tab Manager

<div align="center">
  <img src="Screenshots/Popup_Intent_Selector.png" alt="TabSage Logo" width="400">
  <p><i>HackVortex 2025 Submission by The Silicon Savants</i></p>
</div>

## 📑 Table of Contents

- [Problem Statement](#-problem-statement)
- [Approach & Solution](#-approach--solution)
- [Innovation & Uniqueness](#-innovation--uniqueness)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture & Workflow](#-architecture--workflow)
- [Installation & Usage](#-installation--usage)
- [Screenshots](#-screenshots)
- [Scalability & Real-World Impact](#-scalability--real-world-impact)
- [Future Enhancements](#-future-enhancements)
- [Links](#-links)
- [Contributing](#-contributing)
- [License](#-license)

## 🚩 Problem Statement

Modern web browsing suffers from tab overload, where users open dozens of tabs without clear organization or purpose, leading to cognitive load, reduced productivity, and browser resource strain. Traditional tab managers only organize by domain or time opened, failing to capture the underlying purpose of why tabs were opened in the first place.

## 💡 Approach & Solution

TabSage takes an intent-first approach to tab management. Rather than focusing solely on the visual organization of tabs, we capture the purpose behind each tab at the moment of creation. After exploring both automatic and manual intent capture options, we implemented a hybrid solution that allows users to specify their intent through a clean, non-disruptive interface, transforming chaotic browsing into an organized, purpose-driven experience.

## 🔍 Innovation & Uniqueness

- **Intent-Centric Design**: Unlike domain-based organizers, TabSage captures the "why" behind each tab, enabling truly contextual organization
- **Cognitive Load Reduction**: By requiring intent definition, TabSage encourages mindful browsing and reduces unnecessary tab proliferation
- **Session Portability**: The export feature creates portable, standardized browsing session records that can be referenced across devices or shared with teams

## ✨ Features

- **🧠 Intent Capture**: Record the purpose behind each tab via a dropdown of common intents or custom entries
- **📊 Dashboard View**: See all your tabs organized by intent groups for easier navigation and context switching
- **🗑️ Tab Management**: Close entire groups of related tabs with one click, maintaining focus on current priorities
- **💾 Export Sessions**: Save your browsing sessions as JSON for later reference, analysis, or sharing
- **🏷️ Intent Renaming**: Easily reorganize your tabs by updating their associated intent groups

## ⚙️ Tech Stack

| Component | Technology |
|-----------|------------|
| Extension Framework | Chrome Extension API (Manifest V3) |
| Frontend | HTML5, CSS3, JavaScript |
| UI Framework | Bootstrap 5 |
| Icons | Font Awesome 6 |
| Storage | Chrome Storage API |
| Data Format | JSON |

## 📐 Architecture & Workflow

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│   New Tab       │─────▶│  Intent Popup   │─────▶│ Storage Service │
│   Created       │      │  (User Input)   │      │ (Chrome.storage)│
│                 │      │                 │      │                 │
└─────────────────┘      └─────────────────┘      └────────┬────────┘
                                                           │
                                                           ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│ Export Function │◀─────│  Dashboard UI   │◀─────│  Tab Data       │
│ (JSON Output)   │      │  (Group View)   │      │  Retrieval      │
│                 │      │                 │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

The background service worker monitors tab creation events and prompts for intent. User selections are stored via Chrome's storage API and organized in the dashboard view. The dashboard retrieves all saved tabs, groups them by intent, and provides management functions.

## 🚀 Installation & Usage

1. **Install the Extension**
   - Download or clone this repository
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" at the top-right corner
   - Click "Load unpacked" and select the TabSage folder

2. **Setting Tab Intents**
   - Click the TabSage icon in your toolbar when you open a new tab
   - Choose from the dropdown list or create a custom intent
   - Click "Save Intent" to record your purpose for that tab

3. **Managing Your Tabs**
   - Click "Open Dashboard" in the popup to see all your organized tabs
   - View statistics about your current browsing session
   - Close entire intent groups with a single click
   - Rename intent categories to reorganize your workflow

4. **Exporting Sessions**
   - Click the "Export Session" button on the dashboard
   - Save the JSON file for future reference or analysis

## 📸 Screenshots

<table>
  <tr>
    <td width="50%">
      <img src="Screenshots/Popup_Intent_Selector.png" alt="Intent Selection Popup">
      <p align="center"><strong>Intent Selection Popup</strong><br>Choose a predefined intent or create a custom one</p>
    </td>
    <td width="50%">
      <img src="Screenshots/Dashboard_Overview.png" alt="Dashboard Overview">
      <p align="center"><strong>Dashboard Overview</strong><br>Tabs organized by intent groups</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="Screenshots/Full_Dashboard.jpeg" alt="Full Dashboard View">
      <p align="center"><strong>Full Dashboard View</strong><br>Complete scrollable dashboard with stats</p>
    </td>
    <td width="50%">
      <img src="Screenshots/Export_Session.png" alt="Export Session Feature">
      <p align="center"><strong>Export Feature</strong><br>Save your browsing session for later reference</p>
    </td>
  </tr>
</table>

![Demo GIF](path/to/demo.gif)

👉 [Watch the demo video](https://youtu.be/K1VNzrKkV7c)

**Sample Exported Session:**
```json
{
  "name": "TabSage Session Export",
  "date": "2025-05-29T15:42:07.845Z",
  "tabCount": 12,
  "tabs": [
    {
      "id": 1234567890,
      "url": "https://github.com/trending",
      "intent": "Research",
      "timestamp": 1811929367845
    },
    {
      "id": 1234567891,
      "url": "https://dev.to/",
      "intent": "Learn",
      "timestamp": 1811929327845
    }
  ]
}
```

## 🌐 Scalability & Real-World Impact

TabSage targets knowledge workers, students, researchers, and professionals who regularly juggle multiple contexts in their browsing sessions. The solution scales effortlessly across individual and team workflows, with potential integration into enterprise environments for collaborative research and information sharing. By reducing cognitive load and improving digital organization, TabSage directly addresses the growing problem of information overload, potentially saving users hours weekly in context-switching and tab hunting.

## 🔮 Future Enhancements

- **Smart Intent Prediction**: Machine learning to suggest intents based on URL patterns and user history
- **Synchronization**: Optional cloud sync for saving intent sessions across devices
- **Time Tracking**: Integration with productivity tools to measure time spent on different browsing intents
- **Team Collaboration**: Ability to share organized tab groups with team members for collaborative research
- **Browser Integration**: Deeper integration with Chrome's tab groups API for native group visualization

## 🔗 Links

- [GitHub Repository](https://github.com/gyanchandra2910/TabSage-ChromeExtension)
- [Demo Video](https://youtu.be/K1VNzrKkV7c)

## 🤝 Contributing

Contributions are welcome! To contribute to TabSage:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code follows our coding standards and includes appropriate documentation.

## 📁 Project Structure

```
TabSage/
├── manifest.json       # Extension configuration
├── background.js       # Background service worker
├── popup/              # Browser action popup
│   ├── popup.html
│   └── popup.js
├── dashboard/          # Tab dashboard interface
│   ├── dashboard.html
│   └── dashboard.js
├── styles/             # Stylesheet directory
└── icons/              # Extension icons
```

## 📄 License

This project is licensed under the MIT License.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

&copy; 2025 The Silicon Savants
