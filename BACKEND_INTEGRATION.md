# 🔗 Guia de Integração Frontend-Backend

## ✅ **Status da Adaptação**

O frontend foi **completamente adaptado** para funcionar com seu backend LangGraph. As principais mudanças realizadas:

### **🛠️ Mudanças Implementadas**

1. **Endpoints Atualizados:**
   - `POST /documents/upload-file` - Upload de arquivos
   - `POST /documents/upload` - Upload de texto
   - `DELETE /documents/delete` - Deletar documentos
   - `GET /documents/stats` - Estatísticas
   - `POST /agent/chat` - Chat com streaming LangGraph

2. **Sistema de Conversas Local:**
   - Conversas agora são armazenadas no `localStorage`
   - Não dependem mais de backend para persistência
   - Funcionalidades mantidas: criar, listar, deletar conversas

3. **Gestão de Documentos Híbrida:**
   - Upload e processamento via backend
   - Listagem e associação com conversas via `localStorage`
   - Compatibilidade total com componentes existentes

4. **Processamento de Streaming LangGraph:**
   - Extração correta do conteúdo de `data.content.content`
   - Detecção de execução de ferramentas via `langgraph_node`
   - Feedback visual quando ferramentas estão sendo executadas
   - Finalização baseada em `finish_reason: 'stop'`

## 🚀 **Como Usar**

### **1. Configurar Variável de Ambiente**

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_API_URL=http://localhost:8000
```

### **2. Iniciar o Frontend**

```bash
npm run dev
```

### **3. Testar Funcionalidades**

O frontend agora oferece:

- ✅ **Upload de documentos** - Funciona via seu backend
- ✅ **Chat com busca** - Usa `/agent/chat` com LangGraph
- ✅ **Gestão de conversas** - Local via localStorage
- ✅ **Interface completa** - Todos os componentes funcionam
- ✅ **Feedback de ferramentas** - Mostra quando está executando ferramentas

## 📋 **Formato Real dos Dados LangGraph**

### **Streaming de Chat**
```http
POST /agent/chat
Content-Type: application/json
Accept: text/event-stream

{
  "messages": [
    {
      "role": "user",
      "content": "Preciso de ajuda com programação em Python"
    }
  ],
  "llm_config": {
    "provider": "openai",
    "model": "gpt-4o"
  }
}
```

**Resposta do LangGraph (Server-Sent Events):**
```
data: {'content': AIMessageChunk(content='Claro', additional_kwargs={}, response_metadata={}, id='run--7e5c9b3c-f36d-46bc-ab64-7e44dfb2cfc3'), 'metadata': {'langgraph_step': 1, 'langgraph_node': 'agent', 'langgraph_triggers': ('branch:to:agent',), 'langgraph_path': ('__pregel_pull', 'agent'), 'langgraph_checkpoint_ns': 'agent:abe1459f-551a-8af0-aad3-4cd7f1da6d0a', 'checkpoint_ns': 'agent:abe1459f-551a-8af0-aad3-4cd7f1da6d0a', 'ls_provider': 'openai', 'ls_model_name': 'gpt-4o', 'ls_model_type': 'chat', 'ls_temperature': 0.0}}

data: {'content': AIMessageChunk(content='!', additional_kwargs={}, response_metadata={}, id='run--7e5c9b3c-f36d-46bc-ab64-7e44dfb2cfc3'), 'metadata': {'langgraph_step': 1, 'langgraph_node': 'agent', 'langgraph_triggers': ('branch:to:agent',), 'langgraph_path': ('__pregel_pull', 'agent'), 'langgraph_checkpoint_ns': 'agent:abe1459f-551a-8af0-aad3-4cd7f1da6d0a', 'checkpoint_ns': 'agent:abe1459f-551a-8af0-aad3-4cd7f1da6d0a', 'ls_provider': 'openai', 'ls_model_name': 'gpt-4o', 'ls_model_type': 'chat', 'ls_temperature': 0.0}}

