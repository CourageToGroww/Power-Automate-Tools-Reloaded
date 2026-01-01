**IMPORTANT: Always use Serena's semantic tools to minimize token usage and costs.**

When working on this project:

1. **Use semantic retrieval instead of reading entire files**: Use `find_symbol_definitions`, `find_references`, and `get_call_hierarchy` to locate code precisely rather than reading full files

2. **Use targeted edits**: Prefer `replace_symbol_body` and `replace_lines` over reading and rewriting entire files

3. **Index the project first**: Run `serena project index` or use the onboarding tool to understand the project structure efficiently

4. **Leverage LSP capabilities**: Use `list_workspace_symbols`, `get_definitions`, and `get_references` for navigation instead of grep or manual file searches

5. **Read Serena's instructions**: If you haven't already, read Serena's initial instructions to understand all available tools

6. **Use memory tools**: Store important context using `write_memory` and retrieve with `read_memory` to avoid re-analyzing code

These practices significantly reduce token consumption while maintaining or improving code quality
