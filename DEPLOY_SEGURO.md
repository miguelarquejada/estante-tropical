# Deploy Seguro - Estante Tropical

Guia passo a passo para publicar a PWA em produção mantendo segurança, performance e confiabilidade.

## 1. Pré-Deploy: Verificações de Segurança

### 1.1 Variáveis de Ambiente
```bash
# ✅ NUNCA commitar credenciais
# Verificar que .env está no .gitignore
grep "\.env" .gitignore

# Verificar código não tem secrets hardcoded
grep -r "supabase_anon_key\|supabase_url" src/ --exclude-dir=node_modules
```

**Variáveis que devem estar APENAS no servidor/hospedagem:**
- `VITE_SUPABASE_URL` - URL do projeto Supabase
- `VITE_SUPABASE_ANON_KEY` - Chave anônima (exposta no client, mas protegida por RLS)
- `VITE_GOOGLE_BOOKS_KEY` - Chave da API (opcional, com rate limiting)

### 1.2 Dependências
```bash
# Verificar vulnerabilidades conhecidas
npm audit

# Atualizar patches de segurança (sem quebrar compatibilidade)
npm audit fix --audit-level=moderate

# Revisar se todas as deps são necessárias
npm ls --all | grep -E "^@@|├──"
```

### 1.3 Build de Produção
```bash
# Gerar build otimizado com Service Worker
npm run build

# O arquivo `dist/` terá:
# - app minificado e tree-shaken
# - Service Worker cacheando assets
# - Fallback de SPA para index.html
```

## 2. Supabase em Produção

### 2.1 Row-Level Security (RLS)
A segurança de dados depende **100%** de RLS estar ativado:

```sql
-- Verificar que TODAS as tabelas têm RLS habilitado
SELECT schemaname, tablename, 
       (SELECT count(*) FROM pg_policies WHERE pg_policies.tablename = tables.tablename) as policy_count
FROM pg_tables AS tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename;
```

**Tabelas críticas (`books`, `sessions`, `shelves`):**
- Usuários só veem seus próprios registros
- RLS valida cada INSERT/UPDATE/DELETE
- Usar `auth.uid()` nas policies

Exemplo seguro:
```sql
CREATE POLICY "users_can_see_own_books"
ON books FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "users_can_insert_own_books"
ON books FOR INSERT
WITH CHECK (user_id = auth.uid());
```

### 2.2 Storage Seguro de Capas
```sql
-- Capas são públicas para leitura, mas apenas o dono pode escrever
CREATE POLICY "public_read_covers" ON storage.objects
FOR SELECT USING (bucket_id = 'covers');

CREATE POLICY "users_can_upload_own_covers" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'covers'
  AND auth.uid() IS NOT NULL
);
```

### 2.3 Chaves de API
- **Anon Key**: Exposta no client, protegida por RLS
- **Service Role Key**: NUNCA no client (use apenas em servidor privado)
- **API Key (Google Books)**: Defina quota limit no Google Cloud

## 3. Hospedagem (Vercel, Netlify ou Cloudflare Pages)

### 3.1 Vercel
```bash
# Instalar CLI
npm i -g vercel

# Deploy inicial (vincula ao git)
vercel

# Configurar variáveis de ambiente no painel:
# Settings → Environment Variables
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
# - VITE_GOOGLE_BOOKS_KEY (opcional)
```

**Configuração automática (`vercel.json`):**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 3.2 Netlify
```bash
# instalar CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir dist

# Ou via GitHub: conectar repo, auto-deploy em push
```

**Arquivo `netlify.toml`:**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 3.3 Cloudflare Pages
```bash
# Conectar repo no painel da Cloudflare
# Build: npm run build
# Output: dist
# Deploy automático em push
```

## 4. Supabase: URL Configuration

**CRÍTICO**: Configurar URLs de redirecionamento no Supabase:

Painel → **Authentication → URL Configuration**

```
Site URL:
  - Production: https://seu-dominio.com
  - Staging: https://staging.seu-dominio.com

Redirect URLs:
  - https://seu-dominio.com
  - https://seu-dominio.com/auth/callback
  - https://staging.seu-dominio.com
```

