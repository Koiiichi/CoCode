# CoCode

A collaborative real-time code editor built with modern web technologies, featuring advanced collaboration tools, conflict resolution, and comprehensive development features.

## Features

### Real-time Collaboration

* **Live Cursors & Presence**: See where collaborators are working with live cursor tracking
* **User Avatars**: Visual indicators showing active users in each project
* **Real-time Sync**: Instant synchronization of all code changes across users
* **Conflict Resolution**: Advanced merge conflict handling with Monaco DiffEditor

### Authentication & Security

* **Multi-provider Auth**: Email/password, Google, and GitHub login
* **Secure Sessions**: Firebase Authentication with automatic session management
* **Project Permissions**: Control access to projects and files

### Advanced File Management

* **Hierarchical Structure**: Nested folders and files with drag-and-drop organization
* **File Operations**: Create, rename, delete files and folders
* **Import/Export**: Multi-file import and project ZIP export
* **File Type Detection**: Automatic language detection and syntax highlighting

### Powerful Code Editor

* **Monaco Editor**: Full VS Code editor experience in the browser
* **Syntax Highlighting**: Support for 20+ programming languages
* **IntelliSense**: Code completion and error detection
* **Multiple Tabs**: Work with multiple files simultaneously

### Development Tools

* **Code Execution**: Sandboxed code runner with live preview
* **Console Integration**: Real-time console output and error tracking
* **Development Logs**: Comprehensive logging panel with filtering (Ctrl+Shift+L)
* **Performance Monitoring**: Built-in telemetry and performance metrics

### Code Review & Comments

* **Inline Comments**: Add comments to specific lines with context
* **Comment Resolution**: Mark comments as resolved/reopened
* **Real-time Discussion**: Live comment synchronization across users
* **Comment Panel**: Dedicated sidebar for managing all comments

### Performance & Reliability

* **Conflict Detection**: Automatic version control with merge conflict resolution
* **Error Handling**: Comprehensive error tracking and recovery
* **Offline Support**: Graceful handling of network interruptions
* **Performance Metrics**: Web Vitals tracking (LCP, FID, CLS)

## Technology Stack

* **Frontend**: React (with Vite) + Tailwind CSS
* **Editor**: Monaco Editor (VS Code engine)
* **Backend**: Firebase Realtime Database
* **Authentication**: Firebase Auth
* **Build Tool**: Vite
* **Deployment**: Vercel
* **Monitoring**: Custom telemetry and logging system

## Getting Started

<div style="border-left: 4px solid #e53935; padding: 0.75em 1em; background: #fff5f5;">
<strong>Warning:</strong> Before running locally, make sure you configure your Firebase credentials in a <code>.env</code> file. Without this step, authentication and database features will not work.
</div>

### Prerequisites

* Node.js (v16 or higher)
* npm or yarn
* Firebase project with Realtime Database enabled

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/CoCode.git
   cd CoCode/my-collab-code-editor
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Firebase Setup:**

   * Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
   * Enable Realtime Database
   * Enable Authentication (Email/Password, Google, GitHub)
   * Get your Firebase configuration

4. **Environment Configuration:**
   Create a `.env` file in the root directory:

   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

5. **Start Development Server:**

   ```bash
   npm run dev
   ```

6. **Open Application:**
   Navigate to `http://localhost:5173` in your browser

## Usage Guide

<div style="border-left: 4px solid #1e88e5; padding: 0.75em 1em; background: #f5faff;">
<strong>Info:</strong> For the best experience, ensure you are logged in and have created or joined a project. Some features (collaboration, comments, presence) will not be visible without multiple users.
</div>

### Getting Started

1. **Account Setup**: Sign up with email or use social login (Google/GitHub)
2. **Create Project**: Click "New Project" and give it a name
3. **Invite Collaborators**: Share project URL or invite by email
4. **Start Coding**: Begin editing files with real-time collaboration

