# MCP Eval Examples

This directory contains example datasets demonstrating how to use `playwright-mcp-evals` for testing MCP servers.

## Evaluation Modes

### Direct Mode (Default)

Direct mode makes specific API calls to MCP tools with known inputs. This is useful for:

- Testing tool implementation correctness
- Validating response formats and schemas
- Fast, deterministic testing without LLM costs

```json
{
  "id": "direct-weather-test",
  "mode": "direct",
  "toolName": "get_weather",
  "args": {
    "city": "London"
  },
  "expectedTextContains": ["London", "temperature"]
}
```

### LLM Host Mode

LLM host mode uses actual LLM providers (OpenAI or Anthropic) to test MCP servers through natural language scenarios. This is useful for:

- Testing tool discoverability (can the LLM find the right tool?)
- Validating tool descriptions (are they clear enough?)
- Testing parameter extraction from natural language
- End-to-end realistic usage testing

```json
{
  "id": "llm-weather-test",
  "mode": "llm_host",
  "toolName": "placeholder",
  "args": {},
  "scenario": "What's the weather in Paris?",
  "llmHostConfig": {
    "provider": "openai",
    "model": "gpt-4",
    "temperature": 0.0
  },
  "metadata": {
    "expectedToolCalls": [
      {
        "name": "get_weather",
        "arguments": {
          "city": "Paris"
        },
        "required": true
      }
    ]
  }
}
```

## Running the Examples

### Prerequisites

1. Install the package:
```bash
npm install playwright-mcp-evals @playwright/test
```

2. For LLM host mode, set up API keys:
```bash
export OPENAI_API_KEY="your-key-here"
export ANTHROPIC_API_KEY="your-key-here"
```

### Example Test File

```typescript
import { test, expect } from '@playwright/test';
import { loadEvalDataset, runEvalDataset, createToolCallExpectation } from 'playwright-mcp-evals';
import { mcp } from 'playwright-mcp-evals/fixtures/mcp';

test.use({
  mcpConfig: {
    transport: 'stdio',
    command: 'node',
    args: ['path/to/your/weather-server.js']
  }
});

test('Weather MCP Server Evaluation', async ({ mcp }) => {
  // Load the dataset
  const dataset = await loadEvalDataset('./examples/weather-eval-dataset.json');

  // Run the evaluation
  const result = await runEvalDataset(
    {
      dataset,
      expectations: {
        textContains: createTextContainsExpectation(),
        regex: createRegexExpectation(),
        // For llm_host mode cases
        toolCalls: createToolCallExpectation()
      }
    },
    { mcp }
  );

  // Assert results
  expect(result.passed).toBe(result.total);
  console.log(`Passed: ${result.passed}/${result.total}`);
});
```

## Example Datasets

### weather-eval-dataset.json

Comprehensive weather MCP server evaluation demonstrating:

- **Direct mode tests**: Basic weather lookups with different validation strategies
- **LLM host mode tests**: Natural language queries testing tool discovery
- **Provider comparison**: Examples using both OpenAI and Anthropic
- **Edge cases**: Ambiguous inputs, missing parameters, etc.

## Optional Dependencies

LLM host mode requires installing the appropriate SDK:

- **OpenAI**: `npm install openai @openai/agents`
- **Anthropic**: `npm install @anthropic-ai/sdk`

You only need to install the providers you plan to use. Direct mode works without any LLM dependencies.

## Best Practices

1. **Start with direct mode** to validate basic functionality
2. **Use LLM host mode** to test discoverability and real-world usage
3. **Set temperature to 0.0** for deterministic LLM behavior in tests
4. **Use `expectedToolCalls`** to validate which tools the LLM chose
5. **Combine multiple validation strategies** (text contains, regex, schema, tool calls)

## Cost Considerations

LLM host mode incurs API costs:

- OpenAI GPT-4: ~$0.03 per 1K input tokens, ~$0.06 per 1K output tokens
- Anthropic Claude 3.5 Sonnet: ~$0.003 per 1K input tokens, ~$0.015 per 1K output tokens

For cost-effective testing:
- Use direct mode for most tests
- Reserve LLM host mode for critical user journeys
- Consider using cheaper models for development (gpt-3.5-turbo, claude-3-haiku)

## Troubleshooting

### "OpenAI SDK is not installed"

Install the required dependencies:
```bash
npm install openai @openai/agents
```

### "API key not found"

Set the appropriate environment variable:
```bash
export OPENAI_API_KEY="your-key-here"
# or
export ANTHROPIC_API_KEY="your-key-here"
```

### Tests timing out

Increase the test timeout for LLM host mode tests:
```typescript
test.setTimeout(60000); // 60 seconds
```

## Contributing

Have an interesting eval dataset example? PRs welcome!
