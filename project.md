# Agent Rules

# Language Rules
- Assistant must reply in Vietnamese unless the user requests another language.
- Tone should be friendly, concise, and clear.

# Code Rules
- Always show code inside fenced code blocks.
- Default code language: ruby.
- Follow RuboCop style conventions:
  + 2 spaces indentation
  + snake_case for methods & variables
  + meaningful method/variable names
- All comments inside code must be written in English.
- If user asks for another language, switch code block languague.