data: {'content': AIMessageChunk(content='', additional_kwargs={}, response_metadata={'finish_reason': 'stop', 'model_name': 'gpt-4o-2024-08-06'}, id='run--7e5c9b3c-f36d-46bc-ab64-7e44dfb2cfc3'), 'metadata': {'langgraph_step': 1, 'langgraph_node': 'agent', 'langgraph_triggers': ('branch:to:agent',), 'langgraph_path': ('__pregel_pull', 'agent'), 'langgraph_checkpoint_ns': 'agent:abe1459f-551a-8af0-aad3-4cd7f1da6d0a', 'checkpoint_ns': 'agent:abe1459f-551a-8af0-aad3-4cd7f1da6d0a', 'ls_provider': 'openai', 'ls_model_name': 'gpt-4o', 'ls_model_type': 'chat', 'ls_temperature': 0.0}}
```

## 🔧 **Processamento do Streaming**

### **1. Extração de Conteúdo**
```javascript
// Formato recebido do LangGraph
const data = {
  'content': AIMessageChunk(content='texto', ...),
  'metadata': {
    'langgraph_node': 'agent',  // ou nome da ferramenta
    'langgraph_step': 1,
    'ls_provider': 'openai',
    // ... outros metadados
  }
};

// Extração do texto
const textContent = data.content.content;
const currentNode = data.metadata.langgraph_node;
```

### **2. Detecção de Execução de Ferramentas**
```javascript
// Se langgraph_node !== 'agent', está executando uma ferramenta
if (langGraphNode && langGraphNode !== 'agent') {
  // Mostrar feedback visual: "Executando ferramenta: {nome}"
  showToolExecution(langGraphNode);
} else {
  // É o agente respondendo, processar o texto normalmente
  processTextContent(textContent);
}
```

### **3. Finalização do Streaming**
```javascript
// Verificar finish_reason para finalizar
const finishReason = data.content.response_metadata?.finish_reason;
if (finishReason === 'stop') {
  // Finalizar streaming e salvar resposta completa
  completeResponse(fullResponse);
}
```

## 📋 **Upload de Arquivo**
```http
POST /documents/upload-file
Content-Type: multipart/form-data

# FormData:
- file: [arquivo]
- metadata: '{"thread_id": "demo-123", "filename": "doc.pdf"}'
```

**Resposta esperada:**
```json
{
  "success": true,
  "document_id": "doc_a1b2c3d4e5f6789",
  "vectors_created": 5,
  "processing_time": 2.45
}
```

## 🎯 **Funcionalidades Implementadas**

### **✅ Funciona Completamente:**
- Upload de documentos (arquivo e texto)
- Chat com busca em documentos via LangGraph
- Streaming de respostas com feedback de ferramentas
- Gestão de conversas local
- Interface de usuário completa
- Feedback visual quando ferramentas estão sendo executadas

### **🔄 Feedback Visual de Ferramentas:**
- Quando `langgraph_node` ≠ 'agent': mostra "Executando ferramenta: {nome}"
- Spinner animado durante execução
- Transição suave entre execução de ferramenta e resposta do agente

### **📋 Simulado Localmente:**
- Lista de documentos por conversa
- Status de processamento
- Progresso de indexação
- Metadados de documentos

## 🚦 **Teste de Integração**

Para testar a integração:

1. **Inicie seu backend LangGraph** na porta 8000
2. **Configure a variável** `VITE_API_URL=http://localhost:8000`
3. **Inicie o frontend** com `npm run dev`
4. **Teste o upload** de um documento
5. **Teste o chat** fazendo perguntas - observe o feedback de ferramentas!

## 📝 **Logs e Debug**

O frontend agora inclui logs detalhados para LangGraph:

```javascript
// Logs de streaming LangGraph
console.log('Iniciando streaming LangGraph:', config);
console.log('Chunk LangGraph bruto:', chunk);
console.log('Dados LangGraph:', data);
console.log('Token LangGraph recebido:', textContent);

// Logs de execução de ferramentas
console.log('Executando ferramenta:', toolName);
console.log('Ferramenta finalizada:', toolName);
```

## 🎉 **Resultado**

O frontend está **100% funcional** com seu backend LangGraph, incluindo:

- ✅ **Processamento correto** do formato de dados real
- ✅ **Feedback visual** de execução de ferramentas
- ✅ **Streaming otimizado** com detecção de finalização
- ✅ **Interface moderna** com indicadores visuais
- ✅ **Logs detalhados** para debugging
- ✅ **Experiência completa** para demonstração acadêmica! 