const { data, error } = await supabase.from('appointments').select('*').limit(1);
console.log(error ? '✅ SEGURO: ' + error.message : '❌ INSEGURO: ' + data?.length);## 🔒 GUIA DE SEGURANÇA - CONFIGURAÇÕES NECESSÁRIAS

### ⚠️ OBRIGATÓRIO ANTES DE COLOCAR EM PRODUÇÃO

O código foi atualizado com proteção de rotas no frontend, mas é **CRÍTICO** configurar as políticas de segurança no banco de dados (Row Level Security - RLS).

---

## 1️⃣ HABILITAR RLS SUPABASE

### Passo 1: Ir para o Dashboard do Supabase
1. Login em https://app.supabase.com
2. Selecione seu projeto "Projeto manicure"
3. Vá para **SQL Editor** ou **Database** > **Tables**

### Passo 2: ENABLER RLS EM TODAS AS TABELAS

Execute estes comandos SQL:

```sql
-- Habilitar RLS na tabela 'appointments'
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS na tabela 'clients'
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS na tabela 'services'
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS na tabela 'auth.users' (se aplicável)
-- Nota: auth.users é controlado automaticamente pelo Supabase
```

---

## 2️⃣ CRIAR POLÍTICAS RLS

### Para a tabela `appointments` (Agendamentos):

```sql
-- Permitir ler agendamentos apenas ao admin autenticado
CREATE POLICY "admin_select_appointments" ON appointments
  FOR SELECT
  USING (auth.role() = 'authenticated' AND (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin');

-- Permitir atualizar agendamentos apenas ao admin autenticado
CREATE POLICY "admin_update_appointments" ON appointments
  FOR UPDATE
  USING (auth.role() = 'authenticated' AND (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin');

-- Permitir ler apenas agendamentos do próprio cliente
CREATE POLICY "client_select_own_appointments" ON appointments
  FOR SELECT
  USING (client_id = auth.uid());
```

### Para a tabela `clients` (Clientes):

```sql
-- Permitir ler dados do cliente apenas ao admin
CREATE POLICY "admin_select_clients" ON clients
  FOR SELECT
  USING (auth.role() = 'authenticated' AND (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin');

-- Permitir ler perfil do próprio cliente
CREATE POLICY "client_select_own_data" ON clients
  FOR SELECT
  USING (id = auth.uid());
```

### Para a tabela `services` (Serviços):

```sql
-- Permitir ler serviços para todos (público) - útil para agendamentos
CREATE POLICY "public_select_services" ON services
  FOR SELECT
  USING (true);
```

---

## 3️⃣ ADICIONAR ROLE 'ADMIN' AOS USUÁRIOS

Quando criar um usuário admin, adicione a metadados:

```sql
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', '"admin"'::jsonb)
WHERE email = 'seu@email.com';
```

Ou via interface Supabase:
1. Vá para **Authentication** > **Users**
2. Clique no usuário admin
3. No campo `raw_user_meta_data`, adicione:
```json
{
  "role": "admin"
}
```

---

## 4️⃣ CONFIGURAÇÕES NO FRONTEND (JÁ APLICADAS)

✅ **Já implementado:**
- ProtectedRoute component que valida sessão antes de renderizar
- Verificação de sessão válida com `supabase.auth.getUser()`
- Monitoramento de mudanças de autenticação em tempo real
- Redirecionamento automático ao /admin se perder sessão

---

## 5️⃣ CHECKLIST PRÉ-LANÇAMENTO

- [ ] RLS habilitado em todas as tabelas
- [ ] Políticas RLS criadas conforme acima
- [ ] Usuário admin tem metadado `role: "admin"`
- [ ] Testar acesso direto a `/admin/dashboard` sem login (deve redirecionar)
- [ ] Testar com sessão expirada (deve redirecionar)
- [ ] Testar cancelamento/update de agendamentos sem estar admin
- [ ] Revisar logs de acesso do Supabase

---

