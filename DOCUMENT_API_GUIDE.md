# 📄 Guia da Nova API de Documentos

Este guia documenta a integração da nova API de documentos que substitui a API antiga, fornecendo funcionalidades aprimoradas de upload, gerenciamento e busca de documentos.

## 🚀 Principais Mudanças

### ✅ O que foi Atualizado

1. **Endpoints da API**
   - `POST /documents/upload` - Upload de documentos (texto e arquivos)
   - `POST /documents/upload-bulk` - Upload múltiplo de documentos
   - `DELETE /documents/delete` - Deleção de documentos
   - `POST /documents/search` - Busca por similaridade
   - `GET /documents/stats` - Estatísticas do índice
   - `DELETE /documents/clear-namespace` - Limpar namespace

2. **Sistema de Namespaces**
   - Cada thread usa namespace `thread_{threadId}`
   - Isolamento lógico de documentos por conversa
   - Melhor organização e performance

3. **Metadados Aprimorados**
   - Suporte a tags, autor, fonte
   - Metadados customizáveis
   - Melhor rastreabilidade

4. **Processamento de Vetores**
   - Vetores dummy gerados localmente (temporário)
   - Em produção, seria feito pelo backend com embeddings reais
   - Vetores consistentes baseados no conteúdo

## 📋 Estrutura de Dados

### Document Interface
```typescript
interface Document {
  document_id: string;           // ID único do documento
  vectors_created?: number;      // Número de vetores criados
  processing_time?: number;      // Tempo de processamento
  filename: string;              // Nome do arquivo
  original_filename: string;     // Nome original
  mime_type?: string;           // Tipo MIME
  file_size?: number;           // Tamanho do arquivo
  is_processed: boolean;        // Status de processamento
  index_status: string;         // Status do índice
  doc_metadata: object;         // Metadados do documento
  created_at: string;           // Data de criação
  thread_id: string;            // ID da thread/conversa
}
```

### UploadDocumentRequest Interface
```typescript
interface UploadDocumentRequest {
  document: DocumentMetadata;    // Metadados do documento
  vector: number[];             
  namespace?: string;           // Namespace para organização
  document_id?: string;         // ID customizado (opcional)
}
```

### DocumentMetadata Interface
```typescript
interface DocumentMetadata {
  title: string;                // Título do documento
  content?: string;             // Conteúdo (para upload de texto)
  source?: string;              // Fonte do documento
  author?: string;              // Autor
  tags?: string[];              // Tags para categorização
  thread_id?: string;           // ID da thread
  filename?: string;            // Nome do arquivo
  uploaded_at?: string;         // Data de upload
  mime_type?: string;           // Tipo MIME
  file_size?: number;           // Tamanho do arquivo
  [key: string]: any;           // Metadados customizados
}
```

## 🔧 Métodos Disponíveis

### Upload de Arquivo
```typescript
await documentService.uploadDocument(file: File, threadId: string)
```
- Lê o conteúdo do arquivo (para arquivos de texto)
- Gera vetor dummy baseado no conteúdo
- Usa `POST /documents/upload` com metadados completos
- Retorna documento com metadados completos

### Upload de Texto
```typescript
await documentService.uploadText(content: string, threadId: string, title?: string)
```
- Faz upload de texto diretamente
- Gera vetor dummy baseado no conteúdo
- Ideal para conteúdo copiado/colado
- Cria documento virtual com metadados

### Buscar Documentos da Conversa
```typescript
await documentService.getConversationDocuments(threadId: string)
```
- Retorna todos os documentos de uma conversa
- Usa localStorage para cache local
- Compatível com componentes existentes
- **Nota:** Backend não tem endpoint para listagem

### Deletar Documentos
```typescript
await documentService.deleteDocuments(documentIds: string[], namespace?: string)
await documentService.deleteDocument(documentId: number) // Compatibilidade
```
- Deleta documentos do backend e localStorage
- Suporte a deleção em lote
- Limpeza automática de cache

### Estatísticas
```typescript
await documentService.getDocumentStats()
```
- Retorna estatísticas do índice Pinecone
- Total de vetores, dimensão, ocupação
- Útil para monitoramento

