## 🚨 PROBLEMA IDENTIFICADO: RLS NÃO ESTÁ BLOQUEANDO

Os testes revelaram que **sem autenticação consegue ler dados** de `appointments` e `clients`. Isso é uma falha crítica de segurança!

---

## 🔧 SOLUÇÃO: Corrigir Políticas RLS

### Passo 1: Verificar Políticas Atuais

1. Vá para [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. **SQL Editor** → Execute:

```sql
-- Ver todas as políticas RLS
SELECT * FROM pg_policies WHERE tablename IN ('appointments', 'clients', 'services');
```

### Passo 2: DELETAR Políticas Antigas

Se houver políticas antigas ou quebradas:

```sql
-- Remover policies antigas
DROP POLICY IF EXISTS "admin_select_appointments" ON appointments;
DROP POLICY IF EXISTS "admin_update_appointments" ON appointments;
DROP POLICY IF EXISTS "client_select_own_appointments" ON appointments;
DROP POLICY IF EXISTS "admin_select_clients" ON clients;
DROP POLICY IF EXISTS "client_select_own_data" ON clients;
DROP POLICY IF EXISTS "public_select_services" ON services;
```

### Passo 3: CRIAR Novas Políticas Corretas

Execute **TODO** este código SQL no Supabase SQL Editor:

```sql
-- ============================================
-- 1. APPOINTMENTS TABLE
-- ============================================

-- ✅ Apenas ADMIN pode ler todos os agendamentos
CREATE POLICY "appointments_admin_select" ON appointments
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ✅ Apenas ADMIN pode atualizar agendamentos
CREATE POLICY "appointments_admin_update" ON appointments
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- ✅ Apenas ADMIN pode deletar agendamentos
CREATE POLICY "appointments_admin_delete" ON appointments
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- 2. CLIENTS TABLE
-- ============================================

-- ✅ Apenas ADMIN pode ler clientes
CREATE POLICY "clients_admin_select" ON clients
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ✅ Cliente pode ler apenas seus próprios dados
CREATE POLICY "clients_self_select" ON clients
  FOR SELECT
  USING (id = auth.uid());

-- ============================================
-- 3. SERVICES TABLE
-- ============================================

-- ✅ PÚBLICO - Todos podem ler serviços
CREATE POLICY "services_public_select" ON services
  FOR SELECT
  USING (true);
```

### Passo 4: Testar as Políticas

**Na mesma janela do SQL Editor**, execute:

```sql
-- Verificar se RLS está habilitado
SELECT * FROM pg_class WHERE relname IN ('appointments', 'clients', 'services');

-- Ver todas as policies criadas
SELECT tablename, policyname, permissive, roles, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('appointments', 'clients', 'services');
```

---

## ✅ TESTE MANUAL NO NAVEGADOR

### Teste 1: Sem Autenticação (Deve Falhar)

```javascript
// ABRA EM NAVEGAÇÃO PRIVADA - Sem fazer login

// Console:
const { data, error } = await supabase.from('appointments').select('*');
console.log('Error?', !!error, 'Data?', data);

// ESPERADO:
// Error? true
// Error message: "new row violates row-level security policy"
```

### Teste 2: Com Autenticação (Deve Passar)

```javascript
// Faça login primeiro
// Depois rode:

const { data, error } = await supabase.from('appointments').select('*');
console.log('Error?', !!error, 'Data?', data?.length || 0);

// ESPERADO:
// Error? false
// Data? [número de registros]
```

### Teste 3: Services (Deve Passar Sempre)

```javascript
// FUNCIONA COM OU SEM AUTENTICAÇÃO

const { data, error } = await supabase.from('services').select('*');
console.log('Error?', !!error, 'Data?', data?.length || 0);

// ESPERADO:
// Error? false
// Data? [número de serviços]
```

---

## 🧪 Script de Teste Completo

Cole isto no console APÓS fazer login:

```javascript
console.log('🔒 TESTE COMPLETO RLS\n');

// 1. Verificar autenticação
const { data: { user } } = await supabase.auth.getUser();
console.log('✅ Autenticado:', !!user, user?.email);

// 2. Ler appointments
const { data: apts, error: apts_err } = await supabase
  .from('appointments')
  .select('*')
  .limit(1);
console.log('✅ Appointments:', !apts_err ? `${apts?.length} registros` : `ERROR: ${apts_err.message}`);

// 3. Ler clients
const { data: clients, error: clients_err } = await supabase
  .from('clients')
  .select('*')
  .limit(1);
console.log('✅ Clients:', !clients_err ? `${clients?.length} registros` : `ERROR: ${clients_err.message}`);

// 4. Ler services
const { data: services, error: services_err } = await supabase
  .from('services')
  .select('*')
  .limit(1);
console.log('✅ Services:', !services_err ? `${services?.length} registros` : `ERROR: ${services_err.message}`);

console.log('\n✅ Teste em abeta privada (sem login) após isso');
```

---

## ⚠️ SE AINDA NÃO FUNCIONAR

**Problema**: As políticas não estão bloqueando

**Solução**:

1. **Verifique se RLS está HABILITADO**:
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('appointments', 'clients', 'services');
-- Deve mostrar rowsecurity = true para todas
```

2. **Se rowsecurity = false**, execute:
```sql
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
-- services pode ficar false se quiser público
```

3. **Verifique se não há DEFAULT POLICIES**:
```sql
-- Deletar todas as policies
DROP POLICY IF EXISTS admin_select_appointments ON appointments;
DROP POLICY IF EXISTS admin_update_appointments ON appointments;
DROP POLICY IF EXISTS client_select_own_appointments ON appointments;
DROP POLICY IF EXISTS admin_select_clients ON clients;
DROP POLICY IF EXISTS client_select_own_data ON clients;
DROP POLICY IF EXISTS public_select_services ON services;

-- ... (delete outras que encontrar)
```

4. **Recriar do zero** conforme o Passo 3 acima

---

## 📋 CHECKLIST

- [ ] Deletei políticas antigas
- [ ] Criei novas políticas RLS
- [ ] RLS está ENABLED em appointments
- [ ] RLS está ENABLED em clients  
- [ ] RLS está DISABLED ou PUBLIC em services
- [ ] Testei sem autenticação (bloqueou) ✅
- [ ] Testei com autenticação (passou) ✅
- [ ] Testei services público (passou) ✅

---

## 🚀 DEPOIS DE CORRIGIR

1. Rode os testes novamente:
```bash
npm test -- security.test.ts
```

2. Teste manual no navegador conforme acima

3. Se tudo passar: **SEGURANÇA CONFIRMADA!** ✅

---

## 📞 OUTRA OPÇÃO: Teste sem Código

Se preferir apenas verificar manualmente sem rodar testes:

1. Abra em aba privada
2. F12 → Console
3. Cole:
```javascript
const { data, error } = await supabase.from('appointments').select('*').limit(1);
console.log(error?.message || `Conseguiu acessar: ${data?.length} registros`);
```
4. Se mostrar "violates row-level security" = ✅ SEGURO
5. Se mostrar número de registros = ❌ INSEGURO