⚠️ **Sem isso**: login com Google e email confirmado falham.

## 5. HTTPS & Segurança HTTP

### 5.1 Headers de Segurança
Configurar no provedor de hospedagem ou Supabase:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self' https://supabase.co; img-src 'self' data: https:;
Referrer-Policy: strict-origin-when-cross-origin
```

**Vercel**: Settings → Security Headers → ativar defaults

### 5.2 CORS
Supabase já libera CORS para hospedagens públicas. Se houver erro CORS:
- Checar que `VITE_SUPABASE_URL` está correto
- Verificar que RLS policies não bloqueiam requests legítimas

## 6. Testing Antes de Deploy

```bash
# Rodar testes localmente
npm test

# Validar build
npm run build
npm run preview    # Simular produção localmente

# Testar PWA offline
# 1. Abrir DevTools → Application → Service Workers
# 2. Marcar "Offline"
# 3. Navegar pela app - deve funcionar

# Testar login
# 1. Confirmar email (ou desativar confirmação em dev)
# 2. Login com Google (se configurado)
# 3. Sincronização offline → online
```

## 7. Monitoramento & Rollback

### 7.1 Erros em Produção
Adicionar rastreamento (opcional, use Sentry ou Vercel Analytics):

```typescript
// src/lib/error-tracking.ts
export const reportError = (error: Error, context?: Record<string, unknown>) => {
  if (import.meta.env.PROD) {
    // Enviar para Sentry, DataDog, etc
    console.error('[PROD]', error, context);
  }
};
```

### 7.2 Rollback
Se algo quebrou:

**Vercel**: Deployments → selecionar versão anterior → "Promote to Production"

**Netlify**: Deploys → clicar em deploy anterior → "Publish deploy"

**Cloudflare**: Rollback automático disponível

## 8. Checklist de Deploy

```markdown
☐ npm audit - sem vulnerabilidades críticas
☐ npm run test - testes passando
☐ npm run build - sem erros
☐ .env.example atualizado
☐ Nenhum .env ou secret commited
☐ Supabase RLS habilitado em todas as tabelas
☐ URLs de redirecionamento no Supabase configuradas
☐ Variáveis de ambiente na hospedagem
☐ HTTPS ativado (automático na Vercel/Netlify/Cloudflare)
☐ Headers de segurança configurados
☐ Testar PWA offline em produção
☐ Testar login (email + Google)
☐ Testar sincronização
☐ Verificar logs de erro
☐ Backup de dados (Supabase → Settings → Backups)
```

## 9. Troubleshooting Comum

| Problema | Solução |
|----------|---------|
| Login falha | Adicionar URL do app em Supabase → Auth → URL Configuration |
| CORS error | Verificar `VITE_SUPABASE_URL` está correto |
| "Permission denied" | Verificar RLS policies e user_id no token |
| Service Worker offline não funciona | Limpar cache, confirmar que `/dist/` tem `sw.js` |
| Google Books API rate limit | Adicionar `VITE_GOOGLE_BOOKS_KEY` |
| Build lento | Usar `npm ci` em CI/CD (mais rápido que `npm install`) |

## 10. Autenticação Google (Opcional)

1. **Google Cloud Console**: https://console.cloud.google.com
   - Novo projeto → "Estante Tropical"
   - APIs & Services → Library → "Google Books API" → Enable
   - APIs & Services → Credentials → OAuth 2.0 Client ID
   - Authorized redirect URIs:
     ```
     https://SEU-PROJETO.supabase.co/auth/v1/callback
     ```

2. **Supabase Console**: Authentication → Providers → Google
   - Adicionar Client ID e Client Secret

3. **Na app**: Botão de login mostrará "Continuar com Google"

## Próximas Etapas

- [ ] Configurar domínio customizado (DNS apontando para Vercel/Netlify)
- [ ] Configurar email customizado (sendgrid ou similar no Supabase)
- [ ] Adicionar analytics (Vercel Web Vitals, Supabase Realtime)
- [ ] Backup automático do Supabase
- [ ] Monitoring de uptime (Uptime Robot, Pingdom)