### Busca por Similaridade
```typescript
await documentService.searchDocuments(query: string, threadId?: string, topK: number = 5)
```
- **Nota:** Requer implementação de embedding no backend
- Atualmente retorna array vazio
- Preparado para implementação futura

### Limpar Namespace
```typescript
await documentService.clearNamespace(namespace: string)
```
- Remove todos os documentos de um namespace
- Útil para limpeza de conversas
- Atualiza localStorage automaticamente

## 🧪 Testando a API

### Console do Navegador
```javascript
// Testar todas as funcionalidades
await window.testDocumentAPI()

// Testar upload de arquivo específico
await window.testFileUpload(file, 'thread-id')
```

### Teste Manual
1. Abra o console do navegador (F12)
2. Execute `await window.testDocumentAPI()`
3. Verifique os logs para confirmar funcionamento

## 🔄 Compatibilidade

### Componentes Atualizados
- ✅ `DocumentUpload.tsx` - Funciona com nova API
- ✅ `DocumentBar.tsx` - Compatível
- ✅ `Chat.tsx` - Upload e deleção atualizados
- ✅ `DocumentProgressBar.tsx` - Mantém compatibilidade

### Funcionalidades Mantidas
- ✅ Drag & drop de arquivos
- ✅ Upload múltiplo
- ✅ Feedback visual de progresso
- ✅ Gerenciamento por conversa
- ✅ Cache local (localStorage)

## 🚨 Pontos de Atenção

### Limitações Atuais

#### Vetores Dummy
- **Temporário:** Vetores são gerados localmente como placeholder
- **Produção:** Backend deve implementar embeddings reais (OpenAI, etc.)
- **Consistência:** Vetores são gerados baseados no hash do conteúdo

#### Processamento de Arquivos
- **Texto:** Arquivos `.txt`, `.md` e `text/*` são lidos completamente
- **Outros:** Apenas metadados são enviados (nome, tipo, tamanho)
- **Futuro:** Backend deve implementar processamento de PDF, DOCX, etc.

#### Listagem de Documentos
- **Cache Local:** Usa localStorage para simular listagem por thread
- **Backend:** Não tem endpoint para listar documentos por namespace
- **Recomendação:** Implementar endpoint `/documents/list` no backend

### Namespaces
- Sempre use `thread_{threadId}` para consistência
- Namespace padrão é 'default' se não especificado
- Isolamento garante que documentos não se misturem

### Processamento
- Processamento é automático no upload
- Não há mais status 'pending' ou 'processing'
- Documentos ficam disponíveis imediatamente

### Cache Local
- localStorage mantém sincronização
- Documentos são armazenados por thread
- Limpeza automática na deleção

## 📈 Performance

### Melhorias
- ✅ Processamento mais rápido
- ✅ Menos requisições à API
- ✅ Cache inteligente
- ✅ Namespaces otimizados

### Monitoramento
- Use `getDocumentStats()` para métricas
- Logs detalhados no console
- Tratamento robusto de erros

## 🔮 Próximos Passos

### Funcionalidades Planejadas
- [ ] Busca por similaridade com embedding
- [ ] Bulk upload otimizado
- [ ] Versionamento de documentos
- [ ] Metadados avançados

### Otimizações
- [ ] Cache Redis para performance
- [ ] Compressão de metadados
- [ ] Índices secundários
- [ ] Rate limiting inteligente

---

## 🆘 Troubleshooting

### Erro de Upload
```
Error: Erro ao fazer upload do documento
```
**Solução:** Verifique se o backend está rodando e os endpoints estão corretos.

### Documento Não Encontrado
```
Error: Documento com ID X não encontrado
```
**Solução:** Verifique se o documento existe no localStorage e no backend.

### Namespace Inválido
```
Error: Namespace não encontrado
```
**Solução:** Use o formato `thread_{threadId}` para namespaces.

---

**📞 Suporte:** Para dúvidas ou problemas, verifique os logs do console e teste com `window.testDocumentAPI()`. 