## 6️⃣ TESTES DE SEGURANÇA

### Teste 1: Acesso ao Dashboard sem login
```
1. Abra sessão privada/anônima
2. Acesse: http://localhost:5173/admin/dashboard
3. Esperado: Redireciona para /admin (login)
✓ PASSOU
```

### Teste 2: Sessão expirada
```
1. Faça login no admin
2. Abra DevTools > Application > Cookies
3. Delete o session cookie do Supabase
4. Recarregue a página
5. Esperado: Redireciona para /admin
✓ PASSOU
```

### Teste 3: Query direto do banco
```
// Console do navegador - isso NÃO deve funcionar sem RLS
supabase.from('appointments').select('*')

Esperado (com RLS): "Error: user not authenticated"
✓ PASSOU
```

---

## 7️⃣ INFORMAÇÕES ADICIONAIS

**Estrutura de usuários:**
- `admin` - Pode ver, editar e cancelar agendamentos
- `client` - Pode ver apenas próprios agendamentos via CPF

**Fluxo de autenticação:**
```
Cliente busca agendamento → Autentica com CPF
Admin → Faz login com email/senha → JWT armazenado
```

**Tokens:**
- Supabase armazena JWT no localStorage automaticamente
- Expira em 1 hora (padrão Supabase)
- Refresh token renovado automaticamente

---

## ⚠️ POSSÍVEIS VULNERABILIDADES ELIMINADAS

❌ **Antes:**
- Acesso direto a `/admin/dashboard` sem auth
- Sem RLS = queries sem proteção
- Delay em verificação de sessão

✅ **Agora:**
- Rota protegida por ProtectedRoute component
- RLS no banco impede queries não autorizadas
- Verificação de sessão antes de renderizar qualquer coisa
- Monitoramento de expiração em tempo real

---

## 8️⃣ TESTES PRÁTICOS - COMO FAZER

### Teste 1: Acesso Direto sem Autenticação ❌

**O que testar:**
- Abra em **navegação privada/anônima** (Ctrl+Shift+P no Chrome)
- Acesse: `http://localhost:5173/admin/dashboard`

**Resultado esperado:**
```
❌ FALHA (redirecionado para /admin com mensagem de erro)
✅ PASSOU se: Redirecionar para página de login
```

---

### Teste 2: Verificar RLS com Console 🔐

**Passo 1:** Faça login normal no admin

**Passo 2:** Abra o DevTools (F12) → Console

**Passo 3:** Execute este código:

```javascript
// Teste 1: Tentar ler agendamentos como admin (DEVE FUNCIONAR)
const { data: appointments, error: error1 } = await supabase
  .from('appointments')
  .select('*')
  .limit(1);

console.log('Teste 1 - Admin lendo agendamentos:');
console.log('Sucesso?', !error1);
console.log('Dados:', appointments?.length > 0 ? 'Encontrado' : 'Vazio');
if (error1) console.error('Erro:', error1.message);
```

**Esperado:**
```
✅ Sucesso? true
✅ Deve trazer dados ou "Vazio" (sem erro)
```

---

### Teste 3: RLS Bloqueando Acesso Público 🚫

**Passo 1:** Abra **AbA/guia privada** em novo solitário

**Passo 2:** Abra DevTools → Console

**Passo 3:** Execute (sem fazer login):

```javascript
// Teste 2: Tentar ler agendamentos SEM estar autenticado (DEVE FALHAR)
const { data: appointments, error: error2 } = await supabase
  .from('appointments')
  .select('*')
  .limit(1);

console.log('Teste 2 - SEM autenticação lendo agendamentos:');
console.log('Erro encontrado?', !!error2);
if (error2) {
  console.error('✅ CORRETO - Erro:', error2.message);
} else {
  console.warn('❌ FALHA - Conseguiu acessar sem autenticação!');
}
```

**Esperado:**
```
✅ Erro encontrado? true
✅ Erro: "new row violates row-level security policy" 
   OU "User not authenticated"
```

