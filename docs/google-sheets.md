# Receber os pedidos no Google Sheets

O formulário `/contact` usa seis campos progressivos: nome, empresa, e-mail, WhatsApp, solução desejada e investimento. As respostas anteriores continuam editáveis. O último campo inclui autorização de contato. As opções de solução e investimento usam botões de escolha única.

## Ativar a integração

1. No [Google Cloud Console](https://console.cloud.google.com/), crie ou selecione um projeto e ative a **Google Sheets API**.
2. Em **IAM e administrador → Contas de serviço**, crie uma conta de serviço para o site. Ela não precisa de papéis administrativos no projeto. Crie uma chave JSON para essa conta; mantenha o arquivo privado, fora do código e da pasta pública.
3. Crie uma planilha privada no Google Sheets e uma aba chamada **Leads**. Cole a primeira linha do arquivo `google-sheets-header.csv` em A1, ou importe esse CSV como a aba inicial.
4. Compartilhe **apenas essa planilha**, como editor, com o endereço `client_email` que está no JSON da conta de serviço. Os visitantes do site não precisam ter uma conta Google.
5. Copie `.env.example` para `.env.local` e preencha:

   ```dotenv
   GOOGLE_SHEETS_ID=ID_DA_PLANILHA
   GOOGLE_SHEETS_TAB=Leads
   GOOGLE_CLIENT_EMAIL=CONTEUDO_DE_client_email
   GOOGLE_PRIVATE_KEY="CONTEUDO_DE_private_key_COM_\n_PRESERVADOS"
   ```

   O ID é o trecho entre `/d/` e `/edit` na URL da planilha. Use os valores reais de `client_email` e `private_key` do JSON. Copie o valor da chave como está no JSON, entre aspas, preservando os `\n`.

6. Na hospedagem, cadastre as mesmas quatro variáveis como **variáveis de ambiente do servidor** e reinicie/reimplante o site. Não use nomes que comecem com `NEXT_PUBLIC_`.
7. Envie um pedido de teste pelo `/contact` e confira a nova linha na aba Leads. A confirmação de sucesso só aparece depois que o Google confirma a gravação.

## Validação do formulário

O formulário usa mensagens próprias junto aos campos, com as mesmas regras de formato no navegador e no servidor. O WhatsApp recebe máscara brasileira durante a digitação, aceita colagem com +55, verifica DDD, tamanho, prefixos de celular/fixo e rejeita números com todos os dígitos repetidos. Nome, empresa, estrutura de e-mail, opções e autorização de contato também são verificados. Nomes não são capitalizados automaticamente; espaços extras são normalizados e o domínio do e-mail é convertido para minúsculas.

A validação de formato não confirma que o e-mail existe, que o telefone está ativo ou que a conta pertence ao visitante. Nenhum serviço de consulta de contas foi integrado.

## O que é registrado

Cada envio acrescenta uma linha em A:L, preservando as linhas anteriores: data em UTC, ID do pedido, nome, empresa, e-mail, WhatsApp, solução, equipe, investimento, descrição, consentimento e origem. São gravados valores `RAW`, sem interpretar textos como fórmulas. As colunas antigas de equipe e descrição ficam vazias nos novos pedidos da DuoThink para manter a compatibilidade com os registros existentes. Não renomeie nem reordene as colunas sem ajustar `app/sheets.js`.

Os formulários dos sites de arquitetura continuam aceitando seu formato anterior; os campos que eles não solicitam ficam vazios na planilha.

O envio usa `/api/contact`; credenciais e tokens ficam no servidor. Validação e limite de tentativas são aplicados no servidor. Em falhas, as respostas permanecem no formulário. A prevenção de cliques repetidos vale para o mesmo pedido no processo do servidor por 15 minutos; esse cache não é compartilhado entre instâncias nem sobrevive a reinícios. Uma falha de rede após uma gravação pode exigir conferir a planilha antes de repetir o envio.

As variáveis do Resend são opcionais: enviam uma notificação por e-mail **depois** de salvar a linha. Uma falha nessa notificação não muda a confirmação de que o pedido foi registrado.

## Verificação realizada nesta entrega

Validação, assinatura da autenticação, campos e gravação foram testados com respostas simuladas da API. O fluxo visual e a retenção de dados foram conferidos no navegador. A gravação em uma planilha real depende das quatro variáveis e do compartilhamento descritos acima; nenhuma credencial real acompanha o ZIP.

Referências: [autenticação de conta de serviço](https://developers.google.com/identity/protocols/oauth2/service-account) e [Google Sheets: acrescentar linhas](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/append).
