// This file contains various TypeScript and ESLint issues for testing
// the MCP Diagnostics Extension

export class TestClass {
  private unusedProperty: string = "test"; // Unused variable

  constructor() {
    // Missing semicolon
    const x = 5

    // Type error - string assigned to number
    const y: number = "hello";

    // Undefined variable
    console.log(undefinedVar);

    // Unreachable code
    return;
    console.log("This will never execute");
  }

  // Function with unused parameter
  public unusedParam(param: string): void {
    console.log("Function without using parameter");
  }

  // Missing return type annotation
  public missingReturnType() {
    return "should specify return type";
  }
}

// Unused import would go here
import { SomeUnusedClass } from './non-existent';

// Using 'any' type (should be avoided)
function anyTypeFunction(param: any): any {
  return param;
}