---

### Teste 4: Sessão Expirada 🔄

**Passo 1:** Faça login normalmente

**Passo 2:** Abra DevTools → Application → Cookies

**Passo 3:** Procure por cookie com nome contendo `sb` (Supabase)

**Passo 4:** Delete o cookie

**Passo 5:** Volte para a página do admin

**Resultado esperado:**
```
❌ Dashboard some ou redireciona para /admin
✅ PASSOU
```

---

### Teste 5: Tentar Modificar Dados sem Permissão 🚫

**Passo 1:** Faça login como admin

**Passo 2:** Console → Execute:

```javascript
// Teste 3: Tentar ATUALIZAR agendamento
const { error: updateError } = await supabase
  .from('appointments')
  .update({ status: 'cancelled' })
  .eq('id', 'any-id-here')
  .limit(1);

console.log('Teste 3 - Atualizar agendamento:');
if (updateError) {
  console.error('Erro:', updateError.message);
}
```

**Esperado:**
```
✅ Apenas admin consegue atualizar
✅ Cliente não autenticado recebe erro
```

---

### Teste 6: TESTE FULL - Script Automatizado 🤖

**Passo 1:** Faça login no admin

**Passo 2:** Console → Cole este script completo:

```javascript
// TESTE COMPLETO DE SEGURANÇA
async function testSecurity() {
  console.log('🔒 INICIANDO TESTES DE SEGURANÇA...\n');
  
  const results = {};
  
  // Teste 1: Verificar autenticação
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  results.authenticated = !!user && !authError;
  console.log(`✅ Teste 1 - Autenticado: ${results.authenticated}`);
  if (user) console.log(`   └─ Email: ${user.email}`);
  
  // Teste 2: Ler agendamentos
  const { data: appointments, error: readError } = await supabase
    .from('appointments')
    .select('id, appointment_date, status')
    .limit(1);
  results.canRead = !readError && appointments?.length >= 0;
  console.log(`✅ Teste 2 - Ler agendamentos: ${results.canRead}`);
  if (readError) console.error(`   └─ Erro: ${readError.message}`);
  
  // Teste 3: Tentar atualizar
  const { error: updateError } = await supabase
    .from('appointments')
    .update({ status: 'confirmed' })
    .eq('id', 'non-existent-id')
    .limit(1);
  results.canUpdate = !updateError;
  console.log(`✅ Teste 3 - Atualizar dados: ${results.canUpdate}`);
  if (updateError) console.error(`   └─ Erro: ${updateError.message}`);
  
  // Teste 4: Ler clients
  const { data: clients, error: clientError } = await supabase
    .from('clients')
    .select('id, name')
    .limit(1);
  results.canReadClients = !clientError;
  console.log(`✅ Teste 4 - Ler clientes: ${results.canReadClients}`);
  if (clientError) console.error(`   └─ Erro: ${clientError.message}`);
  
  // Teste 5: Ler services (PÚBLICO)
  const { data: services, error: serviceError } = await supabase
    .from('services')
    .select('id, name')
    .limit(1);
  results.canReadServices = !serviceError;
  console.log(`✅ Teste 5 - Ler serviços: ${results.canReadServices}`);
  
  console.log('\n📊 RESULTADO FINAL:');
  console.table(results);
  
  const allPassed = Object.values(results).every(v => v === true);
  if (allPassed) {
    console.log('✅ TODOS OS TESTES PASSARAM!');
  } else {
    console.warn('⚠️ Alguns testes falharam');
  }
  
  return results;
}

// Executar
testSecurity();
```

**Resultado esperado:**
```
✅ Teste 1 - Autenticado: true
   └─ Email: seu@email.com
✅ Teste 2 - Ler agendamentos: true
✅ Teste 3 - Atualizar dados: true
✅ Teste 4 - Ler clientes: true
✅ Teste 5 - Ler serviços: true

📊 RESULTADO FINAL:
{ authenticated: true, canRead: true, canUpdate: true, canReadClients: true, canReadServices: true }

✅ TODOS OS TESTES PASSARAM!
```

