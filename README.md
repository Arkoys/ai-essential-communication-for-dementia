# Dementia Clinical Coach

A clinical decision support web application designed for primary care providers. This tool assists them in the recognition, evaluation, and diagnosis of dementia by leveraging evidence-based medical resources.

## 🌟 Features

- **Specialized AI Coach:** A chatbot powered by the Google Gemini API, configured to provide relevant clinical guidance.
- **Integrated Knowledge Base (RAG):** The assistant uses Retrieval-Augmented Generation (RAG) to ground its responses in the Ariadne Labs "Essential Communications Toolkit".
- **Consultation Management:** Conversation history is saved and organized by session via Firebase.
- **Navigation Map:** An interface guiding the practitioner through 3 key phases: Recognition, Evaluation, and Diagnosis.
- **Admin Panel:** A dedicated interface to inject and manage documentary resources (Knowledge Chunks) and configure RAG parameters.
- **Auto-Seeding:** Automatic injection of default medical resources upon the administrator's first login.
- **Secure Authentication:** Google Sign-In (Firebase Auth) to restrict access.
- **Responsive Design:** Interface optimized for desktop, tablet, and mobile use.

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS, Lucide React (icons)
- **Backend & Database:** Firebase (Authentication, Firestore)
- **Artificial Intelligence:** Google Gemini API (`@google/genai`) for text generation and embeddings.

## 🚀 Installation and Setup

### Prerequisites
- Node.js
- A Firebase project with Authentication (Google) and Firestore enabled.
- A Google Gemini API key.

### Steps

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

## 📚 Knowledge Base (RAG)

The application is pre-configured with Ariadne Labs resources:
- **Primer:** Introductory guide to essential communication.
- **Stuck Points Framework:** Framework for managing emotional and relational roadblocks.
- **Sample Language:** Dialogue examples for the recognition, evaluation, and diagnosis phases.

## 🏗️ System Architecture

```mermaid
flowchart TD
    %% Users
    Provider([Primary Care Provider])
    Admin([System Admin])

    %% Frontend App
    subgraph Client [Client Application - React SPA]
        UI_Chat[Chat Interface]
        UI_Admin[Admin Panel]
        RAG_Engine[RAG Controller - rag.ts]
        LLM_Service[LLM Service - llm.ts]
    end

    %% Firebase / BaaS
    subgraph Firebase [Firebase Cloud]
        Auth[Firebase Authentication]
        Firestore[(Firestore NoSQL DB)]
    end

    %% External APIs
    subgraph External_APIs [External AI Providers]
        Gemini[Google Gemini API]
        Minimax[Minimax API]
    end

    %% Cloud Hosting
    Hosting((Netflify, Google Cloud Run, or esle...))

    %% Connections - Auth & DB
    Provider -->|Logs in| Auth
    Admin -->|Logs in| Auth
    UI_Chat -->|Reads chunks & config| Firestore
    UI_Admin -->|Writes chunks & config| Firestore

    %% RAG Admin Flow
    Admin -->|Uploads Guidelines/Ressources| UI_Admin
    UI_Admin -->|Generate Embedding| Gemini
    UI_Admin -->|Save Doc + Vector| Firestore

    %% Chat & RAG Query Flow
    Provider -->|Asks clinical question| UI_Chat
    UI_Chat --> RAG_Engine
    
    %% RAG Logic
    RAG_Engine -.->|If RAG| Gemini_vector[Vectorize Query via Gemini]
    Gemini_vector -.->|Fetch chunks| Firestore
    RAG_Engine -.->|If Prompt Stuffing| Firestore_All[Fetch ALL chunks]
    
    RAG_Engine -->|Format Context| LLM_Service
    
    %% LLM Generation Flow
    LLM_Service -->|Prompt + Context + History| Gemini
    LLM_Service -->|Prompt + Context + History| Minimax
    
    %% Hosting
    Hosting -.->|Serves compiled App| Client
```

## 🗄️ Database Schema

```mermaid
erDiagram
    APP_SETTINGS {
        string documentId PK "e.g., 'rag_config'"
        number topK "Number of chunks (e.g., 3)"
        number similarityThreshold "e.g., 0.7"
        string mode "'rag' or 'prompt_stuffing'"
        string modelProvider "'gemini' or 'minimax'"
    }

    KNOWLEDGE_CHUNKS {
        string documentId PK "Auto-generated"
        string source "e.g., 'Ariadne Labs - Primer'"
        string content "Raw text of the resource"
        number[] embedding "Array of floats (GenAI Vector)"
    }

    USERS {
        string uid PK "Matches Firebase Auth UID"
        string email 
        string role "'provider' or 'admin'"
    }

    CONVERSATIONS {
        string conversationId PK 
        string uid FK "Owner of the conversation"
        string currentPhase "e.g., 'Recognition'"
        timestamp lastUpdatedAt 
    }

    MESSAGES {
        string messageId PK 
        string conversationId FK 
        string role "'user' or 'assistant'"
        string content "Message text content"
        timestamp createdAt 
    }

    %% Relationships
    USERS ||--o{ CONVERSATIONS : "owns"
    CONVERSATIONS ||--o{ MESSAGES : "contains"
```


## 🤝 In Collaboration With

This project is done in collaboration with the following schools and labs:

| EPFL | LIGHT LABORATORY | Harvard T.H. Chan School | Ariadne Labs |
| :---: | :---: | :---: | :---: |
| <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Logo_EPFL_2019.svg/1280px-Logo_EPFL_2019.svg.png" width="150" alt="EPFL"> | <img src="https://avatars.githubusercontent.com/u/62012557?s=200&v=4" width="150" alt="LIGHT LABORATORY"> | <img src="https://upload.wikimedia.org/wikipedia/en/1/18/Harvard_shield-Public_Health.png" width="150" alt="Harvard T.H. Chan School"> | <img src="https://www.ariadnelabs.org/wp-content/themes/ariadne-labs/assets/images/AL-logo-solo-white.svg" width="150" alt="Ariadne Labs"> |


## ⚠️ Security Warning (PHI)

**Warning:** This tool is designed for general clinical decision support. Users **must never** input Protected Health Information (PHI) or identifiable patient data into the chat interface. All queries must be anonymized.