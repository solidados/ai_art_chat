# ArtsMIA AI Collection Chat

A conversational AI interface for exploring the Minneapolis Institute of Art's collection through natural language queries.

## 🛠️ Technologies Used
- **Framework**: Next.js 15.3.4
- **Language**: TypeScript 5
- **React**: v19
- **Backend**: Node.js

## 🔌 Key Libraries & Services
- **Vector Database**: DataStax Astra (for storing and querying art embeddings)
- **AI Model**: OpenAI (for natural language understanding and generation)
- **Database Client**: Cassandra driver (for Astra DB connectivity)

## 🌐 Data Source
All artwork information is sourced from the [Minneapolis Institute of Art Collection dataset](https://github.com/artsmia/collection), made publicly available by the museum.

## 🎨 About This Project
This AI chat application allows art enthusiasts to:
- Discover artworks from Mia's collection
- Learn about artists and art movements
- Get detailed information about specific pieces
- Explore art history through conversational interface

The application combines OpenAI's LLM technology with DataStax Astra vector database to provide accurate, context-aware responses about the museum's collection.

## Getting Started
1. Clone this repository
2. Install dependencies: `npm install`
3. Run development server: `npm run dev`

*Note: This project is currently in early development (v0.1.0)*
