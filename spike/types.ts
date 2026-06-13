export type StopReason =
  | "end_turn"
  | "max_tokens"
  | "stop_sequence"
  | "tool_use"
  | "pause_turn"
  | "refusal";

export type Usage = {
  input_tokens: number;
  output_tokens: number;
};

export type TextBlock = {
  type: "text";
  text: string;
};

export type ToolUseBlock = {
  type: "tool_use";
  id: string;
  name: string;
  input: unknown;
};

export type ToolResultBlock = {
  type: "tool_result";
  tool_use_id: string;
  content?: string;
  is_error?: boolean;
};

export type ContentBlock = TextBlock | ToolUseBlock;
export type ContentBlockParam = TextBlock | ToolUseBlock | ToolResultBlock;

export type MessageParam = {
  role: "user" | "assistant";
  content: string | ContentBlockParam[];
};

export type Message = {
  id: string;
  model: string;
  role: "assistant";
  content: ContentBlock[];
  stop_reason: StopReason;
  usage: Usage;
};

export type ToolDefinition = {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties?: unknown;
    required?: string[];
  };
};
