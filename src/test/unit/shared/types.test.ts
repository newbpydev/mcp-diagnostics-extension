// Import the schemas we're about to create
import {
  ProblemSeveritySchema,
  PositionSchema,
  RangeSchema,
  ProblemItemSchema,
  DiagnosticsChangeEventSchema,
  ProblemSeverity,
  Position,
  Range,
  ProblemItem,
  DiagnosticsChangeEvent,
} from '@shared/types';

describe('Zod Schema Validation', () => {
  describe('ProblemSeveritySchema', () => {
    it('should validate correct severity values', () => {
      expect(() => ProblemSeveritySchema.parse('Error')).not.toThrow();
      expect(() => ProblemSeveritySchema.parse('Warning')).not.toThrow();
      expect(() => ProblemSeveritySchema.parse('Information')).not.toThrow();
      expect(() => ProblemSeveritySchema.parse('Hint')).not.toThrow();
    });

    it('should reject invalid severity values', () => {
      expect(() => ProblemSeveritySchema.parse('Invalid')).toThrow();
      expect(() => ProblemSeveritySchema.parse('')).toThrow();
      expect(() => ProblemSeveritySchema.parse(null)).toThrow();
      expect(() => ProblemSeveritySchema.parse(undefined)).toThrow();
    });
  });

  describe('PositionSchema', () => {
    it('should validate correct position objects', () => {
      const validPosition = { line: 0, character: 0 };
      expect(() => PositionSchema.parse(validPosition)).not.toThrow();

      const result = PositionSchema.parse(validPosition);
      expect(result).toEqual(validPosition);
    });

    it('should validate positive numbers', () => {
      const position = { line: 10, character: 25 };
      expect(() => PositionSchema.parse(position)).not.toThrow();
    });

    it('should reject negative numbers', () => {
      expect(() => PositionSchema.parse({ line: -1, character: 0 })).toThrow();
      expect(() => PositionSchema.parse({ line: 0, character: -1 })).toThrow();
    });

    it('should reject non-integer numbers', () => {
      expect(() => PositionSchema.parse({ line: 1.5, character: 0 })).toThrow();
      expect(() => PositionSchema.parse({ line: 0, character: 2.7 })).toThrow();
    });

    it('should reject missing properties', () => {
      expect(() => PositionSchema.parse({ line: 0 })).toThrow();
      expect(() => PositionSchema.parse({ character: 0 })).toThrow();
      expect(() => PositionSchema.parse({})).toThrow();
    });
  });

  describe('RangeSchema', () => {
    it('should validate correct range objects', () => {
      const validRange = {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 10 },
      };
      expect(() => RangeSchema.parse(validRange)).not.toThrow();
    });

    it('should reject invalid start position', () => {
      const invalidRange = {
        start: { line: -1, character: 0 },
        end: { line: 0, character: 10 },
      };
      expect(() => RangeSchema.parse(invalidRange)).toThrow();
    });

    it('should reject invalid end position', () => {
      const invalidRange = {
        start: { line: 0, character: 0 },
        end: { line: 0, character: -1 },
      };
      expect(() => RangeSchema.parse(invalidRange)).toThrow();
    });
  });

  describe('ProblemItemSchema', () => {
    const validProblemItem = {
      filePath: '/path/to/file.ts',
      workspaceFolder: 'my-workspace',
      range: {
        start: { line: 5, character: 10 },
        end: { line: 5, character: 20 },
      },
      severity: 'Error' as ProblemSeverity,
      message: 'Test error message',
      source: 'typescript',
      code: 'TS2304',
    };

    it('should validate complete problem item', () => {
      expect(() => ProblemItemSchema.parse(validProblemItem)).not.toThrow();
    });

    it('should validate problem item without optional fields', () => {
      const minimalProblem = {
        filePath: '/path/to/file.ts',
        workspaceFolder: 'my-workspace',
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 10 },
        },
        severity: 'Warning' as ProblemSeverity,
        message: 'Warning message',
        source: 'eslint',
      };
      expect(() => ProblemItemSchema.parse(minimalProblem)).not.toThrow();
    });

    it('should validate numeric code', () => {
      const problemWithNumericCode = {
        ...validProblemItem,
        code: 2304,
      };
      expect(() => ProblemItemSchema.parse(problemWithNumericCode)).not.toThrow();
    });

    it('should validate with related information', () => {
      const problemWithRelated = {
        ...validProblemItem,
        relatedInformation: [
          {
            location: {
              uri: '/path/to/related.ts',
              range: {
                start: { line: 1, character: 0 },
                end: { line: 1, character: 5 },
              },
            },
            message: 'Related information',
          },
        ],
      };
      expect(() => ProblemItemSchema.parse(problemWithRelated)).not.toThrow();
    });

    it('should reject empty required strings', () => {
      expect(() => ProblemItemSchema.parse({ ...validProblemItem, filePath: '' })).toThrow();
      expect(() => ProblemItemSchema.parse({ ...validProblemItem, workspaceFolder: '' })).toThrow();
      expect(() => ProblemItemSchema.parse({ ...validProblemItem, message: '' })).toThrow();
      expect(() => ProblemItemSchema.parse({ ...validProblemItem, source: '' })).toThrow();
    });

    it('should reject missing required fields', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { filePath, ...withoutFilePath } = validProblemItem;
      expect(() => ProblemItemSchema.parse(withoutFilePath)).toThrow();

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { workspaceFolder, ...withoutWorkspace } = validProblemItem;
      expect(() => ProblemItemSchema.parse(withoutWorkspace)).toThrow();

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { range, ...withoutRange } = validProblemItem;
      expect(() => ProblemItemSchema.parse(withoutRange)).toThrow();

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { severity, ...withoutSeverity } = validProblemItem;
      expect(() => ProblemItemSchema.parse(withoutSeverity)).toThrow();

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { message, ...withoutMessage } = validProblemItem;
      expect(() => ProblemItemSchema.parse(withoutMessage)).toThrow();

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { source, ...withoutSource } = validProblemItem;
      expect(() => ProblemItemSchema.parse(withoutSource)).toThrow();
    });
  });

  describe('DiagnosticsChangeEventSchema', () => {
    it('should validate correct change event', () => {
      const validEvent = {
        uri: '/path/to/file.ts',
        problems: [
          {
            filePath: '/path/to/file.ts',
            workspaceFolder: 'my-workspace',
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 10 },
            },
            severity: 'Error' as ProblemSeverity,
            message: 'Test error',
            source: 'typescript',
          },
        ],
      };
      expect(() => DiagnosticsChangeEventSchema.parse(validEvent)).not.toThrow();
    });

    it('should validate empty problems array', () => {
      const eventWithNoProblems = {
        uri: '/path/to/file.ts',
        problems: [],
      };
      expect(() => DiagnosticsChangeEventSchema.parse(eventWithNoProblems)).not.toThrow();
    });

    it('should reject invalid problem items in array', () => {
      const eventWithInvalidProblem = {
        uri: '/path/to/file.ts',
        problems: [
          {
            filePath: '', // Invalid empty string
            workspaceFolder: 'my-workspace',
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 10 },
            },
            severity: 'Error' as ProblemSeverity,
            message: 'Test error',
            source: 'typescript',
          },
        ],
      };
      expect(() => DiagnosticsChangeEventSchema.parse(eventWithInvalidProblem)).toThrow();
    });
  });

  describe('Type Inference', () => {
    it('should infer correct TypeScript types', () => {
      // This test ensures our Zod schemas produce the correct TypeScript types
      const severity: ProblemSeverity = 'Error';
      const position: Position = { line: 0, character: 0 };
      const range: Range = { start: position, end: position };

      const problemItem: ProblemItem = {
        filePath: '/test.ts',
        workspaceFolder: 'test',
        range,
        severity,
        message: 'test',
        source: 'test',
      };

      const event: DiagnosticsChangeEvent = {
        uri: '/test.ts',
        problems: [problemItem],
      };

      // If this compiles, our types are correct
      expect(severity).toBe('Error');
      expect(position.line).toBe(0);
      expect(range.start).toEqual(position);
      expect(problemItem.severity).toBe('Error');
      expect(event.problems).toHaveLength(1);
    });
  });
});