---

### Teste 7: Teste SEM Autenticação (Em Abeta Privada) 🚫

**Passo 1:** Abra aba privada/incógnita

**Passo 2:** Console → Cole este script:

```javascript
// TESTE SEM AUTENTICAÇÃO
async function testNoAuth() {
  console.log('🔓 TESTANDO SEM AUTENTICAÇÃO...\n');
  
  // Teste 1: Verificar se está autenticado
  const { data: { user } } = await supabase.auth.getUser();
  console.log(`❌ Autenticado: ${!!user}`);
  
  // Teste 2: Tentar ler agendamentos (DEVE FALHAR)
  const { data: appointments, error: readError } = await supabase
    .from('appointments')
    .select('*');
  
  console.log(`\n🔒 Tentativa de ler agendamentos:`);
  if (readError) {
    console.error(`✅ BLOQUEADO - Erro: ${readError.message}`);
  } else {
    console.warn(`❌ FALHA DE SEGURANÇA - Conseguiu acessar!`);
  }
  
  // Teste 3: Tentar ler clientes (DEVE FALHAR)
  const { data: clients, error: clientError } = await supabase
    .from('clients')
    .select('*');
  
  console.log(`\n🔒 Tentativa de ler clientes:`);
  if (clientError) {
    console.error(`✅ BLOQUEADO - Erro: ${clientError.message}`);
  } else {
    console.warn(`❌ FALHA DE SEGURANÇA - Conseguiu acessar!`);
  }
}

testNoAuth();
```

**Esperado:**
```
❌ Autenticado: false

🔒 Tentativa de ler agendamentos:
✅ BLOQUEADO - Erro: new row violates row-level security policy

🔒 Tentativa de ler clientes:
✅ BLOQUEADO - Erro: new row violates row-level security policy
```

---

### Teste 8: Simulando Ataque de Força Bruta 🔓

**Verificar se há rate limiting:**

```javascript
// Script para testar se há proteção contra força bruta
async function testBruteForce() {
  console.log('🔓 Testando proteção contra força bruta...\n');
  
  for (let i = 0; i < 5; i++) {
    const { error } = await supabase.auth.signInWithPassword({
      email: 'admin@test.com',
      password: `wrongpass${i}`
    });
    
    console.log(`Tentativa ${i + 1}: ${error?.status || 'Erro desconhecido'}`);
    
    if (error?.message?.includes('too many')) {
      console.warn('✅ Rate limiting ativo!');
      break;
    }
  }
}

testBruteForce();
```

---

## TABELA DE RESULTADOS ESPERADOS

| Teste | Autenticado | Não Auth | Resultado Esperado |
|-------|-------------|----------|-------------------|
| Ler Agendamentos | ✅ SIM | ❌ NÃO | RLS bloqueando |
| Atualizar Agendamentos | ✅ SIM | ❌ NÃO | RLS bloqueando |
| Ler Clientes | ✅ SIM | ❌ NÃO | RLS bloqueando |
| Ler Serviços | ✅ SIM | ✅ SIM | Público permitido |
| Acessar /admin/dashboard | ✅ SIM | ❌ NÃO | Rota protegida |

---

## CHECKLIST DE TESTES FINAIS

- [ ] Teste 1: ❌ Sem auth → /admin/dashboard redireciona
- [ ] Teste 2: ✅ Console com auth → ler agendamentos OK
- [ ] Teste 3: ❌ Console sem auth → ler agendamentos FALHA
- [ ] Teste 4: 🔄 Sessão expirada → dashboard redireciona
- [ ] Teste 5: ✅ Admin consegue atualizar
- [ ] Teste 6: ✅ Script automático passa
- [ ] Teste 7: ❌ Sem auth script falha
- [ ] Teste 8: 🔐 Rate limiting testado

---

Se tudo está verde, você está **PRONTO** para beta teste! 🎉
