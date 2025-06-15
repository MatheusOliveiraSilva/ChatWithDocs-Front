# ChatWithDocs Frontend

Frontend da aplicação de IA para conversas com documentos, integrado ao backend disponível em: [https://github.com/MatheusOliveiraSilva/proj-final-prog](https://github.com/MatheusOliveiraSilva/proj-final-prog)

## 📋 Sobre o Projeto

Este é o frontend de uma aplicação de IA que permite aos usuários fazer upload de documentos e conversar com eles usando inteligência artificial. A aplicação oferece uma interface moderna e responsiva para interação com documentos através de chat em tempo real.

### 🎯 Funcionalidades Principais

- **Upload de Documentos**: Suporte a múltiplos formatos (PDF, DOCX, TXT, etc.)
- **Chat Inteligente**: Conversas em tempo real com IA sobre o conteúdo dos documentos
- **Streaming de Respostas**: Respostas da IA são exibidas em tempo real conforme são geradas
- **Histórico de Conversas**: Persistência local das conversas usando localStorage
- **Interface Responsiva**: Design moderno e adaptável para diferentes dispositivos

### 🏗️ Arquitetura e Funcionamento

#### **Gerenciamento de Estado**
- **localStorage**: Armazena conversas, preferências do usuário e sessões localmente
- **React State**: Gerencia estado da aplicação em tempo real (mensagens, uploads, configurações)

#### **Comunicação com Backend**
- **Requisições HTTP**: Upload de documentos e busca usando fetch API
- **Server-Sent Events (SSE)**: Streaming de respostas da IA em tempo real
- **Formato de Dados**: Comunicação via JSON com o backend FastAPI

#### **Processamento de Documentos**
- **Frontend**: Envia arquivos brutos via FormData
- **Backend**: Processa extração de conteúdo, chunking e embeddings
- **Namespace**: Organiza documentos por thread de conversa (`thread_{threadId}`)

#### **Streaming de Respostas**
- **Conexão SSE**: Estabelece stream com endpoint `/agent/chat`
- **Processamento em Tempo Real**: Chunks de texto são exibidos conforme chegam
- **Histórico Contextual**: Envia histórico completo da conversa para manter contexto

## 🚀 Configuração e Instalação

### Pré-requisitos

Se você não tem Node.js instalado, siga estes passos:

#### 1. Instalar Node.js
```bash
# macOS (usando Homebrew)
brew install node

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Windows
# Baixe e instale de: https://nodejs.org/
```

#### 2. Verificar Instalação
```bash
node --version  # Deve mostrar v18+ ou superior
npm --version   # Deve mostrar versão do npm
```

### Instalação do Projeto

#### 1. Clonar o Repositório
```bash
git clone https://github.com/seu-usuario/ChatWithDocs-Front.git
cd ChatWithDocs-Front
```

#### 2. Instalar Dependências
```bash
npm install
```

#### 3. Executar em Desenvolvimento
```bash
npm run dev
```

A aplicação estará disponível em: `http://localhost:5173`

#### 4. Verificar se Está Funcionando
- Acesse `http://localhost:5173` no navegador
- Você deve ver a interface do ChatWithDocs

### Build para Produção

#### 1. Gerar Build
```bash
npm run build
```

#### 2. Verificar Build
```bash
# Os arquivos estarão na pasta 'dist'
ls dist/

# Para testar o build localmente
npm run preview
```

## 🔧 Configuração do Backend

Por padrão, o frontend se conecta ao backend em `http://localhost:8000`. 

Para usar um backend em URL diferente, crie um arquivo `.env`:
```bash
VITE_API_URL=http://seu-backend:porta
```

## 🛠️ Tecnologias Utilizadas

- **React 18**: Framework principal
- **TypeScript**: Tipagem estática
- **Vite**: Build tool e dev server
- **CSS Modules**: Estilização
- **React Router**: Navegação
- **Server-Sent Events**: Streaming em tempo real

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes React reutilizáveis
├── pages/              # Páginas principais da aplicação
├── services/           # Serviços de comunicação com APIs
├── styles/             # Arquivos CSS
├── hooks/              # Custom hooks React
└── types/              # Definições TypeScript
```

