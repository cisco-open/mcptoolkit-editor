// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Handlebars template for rendering an MCP Description document to Markdown.
 * Designed for the "Markdown" preview tab.
 */

export const mcpdescMarkdownTemplate = `# {{info.name}}{{#if info.title}} — {{info.title}}{{/if}}

{{#if info.description}}
> {{info.description}}
{{/if}}

| Field | Value |
|-------|-------|
| **Version** | {{info.version}} |
{{#if info.protocolVersion}}| **MCP Protocol** | {{info.protocolVersion}} |
{{/if}}{{#if info.id}}| **ID** | \`{{info.id}}\` |
{{/if}}{{#if info.websiteUrl}}| **Website** | {{info.websiteUrl}} |
{{/if}}{{#if info.icons}}| **Icons** | {{count info.icons}} icon(s) |
{{/if}}{{#if info.license}}| **License** | {{info.license.name}} |
{{/if}}{{#if info.contact}}| **Contact** | {{info.contact.name}}{{#if info.contact.email}} <{{info.contact.email}}>{{/if}} |
{{/if}}| **Spec** | mcpdesc {{mcpdesc}} |

---

## Transports

{{#each transports}}
### {{type}}

{{#eq type "stdio"}}- **Command:** \`{{command}}\`{{#if args}} {{join args " "}}{{/if}}
{{#if env}}
- **Environment:**
{{#each env}}  - \`{{@key}}\` = \`{{this}}\`
{{/each}}{{/if}}{{/eq}}{{#eq type "streamable-http"}}- **URL:** {{url}}
{{/eq}}{{#eq type "sse"}}- **URL:** {{url}}
{{/eq}}
{{/each}}

{{#if security}}
---

## Security

{{#each security}}
- **{{type}}**{{#if scheme}} ({{scheme}}{{#if bearerFormat}}, {{bearerFormat}}{{/if}}){{/if}}{{#if description}} — {{description}}{{/if}}
{{#if flows}}
{{#if flows.authorizationCode}}  - Authorization Code: \`{{flows.authorizationCode.authorizationUrl}}\`
{{/if}}{{#if flows.clientCredentials}}  - Client Credentials: \`{{flows.clientCredentials.tokenUrl}}\`
{{/if}}{{/if}}
{{/each}}
{{/if}}

{{#if capabilities}}
---

## Capabilities

| Feature | Enabled |
|---------|---------|
{{#exists capabilities.tools}}| Tools list-changed | {{capabilities.tools.listChanged}} |
{{/exists}}{{#exists capabilities.resources}}| Resources subscribe | {{capabilities.resources.subscribe}} |
| Resources list-changed | {{capabilities.resources.listChanged}} |
{{/exists}}{{#exists capabilities.prompts}}| Prompts list-changed | {{capabilities.prompts.listChanged}} |
{{/exists}}{{#exists capabilities.completions}}| Completions | ✓ |
{{/exists}}{{#exists capabilities.logging}}| Logging | ✓ |
{{/exists}}{{#exists capabilities.tasks}}| Tasks | ✓ |
{{/exists}}
{{/if}}

{{#if tools}}
---

## Tools ({{count tools}})

{{#each tools}}
### {{#if title}}{{title}}{{else}}{{name}}{{/if}}

\`{{name}}\`{{#if deprecated}} ⚠️ **DEPRECATED**{{/if}}

{{#if description}}{{description}}{{/if}}

{{#if tags}}🏷️ {{join tags ", "}}{{/if}}

{{#if annotations}}
| Hint | Value |
|------|-------|
{{#exists annotations.readOnlyHint}}| Read-only | {{annotations.readOnlyHint}} |
{{/exists}}{{#exists annotations.destructiveHint}}| Destructive | {{annotations.destructiveHint}} |
{{/exists}}{{#exists annotations.idempotentHint}}| Idempotent | {{annotations.idempotentHint}} |
{{/exists}}{{#exists annotations.openWorldHint}}| Open-world | {{annotations.openWorldHint}} |
{{/exists}}{{/if}}

{{#if inputSchema}}
**Input Schema**

\`\`\`json
{{json inputSchema}}
\`\`\`
{{/if}}

{{#if outputSchema}}
**Output Schema**

\`\`\`json
{{json outputSchema}}
\`\`\`
{{/if}}

{{/each}}
{{/if}}

{{#if resources}}
---

## Resources ({{count resources}})

| URI | Name | MIME | Description |
|-----|------|------|-------------|
{{#each resources}}| \`{{uri}}\` | {{name}} | {{mimeType}} | {{description}} |
{{/each}}
{{/if}}

{{#if resourceTemplates}}
---

## Resource Templates ({{count resourceTemplates}})

| URI Template | Name | MIME | Description |
|--------------|------|------|-------------|
{{#each resourceTemplates}}| \`{{uriTemplate}}\` | {{name}} | {{mimeType}} | {{description}} |
{{/each}}
{{/if}}

{{#if prompts}}
---

## Prompts ({{count prompts}})

{{#each prompts}}
### {{#if title}}{{title}}{{else}}{{name}}{{/if}}

\`{{name}}\`{{#if deprecated}} ⚠️ **DEPRECATED**{{/if}}

{{#if description}}{{description}}{{/if}}

{{#if arguments}}
| Argument | Required | Description |
|----------|----------|-------------|
{{#each arguments}}| \`{{name}}\` | {{#if required}}✓{{else}}—{{/if}} | {{description}} |
{{/each}}
{{/if}}

{{/each}}
{{/if}}

{{#if tags}}
---

## Tags

{{#each tags}}- **{{name}}**{{#if description}}: {{description}}{{/if}}
{{#if tags}}{{#each tags}}  - {{name}}{{#if description}}: {{description}}{{/if}}
{{/each}}{{/if}}{{/each}}
{{/if}}
`;
