import { z } from 'zod';

/**
 * Zod schema for problem severity levels
 *
 * Validates that severity is one of the four standard VS Code diagnostic severities:
 * - Error: Critical issues that prevent compilation or execution
 * - Warning: Issues that should be addressed but don't prevent execution
 * - Information: Informational messages for the user
 * - Hint: Subtle suggestions for code improvement
 *
 * @example
 * ```typescript
 * const severity = ProblemSeveritySchema.parse('Error'); // ✅ Valid
 * const invalid = ProblemSeveritySchema.parse('Critical'); // ❌ Throws ZodError
 * ```
 */
export const ProblemSeveritySchema = z.enum(['Error', 'Warning', 'Information', 'Hint']);

/**
 * Severity levels for diagnostic problems
 *
 * Type-safe representation of VS Code diagnostic severity levels.
 * Inferred from the Zod schema to ensure runtime and compile-time consistency.
 */
export type ProblemSeverity = z.infer<typeof ProblemSeveritySchema>;

/**
 * Zod schema for position in a document
 *
 * Validates a position within a text document using zero-based indexing:
 * - line: Zero-based line number (0 = first line)
 * - character: Zero-based character offset within the line (0 = first character)
 *
 * Both values must be non-negative integers.
 *
 * @example
 * ```typescript
 * const position = PositionSchema.parse({ line: 5, character: 10 }); // ✅ Valid
 * const invalid = PositionSchema.parse({ line: -1, character: 0 }); // ❌ Throws ZodError
 * ```
 */
export const PositionSchema = z.object({
  line: z.number().int().min(0),
  character: z.number().int().min(0),
});

/**
 * Position in a document
 *
 * Represents a specific location within a text document using zero-based indexing.
 * Compatible with VS Code's Position interface and Language Server Protocol.
 */
export type Position = z.infer<typeof PositionSchema>;

/**
 * Zod schema for range in a document
 *
 * Validates a range within a text document defined by start and end positions.
 * Both positions must be valid according to the PositionSchema.
 *
 * @example
 * ```typescript
 * const range = RangeSchema.parse({
 *   start: { line: 0, character: 0 },
 *   end: { line: 0, character: 10 }
 * }); // ✅ Valid
 * ```
 */
export const RangeSchema = z.object({
  start: PositionSchema,
  end: PositionSchema,
});

/**
 * Range in a document
 *
 * Represents a text range within a document, defined by start and end positions.
 * Compatible with VS Code's Range interface and Language Server Protocol.
 */
export type Range = z.infer<typeof RangeSchema>;

/**
 * Zod schema for the core problem item model
 */
export const ProblemItemSchema = z.object({
  filePath: z.string().min(1),
  workspaceFolder: z.string().min(1),
  range: RangeSchema,
  severity: ProblemSeveritySchema,
  message: z.string().min(1),
  source: z.string().min(1),
  code: z.union([z.string(), z.number()]).optional(),
  relatedInformation: z
    .array(
      z.object({
        location: z.object({
          uri: z.string(),
          range: RangeSchema,
        }),
        message: z.string(),
      })
    )
    .optional(),
});

/**
 * Core problem item model - this is our canonical representation
 * of a diagnostic issue that will be exposed via MCP
 */
export type ProblemItem = z.infer<typeof ProblemItemSchema>;

/**
 * Zod schema for diagnostics change events
 */
export const DiagnosticsChangeEventSchema = z.object({
  uri: z.string(),
  problems: z.array(ProblemItemSchema),
});

/**
 * Event emitted when diagnostics change
 */
export type DiagnosticsChangeEvent = z.infer<typeof DiagnosticsChangeEventSchema>;

/**
 * Configuration for the extension
 */
export interface ExtensionConfig {
  readonly mcpServerPort: number;
  readonly debounceMs: number;
  readonly enablePerformanceLogging: boolean;
  readonly maxProblemsPerFile: number;
}

/**
 * Filter options for querying problems
 */
export interface ProblemFilter {
  readonly severity?: ProblemSeverity;
  readonly workspaceFolder?: string;
  readonly filePath?: string;
  readonly source?: string;
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * Summary statistics for problems
 */
export interface ProblemSummary {
  readonly totalProblems: number;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly infoCount: number;
  readonly hintCount: number;
  readonly fileCount: number;
  readonly workspaceFolders: ReadonlyArray<string>;
}
