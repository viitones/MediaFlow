A reprodução de vídeos está funcionando corretamente.

Implementar apenas as melhorias descritas abaixo.

Não alterar funcionalidades já funcionando.

Não realizar refatorações desnecessárias.

---

# 1. Barra de Progresso na Tela de Controle

Na tela principal (Controle), adicionar uma barra de progresso para vídeos.

Objetivo:

Permitir que o operador acompanhe e controle a reprodução do vídeo sem precisar utilizar a segunda tela.

---

## Exibição

Quando a mídia atual for um vídeo:

Exibir:

```text
00:35 / 03:25
```

onde:

* lado esquerdo = tempo atual
* lado direito = duração total

---

## Barra de Progresso

Adicionar um slider horizontal.

Exemplo:

```text
|────────────●────────────|
```

O marcador deve acompanhar a reprodução em tempo real.

Atualização mínima:

```text
250ms
```

ou melhor.

---

## Controle Manual

O operador deve conseguir:

* avançar
* retroceder

arrastando o slider.

Ao soltar o slider:

```ts
video.currentTime = novoTempo
```

A alteração deve refletir:

* no Preview
* na Tela Player

simultaneamente.

---

## Sincronização

A posição atual do vídeo deve ser armazenada no estado global.

Exemplo:

```ts
currentTime
duration
progress
```

O Preview e o Player devem utilizar a mesma fonte de dados.

---

# 2. Exibir Duração do Vídeo

Atualmente a lista de mídias mostra:

* nome
* tamanho do arquivo

Porém não mostra a duração do vídeo.

---

## Comportamento Esperado

Para vídeos exibir:

```text
Assinatura com certificado digital DXToken

1920x1080
145 MB
03:25
```

Ou layout equivalente.

---

## Obtenção da Duração

Durante a importação do vídeo utilizar:

```ts
video.onloadedmetadata
```

para capturar:

```ts
duration
```

Persistir no banco.

Exemplo:

```ts
media.duration
```

---

## Formatação

Exibir:

```text
00:45
03:25
01:15:42
```

dependendo da duração.

Não exibir segundos decimais.

---

# 3. Banco de Dados

Caso ainda não exista:

Adicionar campo:

```sql
duration
```

para armazenar a duração do vídeo e do áudio.

Não recalcular a cada renderização.

A duração deve ser extraída apenas na importação.

---

# Resultado Esperado

Após a implementação:

* O operador visualiza o progresso do vídeo.
* O operador pode avançar e retroceder.
* O Preview e o Player permanecem sincronizados.
* A lista de mídias exibe a duração dos vídeos.
* A lista de mídias continua exibindo resolução e tamanho do arquivo.
* Nenhuma funcionalidade existente deve ser alterada ou quebrada.
* Garanta a responsividade.