### File Management

* **Create Files**: Use the "+" button or file tree context menu
* **Create Folders**: Right-click in file tree or use folder creation button
* **Organize**: Drag and drop files/folders to reorganize structure
* **Import**: Use import button to add multiple files at once
* **Export**: Export individual files or entire project as ZIP

### Collaboration Features

* **Live Cursors**: See collaborators' cursors and selections in real-time
* **Presence Indicators**: View active users in the collaborator pill
* **Comments**: Click line numbers to add contextual comments
* **Conflict Resolution**: Automatic detection and resolution of merge conflicts

### Development Tools

* **Code Runner**: Execute code with Ctrl+Enter, view output in console
* **Dev Logs**: Press Ctrl+Shift+L to open development logs panel
* **Comments Panel**: Toggle with the comments button to manage all comments
* **File Tree**: Organize project structure with nested folders

### Keyboard Shortcuts

* `Ctrl+Enter`: Run code
* `Ctrl+Shift+L`: Toggle development logs
* `Ctrl+S`: Save file (automatic)
* Standard Monaco Editor shortcuts (Ctrl+F for find, etc.)

## Architecture

### Core Components

* **Editor Manager**: Monaco editor integration and file handling
* **Presence System**: Real-time user tracking and cursor synchronization
* **Conflict Handler**: Version control and merge conflict resolution
* **File Tree Manager**: Hierarchical file organization with drag-and-drop
* **Comments System**: Inline commenting with real-time sync
* **Code Runner**: Sandboxed code execution environment
* **Telemetry**: Performance monitoring and usage analytics
* **Dev Logs**: Development logging and debugging tools

## Development

### Building for Production

```bash
npm run build
```

## Deployment

The application is deployed on [Vercel](https://your-vercel-link.vercel.app).

<div style="border-left: 4px solid #1e88e5; padding: 0.75em 1em; background: #f5faff;">
<strong>Info:</strong> Configure your environment variables in the Vercel dashboard (<code>Project Settings &gt; Environment Variables</code>) before deploying. Automatic builds are triggered from the main branch.
</div>

## Debugging

### Development Logs

* Press `Ctrl+Shift+L` to open the development logs panel
* Filter logs by level (Debug, Info, Warn, Error)
* Export logs for analysis
* Real-time console integration

### Performance Monitoring

* Built-in Web Vitals tracking
* Performance metrics collection
* Telemetry data export
* Error tracking and reporting

## Git Scripts & Automation

We use custom automation tools for managing branches and ensuring safe merges across environments.

See [`scripts/README.md`](scripts/README.md) for full documentation.

## Contributing

We welcome contributions! Here's how to get started:

1. **Fork the Repository**
2. **Create Feature Branch**: `git checkout -b feature/amazing-feature`
3. **Commit Changes**: `git commit -m 'Add amazing feature'`
4. **Push to Branch**: `git push origin feature/amazing-feature`
5. **Open Pull Request**

### Development Guidelines

* Follow existing code style and patterns
* Add comprehensive comments for new features
* Test thoroughly with multiple users
* Update documentation for new features
* Ensure Firebase security rules are appropriate

### Feature Requests

* Open an issue with detailed description
* Include use cases and expected behavior
* Consider implementation complexity
* Discuss with maintainers before major changes

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

* **Monaco Editor**: Microsoft's excellent web-based code editor
* **Firebase**: Google's real-time database and authentication platform
* **Vite**: Fast build tool and development server
* **Contributors**: All developers who have contributed to this project

## Support

* **Issues**: [GitHub Issues](https://github.com/yourusername/CoCode/issues)
* **Discussions**: [GitHub Discussions](https://github.com/yourusername/CoCode/discussions)
* **Documentation**: [Wiki](https://github.com/yourusername/CoCode/wiki)

---

**CoCode** - Collaborative coding made simple and powerful. Built with ❤️ for developers who code together.
