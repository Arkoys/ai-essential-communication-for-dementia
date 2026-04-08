# Dementia Clinical Assistant

A clinical decision support web application designed for primary care providers. This tool assists them in the recognition, evaluation, and diagnosis of dementia by leveraging evidence-based medical resources.

## 🌟 Features

- **Specialized AI Assistant:** A chatbot powered by the Google Gemini API, configured to provide relevant clinical guidance.
- **Integrated Knowledge Base (RAG):** The assistant uses Retrieval-Augmented Generation (RAG) to ground its responses in the Ariadne Labs "Essential Communications Toolkit".
- **Consultation Management:** Conversation history is saved and organized by session via SQLite.
- **Navigation Map:** An interface guiding the practitioner through 3 key phases: Recognition, Evaluation, and Diagnosis.
- **Admin Panel:** A dedicated interface to inject and manage documentary resources (Knowledge Chunks) and configure RAG parameters.
- **Auto-Seeding:** Automatic injection of default medical resources upon the administrator's first login.
- **Secure Authentication:** Google Sign-In (Firebase Auth) to restrict access.
- **Responsive Design:** Interface optimized for desktop, tablet, and mobile use.

## 🛠️ Tech Stack

- **Framework:** Next.js (App Router), React 18, TypeScript
- **Styling:** Tailwind CSS, Lucide React (icons)
- **Database:** SQLite (via `sqlite3` and `sqlite`)
- **Authentication:** Firebase Auth
- **Artificial Intelligence:** Google Gemini API (`@google/genai`) for text generation and embeddings.
- **Deployment:** Docker & Docker Compose

## 🚀 Installation and Setup

### Prerequisites
- Node.js
- Docker & Docker Compose (for containerized deployment)
- A Firebase project with Authentication (Google) enabled.
- A Google Gemini API key. (or other model, to modify if needed)

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configuration:**
   The application requires a `firebase-applet-config.json` file at the root for Firebase configuration, as well as a `GEMINI_API_KEY` environment variable for the AI.

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   The application will be accessible on port 3000.

### Docker Deployment

1. **Build and run the container:**
   ```bash
   docker-compose up --build -d
   ```
   The application will be accessible on port 3000. Data will be persisted in a Docker volume.

## 📚 Knowledge Base (RAG)

The application is pre-configured with Ariadne Labs resources:
- **Primer:** Introductory guide to essential communication.
- **Stuck Points Framework:** Framework for managing emotional and relational roadblocks.
- **Sample Language:** Dialogue examples for the recognition, evaluation, and diagnosis phases.

## ⚠️ Security Warning (PHI)

**Warning:** This tool is designed for general clinical decision support. Users **must never** input Protected Health Information (PHI) or identifiable patient data into the chat interface. All queries must be anonymized.

## 🤝 In Collaboration With

This project is done in collaboration with the following schools and labs:

| EPFL | LIGHT LABORATORY | Harvard T.H. Chan School | Ariadne Labs |
| :---: | :---: | :---: | :---: |
| <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Logo_EPFL_2019.svg/1280px-Logo_EPFL_2019.svg.png" width="150" alt="EPFL"> | <img src="https://avatars.githubusercontent.com/u/62012557?s=200&v=4" width="150" alt="LIGHT LABORATORY"> | <img src="https://upload.wikimedia.org/wikipedia/en/1/18/Harvard_shield-Public_Health.png" width="150" alt="Harvard T.H. Chan School"> | <img src="https://www.ariadnelabs.org/wp-content/themes/ariadne-labs/assets/images/AL-logo-solo-white.svg" width="150" alt="Ariadne Labs"> |
